# Requirements Document

## Introduction

This feature extends NetWatch — previously a self-contained single-file HTML simulator — into a two-tier application with a proper backend, real authentication, and centralized result storage, while adding two operating modes: Teach Mode and Quiz Mode.

In Teach Mode, every interactive element exposes an explanatory panel describing what the metric or component represents and why it matters for diagnosis. There are no scores, no attempt limits, and no login required. Students enter Teach Mode via the "Learn the tool" path on the landing page, which leads to a skill-selection screen rather than the lesson list.

In Quiz Mode, the scored simulation + diagnosis-question flow is retained, but is now gated by real student authentication, a server-enforced per-lesson attempt counter, and an instructor-authenticated reset that restores attempt credit without erasing a previously recorded result. Students enter Quiz Mode via the "Take a scenario" path on the landing page, which leads directly to the lesson list.

Mode is chosen at the landing page level — before any lesson or skill is selected — not per-lesson via a modal. This is a deliberate design choice: the two paths have genuinely different content (skill-reference cards vs. scenario lesson cards) and different flows (no login vs. login-gated), so presenting them as a single list with a post-selection mode choice creates unnecessary friction and ambiguity.

Student identity, attempts, and results are persisted server-side in a database, not in browser storage. There is no plaintext password gating admin actions — instructor actions require an authenticated instructor session. The frontend is split into modules; simulation logic, rendering, and API communication are separated.

---

## Glossary

- **NetWatch**: The network monitoring education simulator, now split into a frontend (modular JS/HTML/CSS) and a backend (API + database).
- **Lesson**: A predefined scenario (topology template + scripted incident timeline), identified by a unique `lessonId`.
- **Skill**: A panel-reading reference card (topology, charts, alerts, packets), identified by a unique `skillId`. Each skill has a three-question self-check (recall → reading → synthesis).
- **Simulation_Engine**: The existing tick-based engine driving telemetry, topology colour, charts, alerts, logs, and the packet feed. Must not be modified.
- **Teach Mode**: Exploratory mode — no scoring, no attempt limits, no login. Explain_Panels visible. Entered via the "Learn the tool" landing path → Skill select screen.
- **Quiz Mode**: Scored, attempt-limited, identity-tied mode. Explain_Panels suppressed. Entered via the "Take a scenario" landing path → Lesson select screen.
- **Landing Page**: The entry screen presenting two top-level paths: "Learn the tool" (Teach Mode) and "Take a scenario" (Quiz Mode). Mode is decided here, before any lesson or skill is selected.
- **Skill Select Screen**: The Teach Mode entry screen listing Skill cards. Reached via "Learn the tool." No login required.
- **Lesson Select Screen**: The Quiz Mode entry screen listing Lesson/scenario cards. Reached via "Take a scenario." Login is required after selecting a card.
- **Login_Screen**: The Quiz Mode pre-simulation screen that authenticates the student against the backend.
- **Student_Account**: A backend-stored record (NPM, name, hashed password) identifying a student.
- **Instructor_Account**: A backend-stored record (username, hashed password) with permission to view all results and perform Admin_Reset.
- **Session_Token**: A signed JWT or session cookie issued by the backend on successful login, required for all authenticated API calls. The token is held in memory for the duration of the browser session and is cleared when the student navigates away from the simulation or closes the tab.
- **NPM**: The student identification number (digits only, 1–20 digits, leading zeros permitted), used as the student's login identifier and as a key for attempt/result records.
- **Attempt**: One complete run of a lesson simulation in Quiz Mode, ending with a submitted diagnosis answer.
- **Attempt_Counter**: The server-side record (in the database) of how many Attempts a student has used for a given lesson.
- **Attempt_Limit**: The maximum Attempts permitted per student per lesson, defined as a single named constant on the backend (default 3).
- **Diagnosis_Modal**: The end-of-lesson multiple-choice modal where the student selects a root-cause answer (Quiz Mode only).
- **Self_Check**: A three-question ungraded comprehension check attached to each Skill, presented in Teach Mode via the "🎯 Self-Check" button. Not used in Quiz Mode.
- **Result_Record**: The database record of a student's diagnosis submission outcome ("correct" or "incorrect"), including a server-generated ISO 8601 timestamp and the student's NPM and lessonId.
- **Admin_Reset**: The instructor-authenticated action that resets only the Attempt_Counter for a specific student + lesson pair without modifying Result_Records.
- **Explain_Panel**: The fixed side-panel shown in Teach Mode when the student clicks an interactive element, describing what that metric or component represents and why it matters for diagnosis.
- **Sandbox_Drawer**: The existing manual override and test-alert drawer. Behaviour unchanged.
- **API**: The backend's REST endpoints, called from the frontend via a dedicated API client module.

---

## Requirements

### Requirement 1: Mode Entry and Path Separation

**User Story:** As a student or instructor, I want to choose between Teach Mode and Quiz Mode at the landing page before entering any lesson or skill, so that the correct learning or assessment experience is applied from the start.

#### Acceptance Criteria

1. THE landing page SHALL present two clearly labelled top-level paths: "Learn the tool" (Teach Mode) and "Take a scenario" (Quiz Mode), each with a short description (no more than 30 words) explaining what the student will experience.
2. WHEN the student activates the "Learn the tool" path, THE NetWatch SHALL navigate to the Skill Select screen without showing a Login_Screen and without storing a Quiz Mode session.
3. WHEN the student activates the "Take a scenario" path, THE NetWatch SHALL navigate to the Lesson Select screen, where selecting a lesson card proceeds directly to the Login_Screen (Quiz Mode).
4. THE session mode SHALL be set to "teach" when a skill simulation is launched from the Skill Select screen, and to "quiz" when a lesson simulation is launched after successful Quiz Mode login. No separate mode-confirmation step is required.
5. WHEN the simulation is running, THE topbar SHALL display a persistent mode indicator labelled "TEACH" or "QUIZ" for the duration of that session.
6. WHEN the student activates the back action from the Skill Select screen, THE NetWatch SHALL return to the landing page.
7. WHEN the student activates the back action from the Lesson Select screen, THE NetWatch SHALL return to the landing page.
8. WHILE Quiz Mode is active, THE Diagnosis_Modal SHALL NOT surface any hint after the first hint in the hint sequence.
9. WHILE Teach Mode is active, THE Diagnosis_Modal SHALL surface each additional hint when the student requests it, until all hints for the lesson have been displayed.

---

### Requirement 2: Teach Mode — Unrestricted Simulation Access

**User Story:** As a student in Teach Mode, I want to run any lesson an unlimited number of times without any identity capture, so that I can explore the simulation freely.

#### Acceptance Criteria

1. WHEN a student activates a skill card in Teach Mode, THE NetWatch SHALL launch the simulation without showing the Login_Screen and without making any backend authentication call.
2. WHILE Teach Mode is active, THE NetWatch SHALL NOT read, increment, or enforce any Attempt_Counter, and SHALL NOT call any attempt-related API endpoint.
3. WHILE Teach Mode is active, THE NetWatch SHALL NOT transmit to the backend or persist server-side any Result_Record containing or derivable from a student's NPM or name.
4. WHEN a student submits a diagnosis answer in Teach Mode, THE NetWatch SHALL record an anonymous local progress entry in client-side storage under a key derived solely from `lessonId` (containing no NPM or name), indicating whether the diagnosis was attempted and whether the answer was correct, overwriting any prior entry for that `lessonId`.
5. WHILE Teach Mode is active, THE Diagnosis_Modal SHALL present the multiple-choice question, reveal hints one at a time per student request until all available hints are displayed, and automatically display the full explanation immediately after the student submits an answer — with no scoring display and no attempt counter shown.
6. WHEN Teach Mode is confirmed, THE NetWatch SHALL set the session mode to "teach," stored client-side only, and all rendering and gating decisions within that session SHALL be governed by this value.

---

### Requirement 3: Teach Mode — Explanatory Tooltips and Panels

**User Story:** As a student in Teach Mode, I want clicking any interactive element (device nodes, metric cards, alert entries, packet rows) to show an explanation of what that component or metric represents and why it matters for diagnosis, so that I can build conceptual understanding while exploring the simulation.

#### Acceptance Criteria

1. WHILE Teach Mode is active, WHEN the student clicks a topology device node, THE Explain_Panel SHALL appear within 300 ms and SHALL contain a description of what that device type does in a network and what its telemetry metrics indicate about its health.
2. WHILE Teach Mode is active, WHEN the student clicks a metric card (stat bar cells, device-grid cards, chart panels), THE Explain_Panel SHALL appear within 300 ms and SHALL contain a description of what that metric measures, its normal range, and what elevated or degraded values indicate.
3. WHILE Teach Mode is active, WHEN the student clicks an alert-list entry, THE Explain_Panel SHALL appear within 300 ms and SHALL contain a description of the alert category and the investigation steps it implies.
4. WHILE Teach Mode is active, WHEN the student clicks a packet-table row, THE Explain_Panel SHALL appear within 300 ms and SHALL contain a description of the protocol, the direction/flags shown, and what anomalous values in that row suggest.
5. WHILE Teach Mode is active, WHEN the student clicks a second interactive element while an Explain_Panel is already visible, THE Explain_Panel SHALL replace its content in-place, remaining continuously visible with no close/reopen transition, with the 300 ms deadline restarting from the second click.
6. WHILE Teach Mode is active and the Explain_Panel is visible, WHEN the student clicks the explicit close control within the panel or presses the Escape key (regardless of keyboard focus), THE Explain_Panel SHALL close and the simulation SHALL remain on the same screen with all simulation state unchanged.
7. THE Explain_Panel content SHALL be keyed by element type (device type, metric name, alert category, protocol) rather than by the specific live value at the time of click, so that explanations remain consistent and lesson-independent.
8. IF the clicked element has no entry in the Explain_Panel content lookup, THEN THE Explain_Panel SHALL display a non-empty message indicating that no explanation is available for that element, rather than remaining empty or hidden.

---

### Requirement 4: Quiz Mode — Real Student Authentication

**User Story:** As a student entering Quiz Mode, I want to log in with real credentials verified by the backend, so that my attempts and results are reliably tied to my identity and cannot be spoofed by anyone typing my NPM.

#### Acceptance Criteria

1. WHEN a student selects a lesson card on the Lesson Select screen, THE Login_Screen SHALL be presented before the simulation loads.
2. WHEN the student submits the Login_Screen form, THE Login_Screen SHALL validate that the NPM field contains only digit characters (1–20 digits) and that the password field is non-empty; IF either validation fails, THE Login_Screen SHALL display a field-specific inline error and SHALL NOT call the backend.
3. WHEN the student submits a valid Login_Screen form, THE NetWatch SHALL call `POST /api/auth/login` with the NPM and password.
4. IF the backend returns a valid Session_Token, THEN THE NetWatch SHALL store the token in memory (not in localStorage or sessionStorage) and clear it when the student navigates away from the simulation or closes the tab, retrieve the student's name from the authenticated response, and proceed to load the simulation.
5. IF the backend rejects the credentials with a 401 response, THEN THE Login_Screen SHALL display the inline error "Invalid NPM or password" without proceeding, and SHALL NOT indicate whether the NPM or the password was the invalid field.
6. IF the backend call fails with a network error or a non-401 server error, THEN THE Login_Screen SHALL display an inline error indicating the login could not be completed, and SHALL retain the NPM field value so the student does not need to re-enter it.
7. WHEN the student activates the back action on the Login_Screen, THE NetWatch SHALL return to the Lesson Select screen and SHALL clear any partially received token or cached credentials from memory.
8. WHEN the simulation starts after successful authentication, THE topbar SHALL display "Welcome, [Name]" where [Name] is the student's name from the authenticated response, truncated to 50 characters with an ellipsis appended if the name exceeds 50 characters. IF the name is absent or empty in the response, THE topbar SHALL display "Welcome, Student".
9. ⚠️ **Open Question — Account Provisioning**: Whether Student_Accounts are provisioned by instructor pre-creation or by student self-registration is not yet defined. This question MUST be resolved before implementing the account-creation path.

---

### Requirement 5: Quiz Mode — Server-Enforced Attempt Limiting

**User Story:** As an instructor, I want each student's Quiz Mode attempts on a lesson to be limited to a configurable number, so that the assessment retains integrity without repeated tries.

#### Acceptance Criteria

1. THE backend SHALL define `ATTEMPT_LIMIT` as a single named constant (default 3), applied uniformly across all lessons unless a future requirement specifies per-lesson overrides.
2. WHEN an authenticated student selects a lesson in Quiz Mode, THE NetWatch SHALL call `POST /api/attempts` with the Session_Token and `lessonId` before loading the simulation.
3. IF the backend returns `{ allowed: true }`, THE backend SHALL have already incremented and persisted the Attempt_Counter for that student + lesson, and THE NetWatch SHALL proceed to load the simulation.
4. IF the backend returns `{ allowed: false }` because the Attempt_Counter equals or exceeds `ATTEMPT_LIMIT`, THE NetWatch SHALL display a blocked-attempt screen showing the student's name and NPM, the lesson title, and a message stating the attempt limit has been reached, and SHALL NOT load the simulation.
5. IF the `POST /api/attempts` call fails with a network error or server error, THE NetWatch SHALL display an inline error and SHALL NOT load the simulation, so that unconfirmed attempts are never silently consumed.
6. Attempt_Counters are scoped per student + lesson pair; selecting a different lesson causes THE NetWatch to evaluate the Attempt_Counter for that new lesson independently.
7. WHEN a diagnosis is submitted, THE Diagnosis_Modal SHALL display the authenticated student's name and NPM alongside the result.

---

### Requirement 6: Quiz Mode — Suppress Explanatory Tooltips

**User Story:** As an instructor, I want Explain_Panels to be absent in Quiz Mode so that students must reason from simulation evidence alone, without guided explanations.

#### Acceptance Criteria

1. WHILE Quiz Mode is active, THE NetWatch SHALL NOT show an Explain_Panel in response to any click, Enter key press, or Space key press on topology nodes, metric cards, alert entries, or packet rows.
2. WHILE Quiz Mode is active, THE NetWatch SHALL NOT apply any cursor style change, tooltip text, or visible background or border highlight to topology nodes, metric cards, alert entries, or packet rows that would indicate an Explain_Panel is available; all other hover and focus states unrelated to Explain_Panel affordances SHALL remain unchanged.
3. WHILE Quiz Mode is active, WHEN the student activates a topology node, metric card, alert entry, or packet row, THE NetWatch SHALL NOT show an Explain_Panel or any secondary informational response beyond the element's existing non-Explain_Panel behaviour (e.g., the device-detail modal for topology nodes remains available).

---

### Requirement 7: Quiz Mode — Server-Side Result Recording

**User Story:** As an instructor, I want each student's diagnosis submissions stored server-side so that results are trustworthy, centrally viewable, and not dependent on individual browsers.

#### Acceptance Criteria

1. WHEN a student submits a diagnosis answer in Quiz Mode, THE NetWatch SHALL call `POST /api/results` with the Session_Token, `lessonId`, and outcome (`"correct"` or `"incorrect"`).
2. THE backend SHALL persist the submission as a new Result_Record row with a server-generated ISO 8601 timestamp, without overwriting or deleting any prior Result_Record for the same student + lesson pair.
3. IF the `POST /api/results` call fails (network error or non-2xx server response), THE NetWatch SHALL automatically retry the call once; IF the retry also fails, THE NetWatch SHALL display an inline error within the Diagnosis_Modal indicating the result could not be saved, without closing the modal or blocking further navigation.
4. WHILE the attempt limit is reached for a lesson and the blocked-attempt screen is displayed, THE NetWatch SHALL call `GET /api/results?studentId={npm}&lessonId={lessonId}`; IF the response contains at least one Result_Record with outcome `"correct"`, THE NetWatch SHALL display that record's outcome and ISO 8601 timestamp alongside the blocked-attempt message.
5. WHEN an authenticated Instructor_Account calls `GET /api/results/all` with a valid Instructor Session_Token, THE backend SHALL return the full set of Result_Records across all students and lessons.

---

### Requirement 8: Admin Reset — Instructor-Authenticated Attempt Counter Reset

**User Story:** As an instructor, I want to reset a specific student's attempt counter for a specific lesson using my authenticated session, so that I can grant a retry without erasing their recorded result and without any plaintext password in the source.

#### Acceptance Criteria

1. THE Admin_Reset control SHALL be reachable from the Lesson Select screen and the blocked-attempt screen, rendered as a clearly labelled secondary action (not a primary button) that does not interfere with the main student flow.
2. WHEN the Admin_Reset control is activated and no Instructor Session_Token is held in memory, THE NetWatch SHALL present an Instructor_Account login prompt before displaying the Admin_Reset form.
3. WHEN the Admin_Reset control is activated and a valid Instructor Session_Token is held in memory, THE NetWatch SHALL display the Admin_Reset form directly, collecting NPM and lessonId (no password field — the Instructor Session_Token is the authentication credential).
4. IF the NPM or lessonId field is empty or whitespace-only when the Admin_Reset form is submitted, THE NetWatch SHALL display a field-specific inline validation error for each empty field and SHALL NOT call the backend.
5. WHEN the Admin_Reset form is submitted with both fields non-empty, THE NetWatch SHALL call `POST /api/admin/reset` with the Instructor Session_Token, NPM, and lessonId.
6. IF the backend returns a success response, THE backend SHALL have backed up the prior Attempt_Counter value and set the Attempt_Counter to 0 without modifying any Result_Record, and THE NetWatch SHALL display a confirmation message identifying the NPM and lessonId that were reset.
7. IF the backend returns a 403 response because the Session_Token is not an Instructor_Account, THE NetWatch SHALL display a message stating the action requires instructor authentication and SHALL NOT modify any data.
8. IF the backend returns a 404 response because the lessonId does not correspond to a known lesson, THE NetWatch SHALL display "Lesson ID not recognised."
9. There SHALL be no plaintext password constant anywhere in the frontend source that gates this or any other action.

---

### Requirement 9: Simulation Engine Preservation

**User Story:** As a developer, I want the simulation engine's core behaviour to remain unchanged regardless of mode, so that the educational content is consistent between Teach and Quiz modes.

#### Acceptance Criteria

1. WHILE either Teach Mode or Quiz Mode is active, THE Simulation_Engine SHALL produce identical telemetry values, stage transitions, topology colour states, alert entries, log lines, and packet feed rows for the same slider inputs and tick count as it would in the absence of any mode variable.
2. IF telemetry advancement throws an exception for a device during a simulation tick, THEN THE Simulation_Engine SHALL catch that exception, log it to the browser console, and continue advancing all other devices, links, alerts, logs, and the packet feed for that tick without halting.
3. WHILE either Teach Mode or Quiz Mode is active, THE Sandbox_Drawer SHALL remain openable and its manual override sliders, scenario preset buttons, and test-alert injection controls SHALL function identically to their behaviour before this feature was introduced.
4. THE tick function, incident stage definitions, telemetry easing formulas, alert generation, log generation, and packet feed generation SHALL contain no conditional branches or variable reads that depend on the current mode or authentication state; mode and auth state SHALL be readable only from UI rendering and gating code.

---

### Requirement 10: Two-Tier Architecture and Data Handling

**User Story:** As a developer and instructor, I want student data centrally stored and real authentication enforced, so that results are trustworthy and viewable across all students without relying on individual browsers.

#### Acceptance Criteria

1. THE NetWatch frontend SHALL be organised as separate modules — at minimum: lesson data, simulation engine, per-view rendering, auth, and API client — rather than a single inline `<script>` block; the simulation engine module SHALL be identical in logic to the pre-split version.
2. THE NetWatch SHALL include a backend service (Node/Express or equivalent) that exposes the authentication and data-persistence endpoints required by Requirements 4, 5, 7, and 8.
3. Student NPM, name, attempt counts, and result outcomes SHALL be transmitted to and persisted exclusively by the backend; client-side storage SHALL be used only for the anonymous Teach Mode progress entry (Requirement 2.4) and any transient UI state that does not contain student identity.
4. THE NetWatch SHALL require an active network connection to the backend to use Quiz Mode; IF the backend is unreachable when a Quiz Mode action is attempted, THE NetWatch SHALL display an error indicating the backend is unavailable. Teach Mode SHALL remain fully functional offline except that Chart.js charts MAY not render if the CDN is unreachable, and all other simulation functionality SHALL remain operational.
5. No password, secret, or signing key required for authentication or admin actions SHALL appear in the frontend source code; all credential verification and token signing SHALL occur exclusively on the backend.

---

### Requirement 11: Teach Mode — Skill Reference and Self-Check

**User Story:** As a student in Teach Mode, I want a structured set of panel-reading skills with comprehension questions, so that I can learn how to use the monitoring interface before attempting a graded scenario.

> **Scope note:** This requirement describes features added beyond the original teach/quiz split. The Skill Select screen, SKILLS data model, and Self_Check system are live in the codebase and documented here for completeness.

#### Acceptance Criteria

1. THE Skill Select screen SHALL display one card per Skill entry, each showing the skill title, a description of what it teaches, the target simulation panel (Topology, Charts, Alerts, or Packets), and a cross-reference list of lessons where the skill is relevant ("Comes up in: …").
2. WHEN a student selects a skill card, THE NetWatch SHALL launch a simulation in Teach Mode (no login, no attempt gate) with the lesson whose incident best illustrates that skill's target panel.
3. WHILE a Teach Mode simulation is running, THE lesson bar SHALL show a "🎯 Self-Check" button in place of the "🩺 Diagnose" button. THE "🩺 Diagnose" button SHALL only appear in Quiz Mode.
4. WHEN the student clicks "🎯 Self-Check", THE Self_Check modal SHALL open with the three questions for the active skill in tier order: recall → reading → synthesis. The modal SHALL NOT open automatically on simulation start.
5. Self_Check questions SHALL be fully ungraded: no attempt limit, no POST to any backend endpoint, no student identity captured.
6. THE recall and synthesis tiers SHALL be rendered as multiple-choice questions with immediate feedback after selection. THE reading tier SHALL present a "click the element" prompt and mark correct when the student clicks an element matching the question's target selector in the live simulation panel.
7. WHEN a student completes all three Self_Check questions for a skill (by advancing through all of them), THE Skill Select screen SHALL display a "✓ COMPLETE" badge on that skill's card. This completion state is held in-memory only — it is not persisted to the backend or to localStorage.
8. Each Skill entry SHALL have exactly three selfCheck questions, one per tier (recall, reading, synthesis), in that order. IF a genuine synthesis question is not possible for a given skill, a second reading-tier question MAY be substituted, and this substitution SHALL be noted in the skill's data definition.

---

## Implementation Status Notes

The following items from the original spec are implemented but diverge from the original described interaction pattern. The divergence is a deliberate design choice, not an omission.

| Original spec description | Current implementation | Reason |
|---|---|---|
| Per-lesson Mode Selector modal (Req 1 original) | Landing page with two top-level path buttons | Mode is decided before content selection; the two paths have different content screens (skills vs. lessons), making a per-card modal redundant and confusing |
| Back from Login returns to Mode Selector | Back from Login returns to Lesson Select screen | Mode Selector no longer exists; Lesson Select is the correct prior screen in the Quiz path |
| `exitToLessons()` function name | Renamed to `exitSimulation()`, branches on mode to return to Skill Select (teach) or Lesson Select (quiz) | The function now exits to the correct screen for the active mode, not always the lesson list |
