/**
 * src/auth.js
 * In-memory session state. No writes to localStorage, sessionStorage, or cookies.
 *
 * Private variables are module-scoped. Only getter/setter functions are exported.
 * The beforeunload handler clears the student session when the tab closes.
 */

// ─── Private state ────────────────────────────────────────────────────────────

let _sessionToken    = null;
let _instructorToken = null;
let _currentMode     = null;  // 'teach' | 'quiz' | null
let _studentName     = null;
let _studentNPM      = null;

// ─── Student session ──────────────────────────────────────────────────────────

/**
 * Store a student session in memory after successful login.
 * @param {string|null} token - JWT from backend (null for teach mode)
 * @param {string|null} name  - Student's display name
 * @param {string|null} npm   - Student's NPM identifier
 * @param {'teach'|'quiz'} mode - The chosen mode for this session
 */
export function setStudentSession(token, name, npm, mode) {
  _sessionToken = token;
  _studentName  = name;
  _studentNPM   = npm;
  _currentMode  = mode;
}

export function getSessionToken()  { return _sessionToken; }
export function getCurrentMode()   { return _currentMode; }
export function getStudentName()   { return _studentName; }
export function getStudentNPM()    { return _studentNPM; }

export function clearStudentSession() {
  _sessionToken = null;
  _studentName  = null;
  _studentNPM   = null;
  _currentMode  = null;
}

// ─── Instructor session ───────────────────────────────────────────────────────

export function setInstructorToken(token) { _instructorToken = token; }
export function getInstructorToken()      { return _instructorToken; }
export function clearInstructorToken()    { _instructorToken = null; }

// ─── Tab close cleanup ────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', clearStudentSession);
}
