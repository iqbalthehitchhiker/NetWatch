# Implementation Plan: Teach / Quiz Mode (Two-Tier Architecture)

## Overview

Refactor `NetWatch_V1.0.1.html` from a single-file HTML simulator into a modular frontend + Node/Express backend. The simulation engine is extracted verbatim into `src/engine.js` — its logic is never modified. New modules (`src/lessons.js`, `src/auth.js`, `src/api.js`, `src/renderers/`, `src/app.js`) are built around the engine. The backend (`backend/`) handles authentication, attempt counting, and result storage via a SQLite/PostgreSQL database. All 14 correctness properties from the design are verified with fast-check property tests.

Dependency order: project scaffolding → backend foundation → frontend module extraction → auth / API client → new UI components → engine / render integration → testing.

---

## Tasks

- [ ] 1. Scaffold project structure and install dependencies
  - [ ] 1.1 Create directory tree and root configuration files
    - Create: `src/`, `src/renderers/`, `backend/`, `backend/routes/`, `public/`
    - Add `package.json` with `"type": "module"`, scripts for `start` (node backend/server.js) and `test` (node --experimental-vm-modules node_modules/.bin/jest or vitest run)
    - Add `.gitignore` (node_modules, .env, *.db)
    - Add `index.html` shell: copy `<head>` (CSS variables, fonts, Chart.js CDN) from `NetWatch_V1.0.1.html`; add `<script type="module" src="src/app.js"></script>`; no inline script block
    - _Requirements: 10.1_

  - [ ] 1.2 Install backend runtime dependencies
    - `npm install express jsonwebtoken bcrypt better-sqlite3` (or `pg` if PostgreSQL is preferred)
    - Pin exact versions in `package.json`
    - _Requirements: 10.2_

  - [ ] 1.3 Install test and dev dependencies
    - `npm install --save-dev fast-check vitest` (or jest + @jest/globals)
    - Create `vitest.config.js` (or `jest.config.js`) with coverage enabled
    - _Requirements: (testing infrastructure)_

- [ ] 2. Implement backend constants and database layer
  - [ ] 2.1 Create `backend/constants.js`
    - Export `ATTEMPT_LIMIT = 3` and `JWT_EXPIRY = '8h'`
    - No other logic — pure constant file
    - _Requirements: 5.1_

  - [ ] 2.2 Create `backend/db.js` — database connection and query helpers
    - Open/create SQLite file (or connect to PostgreSQL via env vars)
    - Run `CREATE TABLE IF NOT EXISTS` for all four tables: `Student_Accounts`, `Instructor_Accounts`, `Attempt_Counters`, `Result_Records` (schemas from design.md Data Models section)
    - Export named query helpers: `findStudentByNpm(npm)`, `findInstructorByUsername(username)`, `getAttemptCount(npm, lessonId)`, `incrementAttempt(npm, lessonId)`, `resetAttempt(npm, lessonId)`, `insertResult(npm, lessonId, outcome)`, `getResults(npm, lessonId)`, `getAllResults()`
    - _Requirements: 10.2_

  - [ ] 2.3 Create `backend/constants.js` seed script (separate file `backend/seed.js`)
    - Accept CLI args: `--npm`, `--name`, `--password`, `--role` (student | instructor)
    - Hash password with bcrypt (saltRounds = 12), insert row into appropriate table
    - Print "Seeded {role} {npm|username}" on success
    - _Requirements: 4.9 (instructor pre-creation default)_

- [ ] 3. Implement backend route handlers
  - [ ] 3.1 Create `backend/routes/auth.js` — POST /api/auth/login
    - Accept `{ npm, password }` (student) or `{ username, password, role: "instructor" }` (instructor)
    - Look up account in db; compare password with `bcrypt.compare`
    - On match: sign JWT `{ sub: npm|username, role: "student"|"instructor", name }` with `process.env.JWT_SECRET`; return `{ token, name, role }`
    - On mismatch: return 401 `{ error: "Invalid credentials" }`
    - _Requirements: 4.3, 4.5, 8.2_

  - [ ] 3.2 Create `backend/routes/attempts.js` — POST /api/attempts
    - Verify Bearer JWT; reject with 401 if invalid or non-student role
    - Read `lessonId` from body; reject with 400 if missing
    - Call `getAttemptCount`; if `count >= ATTEMPT_LIMIT` return `{ allowed: false, attemptsUsed: count, attemptLimit: ATTEMPT_LIMIT }`
    - Otherwise call `incrementAttempt` atomically, return `{ allowed: true, attemptsUsed: count + 1, attemptLimit: ATTEMPT_LIMIT }`
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ] 3.3 Create `backend/routes/results.js` — POST /api/results and GET /api/results and GET /api/results/all
    - POST: verify student JWT; validate `outcome` is `"correct"` or `"incorrect"`; call `insertResult`; return 201 `{ id, recordedAt }`
    - GET `?studentId&lessonId`: verify student JWT; call `getResults`; return `{ results: [...] }`
    - GET `/all`: verify instructor JWT (403 if student or invalid); call `getAllResults`; return `{ results: [...] }`
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [ ] 3.4 Create `backend/routes/admin.js` — POST /api/admin/reset
    - Verify Bearer JWT; reject with 403 if not instructor role
    - Validate `npm` and `lessonId` fields non-empty
    - Read prior count; call `resetAttempt`; return 200 `{ message: "Attempt counter reset", npm, lessonId, priorCount }`
    - Return 404 `{ error: "Lesson not found" }` if lessonId not in known lesson list (import from lessons data)
    - _Requirements: 8.5, 8.6, 8.7, 8.8_

  - [ ] 3.5 Create `backend/server.js` — Express entry point
    - Import express, cors, routes; apply `express.json()` middleware
    - Mount: `/api/auth` → auth router, `/api/attempts` → attempts router, `/api/results` → results router, `/api/admin` → admin router
    - Serve `index.html` and `src/` as static files for development
    - `app.listen(process.env.PORT || 3000)`
    - Read `JWT_SECRET` from `process.env`; throw if not set
    - _Requirements: 10.2, 10.5_

- [ ] 4. Checkpoint — backend API runnable
  - Start the server (`node backend/server.js`) and verify all 6 endpoints respond to curl/Postman with correct status codes. Seed at least one student and one instructor account. Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Extract lesson data into `src/lessons.js`
  - [ ] 5.1 Copy the `LESSONS` array verbatim from `NetWatch_V1.0.1.html` into `src/lessons.js`
    - Include topology templates, incident timelines, diagnosis questions, hints, correct answers
    - Export as `export const LESSONS = [...]`
    - No runtime logic — pure data module
    - _Requirements: 10.1_

- [ ] 6. Extract simulation engine into `src/engine.js`
  - [ ] 6.1 Copy all engine functions verbatim from `NetWatch_V1.0.1.html` into `src/engine.js`
    - Include: `tick(state)`, all helpers it calls, incident stage definitions, telemetry easing formulas, per-device advance functions, alert generation logic, log generation logic, packet feed generation logic
    - Remove any `document.*` calls, `localStorage` reads/writes, and any references to `currentMode`, `sessionToken`, or auth/mode variables
    - Add `export { LESSONS, createInitialState, tick, resetState }` at the bottom
    - Import `LESSONS` from `./lessons.js` instead of defining it inline
    - _Requirements: 9.1, 9.4, 10.1_

  - [ ] 6.2 Static smoke test — grep engine.js for forbidden references
    - Write a test (or npm script) that reads `src/engine.js` as text and asserts zero matches for: `currentMode`, `sessionToken`, `instructorToken`, `localStorage`, `sessionStorage`, `document\.`
    - This test MUST pass before any integration work begins
    - _Requirements: 9.4_

  - [ ]* 6.3 Write property test for engine mode-independence (Property 11)
    - **Property 11: Simulation engine output is mode-independent**
    - For any valid initial `state` and any two values of a hypothetical mode context, running `tick(state)` N times (1–30, generated by fast-check) must produce identical `state.topo.nodes[*].cur` telemetry, `state.alerts`, and `state.packets` — because `tick()` never reads any mode variable
    - **Validates: Requirements 9.1, 9.4**

  - [ ]* 6.4 Write property test for tick exception isolation (Property 12)
    - **Property 12: Tick exception isolation**
    - For any device that throws during its advancement step (inject fault via mock), all other devices must still update and `tick()` must not re-throw to the caller
    - **Validates: Requirements 9.2**

- [ ] 7. Create `src/renderers/` — per-view render functions
  - [ ] 7.1 Create `src/renderers/overview.js`
    - Extract stat-bar and summary-card render logic from `NetWatch_V1.0.1.html` into exported functions: `renderStatBar(state)`, `renderDeviceGrid(state)`
    - Each function writes to DOM elements; reads only from `state`, not from auth/mode variables
    - Add `data-explain-key="metric:{key}"` attributes on each `.sc` div and `.dm-card` div (keys from design.md EXPLAIN_CONTENT namespace)
    - _Requirements: 3.2, 10.1_

  - [ ] 7.2 Create `src/renderers/topology.js`
    - Extract `renderTopologySVG(state)` from `NetWatch_V1.0.1.html`
    - Replace `onclick="openDeviceDetail(id)"` with `data-node-id="${n.id}"` and `data-explain-key="device:${n.type}"` attributes — no inline onclick
    - _Requirements: 3.1, 10.1_

  - [ ] 7.3 Create `src/renderers/alerts.js`
    - Extract `renderAlerts(state)` from `NetWatch_V1.0.1.html`
    - Add `data-explain-key="alert:${a.level}"` to each `.alert-item` element
    - _Requirements: 3.3, 10.1_

  - [ ] 7.4 Create `src/renderers/packets.js`
    - Extract `renderPackets(state)` from `NetWatch_V1.0.1.html`
    - Add `data-explain-key="proto:${p.proto}"` to each `<tr>` element
    - _Requirements: 3.4, 10.1_

  - [ ] 7.5 Create `src/renderers/charts.js`
    - Extract all Chart.js chart creation and update logic from `NetWatch_V1.0.1.html` into exported functions: `initCharts(canvasIds)`, `updateCharts(state)`
    - _Requirements: 10.1_

  - [ ] 7.6 Create `src/renderers/logs.js`
    - Extract log console render logic into exported `renderLogs(state)`
    - _Requirements: 10.1_

- [ ] 8. Create `src/auth.js` — in-memory session state
  - [ ] 8.1 Implement module-level private variables and exported getter/setter API
    - Private vars: `_sessionToken`, `_instructorToken`, `_currentMode`, `_studentName`, `_studentNPM` — all initialised to `null`
    - Exported: `setStudentSession(token, name, npm, mode)`, `getSessionToken()`, `getCurrentMode()`, `getStudentName()`, `getStudentNPM()`, `clearStudentSession()`
    - Exported: `setInstructorToken(token)`, `getInstructorToken()`, `clearInstructorToken()`
    - Register `window.addEventListener('beforeunload', clearStudentSession)` inside module init
    - No writes to `localStorage`, `sessionStorage`, or cookies
    - _Requirements: 4.4, 10.5_

  - [ ]* 8.2 Write property test for token never written to Web Storage (Property 8)
    - **Property 8: Student session token is never written to Web Storage**
    - For any arbitrary token string, calling `setStudentSession(token, ...)` must result in zero occurrences of that token string in `localStorage` and `sessionStorage`
    - **Validates: Requirements 4.4, 10.5**

- [ ] 9. Create `src/api.js` — fetch wrappers for all backend endpoints
  - [ ] 9.1 Implement `login(npm, password)` → POST /api/auth/login
    - Returns `{ ok: true, token, name, role }` on 200; `{ ok: false, status: 401, error }` on 401; `{ ok: false, status: 0, error }` on network error
    - _Requirements: 4.3, 4.5, 4.6_

  - [ ] 9.2 Implement `startAttempt(lessonId)` → POST /api/attempts
    - Reads token from `auth.getSessionToken()`; sends `Authorization: Bearer {token}`
    - Returns `{ ok: true, allowed, attemptsUsed, attemptLimit }` on 200; `{ ok: false, error }` on 401/5xx/network
    - _Requirements: 5.2, 5.3_

  - [ ] 9.3 Implement `recordResult(lessonId, outcome)` → POST /api/results with single auto-retry
    - On first failure, waits 500 ms and retries once; returns `{ ok: true, id, recordedAt }` or `{ ok: false, error }` after both attempts
    - _Requirements: 7.1, 7.3_

  - [ ] 9.4 Implement `getResults(npm, lessonId)` → GET /api/results
    - Returns `{ ok: true, results: [...] }` on 200; `{ ok: false, error }` on failure
    - _Requirements: 7.4_

  - [ ] 9.5 Implement `getAllResults()` → GET /api/results/all
    - Reads instructor token from `auth.getInstructorToken()`
    - Returns `{ ok: true, results: [...] }` on 200; `{ ok: false, status: 403 }` on 403
    - _Requirements: 7.5_

  - [ ] 9.6 Implement `adminReset(npm, lessonId)` → POST /api/admin/reset
    - Reads instructor token from `auth.getInstructorToken()`
    - Returns `{ ok: true, ... }` on 200; `{ ok: false, status: 403 }` on 403; `{ ok: false, status: 404 }` on 404
    - _Requirements: 8.5, 8.7_

- [ ] 10. Checkpoint — module layer complete
  - Verify `src/engine.js` imports cleanly from `src/lessons.js` and that `smoke test` in task 6.2 passes. Confirm `src/auth.js` and `src/api.js` have no syntax errors (`node --check src/auth.js && node --check src/api.js`). Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement pure utility functions (independently testable)
  - [ ] 11.1 Implement `validateLoginForm(npm, password)` in `src/app.js` (or `src/utils.js`)
    - Input: `{ npm: string, password: string }`
    - NPM rule: matches `/^\d{1,20}$/`; else `npmErr = "NPM must be 1–20 digits"`
    - Password rule: trimmed length ≥ 1; else `passwordErr = "Password is required"`
    - Returns `{ ok: boolean, npmErr: string|null, passwordErr: string|null }`
    - No side effects — pure function
    - _Requirements: 4.2_

  - [ ]* 11.2 Write property test for NPM validation (Property 1)
    - **Property 1: NPM validation rejects all non-digit and out-of-range inputs**
    - For any string not matching `/^\d{1,20}$/` (generated by fast-check: empty string, strings with letters, strings > 20 digits, strings with special characters), `validateLoginForm(npm, "pass")` must return `{ ok: false }` with non-null `npmErr`
    - **Validates: Requirements 4.2**

  - [ ] 11.3 Implement `formatWelcomeName(name)` in `src/app.js` (or `src/utils.js`)
    - If `name` is falsy or empty string, return `"Student"`
    - If `name.length <= 50`, return `name` unchanged
    - If `name.length > 50`, return `name.slice(0, 50) + "…"`
    - Pure function, no side effects
    - _Requirements: 4.8_

  - [ ]* 11.4 Write property test for welcome name truncation (Property 13)
    - **Property 13: Welcome name truncation**
    - For any string of arbitrary length generated by fast-check: `formatWelcomeName(name)` must return a string of at most 51 characters (50 + "…"), and must never truncate a name of ≤ 50 characters
    - **Validates: Requirements 4.8**

  - [ ] 11.5 Implement `validateAdminResetForm(npm, lessonId)` in `src/app.js` (or `src/utils.js`)
    - Returns `{ ok: boolean, npmErr: string|null, lessonIdErr: string|null }`
    - Each field: empty or whitespace-only → field-specific error; non-empty non-whitespace → null error
    - Pure function, no side effects
    - _Requirements: 8.4_

  - [ ]* 11.6 Write property test for Admin Reset form validation (Property 2)
    - **Property 2: Admin Reset form rejects all whitespace/empty inputs**
    - For any string that is empty or whitespace-only (generated by fast-check), `validateAdminResetForm(npm, lessonId)` with that string as either field must return `{ ok: false }` with a non-null error for that field
    - **Validates: Requirements 8.4**

- [ ] 12. Build `index.html` — markup and CSS
  - [ ] 12.1 Copy all CSS and markup from `NetWatch_V1.0.1.html` into `index.html`
    - Retain all existing CSS variables, panel/card primitives, lesson-select styles, simulation layout, modal styles, topbar
    - Remove all `<script>` blocks — `index.html` must have zero inline script
    - Add `<script type="module" src="src/app.js"></script>` as the only script tag
    - _Requirements: 10.1_

  - [ ] 12.2 Add new markup blocks for mode-selector, login, blocked-attempt, and admin-reset modals
    - `#modal-mode-select`: two `.mode-choice-card` divs (Teach / Quiz), mode description text (≤ 30 words each per design.md), back button
    - `#modal-login`: NPM field (`#login-npm`, `inputmode="numeric"`, `maxlength="20"`), password field (`#login-password`, `type="password"`), inline error divs, back button, submit button
    - `#modal-blocked`: `#blocked-identity`, `#blocked-best-result`, "All Lessons" button, "Admin Reset…" ghost button
    - `#modal-admin-reset`: instructor-login sub-form (`#ar-instructor-form`) and reset sub-form (`#ar-reset-form`) with NPM + lessonId fields, per-field error divs, `#ar-success`
    - _Requirements: 1.1, 1.2, 4.1, 5.4, 8.1, 8.2, 8.3_

  - [ ] 12.3 Add Explain Panel markup and CSS
    - `<div id="explain-panel" class="explain-panel hidden" role="dialog" aria-label="Element Explanation">` with `#ep-title`, `#ep-body`, close button
    - CSS: `position: fixed; right: 0; top: 52px; bottom: 0; width: 320px;` plus background, border, z-index
    - Add Quiz Mode affordance-suppression rules: `body.quiz-mode .dm-card, body.quiz-mode .sc, body.quiz-mode .alert-item, body.quiz-mode .packet-table tr, body.quiz-mode .topo-node { cursor: default !important; }` and remove hover highlights
    - _Requirements: 3.1–3.8, 6.2_

  - [ ] 12.4 Add topbar mode badge and welcome name elements
    - `<div id="topbar-mode-badge" class="mode-badge hidden">` and `<span id="topbar-welcome" class="hidden">` inside existing `.topbar`
    - Add `.mode-badge`, `.mode-badge-teach`, `.mode-badge-quiz` CSS
    - Add "Admin Reset…" ghost button in `.select-footnote` of `#screen-select`
    - _Requirements: 1.4, 4.8, 8.1_

- [ ] 13. Implement `src/app.js` — entry point, screen router, modal logic, explain panel
  - [ ] 13.1 Implement the EXPLAIN_CONTENT lookup object and explain panel functions
    - `EXPLAIN_CONTENT`: keyed object with all namespaces from design.md — `device:{type}` (6), `metric:{name}` (10+), `alert:{level}` (3), `proto:{protocol}` (6), plus `fallback`
    - `showExplainPanel(key)`: guard `if (getCurrentMode() !== "teach") return;`; look up entry with fallback; set `#ep-title`, `#ep-body`; remove `hidden`
    - `closeExplainPanel()`: add `hidden` class
    - Register delegated `keydown` Escape listener for `closeExplainPanel()`
    - _Requirements: 3.1–3.8_

  - [ ]* 13.2 Write property test for Explain Panel fallback (Property 4)
    - **Property 4: Explain Panel fallback for unknown keys**
    - For any string not present in `EXPLAIN_CONTENT` (generated by fast-check), calling `showExplainPanel(key)` with mock DOM must display a non-empty title and body from the `fallback` entry — never an empty or hidden panel
    - **Validates: Requirements 3.8**

  - [ ]* 13.3 Write property test for Explain Panel key determinism (Property 3)
    - **Property 3: Explain Panel content is keyed by type, not live value**
    - For any two calls to `showExplainPanel` with the same key but in separate invocations, the resulting `#ep-title` and `#ep-body` content must be identical regardless of any other state
    - **Validates: Requirements 3.7**

  - [ ]* 13.4 Write property test for Explain Panel suppression in Quiz Mode (Property 5)
    - **Property 5: Explain Panel is suppressed for all element types in Quiz Mode**
    - For any content key (device, metric, alert, proto), when `getCurrentMode()` returns `"quiz"`, calling `showExplainPanel(key)` must leave `#explain-panel` with the `hidden` class
    - **Validates: Requirements 6.1**

  - [ ] 13.5 Implement Mode Selector flow
    - `openModeSelector(lessonId)`: store `pendingLessonId`; populate lesson title; show `#modal-mode-select`
    - `confirmMode(mode)`: if `"teach"` → call `auth.setStudentSession(null, null, null, "teach")`; set `body.quiz-mode` off; launch simulation; if `"quiz"` → show `#modal-login`
    - `cancelModeSelector()`: clear `pendingLessonId`; hide `#modal-mode-select`
    - Register Escape and click-outside listeners to call `cancelModeSelector()`
    - Override existing `startLesson(lessonId)` to call `openModeSelector(lessonId)` instead of launching directly
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [ ] 13.6 Implement Login Screen flow
    - `submitLogin()`: read NPM + password; call `validateLoginForm`; show field errors and return if invalid; call `api.login(npm, password)`; on 200 call `auth.setStudentSession(token, name, npm, "quiz")`; proceed to `startAttemptGate()`; handle 401 and network errors per design.md error table
    - `backFromLogin()`: clear form fields, clear errors, return to Mode Selector
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7_

  - [ ] 13.7 Implement Attempt Gate flow
    - `startAttemptGate()`: call `api.startAttempt(pendingLessonId)`; on `allowed: true` call `launchSimulation()`; on `allowed: false` call `showBlockedScreen()`; on network/5xx show inline error without launching
    - `showBlockedScreen()`: populate `#blocked-identity` with name + NPM; call `api.getResults(npm, lessonId)` and display first correct result if present; show `#modal-blocked`
    - _Requirements: 5.2, 5.3, 5.5, 7.4_

  - [ ]* 13.8 Write property test for attempt counter independence (Property 9)
    - **Property 9: Attempt counters are independent across (student, lesson) pairs**
    - For any two distinct `(npm, lessonId)` pairs, incrementing the counter for one via the backend route handler (with mocked db) must not change the counter value for the other pair
    - **Validates: Requirements 5.6**

  - [ ] 13.9 Implement Admin Reset flow
    - `openAdminReset()`: if `auth.getInstructorToken()` present → show `#ar-reset-form`; else show `#ar-instructor-form`
    - `submitInstructorLogin()`: call `api.login(username, password)` with role flag; on success store instructor token, switch to `#ar-reset-form`
    - `submitAdminReset()`: call `validateAdminResetForm`; show field errors and return if invalid; call `api.adminReset(npm, lessonId)`; handle 200, 403, 404 responses per design.md
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 10.5_

  - [ ] 13.10 Implement result recording functions
    - `recordQuizResult(lessonId, outcome)`: call `api.recordResult(lessonId, outcome)`; on failure after retry show inline error inside Diagnosis Modal without closing it
    - `recordTeachProgress(lessonId, correct)`: write `{ lessonId, attempted: true, correct, lastTs: ISO8601 }` to `localStorage` key `nw_teach_{lessonId}`; catch storage errors silently
    - _Requirements: 2.4, 7.1, 7.3_

  - [ ]* 13.11 Write property test for Teach Mode localStorage key schema (Property 7)
    - **Property 7: Teach progress key never contains student identity**
    - For any `lessonId` string, the key written by `recordTeachProgress` must match exactly `nw_teach_{lessonId}` and must not contain any NPM or name string
    - **Validates: Requirements 2.4, 10.3**

  - [ ]* 13.12 Write property test for result records append-only (Property 10)
    - **Property 10: Result records are append-only**
    - For any N consecutive calls to the backend `POST /api/results` handler (with mocked db), the mock must receive exactly N `insertResult` calls and zero `UPDATE` or `DELETE` calls
    - **Validates: Requirements 7.2**

  - [ ] 13.13 Implement hint logic for Teach vs Quiz modes
    - In the existing hint-reveal function: in Quiz Mode, after first hint is shown, disable and hide the "Next Hint" button
    - In Teach Mode: no cap — all hints are revealable one by one
    - In Quiz Mode: Diagnosis Modal suppresses hints beyond 1
    - _Requirements: 1.7, 1.8, 2.5_

  - [ ]* 13.14 Write property test for hint exhaustion / suppression (Property 14)
    - **Property 14: Hint exhaustion in Teach Mode / suppression in Quiz Mode**
    - For any lesson with N hints (N generated by fast-check, 1–10): in Teach Mode, N reveal actions must show all N hints; in Quiz Mode, N reveal actions must leave visible hint count at exactly 1
    - **Validates: Requirements 1.7, 1.8_

  - [ ] 13.15 Wire delegated event listeners on simulation root
    - One listener on `#topology-svg` container: reads `data-node-id` and `data-explain-key`; in Teach Mode calls `showExplainPanel(key)`; in Quiz Mode calls `openDeviceDetail(nodeId)` (existing modal)
    - One listener on `#stat-bar`: reads `data-explain-key` from `.sc`; calls `showExplainPanel(key)`
    - One listener on `#alert-list`: reads `data-explain-key` from `.alert-item`; calls `showExplainPanel(key)`
    - One listener on `#packet-table-body`: reads `data-explain-key` from `tr`; calls `showExplainPanel(key)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.3_

  - [ ] 13.16 Implement `launchSimulation()` and `exitToLessons()`
    - `launchSimulation()`: set topbar mode badge ("TEACH"/"QUIZ"), set `#topbar-welcome` text via `formatWelcomeName`, add/remove `body.quiz-mode` class, close all modals, show `#app`, start tick loop
    - `exitToLessons()`: stop tick loop, call `auth.clearStudentSession()`, remove `body.quiz-mode`, hide mode badge and welcome, close explain panel, show `#screen-select`
    - _Requirements: 1.4, 4.8, 2.1, 2.6_

  - [ ]* 13.17 Write property test for Teach Mode making no API calls (Property 6)
    - **Property 6: Teach Mode makes no backend API calls for any lesson**
    - For any lessonId, completing a full Teach Mode session with all api.js functions replaced by spies must result in zero spy invocations
    - **Validates: Requirements 2.2, 2.3, 10.3**

- [ ] 14. Static smoke test suite
  - [ ] 14.1 Write static grep test: `engine.js` contains no auth/mode references
    - Read `src/engine.js` as text; assert zero matches for `/currentMode|sessionToken|instructorToken|localStorage|sessionStorage|document\./`
    - Fail with clear message listing any found matches
    - _Requirements: 9.4_

  - [ ] 14.2 Write static grep test: frontend contains no plaintext passwords
    - Read all files in `src/` as text; assert zero matches for any hardcoded password constant pattern (e.g. `RESET_PASSWORD`, `= ['"]netwatch`, `password.*=.*['"][a-zA-Z0-9]`)
    - _Requirements: 8.9, 10.5_

  - [ ] 14.3 Write static test: `backend/constants.js` exports `ATTEMPT_LIMIT === 3`
    - Import `{ ATTEMPT_LIMIT }` from `backend/constants.js`; assert `ATTEMPT_LIMIT === 3`
    - _Requirements: 5.1_

- [ ] 15. Final checkpoint — full two-tier integration verified
  - Run `npm test` — all property tests, unit tests, and smoke tests must pass. Start the server and verify in browser: lesson card → Mode Selector → Teach Mode loads without login; Quiz Mode → Login → Attempt Gate → simulation; attempt limit blocks at 3; Explain Panel opens/closes in Teach Mode only; Admin Reset resets counter without touching result records; `GET /api/results/all` requires instructor token. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP — all core implementation tasks are unmarked
- The simulation engine (`src/engine.js`) is extracted verbatim — no logic is modified. The smoke test in task 14.1 enforces this constraint mechanically
- No plaintext password exists in the frontend at any point. The admin reset flow uses instructor JWT only (task 13.9). Smoke test 14.2 enforces this
- Property tests use fast-check with a minimum of 100 iterations each. Tag format: `// Feature: teach-quiz-mode, Property {N}: {property_text}`
- The backend default for student account provisioning is instructor pre-creation (task 2.3). Self-registration is deferred per Req 4.9
- `src/auth.js` module variables are private; only getter/setter functions are exported — no raw variable exports
- The `beforeunload` handler in `src/auth.js` clears the student session token from memory on tab close

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "5.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "6.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "6.4", "8.1"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "8.2", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6"] },
    { "id": 5, "tasks": ["11.1", "11.3", "11.5", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 6, "tasks": ["11.2", "11.4", "11.6", "13.1", "13.5"] },
    { "id": 7, "tasks": ["13.2", "13.3", "13.4", "13.6", "13.7", "13.9", "13.10"] },
    { "id": 8, "tasks": ["13.8", "13.11", "13.12", "13.13", "13.15", "13.16"] },
    { "id": 9, "tasks": ["13.14", "13.17", "14.1", "14.2", "14.3"] }
  ]
}
```
