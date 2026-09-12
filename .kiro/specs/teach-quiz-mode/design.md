# Design Document: Teach / Quiz Mode

## Overview

This document describes the two-tier redesign of NetWatch from a single-file HTML simulator into a modular frontend + Node/Express backend application with a real database. The result is two operating modes — Teach Mode and Quiz Mode — backed by server-enforced authentication, server-stored attempt counters, and server-stored result records.

The core simulation engine (tick-based telemetry, topology rendering, charts, alerts, logs, packet feed) is extracted unchanged into its own module. Everything that changes is in the outer layers: screen flow, authentication, API communication, explain-panel logic, and result/attempt gating. The engine never reads authentication or mode state.

Key architectural changes from the old single-file design:
- **No localStorage for student identity.** NPM, name, attempt counters, and results move to the backend database.
- **No plaintext password in frontend.** Admin actions are gated by an instructor JWT, not a hardcoded string.
- **No sessionStorage for tokens.** The Session_Token lives in a JS closure variable, cleared when the page unloads.
- **Teach Mode is fully offline-capable.** It makes zero backend calls; its only persistence is an anonymous local-storage progress entry keyed by `lessonId` only.

---

## Architecture

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (Frontend)                       │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ lesson-data │  │  sim-engine  │  │   view renderers     │   │
│  │  module     │  │  module      │  │ (overview, topology, │   │
│  │  lessons.js │  │  engine.js   │  │  alerts, packets…)   │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │     auth module         │  │      api-client module      │  │
│  │  auth.js                │  │  api.js                     │  │
│  │  - in-memory token      │  │  - fetch wrappers           │  │
│  │  - session state        │  │  - retry logic              │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               app.js (entry / screen router)             │   │
│  │  Mode Selector · Login Screen · Attempt Gate             │   │
│  │  Explain Panel · Result Recording · Admin Reset          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ REST / JSON  (HTTPS)
┌────────────────────────────▼─────────────────────────────────────┐
│                     Node / Express Backend                        │
│                                                                   │
│   POST /api/auth/login          POST /api/attempts               │
│   POST /api/results             GET  /api/results                │
│   GET  /api/results/all         POST /api/admin/reset            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Database (SQL or NoSQL)               │    │
│  │  Student_Accounts · Instructor_Accounts                  │    │
│  │  Attempt_Counters · Result_Records                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

### Screen Flow

```
Lesson Select screen
  │
  │  user clicks lesson card  →  intercepted by app.js
  │
  ▼
Mode Selector (modal)
  │  "Teach Mode"               "Quiz Mode"
  │       │                         │
  │       ▼                         ▼
  │  set session.mode="teach"   Login Screen (modal)
  │  launch simulation              │
  │                                 │  POST /api/auth/login
  │                                 │  ← Session_Token + name
  │                                 │
  │                                 ▼
  │                           Attempt Gate
  │                           POST /api/attempts
  │                             │         │
  │                      allowed:true   allowed:false
  │                             │         │
  │                             │         ▼
  │                             │   Blocked Attempt Screen
  │                             │   (optionally GET /api/results
  │                             │    to show prior correct result)
  │                             │         │
  │                             │    Admin Reset link
  │                             │         │
  ▼                             ▼         ▼
Simulation (#app)           Admin Reset flow
  - topbar: mode badge + "Welcome, [Name]"
  - Teach Mode: Explain Panels active, Sandbox Drawer active
  - Quiz Mode: Explain Panels suppressed, Sandbox Drawer active
  │
  ▼
Diagnosis Modal (existing, extended)
  - Teach Mode: all hints, anonymous teach progress → localStorage
  - Quiz Mode: 1 hint max, POST /api/results, show Name + NPM
  │
  ▼
Back to Lesson Select (exitToLessons, clears in-memory token)
```

### Frontend Module Breakdown

| File | Responsibility |
|------|---------------|
| `src/lessons.js` | Lesson data array (topology templates, incident timelines, diagnosis questions, hints, correct answers). No runtime logic. |
| `src/engine.js` | The tick-based simulation engine extracted verbatim from `NetWatch_V1.0.1.html`. No mode/auth reads. |
| `src/renderers/` | Per-view rendering functions (overview, topology SVG, alerts list, packet table, metrics, log console, charts). Stateless render functions called by app.js. |
| `src/auth.js` | In-memory token store, session state (currentMode, studentName, studentNPM, instructorToken), lifecycle helpers (clearStudentSession, clearInstructorToken). |
| `src/api.js` | Thin fetch wrappers for each backend endpoint. Reads token from auth.js. Implements single-retry for result submission. |
| `src/app.js` | Entry point. Owns the screen router, all modal logic, event delegation, the explain panel system, and the Admin Reset flow. Imports from all other modules. |
| `index.html` | Markup and CSS. All `<script>` tags load ES modules. No inline script logic. |
| `backend/server.js` | Express app entry point, middleware, route registration. |
| `backend/routes/` | Route handlers: `auth.js`, `attempts.js`, `results.js`, `admin.js`. |
| `backend/db.js` | Database connection and query helpers. |
| `backend/constants.js` | `ATTEMPT_LIMIT = 3` and other server-side constants. |

---

## Components and Interfaces

### Mode Selector

Triggered when the student clicks a lesson card. The current `pendingLessonId` is stored in a closure variable.

**State transitions:**
- Confirm "Teach" → set `currentMode = "teach"` in auth.js, show topbar badge "TEACH", launch simulation directly.
- Confirm "Quiz" → show Login Screen.
- Back / Escape / click-outside → clear `pendingLessonId`, return to lesson-select, no mode stored.

**Mode description strings (≤ 30 words each):**
- Teach: *"Explore freely — no scoring, no limits. Clicking elements reveals explanations. No login required."* (14 words)
- Quiz: *"Scored and attempt-limited. Tied to your student identity. No guided explanations. Login required."* (13 words)

---

### Login Screen

Shown only when Quiz Mode is selected. Makes a real backend call.

**Pure validation function `validateLoginForm(npm, password)`:**

```
Input:  { npm: string, password: string }
Output: { ok: boolean, npmErr: string|null, passwordErr: string|null }

Rules:
  npm      → /^\d{1,20}$/  (digits only, 1–20 characters)
  password → trimmed length ≥ 1
```

This function has no side effects and is independently unit-testable.

**Flow:**
1. `validateLoginForm` runs client-side first. If invalid, show inline errors — no API call.
2. If valid, `api.login(npm, password)` → `POST /api/auth/login`.
3. On success: store token in `auth.sessionToken` (memory only), store `auth.studentName`, `auth.studentNPM`, proceed to Attempt Gate.
4. On 401: show "Invalid NPM or password" (field not identified).
5. On network/5xx: show generic error, retain NPM field value.
6. Back button: clear all partial state, return to Mode Selector.

---

### Attempt Gate

Called after successful login. Makes one API call before launching the simulation.

**Flow:**
```
api.startAttempt(sessionToken, lessonId)  →  POST /api/attempts
  { allowed: true  }  →  proceed to launchSimulation()
  { allowed: false }  →  showBlockedScreen() [optionally loads prior correct result]
  network/server error →  showAttemptError(), do NOT launch simulation
```

The backend increments and persists the counter atomically before responding `allowed: true`. If the response is never received (network error), no counter was consumed — the frontend must not launch.

---

### Explain Panel System

A single fixed `<div id="explain-panel">` element, positioned to the right of the viewport below the topbar. Content is swapped in-place on each call; the panel is never destroyed and recreated.

**Content lookup:** A static JS object `EXPLAIN_CONTENT` keyed by content-key strings. Namespaces:
- `device:{type}` — for topology node clicks (type = gateway, web, database, aicompute, client, switch)
- `metric:{name}` — for stat-bar cells, device-grid cards, chart panels
- `alert:{level}` — for alert list entries (critical, warning, info)
- `proto:{protocol}` — for packet table rows (TCP, UDP, ICMP, DNS, ARP, STP)
- `fallback` — displayed when no matching key exists

**Content key derivation at render time:** Each interactive element receives a `data-explain-key` attribute set during render (e.g. `data-explain-key="metric:cpu"`, `data-explain-key="proto:TCP"`). A single delegated `click` listener on the simulation root reads this attribute and calls `showExplainPanel(key)`.

**`showExplainPanel(key)` logic:**
```
if currentMode !== "teach": return immediately
entry = EXPLAIN_CONTENT[key] ?? EXPLAIN_CONTENT["fallback"]
set #ep-title = entry.title
set #ep-body  = entry.body
remove "hidden" class from panel
```

No animation, no async — response is synchronous and well within 300 ms.

**`closeExplainPanel()`:** Adds "hidden" class. Called by close button and by a global `keydown` Escape listener.

**Quiz Mode suppression:** When `currentMode === "quiz"`, the CSS class `quiz-mode` is added to `<body>`. This class strips hover affordances and sets `cursor: default` on all four interactive element groups. The delegated click handler's early-return guard (`if currentMode !== "teach"`) ensures no explain panel can appear even if the CSS is somehow absent.

---

### Session / Auth State Management

All session state lives in `src/auth.js` as module-level variables (no export of the raw variables — only getter/setter functions are exported):

```js
// auth.js — module scope, not exported directly
let _sessionToken    = null;   // student JWT, cleared on page unload
let _instructorToken = null;   // instructor JWT, separate lifetime
let _currentMode     = null;   // "teach" | "quiz" | null
let _studentName     = null;
let _studentNPM      = null;

// Exported API
export function setStudentSession(token, name, npm, mode) { … }
export function getSessionToken() { return _sessionToken; }
export function getCurrentMode()  { return _currentMode; }
export function getStudentName()  { return _studentName; }
export function getStudentNPM()   { return _studentNPM; }
export function clearStudentSession() { _sessionToken = _currentMode = _studentName = _studentNPM = null; }

export function setInstructorToken(token) { _instructorToken = token; }
export function getInstructorToken()       { return _instructorToken; }
export function clearInstructorToken()    { _instructorToken = null; }
```

**Token lifetime:**
- `_sessionToken` is set on successful student login and cleared by `clearStudentSession()`, called from `exitToLessons()` and the `beforeunload` event handler.
- `_instructorToken` is set on successful instructor login in the Admin Reset flow. It persists across multiple Admin Reset uses within the same browser session until the tab is closed or the instructor explicitly logs out.
- Neither token is written to `localStorage`, `sessionStorage`, or any cookie accessible to JavaScript. They exist only as module-level variables.

**Teach Mode session state:**
- `_currentMode = "teach"`, `_sessionToken = null`, `_studentName = null`, `_studentNPM = null`.
- The anonymous teach-progress entry uses `localStorage.setItem("nw_teach_" + lessonId, …)`. Key contains only `lessonId`, never NPM or name.

---

### Result Recording

**Quiz Mode:** `api.recordResult(token, lessonId, outcome)` → `POST /api/results`. Outcome is `"correct"` or `"incorrect"`. If the call fails, it is retried once automatically. If the retry also fails, an inline error is shown in the Diagnosis Modal without closing the modal.

**Teach Mode:** `recordTeachProgress(lessonId, correct)` writes directly to `localStorage`. Key: `"nw_teach_" + lessonId`. Value: `{ lessonId, attempted: true, correct, lastTs: ISO8601 }`. Overwrites any prior entry for that lessonId. Silent on write failure (teach mode has no mandatory persistence).

---

### Admin Reset Component

**Access points:** A secondary "Admin Reset…" button in the lesson-select screen footer and on the Blocked Attempt Screen. Styled as `btn btn-ghost` to avoid visual prominence.

**Flow (state machine):**
```
User activates Admin Reset
  │
  ├── instructorToken present?
  │     YES → show Admin Reset Form directly
  │     NO  → show Instructor Login prompt
  │                │
  │           Submit instructor credentials
  │           POST /api/auth/login  (with instructor flag or separate endpoint)
  │                │
  │           On success: store instructorToken in memory, show Admin Reset Form
  │
  ▼
Admin Reset Form (NPM + lessonId fields, no password field)
  │  Validation: both fields non-empty and non-whitespace
  │  On invalid: field-specific inline error, no API call
  │
  ▼
POST /api/admin/reset  (Authorization: Bearer {instructorToken})
  │
  ├── 200 OK    → show confirmation "Attempt counter for NPM {npm}, lesson {lessonId} has been reset."
  ├── 403       → show "This action requires instructor authentication."
  ├── 404       → show "Lesson ID not recognised."
  └── other     → show generic error, retain form values
```

No plaintext password constant exists anywhere in the frontend. The instructor is identified solely by their JWT.

---

## Data Models

### Database Tables

**Student_Accounts**
| Column | Type | Constraints |
|--------|------|-------------|
| npm | VARCHAR(20) | PRIMARY KEY, digits only |
| name | VARCHAR(255) | NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL (bcrypt) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |

**Instructor_Accounts**
| Column | Type | Constraints |
|--------|------|-------------|
| username | VARCHAR(100) | PRIMARY KEY |
| password_hash | VARCHAR(255) | NOT NULL (bcrypt) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |

**Attempt_Counters**
| Column | Type | Constraints |
|--------|------|-------------|
| npm | VARCHAR(20) | FK → Student_Accounts |
| lesson_id | VARCHAR(100) | NOT NULL |
| count | INTEGER | NOT NULL, DEFAULT 0 |
| last_attempt_at | TIMESTAMP | |
| PRIMARY KEY | (npm, lesson_id) | |

**Result_Records**
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY (auto) |
| npm | VARCHAR(20) | FK → Student_Accounts |
| lesson_id | VARCHAR(100) | NOT NULL |
| outcome | VARCHAR(10) | CHECK (outcome IN ('correct','incorrect')) |
| recorded_at | TIMESTAMP | NOT NULL, DEFAULT NOW() (server-generated) |

Note: Result_Records are append-only. No UPDATE or DELETE is ever issued against this table by application logic.

### API Request / Response Shapes

**POST /api/auth/login**
```
Request:  { "npm": "1234567890", "password": "s3cr3t" }
Response 200: { "token": "<JWT>", "name": "Student Name", "role": "student" }
Response 401: { "error": "Invalid credentials" }
```

**POST /api/attempts**
```
Request headers: Authorization: Bearer <student JWT>
Request body:    { "lessonId": "ddos_edge" }
Response 200: { "allowed": true,  "attemptsUsed": 2, "attemptLimit": 3 }
         200: { "allowed": false, "attemptsUsed": 3, "attemptLimit": 3 }
Response 401: { "error": "Unauthorized" }
Response 500: { "error": "Internal server error" }
```

Note: The backend increments the counter atomically before responding `allowed: true`. If the request is never received (network error before response), the counter is not incremented.

**POST /api/results**
```
Request headers: Authorization: Bearer <student JWT>
Request body:    { "lessonId": "ddos_edge", "outcome": "correct" }
Response 201: { "id": 42, "recordedAt": "2025-01-15T10:30:00.000Z" }
Response 400: { "error": "Invalid outcome value" }
Response 401: { "error": "Unauthorized" }
```

**GET /api/results?studentId={npm}&lessonId={lessonId}**
```
Request headers: Authorization: Bearer <student JWT>
Response 200: { "results": [ { "id": 1, "outcome": "correct", "recordedAt": "…" }, … ] }
```

**GET /api/results/all**
```
Request headers: Authorization: Bearer <instructor JWT>
Response 200: { "results": [ { "id": 1, "npm": "…", "lessonId": "…", "outcome": "…", "recordedAt": "…" }, … ] }
Response 403: { "error": "Instructor authentication required" }
```

**POST /api/admin/reset**
```
Request headers: Authorization: Bearer <instructor JWT>
Request body:    { "npm": "1234567890", "lessonId": "ddos_edge" }
Response 200: { "message": "Attempt counter reset", "npm": "1234567890", "lessonId": "ddos_edge", "priorCount": 2 }
Response 403: { "error": "Instructor authentication required" }
Response 404: { "error": "Lesson not found" }
```

### Client-Side Storage (localStorage)

Only one key pattern is written from the frontend:

| Key pattern | Contents | Written by |
|-------------|----------|-----------|
| `nw_teach_{lessonId}` | `{ lessonId, attempted: true, correct: bool, lastTs: ISO8601 }` | recordTeachProgress() in Teach Mode |

No NPM, name, token, attempt count, or result record is ever written to localStorage or sessionStorage by the frontend.

### In-Memory Session State (not persisted anywhere)

```
auth.js module variables:
  _sessionToken:    string | null   — student JWT
  _instructorToken: string | null   — instructor JWT
  _currentMode:     "teach" | "quiz" | null
  _studentName:     string | null
  _studentNPM:      string | null
```

---

## Simulation Engine Preservation

The simulation engine in `NetWatch_V1.0.1.html` is extracted verbatim into `src/engine.js`. The extraction process:

1. **Copy the following functions/objects without modification:**
   - `LESSONS` array (lesson topology and incident data)
   - `tick(state)` and all helper functions it calls
   - Incident stage definitions and transition logic
   - Telemetry easing formulas and per-device advance functions
   - Alert generation logic
   - Log generation logic
   - Packet feed generation logic

2. **Remove from engine.js:**
   - Any `document.*` calls (rendering belongs in renderers/)
   - Any `localStorage` reads/writes
   - Any references to `currentMode`, `studentNPM`, session variables

3. **Export contract from engine.js:**
   ```js
   export { LESSONS, createInitialState, tick, resetState }
   ```
   `tick(state)` is a pure-ish function: it takes a state object, mutates it in place (matching original behaviour), and throws no exceptions to the caller (internal exceptions are caught and logged, per Req 9.2).

4. **Verification:** The extracted engine must produce byte-identical telemetry for identical slider inputs and tick counts as the original `NetWatch_V1.0.1.html`.

The engine module contains **zero** references to `currentMode`, `sessionToken`, or any auth/mode variable. This constraint is enforced by a smoke test (static grep of the engine.js source).

---

## Error Handling

| Scenario | Frontend behaviour |
|----------|-------------------|
| `POST /api/auth/login` → 401 | Inline "Invalid NPM or password". NPM field retained. |
| `POST /api/auth/login` → 5xx / network | Inline "Login could not be completed". NPM field retained. |
| `POST /api/attempts` → network/5xx | Inline error shown. Simulation does NOT load. |
| `POST /api/results` → fail | Auto-retry once. If retry fails, inline error in Diagnosis Modal. Modal stays open. |
| `POST /api/admin/reset` → 403 | "This action requires instructor authentication." |
| `POST /api/admin/reset` → 404 | "Lesson ID not recognised." |
| Backend unreachable in Teach Mode | Teach Mode continues to work fully offline. No error shown. |
| Backend unreachable in Quiz Mode | Any Quiz Mode API call that fails shows "Backend unavailable. Please check your connection." |
| tick() throws for a device | Exception caught inside tick(), logged to console. Other devices continue. Simulation does not halt. |
| localStorage write fails (teach progress) | Silent failure. Teach Mode has no mandatory persistence. |

---

## Decision Point: Student Account Provisioning (Open — Req 4.9)

> **⚠️ Open Question**: Whether Student_Accounts are provisioned by instructor pre-creation or by student self-registration is not yet defined.

**Default for initial implementation:** Instructor pre-creation.

Instructors create Student_Account rows directly in the database (or via a future instructor admin UI). Students cannot self-register. This choice:
- Simplifies the backend (no registration endpoint, no email verification, no duplicate-NPM conflicts from students).
- Keeps the student login flow minimal (NPM + password only).
- Is the safer default for a controlled educational environment.

**If self-registration is later required**, a `POST /api/auth/register` endpoint should be added with: NPM uniqueness check, password strength policy, optional instructor-approval flow. No frontend or backend code written for the initial implementation should preclude this change.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: NPM validation rejects all non-digit and out-of-range inputs

*For any* string that does not match `/^\d{1,20}$/`, calling `validateLoginForm` with that string as the NPM field should return `{ ok: false }` with a non-null `npmErr` and should never produce a backend API call.

**Validates: Requirements 4.2**

---

### Property 2: Admin Reset form rejects all whitespace/empty inputs

*For any* string that is empty or composed entirely of whitespace characters, submitting it as the NPM or lessonId field in the Admin Reset form should produce a field-specific validation error and no call to `POST /api/admin/reset`.

**Validates: Requirements 8.4**

---

### Property 3: Explain Panel content is keyed by type, not live value

*For any* two elements of the same type (e.g. two different metric cards both with key `metric:cpu`) but with different live values, calling `showExplainPanel` with their derived content key should produce identical title and body text.

**Validates: Requirements 3.7**

---

### Property 4: Explain Panel fallback for unknown keys

*For any* string that is not a key in `EXPLAIN_CONTENT`, calling `showExplainPanel` with that string should display the fallback entry (non-empty title and body), never an empty or hidden panel.

**Validates: Requirements 3.8**

---

### Property 5: Explain Panel is suppressed for all element types in Quiz Mode

*For any* interactive element type (device node, metric card, alert entry, packet row), when `currentMode` is `"quiz"`, triggering the explain panel handler for that element should leave the explain panel hidden.

**Validates: Requirements 6.1**

---

### Property 6: Teach Mode makes no backend API calls for any lesson

*For any* lessonId, completing a full Teach Mode session (mode selection → simulation → diagnosis submission) should produce zero calls to any `/api/*` endpoint.

**Validates: Requirements 2.2, 2.3, 10.3**

---

### Property 7: Teach progress key never contains student identity

*For any* diagnosis submission in Teach Mode with any lessonId, the localStorage key used for the teach-progress write must match the pattern `nw_teach_{lessonId}` exactly and must not contain any NPM or name string.

**Validates: Requirements 2.4, 10.3**

---

### Property 8: Student session token is never written to Web Storage

*For any* successful student authentication response containing a JWT token, after `setStudentSession` is called, neither `localStorage` nor `sessionStorage` should contain that token value.

**Validates: Requirements 4.4, 10.5**

---

### Property 9: Attempt counters are independent across (student, lesson) pairs

*For any* two distinct (npm, lessonId) pairs, incrementing the attempt counter for one pair (via `POST /api/attempts`) should not change the counter value for the other pair.

**Validates: Requirements 5.6**

---

### Property 10: Result records are append-only (never overwritten)

*For any* N consecutive diagnosis submissions by the same student for the same lesson in Quiz Mode, the database should contain exactly N Result_Record rows for that (npm, lessonId) pair after all N submissions.

**Validates: Requirements 7.2**

---

### Property 11: Simulation engine output is mode-independent

*For any* set of simulation tick inputs (slider values, tick count, lesson id), running the engine in a context where `currentMode = "teach"` vs `currentMode = "quiz"` should produce identical telemetry values, topology states, alert lists, log lines, and packet feed rows — because `tick()` never reads `currentMode`.

**Validates: Requirements 9.1, 9.4**

---

### Property 12: Tick exception isolation

*For any* device that throws an exception during its telemetry advancement step in `tick()`, the remaining devices should still have their metrics updated and the simulation should not halt.

**Validates: Requirements 9.2**

---

### Property 13: Welcome name truncation

*For any* student name string of arbitrary length, `formatWelcomeName(name)` should return a string of at most 53 characters (50 chars + "…") and should never truncate a name of 50 characters or fewer.

**Validates: Requirements 4.8**

---

### Property 14: Hint exhaustion in Teach Mode / suppression in Quiz Mode

*For any* lesson with N available hints, in Teach Mode, requesting hints N times should make all N hints visible. In Quiz Mode, after the first hint is revealed, further hint requests should leave the visible hint count at 1.

**Validates: Requirements 1.7, 1.8**

---

## Testing Strategy

### Property-Based Testing

The properties above are implemented using a PBT library (recommended: **fast-check** for JavaScript). Each property test is configured to run a minimum of 100 iterations. Tests are tagged with their property number.

Suitable PBT targets (pure functions with no I/O):
- `validateLoginForm(npm, password)` — Properties 1, 2
- `showExplainPanel(key)` with mock DOM — Properties 3, 4, 5
- `formatWelcomeName(name)` — Property 13
- `tick(state)` with injected faults — Properties 11, 12
- Backend attempt counter logic (mocked DB) — Property 9
- Backend result-record persistence (mocked DB) — Property 10
- Hint reveal logic — Property 14
- Teach progress key schema — Property 7

Tag format: `// Feature: teach-quiz-mode, Property {N}: {property_text}`

### Unit Tests (Example-Based)

Cover the specific interaction paths identified in the prework as EXAMPLE or EDGE_CASE:
- Mode Selector: confirm Teach/Quiz stores correct session state and shows correct badge.
- Login Screen: 401 error message text, NPM retention on network error, back-button cleanup.
- Attempt Gate: `allowed:false` shows blocked screen; network error shows error without launching.
- Admin Reset: 403 → correct message, 404 → correct message, back-path through instructor login.
- Diagnosis Modal: name + NPM shown in Quiz Mode, absent in Teach Mode; retry on result POST failure.
- Sandbox Drawer: opens and functions identically in both modes.
- Explain Panel: close via button and via Escape key.

### Integration Tests

- Full Teach Mode offline flow: mock backend unreachable, assert all features work.
- Full Quiz Mode flow against a test database: login → attempt → simulation → result → blocked.
- `GET /api/results/all` returns all records for instructor, returns 403 for student token.
- `POST /api/admin/reset` resets counter, leaves result records intact.

### Smoke / Static Tests

- Backend `constants.js` exports `ATTEMPT_LIMIT === 3`.
- `engine.js` source contains no references to `currentMode`, `sessionToken`, or any auth variable (grep check).
- Frontend source contains no hardcoded password constants (grep check).
- All five required module files exist (`lessons.js`, `engine.js`, `auth.js`, `api.js`, `app.js`).
