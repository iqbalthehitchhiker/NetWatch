/**
 * src/auth.js
 * Session state with sessionStorage persistence.
 *
 * Student session (token, name, NPM, mode) and instructor token are persisted
 * to sessionStorage on login and restored on module load. Cleared on explicit
 * Log out, token expiry (401), or tab close.
 *
 * Private variables are module-scoped. Only getter/setter functions are exported.
 */

// ─── Private state ────────────────────────────────────────────────────────────

let _sessionToken    = null;
let _instructorToken = null;
let _currentMode     = null;  // 'teach' | 'quiz' | null
let _studentName     = null;
let _studentNPM      = null;

// ─── Role determination ───────────────────────────────────────────────────────

/**
 * getCurrentRole()
 * Returns 'student' | 'instructor' | 'guest' based on which token is set.
 * Instructor takes priority (mutual exclusion ensures only one is active).
 */
export function getCurrentRole() {
  if (_instructorToken) return 'instructor';
  if (_sessionToken)    return 'student';
  return 'guest';
}

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
  persistStudentSession();
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
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('nw_student_token');
    sessionStorage.removeItem('nw_student_name');
    sessionStorage.removeItem('nw_student_npm');
    sessionStorage.removeItem('nw_student_mode');
  }
}

// ─── Instructor session ───────────────────────────────────────────────────────

export function setInstructorToken(token) {
  _instructorToken = token;
  persistInstructorToken();
}
export function getInstructorToken()      { return _instructorToken; }
export function clearInstructorToken()    {
  _instructorToken = null;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('nw_instructor_token');
  }
}

// ─── sessionStorage persistence ───────────────────────────────────────────────
// Persist student session and instructor token so a refresh keeps the login.
// Cleared on explicit Log out, token expiry (401), or tab close.
function persistStudentSession() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem('nw_student_token', _sessionToken ?? '');
  sessionStorage.setItem('nw_student_name', _studentName ?? '');
  sessionStorage.setItem('nw_student_npm', _studentNPM ?? '');
  sessionStorage.setItem('nw_student_mode', _currentMode ?? '');
}

function persistInstructorToken() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem('nw_instructor_token', _instructorToken ?? '');
}

function restoreSessionFromStorage() {
  if (typeof sessionStorage === 'undefined') return;

  const token = sessionStorage.getItem('nw_student_token') || null;
  const name  = sessionStorage.getItem('nw_student_name') || null;
  const npm   = sessionStorage.getItem('nw_student_npm') || null;
  const mode  = sessionStorage.getItem('nw_student_mode') || null;

  if (token) {
    _sessionToken = token;
    _studentName  = name;
    _studentNPM   = npm;
    _currentMode  = mode;
  }

  const instrToken = sessionStorage.getItem('nw_instructor_token') || null;
  if (instrToken) {
    _instructorToken = instrToken;
  }
}

// Restore any persisted session on module load.
restoreSessionFromStorage();
