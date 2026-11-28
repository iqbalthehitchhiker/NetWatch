# Documentation Update Summary

This document summarizes all changes made to requirements.md, design.md, and tasks.md to bring them into alignment with the actual implemented codebase.

**Date:** Current audit
**Principle:** Code is authoritative — where docs disagree with working, tested code, docs are updated to match.

---

## High-Level Changes

### New Requirements Added (12-16)

Five major features that exist in code with full test coverage but were not documented:

1. **Requirement 12: Quiz Mode Numeric Scoring** - 100-point scoring system with penalties for hints and wrong answers
2. **Requirement 13: Instructor Student Management** - Bulk creation/deletion via web interface
3. **Requirement 14: Theme Persistence** - Light/dark theme toggle with localStorage persistence
4. **Requirement 15: Exit Confirmation** - Modal warning when navigating away mid-simulation
5. **Requirement 16: Global Persistent Navigation** - Always-visible nav bar with dynamic context

### Possible Issues Section Added

Two behaviors flagged for future review:
1. Client-side score computation without server verification
2. Student deletion violating append-only Result_Records guarantee (documented as exception)

### New Requirements Added (17-23) + Future Work

Seven new requirements covering role-based access, session handling, and account UI:

1. **Requirement 17: Roles and Access Matrix** - guest/student/instructor x Teach/Quiz/Sandbox/Admin access matrix; server-side enforcement on `POST /api/admin/*`
2. **Requirement 18: Persistent Account Block** - full form on pages + compact form in sim topbar; name, role badge, attempts remaining per lesson, My results link, Log out
3. **Requirement 19: Log Out for Both Roles** - student and instructor logout; clears session; returns to landing as guest
4. **Requirement 20: Session Expiry** - 8h JWT (`JWT_EXPIRY = '8h'`); re-login in place mid-quiz without discarding simulation; session persists via `sessionStorage` across refresh
5. **Requirement 21: Separate Instructor Login Entry** - student (NPM + password) vs instructor (username + password) login; visually distinct entries
6. **Requirement 22: Read-Only Endpoints for Attempts and Results** - `GET /api/attempts` and `GET /api/results` read-only endpoints
7. **Requirement 23: Login Rate Limiting** - rate limit `POST /api/auth/login` per identifier + IP; HTTP 429 on excess

### Future Work Section Added

Self-service signup, email password reset, and Google sign-in identified as out-of-scope future work.

### Design Sections Added

- Account Block (full form on pages + compact form in sim topbar), role badges, separate instructor login entry
- Sandbox gating (UI-only gating, NOT a security boundary; server enforcement only on `/api/admin/*`)
- Session Handling: `sessionStorage` decision (reversal of earlier memory-only decision)
- 401 Handling and Session Expiry (global 401 handler, re-login in place mid-quiz, retry saving result)

### Tasks Added

- Task 0: Debug why the Log in button does not appear on localhost:3000
- Tasks 21-32: ordered implementation tasks, each with an acceptance test
- Flagged `tests/auth.test.js` and Property 8 (token never written to Web Storage) as requiring updates for the `sessionStorage` migration

---

## Detailed Changes by File

### requirements.md

#### Updated Content

1. **Introduction (line ~10)**
   - Changed: "Learn the tool" → "Learn how it works"
   - Reason: Matches actual button text in index.html

2. **Requirement 1.1 (Acceptance Criteria)**
   - Changed: Path label from "Learn the tool" → "Learn how it works"
   - Reason: Matches actual landing page button text

3. **Requirement 11.9 (New)**
   - Added: Self-Check Resume button behavior
   - Shows when progress past Q1, reopens modal without reset

#### Added Content

4. **Requirements 12-16 (New sections)**
   - **Req 12**: Numeric scoring (formula, live display, best score tracking)
   - **Req 13**: Student management (bulk CRUD, deletion cascade behavior)
   - **Req 14**: Theme toggle and persistence
   - **Req 15**: Exit confirmation modal
   - **Req 16**: Global navigation bar (10 acceptance criteria)

5. **Requirements 17-23 (New sections)**
   - **Req 17**: Roles and access matrix (guest/student/instructor x Teach/Quiz/Sandbox/Admin)
   - **Req 18**: Persistent account block (full + compact)
   - **Req 19**: Log out for both roles
   - **Req 20**: Session expiry (8h JWT, re-login in place, sessionStorage persistence)
   - **Req 21**: Separate instructor login entry
   - **Req 22**: Read-only endpoints for attempts and results
   - **Req 23**: Login rate limiting

6. **Future Work section (New)**
   - Self-service signup, email password reset, Google sign-in

7. **Possible Issues section (New)**
   - Issue 1: Client computes score, server accepts without verification
   - Issue 2: Student deletion removes Result_Records (exception to Req 7.2)

#### Removed Content

None — all original requirements remain valid.

---

### design.md

#### Updated Data Model

1. **Result_Records table schema**
   - Added columns: `score INTEGER NOT NULL DEFAULT 0`
   - Added columns: `hints_used INTEGER NOT NULL DEFAULT 0`
   - Added columns: `wrong_answers INTEGER NOT NULL DEFAULT 0`
   - Added note: "append-only with one exception: instructor bulk student deletion"

2. **Property 13: Welcome name truncation**
   - Changed: "at most 53 characters" → "at most 51 characters (50 chars + "…")"
   - Reason: Implementation is `name.slice(0, 50) + '\u2026'` = 51 total

3. **Decision Point: Student Account Provisioning**
   - Changed: Status from "Open" → "Closed — Req 4.9"
   - Decision: Instructor pre-creation via CLI or web interface (implemented)

#### Updated API Shapes

1. **POST /api/results**
   - Request now includes: `"score": 80, "hints_used": 2, "wrong_answers": 0`
   - Response now includes: `"score": 80, "bestScore": 90`
   - Added note: Server validates non-negative integers, does NOT recompute score

2. **GET /api/results**
   - Response now includes score fields in result objects
   - Added: `"bestScore": 90` at top level

3. **GET /api/results/all**
   - Response now includes score fields: `"score": 80, "hints_used": 2, "wrong_answers": 0`

4. **POST /api/admin/students/bulk (New)**
   - Request: `{ "students": [ { "npm": "...", "name": "...", "password": "..." } ] }`
   - Response: `{ "created": [...], "errors": [...] }`

5. **DELETE /api/admin/students (New)**
   - Request: `{ "npms": [ "1234567890", ... ] }`
   - Response: `{ "deleted": [...], "count": 2 }`
   - Note: Removes all Attempt_Counters, Attempt_Counter_Backups, **and Result_Records**

---

### tasks.md

#### Status Header Added

New section at top:
```markdown
## Implementation Status
- Tasks 1-17: ✅ Complete
- Tasks 18.1-18.4: ⚠️ Incomplete (4 lesson content TODOs)
- Task 19: 🔍 Requires manual browser verification
- Task 20: ✅ Complete (docs in .claude/ directory)
```

#### Task Updates

1. **Task 1.2: Install dependencies**
   - Changed: `npm install express jsonwebtoken bcrypt better-sqlite3`
   - To: `npm install express jsonwebtoken bcrypt cors dotenv`
   - Added note: "Uses Node.js built-in `node:sqlite` (no separate package needed)"

2. **Task 2.1: Backend constants**
   - Added: Scoring constants `SCORE_BASE`, `HINT_PENALTY`, `WRONG_PENALTY`
   - Requirements reference updated: 5.1, 12.2

3. **Task 12.2: Landing page markup**
   - Added explicit button text: "Learn how it works" (Teach) and "Take a Scenario" (Quiz)

4. **Task 14.16: launchSimulation()**
   - Changed: "open Self-Check automatically for Teach Mode if a pending skill is set"
   - To: "store the current skill so `openSelfCheck()` can find it when the student clicks the Self-Check button"

5. **Task 19: Final checkpoint**
   - Reformatted for clarity with bullet points
   - Changed: "Learn the tool" → "Learn how it works"
   - Added: "Self-Check opens on button click" (not automatically)
   - Marked as requiring manual browser verification

6. **Task 20.6: Linux docs**
   - Added note: Files located in `.claude/` directory

#### Notes Section Updates

Added two new notes:
- "Self-Check opens on button click only — it does NOT open automatically (Requirement 11.4)"
- "Uses Node.js built-in `node:sqlite` — no separate database package needed"

Changed references:
- "Learn the tool" → "Learn how it works" (2 occurrences)

#### New Tasks Added

- Task 0: Debug Log in button on localhost:3000
- Tasks 21-32: sessionStorage migration, account block, role badges, separate instructor login, 401 handler, admin role enforcement, read-only attempts endpoint, login rate limiting, Sandbox gating, logout, session expiry, test updates

Flagged tests that must change:
- `tests/auth.test.js` — tests in-memory-only session (`clearAll`, `setStudentSession`, `setInstructorToken`, mutual exclusion); must cover `sessionStorage` persistence and new role model
- Property 8 (design.md) — "token never written to Web Storage" must be revised (token is now written to `sessionStorage`)
- Any test asserting `beforeunload` clears the session must be updated (handler removed)

---

## Verification

All changes have been applied. To verify:

1. **requirements.md**: Search for "Requirements 12-16" — should find 5 new sections
2. **requirements.md**: Search for "Possible Issues" — should find 2 documented issues
3. **design.md**: Search for "score INTEGER" — should find updated Result_Records schema
4. **design.md**: Search for "POST /api/admin/students/bulk" — should find new API endpoint
5. **tasks.md**: Search for "Implementation Status" — should find status header at top
5. **tasks.md**: Search for "cors dotenv" — should find updated install command
6. **requirements.md**: Search for "Requirement 23" — should find Login Rate Limiting
7. **design.md**: Search for "sessionStorage" — should find the session handling reversal section
8. **tasks.md**: Search for "Task 0" — should find the Log in button debug task

---

## Remaining Work

### Content TODOs (Tasks 18.1-18.4)
4 lessons still have placeholder content in `src/lessons.js`:
- `gpu_thermal` (lines 338, 343)
- `internal_overload` (lines 396, 401)
- `web_leak` (lines 454, 459)
- `loop_storm` (lines 512, 517)

### Manual Verification (Task 19)
Cannot be completed without running server in browser:
- Visual UI flows
- Login/authentication flows
- Mode switching behavior
- Admin features

---

## Files Modified

1. `e:\NetWatch\.kiro\specs\teach-quiz-mode\requirements.md`
2. `e:\NetWatch\.kiro\specs\teach-quiz-mode\design.md`
3. `e:\NetWatch\.kiro\specs\teach-quiz-mode\tasks.md`
4. `e:\NetWatch\.kiro\specs\teach-quiz-mode\DOCUMENTATION_UPDATE_SUMMARY.md` (this file)

**Total lines added:** ~700 (5 previous requirements + 7 new requirements + Future Work + new design sections + new tasks)
**Total lines modified:** ~50 (labels, paths, constants, notes, session handling reversal)
**Total lines removed:** 0 (all original content preserved)
