# Implementation Plan: Teach / Quiz Mode (Two-Tier Architecture)

## Overview

Refactor `NetWatch_V1.0.1.html` from a single-file HTML simulator into a modular frontend + Node/Express backend. The simulation engine is extracted verbatim into `src/engine.js` — its logic is never modified. New modules (`src/lessons.js`, `src/auth.js`, `src/api.js`, `src/renderers/`, `src/app.js`, `src/self-check.js`, `src/explain-content.js`) are built around the engine. The backend (`backend/`) handles authentication, attempt counting, and result storage via a SQLite database.

Mode is chosen at the **landing page** level — before any lesson or skill is selected — not per-lesson via a modal. "Learn the tool" leads to the Skill Select screen (Teach Mode, no login). "Take a scenario" leads to the Lesson Select screen, where selecting a card goes directly to login (Quiz Mode). Both screens share a single `#screen-select` container with `#skill-grid` and `#lesson-grid` toggled by display.

Dependency order: project scaffolding → backend foundation → frontend module extraction → auth / API client → new UI components → engine / render integration → testing.

---

## Tasks

- [x] 1. Scaffold project structure and install dependencies
  - [x] 1.1 Create directory tree and root configuration files
    - Create: `src/`, `src/renderers/`, `backend/`, `backend/routes/`, `public/`
    - Add `package.json` with `"type": "module"`, scripts for `start` (node backend/server.js) and `test` (vitest run)
    - Add `.gitignore` (node_modules, .env, *.db)
    - Add `index.html` shell with `<script type="module" src="src/app.js"></script>` as the only script tag; no inline script block
    - _Requirements: 10.1_

  - [x] 1.2 Install backend runtime dependencies
    - `npm install express jsonwebtoken bcrypt better-sqlite3`
    - Pin exact versions in `package.json`
    - _Requirements: 10.2_

  - [x] 1.3 Install test and dev dependencies
    - `npm install --save-dev fast-check vitest`
    - Create `vitest.config.js` with coverage enabled
    - _Requirements: (testing infrastructure)_

- [x] 2. Implement backend constants and database layer
  - [x] 2.1 Create `backend/constants.js`
    - Export `ATTEMPT_LIMIT = 3`, `JWT_EXPIRY = '8h'`, `BCRYPT_ROUNDS = 12`
    - No other logic — pure constant file
    - _Requirements: 5.1_

  - [x] 2.2 Create `backend/db.js` — database connection and query helpers
    - Open/create SQLite file using Node built-in `node:sqlite` (`DatabaseSync`)
    - Run `CREATE TABLE IF NOT EXISTS` for all five tables: `Student_Accounts`, `Instructor_Accounts`, `Attempt_Counters`, `Result_Records`, `Attempt_Counter_Backups`
    - Export named query helpers: `findStudentByNpm(npm)`, `findInstructorByUsername(username)`, `getAttemptCount(npm, lessonId)`, `incrementAttempt(npm, lessonId)`, `resetAttempt(npm, lessonId)`, `insertResult(npm, lessonId, outcome)`, `getResults(npm, lessonId)`, `getAllResults()`
    - _Requirements: 10.2_

  - [x] 2.3 Create `backend/seed.js` — CLI account provisioning script
    - Accept CLI args: `--npm` (students) or `--username` (instructors), `--name`, `--password`, `--role` (student | instructor)
    - Hash password with bcrypt (`BCRYPT_ROUNDS = 12`), insert row into appropriate table
    - Print "Seeded {role} {npm|username}" on success; exit code 1 on missing args
    - _Requirements: 4.9 (instructor pre-creation default)_

- [x] 3. Implement backend route handlers
  - [x] 3.1 Create `backend/routes/auth.js` — POST /api/auth/login
    - Accept `{ npm, password }` (student) or `{ username, password, role: "instructor" }` (instructor)
    - Look up account in db; compare password with `bcrypt.compare`
    - On match: sign JWT `{ sub: npm|username, role, name }` with `process.env.JWT_SECRET`; return `{ token, name, role }`
    - On mismatch: return 401 `{ error: "Invalid credentials" }`
    - _Requirements: 4.3, 4.5, 8.2_

  - [x] 3.2 Create `backend/routes/attempts.js` — POST /api/attempts
    - Verify Bearer JWT; reject with 401 if invalid or non-student role
    - Read `lessonId` from body; reject with 400 if missing
    - Call `getAttemptCount`; if `count >= ATTEMPT_LIMIT` return `{ allowed: false, attemptsUsed: count, attemptLimit }`
    - Otherwise call `incrementAttempt` atomically, return `{ allowed: true, attemptsUsed: count + 1, attemptLimit }`
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 3.3 Create `backend/routes/results.js` — POST /api/results and GET /api/results and GET /api/results/all
    - POST: verify student JWT; validate `outcome` is `"correct"` or `"incorrect"`; call `insertResult`; return 201 `{ id, recordedAt }`
    - GET `?studentId&lessonId`: verify student JWT; enforce students can only view their own results (403 otherwise); call `getResults`; return `{ results: [...] }`
    - GET `/all`: verify instructor JWT (403 if student or invalid); call `getAllResults`; return `{ results: [...] }`; register `/all` before `/` so Express matches correctly
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 3.4 Create `backend/routes/admin.js` — POST /api/admin/reset
    - Verify Bearer JWT; reject with 403 if not instructor role
    - Validate `npm` and `lessonId` fields non-empty (400 if missing)
    - Check `lessonId` against a Set built from `LESSONS.map(l => l.id)`; return 404 `{ error: "Lesson not found" }` if unknown
    - Call `resetAttempt`; return 200 `{ message: "Attempt counter reset", npm, lessonId, priorCount }`
    - _Requirements: 8.5, 8.6, 8.7, 8.8_

  - [x] 3.5 Create `backend/server.js` — Express entry point
    - Import express, cors, routes; apply `express.json()` middleware
    - Mount: `/api/auth` → auth router, `/api/attempts` → attempts router, `/api/results` → results router, `/api/admin` → admin router
    - Serve `index.html` and `src/` as static files for development; catch-all `GET *` returns `index.html`
    - `app.listen(process.env.PORT || 3000)`; throw at startup if `JWT_SECRET` not set
    - _Requirements: 10.2, 10.5_

- [x] 4. Checkpoint — backend API runnable
  - Start the server (`node backend/server.js`) and verify all endpoints respond with correct status codes. Seed at least one student (`--role student`) and one instructor (`--role instructor`) account using `backend/seed.js`. Ensure all tests pass; ask the user if questions arise.

- [x] 5. Extract lesson data into `src/lessons.js`
  - [x] 5.1 Copy the `LESSONS` array verbatim from `NetWatch_V1.0.1.html` into `src/lessons.js`
    - Include topology templates (`TOPOLOGIES`), incident timelines (`INCIDENTS`), diagnosis questions, hints, correct answers
    - Export: `LESSONS`, `DEVICE_TYPES`, `BASELINE`, `TOPOLOGIES`, `INCIDENTS`, `COURSES`, `SKILLS`, `getSimulationConfig(lesson)`
    - `SKILLS` array documented in Task 16; include it here as a stub initially, fill out in Task 16
    - No runtime logic — pure data module
    - _Requirements: 10.1, 11.1_

- [x] 6. Extract simulation engine into `src/engine.js`
  - [x] 6.1 Copy all engine functions verbatim from `NetWatch_V1.0.1.html` into `src/engine.js`
    - Include: `tick(state)`, all helpers it calls, incident stage definitions, telemetry easing formulas, per-device advance functions, alert generation logic, log generation logic, packet feed generation logic
    - Remove any `document.*` calls, `localStorage` reads/writes, and any references to `currentMode`, `sessionToken`, or auth/mode variables
    - Export: `lerp`, `clamp`, `noise`, `computeHealth`, `createInitialState`, `resetState`, `findNode`, `findLink`, `pushAlert`, `pushLog`, `tick`
    - Import `LESSONS`, `TOPOLOGIES`, `INCIDENTS` from `./lessons.js` instead of defining them inline
    - _Requirements: 9.1, 9.4, 10.1_

  - [x] 6.2 Static smoke test — grep engine.js for forbidden references
    - Write a test that reads `src/engine.js` as text and asserts zero matches for: `currentMode`, `sessionToken`, `instructorToken`, `localStorage`, `sessionStorage`, `document\.`
    - This test MUST pass before any integration work begins
    - _Requirements: 9.4_

  - [x]* 6.3 Write property test for engine mode-independence (Property 11)
    - **Property 11: Simulation engine output is mode-independent**
    - For any valid initial `state` and any tick count N (1–30, generated by fast-check), running `tick(state)` N times must produce identical `state.topo.nodes[*].cur` telemetry, `state.alerts`, and `state.packets` regardless of any mode variable — because `tick()` never reads any mode variable
    - **Validates: Requirements 9.1, 9.4**

  - [x]* 6.4 Write property test for tick exception isolation (Property 12)
    - **Property 12: Tick exception isolation**
    - For any device that throws during its advancement step (inject fault via mock), all other devices must still update and `tick()` must not re-throw to the caller
    - **Validates: Requirements 9.2**

- [x] 7. Create `src/renderers/` — per-view render functions
  - [x] 7.1 Create `src/renderers/overview.js`
    - Extract stat-bar and summary-card render logic into exported functions: `renderStatBar(state)`, `renderDeviceGrid(state)`
    - Export `HEALTH_COLOR` constant used by other renderers
    - Add `data-metric-key` attributes on each `.sc` div and `.dm-card` div
    - _Requirements: 3.2, 10.1_

  - [x] 7.2 Create `src/renderers/topology.js`
    - Extract and export `renderTopologySVG(state)`, `renderTopologyColors(state)`
    - Topology nodes use `data-node-id` and `data-explain-key` attributes; no inline onclick
    - _Requirements: 3.1, 10.1_

  - [x] 7.3 Create `src/renderers/alerts.js`
    - Extract and export `renderAlerts(state)`
    - Add `data-level` to each `.alert-item` element for explain-panel keying
    - _Requirements: 3.3, 10.1_

  - [x] 7.4 Create `src/renderers/packets.js`
    - Extract and export `renderPackets(state, packetFilter)` supporting `'all'`, `'flagged'`, or protocol filters
    - Add `data-proto` to each `<tr>` element for explain-panel keying
    - _Requirements: 3.4, 10.1_

  - [x] 7.5 Create `src/renderers/charts.js`
    - Extract all Chart.js chart creation and update logic into exported functions: `initCharts()`, `updateCharts(state)`
    - Wraps `window.Chart` from CDN
    - _Requirements: 10.1_

  - [x] 7.6 Create `src/renderers/logs.js`
    - Extract log console render logic into exported `renderLogs(state)`
    - Include non-colour prefix labels for accessibility
    - _Requirements: 10.1_

- [x] 8. Create `src/auth.js` — in-memory session state
  - [x] 8.1 Implement module-level private variables and exported getter/setter API
    - Private vars: `_sessionToken`, `_instructorToken`, `_currentMode`, `_studentName`, `_studentNPM` — all initialised to `null`
    - Exported: `setStudentSession(token, name, npm, mode)`, `getSessionToken()`, `getCurrentMode()`, `getStudentName()`, `getStudentNPM()`, `clearStudentSession()`
    - Exported: `setInstructorToken(token)`, `getInstructorToken()`, `clearInstructorToken()`
    - Register `window.addEventListener('beforeunload', clearStudentSession)` inside module init (guard with `typeof window !== 'undefined'`)
    - No writes to `localStorage`, `sessionStorage`, or cookies
    - _Requirements: 4.4, 10.5_

  - [x]* 8.2 Write property test for token never written to Web Storage (Property 8)
    - **Property 8: Student session token is never written to Web Storage**
    - For any arbitrary token string, calling `setStudentSession(token, ...)` must result in zero occurrences of that token string in `localStorage` and `sessionStorage`
    - **Validates: Requirements 4.4, 10.5**

- [x] 9. Create `src/api.js` — fetch wrappers for all backend endpoints
  - [x] 9.1 Implement `login(npm, password)` → POST /api/auth/login
    - Returns `{ ok: true, token, name, role }` on 200; `{ ok: false, status: 401, error }` on 401; `{ ok: false, status: 0, error }` on network error
    - _Requirements: 4.3, 4.5, 4.6_

  - [x] 9.2 Implement `startAttempt(lessonId)` → POST /api/attempts
    - Reads token from `auth.getSessionToken()`; sends `Authorization: Bearer {token}`
    - Returns `{ ok: true, allowed, attemptsUsed, attemptLimit }` on 200; `{ ok: false, error }` on 401/5xx/network
    - _Requirements: 5.2, 5.3_

  - [x] 9.3 Implement `recordResult(lessonId, outcome)` → POST /api/results with single auto-retry
    - On first failure, waits 500 ms and retries once; returns `{ ok: true, id, recordedAt }` or `{ ok: false, error }` after both attempts
    - _Requirements: 7.1, 7.3_

  - [x] 9.4 Implement `getResults(npm, lessonId)` → GET /api/results
    - Returns `{ ok: true, results: [...] }` on 200; `{ ok: false, error }` on failure
    - _Requirements: 7.4_

  - [x] 9.5 Implement `getAllResults()` → GET /api/results/all
    - Reads instructor token from `auth.getInstructorToken()`
    - Returns `{ ok: true, results: [...] }` on 200; `{ ok: false, status: 403 }` on 403
    - _Requirements: 7.5_

  - [x] 9.6 Implement `adminReset(npm, lessonId)` → POST /api/admin/reset
    - Reads instructor token from `auth.getInstructorToken()`
    - Returns `{ ok: true, ... }` on 200; `{ ok: false, status: 403 }` on 403; `{ ok: false, status: 404 }` on 404
    - _Requirements: 8.5, 8.7_

  - [x] 9.7 Implement `loginInstructor(username, password)` → POST /api/auth/login (instructor path)
    - Sends `{ username, password, role: "instructor" }`; returns same shape as `login()`
    - Used exclusively by the Admin Reset instructor-login sub-form
    - _Requirements: 8.2, 8.3_

- [x] 10. Checkpoint — module layer complete
  - Verify `src/engine.js` imports cleanly from `src/lessons.js` and that the smoke test in task 6.2 passes. Confirm `src/auth.js` and `src/api.js` have no syntax errors. Ensure all tests pass; ask the user if questions arise.

- [x] 11. Implement pure utility functions (independently testable)
  - [x] 11.1 Implement `validateLoginForm(npm, password)` in `src/utils.js`
    - Input: `{ npm: string, password: string }`
    - NPM rule: matches `/^\d{1,20}$/`; else `npmErr = "NPM must be 1–20 digits"`
    - Password rule: trimmed length ≥ 1; else `passwordErr = "Password is required"`
    - Returns `{ ok: boolean, npmErr: string|null, passwordErr: string|null }`
    - No side effects — pure function
    - _Requirements: 4.2_

  - [x]* 11.2 Write property test for NPM validation (Property 1)
    - **Property 1: NPM validation rejects all non-digit and out-of-range inputs**
    - For any string not matching `/^\d{1,20}$/` (generated by fast-check), `validateLoginForm(npm, "pass")` must return `{ ok: false }` with non-null `npmErr`
    - **Validates: Requirements 4.2**

  - [x] 11.3 Implement `formatWelcomeName(name)` in `src/utils.js`
    - If `name` is falsy or empty string, return `"Student"`
    - If `name.length <= 50`, return `name` unchanged
    - If `name.length > 50`, return `name.slice(0, 50) + "…"`
    - Pure function, no side effects
    - _Requirements: 4.8_

  - [x]* 11.4 Write property test for welcome name truncation (Property 13)
    - **Property 13: Welcome name truncation**
    - For any string of arbitrary length, `formatWelcomeName(name)` must return a string of at most 51 characters (50 + "…"), and must never truncate a name of ≤ 50 characters
    - **Validates: Requirements 4.8**

  - [x] 11.5 Implement `validateAdminResetForm(npm, lessonId)` in `src/utils.js`
    - Returns `{ ok: boolean, npmErr: string|null, lessonIdErr: string|null }`
    - Each field: empty or whitespace-only → field-specific error; non-empty non-whitespace → null error
    - Pure function, no side effects
    - _Requirements: 8.4_

  - [x]* 11.6 Write property test for Admin Reset form validation (Property 2)
    - **Property 2: Admin Reset form rejects all whitespace/empty inputs**
    - For any string that is empty or whitespace-only (generated by fast-check), `validateAdminResetForm(npm, lessonId)` with that string as either field must return `{ ok: false }` with a non-null error for that field
    - **Validates: Requirements 8.4**

- [x] 12. Build `index.html` — markup and CSS
  - [x] 12.1 Copy all CSS and markup from `NetWatch_V1.0.1.html` into `index.html`
    - Retain all existing CSS variables, panel/card primitives, simulation layout, modal styles, topbar
    - Remove all `<script>` blocks — `index.html` must have zero inline script
    - Add `<script type="module" src="src/app.js"></script>` as the only script tag (CDN scripts such as Chart.js are permitted)
    - _Requirements: 10.1_

  - [x] 12.2 Add landing page markup (`#screen-landing`)
    - Two CTA buttons in `.landing-cta`: `#btn-learn-tool` (`onclick="proceedToTeach()"`) and `#btn-take-scenario` (`onclick="proceedToLessons()"`)
    - Each button has a short description (≤ 30 words) explaining what the student will experience — no separate mode-select modal
    - Two `.landing-mode-card` divs in the landing body explaining Teach Mode and Quiz Mode
    - _Requirements: 1.1_

  - [x] 12.3 Add shared select screen markup (`#screen-select`)
    - One `#lesson-grid` (Quiz path, initially visible) and one `#skill-grid` (Teach path, initially `display:none`) inside `#screen-select`
    - "← Home" button that calls `goToLanding()` for back navigation from both select screens (Req 1.6, 1.7)
    - "Admin Reset" ghost button in `.select-footnote` (Req 8.1)
    - _Requirements: 1.2, 1.3, 1.6, 1.7, 8.1_

  - [x] 12.4 Add login, blocked-attempt, and admin-reset modal markup
    - `#modal-login`: NPM field (`#login-npm`, `inputmode="numeric"`, `maxlength="20"`), password field (`#login-password`), inline error divs (`#login-npm-err`, `#login-password-err`, `#login-general-err`), back button (`onclick="backFromLogin()"`), submit button
    - `#modal-blocked`: `#blocked-identity`, `#blocked-best-result`, back button (`onclick="exitSimulation()"`), "Admin Reset…" ghost button (`onclick="openAdminReset()"`)
    - `#modal-admin-reset`: instructor-login sub-form (`#ar-instructor-form`) and reset sub-form (`#ar-reset-form`) with NPM + lessonId fields, per-field error divs, `#ar-success`
    - _Requirements: 4.1, 5.4, 8.1, 8.2, 8.3_

  - [x] 12.5 Add Self-Check modal markup (`#modal-selfcheck`)
    - Contains: `#sc-tier-badge` (e.g. "RECALL 1/3"), `#sc-prompt`, `#sc-reading-instruction` (hidden by default), `#sc-options`, `#sc-result`, `#sc-next-btn` ("Next Question →" / "Finish ✓"), Skip button (`onclick="selfCheckSkip()"`)
    - `z-index` above the simulation panels; initially hidden
    - _Requirements: 11.4_

  - [x] 12.6 Add Explain Panel markup and CSS
    - `<div id="explain-panel" class="explain-panel hidden" role="dialog" aria-label="Element Explanation">` with `#ep-title`, `#ep-body`, close button (`onclick="closeExplainPanel()"`)
    - CSS: `position: fixed; right: 0; top: 52px; bottom: 0; width: 320px;` plus background, border, z-index
    - Quiz Mode affordance-suppression rules: `body.quiz-mode .dm-card, body.quiz-mode .sc, body.quiz-mode .alert-item, body.quiz-mode .packet-table tr, body.quiz-mode .topo-node { cursor: default !important; }`
    - _Requirements: 3.1–3.8, 6.2_

  - [x] 12.7 Add topbar mode badge, welcome name elements, and lesson bar buttons
    - `<div id="topbar-mode-badge" class="mode-badge hidden">` and `<span id="topbar-welcome" class="hidden">` inside existing `.topbar`
    - Lesson bar: `#btn-diagnose` ("🩺 Diagnose") shown in Quiz Mode; `#btn-selfcheck` or use `openSelfCheck()` call in Teach Mode (self-check button replaces diagnose in Teach, per Req 11.3)
    - _Requirements: 1.4, 1.5, 4.8, 11.3_

- [x] 13. Create `src/explain-content.js` — Explain Panel content lookup
  - [x] 13.1 Implement the `EXPLAIN_CONTENT` lookup object
    - Keyed object covering all namespaces: `device:{type}` (6 device types), `metric:{name}` (all metrics shown in UI), `alert:{level}` (critical, warning, info), `proto:{protocol}` (TCP, UDP, ICMP, DNS, ARP, STP), plus `fallback`
    - Each entry has `{ title: string, body: string }`
    - Pure data module — no DOM, no runtime logic; exported separately so tests can import without DOM side effects
    - _Requirements: 3.1–3.8_

  - [x]* 13.2 Write property test for Explain Panel fallback (Property 4)
    - **Property 4: Explain Panel fallback for unknown keys**
    - For any string not present in `EXPLAIN_CONTENT` (generated by fast-check), the fallback entry must provide a non-empty title and body
    - **Validates: Requirements 3.8**

  - [x]* 13.3 Write property test for Explain Panel key determinism (Property 3)
    - **Property 3: Explain Panel content is keyed by type, not live value**
    - Two calls with the same key must produce identical `title` and `body` regardless of any other state
    - **Validates: Requirements 3.7**

- [x] 14. Implement `src/app.js` — entry point, screen router, modal logic, explain panel
  - [x] 14.1 Implement landing-page navigation functions
    - `proceedToTeach()`: set `nw_intro_seen` in sessionStorage, hide `#screen-landing`, show `#skill-grid` (set `lesson-grid` display `none`, `skill-grid` display `''`), remove `hidden` from `#screen-select`
    - `proceedToLessons()`: set `nw_intro_seen`, hide `#screen-landing`, call `showLessonSelectScreen()` (lesson-grid visible, skill-grid hidden)
    - `goToLanding()`: stop timers, clear student/instructor session, reset all topbar indicators, close modals/explain panel, hide `#app` and `#screen-select`, show `#screen-landing`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7_

  - [x] 14.2 Implement `exitSimulation()` — mode-branched back navigation
    - Capture `getCurrentMode()` before calling `clearStudentSession()` (which nulls the mode)
    - Call `teardownSelfCheck()`, stop timers, clear session state, remove `body.quiz-mode`, hide topbar indicators, close explain panel and all modals, remove `active` from `#app`
    - If captured mode === `'teach'` → call `showSkillSelectScreen()` (skill-grid visible, lesson-grid hidden)
    - Otherwise (quiz or null) → call `showLessonSelectScreen()` (lesson-grid visible, skill-grid hidden)
    - _Requirements: 1.4, 2.1, 2.6_

  - [x] 14.3 Implement explain panel functions
    - `showExplainPanel(key)`: guard `if (getCurrentMode() !== 'teach') return;`; look up `EXPLAIN_CONTENT[key] || EXPLAIN_CONTENT['fallback']`; set `#ep-title`, `#ep-body`; remove `hidden` from `#explain-panel`
    - `closeExplainPanel()`: add `hidden` class to `#explain-panel`
    - Register `keydown` Escape listener for `closeExplainPanel()`
    - `attachExplainListeners()`: guard against double-attach with a module-level flag; register delegated listeners on stat bar, topology SVG, alert list, packet table, chart panels, metrics tab
    - Export `isExplainListenersAttached()` and `resetExplainListenersFlag()` for test introspection
    - _Requirements: 3.1–3.8, 6.1_

  - [x]* 14.4 Write property test for Explain Panel suppression in Quiz Mode (Property 5)
    - **Property 5: Explain Panel is suppressed for all element types in Quiz Mode**
    - For any content key, when `getCurrentMode()` returns `"quiz"`, calling `showExplainPanel(key)` must leave `#explain-panel` with the `hidden` class
    - **Validates: Requirements 6.1**

  - [x] 14.5 Implement Login Screen flow
    - `submitLogin()`: read NPM + password; call `validateLoginForm`; show field-specific errors and return if invalid; call `api.login(npm, password)`; on 200 call `auth.setStudentSession(token, name, npm, "quiz")`; proceed to `startAttemptGate()`; on 401 show `"Invalid NPM or password"` without indicating which field failed; on network/non-401 error retain NPM field value and show inline error
    - `backFromLogin()`: clear form fields and errors, close `modal-login`, call `showLessonSelectScreen()` — returns to Lesson Select screen (not landing)
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7_

  - [x] 14.6 Implement Attempt Gate flow
    - `startAttemptGate()`: call `api.startAttempt(pendingLessonId)`; on `allowed: true` call `launchSimulation()`; on `allowed: false` call `showBlockedScreen()`; on network/5xx show inline error without loading the simulation
    - `showBlockedScreen()`: populate `#blocked-identity` with student name + NPM; call `api.getResults(npm, lessonId)` and display first correct result (outcome + ISO 8601 timestamp) if present; show `#modal-blocked`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 7.4_

  - [x]* 14.7 Write property test for attempt counter independence (Property 9)
    - **Property 9: Attempt counters are independent across (student, lesson) pairs**
    - For any two distinct `(npm, lessonId)` pairs, incrementing the counter for one (with mocked db) must not change the counter value for the other
    - **Validates: Requirements 5.6**

  - [x] 14.8 Implement Admin Reset flow
    - `openAdminReset()`: clear all form fields and errors; if `auth.getInstructorToken()` present → show `#ar-reset-form`; else show `#ar-instructor-form`; open `modal-admin-reset`
    - `submitInstructorLogin()`: call `api.loginInstructor(username, password)`; on success store instructor token with `setInstructorToken()`, switch to `#ar-reset-form`; on 401 show `"Invalid credentials"`; on error show generic message
    - `submitAdminReset()`: call `validateAdminResetForm`; show field errors and return if invalid; call `api.adminReset(npm, lessonId)`; on 200 show confirmation with NPM and lessonId; on 403 show instructor-auth error and clear token; on 404 show `"Lesson ID not recognised."`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 10.5_

  - [x] 14.9 Implement result recording functions
    - `recordQuizResult(lessonId, outcome)`: guard `if (getCurrentMode() !== 'quiz' || !getStudentNPM()) return;`; call `api.recordResult(lessonId, outcome)` (which retries once on failure); on final failure show inline error inside Diagnosis Modal without closing it
    - `recordTeachProgress(lessonId, correct)`: guard `if (getCurrentMode() !== 'teach') return;`; write `{ lessonId, attempted: true, correct, lastTs: ISO8601 }` to `localStorage` key `nw_teach_{lessonId}` (key contains only lessonId — no NPM or name); catch storage errors silently
    - _Requirements: 2.3, 2.4, 7.1, 7.3_

  - [x]* 14.10 Write property test for Teach Mode localStorage key schema (Property 7)
    - **Property 7: Teach progress key never contains student identity**
    - For any `lessonId` string, the key written by `recordTeachProgress` must match exactly `nw_teach_{lessonId}` and must not contain any NPM or name string
    - **Validates: Requirements 2.4, 10.3**

  - [x]* 14.11 Write property test for result records append-only (Property 10)
    - **Property 10: Result records are append-only**
    - For any N consecutive calls to the backend `POST /api/results` handler (with mocked db), the mock must receive exactly N `insertResult` calls and zero `UPDATE` or `DELETE` calls
    - **Validates: Requirements 7.2**

  - [x] 14.12 Implement Diagnosis Modal — mode-aware result display
    - In `submitDiagnosis()`: show correct/incorrect result in `#diag-result` for all modes
    - In Quiz Mode (`mode === 'quiz' && npm`): dynamically append a styled `<div>` to `#diag-result` showing `Student: {name} · NPM: {npm}`; call `recordQuizResult()`
    - In Teach Mode: call `recordTeachProgress()`; the full explanation is already rendered in `#diag-result` on submit — no separate auto-show step required; no scoring display; no attempt counter shown
    - _Requirements: 2.5, 5.7_

  - [x] 14.13 Implement hint logic for Teach vs Quiz modes
    - `nextHint()`: in Quiz Mode, after the first hint is shown, disable and hide the "Next Hint" button (only one hint available); in Teach Mode, all hints are revealable one by one with no cap
    - _Requirements: 1.8, 1.9, 2.5_

  - [x]* 14.14 Write property test for hint exhaustion / suppression (Property 14)
    - **Property 14: Hint exhaustion in Teach Mode / suppression in Quiz Mode**
    - For any lesson with N hints (N generated by fast-check, 1–10): in Teach Mode, N reveal actions must show all N hints; in Quiz Mode, N reveal actions must leave visible hint count at exactly 1
    - **Validates: Requirements 1.8, 1.9**

  - [x] 14.15 Wire delegated event listeners on simulation root
    - One listener on `#topo-svg`: reads `data-node-id` and `data-explain-key`; in Teach Mode calls `showExplainPanel(key)`; in Quiz Mode calls `openDeviceDetail(nodeId)` (existing modal)
    - One listener on `#stat-bar`: reads `data-metric-key` from `.sc`; calls `showExplainPanel('metric:' + key)`
    - One listener on `#alert-list`: reads `data-level` from `.alert-item`; calls `showExplainPanel('alert:' + level)`
    - One listener on `#packet-table-body`: reads `data-proto` from `tr`; calls `showExplainPanel('proto:' + proto)`
    - One listener on `#pane-overview`: reads `data-metric-key` from `.chart-panel`; calls `showExplainPanel('metric:' + key)`
    - One listener on `#pane-metrics`: reads `data-metric-key` from `.metric-row`; calls `showExplainPanel('metric:' + key)`
    - All listeners registered through `attachExplainListeners()` with idempotency guard
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.3_

  - [x] 14.16 Implement `launchSimulation()` and `startClock()`
    - `launchSimulation(lessonId)`: set `body.quiz-mode` class (Quiz) or remove it (Teach); set topbar mode badge text ("TEACH"/"QUIZ") and apply appropriate CSS class; set `#topbar-welcome` text via `formatWelcomeName(getStudentName())`; hide welcome in Teach Mode; close all modals; show `#app`; call `attachExplainListeners()` (Teach only); start tick loop and clock; open Self-Check automatically for Teach Mode if a pending skill is set
    - `startClock()`: populate `#clock` with wall-clock time, update every second
    - _Requirements: 1.4, 1.5, 2.1, 4.8_

  - [x]* 14.17 Write property test for Teach Mode making no API calls (Property 6)
    - **Property 6: Teach Mode makes no backend API calls for any lesson**
    - For any lessonId, a full Teach Mode session with all `api.js` functions replaced by spies must result in zero spy invocations for attempt, result, or auth endpoints
    - **Validates: Requirements 2.2, 2.3, 10.3**

- [x] 15. Create `src/self-check.js` — three-question self-check module (Req 11)
  - [x] 15.1 Implement `startSelfCheck(skill, callbacks)` and public API
    - Safe to call multiple times — tears down any in-progress check first
    - Reads `skill.selfCheck[]` (3 questions in tier order: recall → reading → synthesis)
    - Opens `#modal-selfcheck`, renders first question
    - Exports: `startSelfCheck(skill, callbacks)`, `isSelfCheckActive()`, `teardownSelfCheck()`, `selfCheckNext()`, `selfCheckSkip()`
    - Callbacks shape: `{ onComplete(skillId), onQuestionResult(skillId, questionId, correct) }` — both optional
    - `teardownSelfCheck()`: detach reading-tier listener, reset state, hide `#modal-selfcheck`; called by `exitSimulation()` and Skip button
    - _Requirements: 11.4, 11.5_

  - [x] 15.2 Implement recall and synthesis tier rendering (MCQ)
    - Render option divs in `#sc-options` with `data-idx`; delegated click on container calls `_handleMcqClick()`
    - `_handleMcqClick()`: compare `chosenIdx === q.correctIndex`; style all options correct/wrong; show result in `#sc-result`; enable `#sc-next-btn`; fire `onQuestionResult` callback
    - Immediate feedback after selection; "Next Question →" / "Finish ✓" label on `#sc-next-btn`
    - _Requirements: 11.6_

  - [x] 15.3 Implement reading tier — click-to-answer
    - Hide `#sc-options`, show `#sc-reading-instruction` with `q.prompt`
    - Attach a capture-phase `document.addEventListener('click', handler)` that checks `e.target.closest(q.targetSelector)`; on match: mark correct, detach handler, show result, fire callback
    - Separate scoped listener — does NOT open the Explain Panel as a side effect
    - _Requirements: 11.6_

  - [x] 15.4 Implement completion and `completedSkills` badge update
    - When `_idx` advances past the last question, call `_finish()`: set `_active = false`, detach listener, hide modal, fire `onComplete(skillId)` callback
    - In `app.js`, `openSelfCheck()` provides `onComplete` callback that adds skillId to the exported `completedSkills` Set and calls `renderSkillSelect()` to show "✓ COMPLETE" badge on the skill card
    - `completedSkills` Set is held in memory only — not persisted to backend or localStorage
    - _Requirements: 11.7_

  - [x]* 15.5 Write data shape tests for SKILLS.selfCheck (self-check.test.js)
    - Every SKILLS entry must have a `selfCheck` array with exactly 3 entries
    - Tier order must be exactly `['recall', 'reading', 'synthesis']`
    - Reading-tier questions: non-empty `targetSelector`, must NOT have `options` or `correctIndex`
    - Recall/synthesis questions: `options` array ≥ 2 entries, valid `correctIndex`, each option has non-empty `id` and `text`
    - Every skill has a non-empty `lessonRefs` array
    - **Validates: Requirements 11.8**

  - [x]* 15.6 Write module behaviour tests for `src/self-check.js`
    - `isSelfCheckActive()` is false before `startSelfCheck()` is called
    - `startSelfCheck()` sets active to true; `teardownSelfCheck()` sets it to false
    - Advancing to reading tier attaches exactly 1 document click listener; `teardownSelfCheck()` removes it
    - `onComplete` fires after all 3 questions are advanced through
    - `api.recordResult` is NEVER called by any self-check code path
    - **Validates: Requirements 11.5_

- [x] 16. Populate SKILLS data in `src/lessons.js` (Req 11)
  - [x] 16.1 Define the `SKILLS` array with all four skill entries
    - Each skill has: `id`, `title`, `body` (describes what the skill teaches and which panel it targets), `targetPanel` (`'topology' | 'charts' | 'alerts' | 'packets'`), `lessonRefs` (array of lesson titles where this skill is relevant), `selfCheck` (3-question array)
    - Required skills: `read_topology`, `read_charts`, `read_alerts`, `read_packets`
    - _Requirements: 11.1_

  - [x] 16.2 Write `selfCheck` questions for each skill (3 per skill, in tier order: recall → reading → synthesis)
    - Recall tier: multiple-choice question about a concept visible in the target panel; `options[]`, `correctIndex`, `explanation`
    - Reading tier: `prompt` instruction to click a specific element; `targetSelector` (CSS selector matching the element in the live simulation panel); `explanation`; no `options` or `correctIndex`
    - Synthesis tier: multiple-choice question requiring cross-panel reasoning; `options[]`, `correctIndex`, `explanation`
    - All `prompt` and `explanation` fields must be non-empty; no TODO placeholders
    - _Requirements: 11.6, 11.8_

- [x] 17. Static smoke test suite
  - [x] 17.1 Write static grep test: `engine.js` contains no auth/mode references
    - Read `src/engine.js` as text; assert zero matches for `/currentMode|sessionToken|instructorToken|localStorage|sessionStorage|document\./`
    - _Requirements: 9.4_

  - [x] 17.2 Write static grep test: frontend contains no plaintext passwords
    - Read all files in `src/` as text; assert zero matches for hardcoded password constant patterns
    - _Requirements: 8.9, 10.5_

  - [x] 17.3 Write static test: `backend/constants.js` exports `ATTEMPT_LIMIT === 3`
    - Import `{ ATTEMPT_LIMIT }` from `backend/constants.js`; assert `ATTEMPT_LIMIT === 3`
    - _Requirements: 5.1_

- [ ] 18. Resolve lesson content TODOs in `src/lessons.js`
  - All four affected lessons have TODO placeholders in both their `concept` step body and their `watchFor` step body. Each pair must be replaced with real educational content before the lesson is usable in Teach Mode.

  - [ ] 18.1 Replace placeholder content in `gpu_thermal` lesson steps
    - `concept` body: explain thermal throttling, how GPUs reduce clock speed when temperature crosses safe thresholds, and why that creates a bottleneck in distributed training jobs where all nodes must stay in sync
    - `watchFor` body: describe the pattern — GPU util spike followed by a drop-back, temperature climb, then latency rise on the SCHED↔GPU-NODE link — that distinguishes throttling from a network or storage fault
    - _Requirements: 5.1 (complete lesson data)_

  - [ ] 18.2 Replace placeholder content in `internal_overload` lesson steps
    - `concept` body: explain NAT connection-tracking tables, why connection *count* (not bandwidth) exhausts them, and how an internal host can overload a gateway without generating unusual WAN traffic volume
    - `watchFor` body: describe how to distinguish internal-origin overload from an inbound DDoS — specifically the calm ISP-link traffic metric paired with rising GW-1 cpu and packet evidence pointing to a single internal IP
    - _Requirements: 5.1 (complete lesson data)_

  - [ ] 18.3 Replace placeholder content in `web_leak` lesson steps
    - `concept` body: explain what a memory leak is, why memory rises steadily without a traffic cause, and how eventual swap usage drags CPU and response latency down as a secondary effect
    - `watchFor` body: describe the ordering — memory rising first while traffic is flat, then cpu climbing only once memory is nearly exhausted — that distinguishes a leak from load-driven or network-driven causes
    - _Requirements: 5.1 (complete lesson data)_

  - [ ] 18.4 Replace placeholder content in `loop_storm` lesson steps
    - `concept` body: explain Layer-2 switching loops, why Ethernet has no TTL (unlike IP), how a single looped cable causes broadcast frames to circulate forever, and what Spanning Tree Protocol does to prevent this
    - `watchFor` body: describe the pattern — SW-1 traffic and cpu hitting limits while GW-1/SRV-WEB-1 stay healthy, and all downstream workstations degrading in unison — that localises the fault to the switch layer
    - _Requirements: 5.1 (complete lesson data)_

- [ ] 19. Final checkpoint — full two-tier integration verified
  - Run `npm test` — all property tests, unit tests, and smoke tests must pass. Start the server and verify in browser: landing → "Learn the tool" → Skill Select (no login); skill card → Teach Mode simulation → Self-Check opens → ✓ COMPLETE badge appears on skill card after completion; landing → "Take a scenario" → Lesson Select → lesson card → Login → Attempt Gate → simulation; attempt limit blocks at 3 with blocked screen; Explain Panel opens on click in Teach Mode; Explain Panel does NOT open in Quiz Mode; Admin Reset resets counter without touching result records; `GET /api/results/all` requires instructor token. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional property tests; all core implementation tasks are unmarked
- **Mode is chosen at the landing page** — "Learn the tool" goes to Skill Select (Teach), "Take a scenario" goes to Lesson Select (Quiz). There is no per-lesson mode-select modal
- Both select screens share `#screen-select`; `#skill-grid` and `#lesson-grid` are toggled by `display` style
- `exitSimulation()` branches on mode: teach → `showSkillSelectScreen()`, quiz/null → `showLessonSelectScreen()`
- `backFromLogin()` returns to Lesson Select screen (calls `showLessonSelectScreen()`), not to the landing page
- `goToLanding()` is the universal "go home" function; called by the "← Home" button on the select screen and by the topbar logo
- The simulation engine (`src/engine.js`) is extracted verbatim — no logic is modified. Smoke test 17.1 enforces this mechanically
- No plaintext password exists in the frontend at any point. Smoke test 17.2 enforces this
- Property tests use fast-check with a minimum of 100 iterations. Tag format: `// Feature: teach-quiz-mode, Property {N}: {property_text}`
- `completedSkills` is a module-level exported `Set` in `app.js`; it is held in memory only — not persisted
- The `beforeunload` handler in `src/auth.js` clears the student session token from memory on tab close
- The reading-tier self-check listener is a separate capture-phase listener on `document` — it does NOT trigger the Explain Panel as a side effect

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "5.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "6.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "6.4", "8.1"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "8.2", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7"] },
    { "id": 5, "tasks": ["11.1", "11.3", "11.5", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "13.1"] },
    { "id": 6, "tasks": ["11.2", "11.4", "11.6", "13.2", "13.3", "14.1", "14.3"] },
    { "id": 7, "tasks": ["14.4", "14.5", "14.6", "14.8", "14.12", "14.13", "14.15", "14.16", "15.1", "16.1"] },
    { "id": 8, "tasks": ["14.2", "14.7", "14.9", "14.10", "14.11", "14.14", "14.17", "15.2", "15.3", "15.4", "16.2"] },
    { "id": 9, "tasks": ["15.5", "15.6", "17.1", "17.2", "17.3"] },
    { "id": 10, "tasks": ["18.1", "18.2", "18.3", "19"] }
  ]
}
```
