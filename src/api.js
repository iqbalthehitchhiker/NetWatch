/**
 * src/api.js
 * Fetch wrappers for all backend endpoints.
 * Reads tokens from src/auth.js — never touches DOM or global state directly,
 * except for the global 401 handler which clears sessions on expiry.
 */

import { getSessionToken, getInstructorToken, clearStudentSession, clearInstructorToken, getCurrentRole } from './auth.js';

const BASE = '';  // Same-origin; adjust if backend runs on a different port in dev

// ─── Global 401 handler ───────────────────────────────────────────────────────

/**
 * handle401(role)
 * Global handler for 401 responses. Clears the appropriate session and
 * notifies the UI via updateGlobalNav() (imported dynamically to avoid cycles).
 * Returns an error message for the caller to display.
 */
function handle401(role) {
  if (role === 'student') {
    clearStudentSession();
  } else if (role === 'instructor') {
    clearInstructorToken();
  }
  
  // Notify UI of session change
  if (typeof window !== 'undefined' && window.updateGlobalNav) {
    window.updateGlobalNav();
  }
  
  return 'Session expired, please log in again.';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeader(token) {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function post(url, body, token) {
  try {
    const res = await fetch(BASE + url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body:    JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    
    // Handle 401 globally
    if (res.status === 401 && token) {
      const role = getCurrentRole();
      const errorMsg = handle401(role);
      return { ok: false, status: 401, data: { error: errorMsg }, sessionExpired: true };
    }
    
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error — backend may be unavailable' } };
  }
}

async function get(url, token) {
  try {
    const res = await fetch(BASE + url, {
      headers: { ...authHeader(token) },
    });
    const data = await res.json().catch(() => ({}));
    
    // Handle 401 globally
    if (res.status === 401 && token) {
      const role = getCurrentRole();
      const errorMsg = handle401(role);
      return { ok: false, status: 401, data: { error: errorMsg }, sessionExpired: true };
    }
    
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error — backend may be unavailable' } };
  }
}

async function patch(url, body, token) {
  try {
    const res = await fetch(BASE + url, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body:    JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) {
      const role = getCurrentRole();
      const errorMsg = handle401(role);
      return { ok: false, status: 401, data: { error: errorMsg }, sessionExpired: true };
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error - backend may be unavailable' } };
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Student login.
 * @returns {{ ok: true, token, name, role } | { ok: false, status, error }}
 */
export async function login(npm, password) {
  const { ok, status, data } = await post('/api/auth/login', { npm, password });
  if (ok)           return { ok: true,  token: data.token, name: data.name, displayName: data.displayName, role: data.role };
  if (status === 401) return { ok: false, status: 401, error: data.error || 'Invalid NPM or password' };
  return { ok: false, status, error: data.error || 'Login could not be completed' };
}

/**
 * Instructor login.
 * @returns {{ ok: true, token, name, role } | { ok: false, status, error }}
 */
export async function loginInstructor(username, password) {
  const { ok, status, data } = await post('/api/auth/login', { username, password, role: 'instructor' });
  if (ok)           return { ok: true,  token: data.token, name: data.name, role: data.role };
  if (status === 401) return { ok: false, status: 401, error: 'Invalid credentials' };
  return { ok: false, status, error: data.error || 'Login could not be completed' };
}

// ─── Attempts ─────────────────────────────────────────────────────────────────

/**
 * Check and increment attempt counter for authenticated student + lessonId.
 * @returns {{ ok: true, allowed, attemptsUsed, attemptLimit, attemptId } | { ok: false, error }}
 */
export async function startAttempt(lessonId) {
  const token = getSessionToken();
  const { ok, status, data } = await post('/api/attempts', { lessonId }, token);
  if (ok) return { ok: true, allowed: data.allowed, attemptsUsed: data.attemptsUsed, attemptLimit: data.attemptLimit, attemptId: data.attemptId };
  return { ok: false, status, error: data.error || 'Could not start attempt' };
}

/**
 * Get attempt count for authenticated student + lessonId (read-only, no increment).
 * @returns {{ ok: true, attemptsUsed, attemptLimit, attemptsRemaining } | { ok: false, error }}
 */
export async function getAttemptCount(npm, lessonId) {
  const token = getSessionToken();
  const { ok, status, data } = await get(`/api/attempts?studentId=${encodeURIComponent(npm)}&lessonId=${encodeURIComponent(lessonId)}`, token);
  if (ok) return { ok: true, attemptsUsed: data.attemptsUsed, attemptLimit: data.attemptLimit, attemptsRemaining: data.attemptsRemaining };
  return { ok: false, status, error: data.error || 'Could not fetch attempt count' };
}

// ─── Results ──────────────────────────────────────────────────────────────────

/**
 * Record a diagnosis result. Retries once on failure (500 ms delay).
 * On 401, returns sessionExpired: true so caller can trigger in-place re-login.
 * @param {string}  lessonId
 * @param {string}  outcome        'correct' | 'incorrect'
 * @param {number}  [hintsUsed=0]  Hints opened during this attempt
 * @param {number}  [wrongAnswers=0] Wrong submissions before this one
 * @param {number}  [attemptId]    Attempt ID from startAttempt
 * @returns {{ ok: true, id, recordedAt, score, bestScore } | { ok: false, error, sessionExpired?: true }}
 */
export async function recordResult(lessonId, outcome, hintsUsed = 0, wrongAnswers = 0, attemptId) {
  const token = getSessionToken();
  const body  = { lessonId, outcome, hints_used: hintsUsed, wrong_answers: wrongAnswers, attemptId };
  const attempt = async () => post('/api/results', body, token);

  const first = await attempt();
  if (first.ok) return {
    ok: true,
    id: first.data.id,
    recordedAt: first.data.recordedAt,
    score: first.data.score,
    bestScore: first.data.bestScore,
  };
  
  // If 401, return immediately with sessionExpired flag for in-place re-login
  if (first.status === 401 && first.sessionExpired) {
    return { ok: false, error: first.data.error, sessionExpired: true };
  }

  // Single retry after 500 ms (for other errors)
  await new Promise(r => setTimeout(r, 500));
  const second = await attempt();
  if (second.ok) return {
    ok: true,
    id: second.data.id,
    recordedAt: second.data.recordedAt,
    score: second.data.score,
    bestScore: second.data.bestScore,
  };
  
  if (second.status === 401 && second.sessionExpired) {
    return { ok: false, error: second.data.error, sessionExpired: true };
  }

  return { ok: false, error: second.data.error || 'Result could not be saved' };
}

/**
 * Fetch results for a specific student + lesson.
 * @returns {{ ok: true, results: [], bestScore: number } | { ok: false, error }}
 */
export async function getResults(npm, lessonId) {
  const token = getSessionToken();
  const { ok, status, data } = await get(`/api/results?studentId=${encodeURIComponent(npm)}&lessonId=${encodeURIComponent(lessonId)}`, token);
  if (ok) return { ok: true, results: data.results || [], bestScore: data.bestScore ?? 0 };
  return { ok: false, status, error: data.error || 'Could not fetch results' };
}

/**
 * Fetch all results for the authenticated student (all lessons).
 * @returns {Array} results array or empty array on failure
 */
export async function fetchStudentResults(npm) {
  const token = getSessionToken();
  
  // Fetch results for all lessons
  const promises = [];
  // Import LESSONS from lessons.js
  const { LESSONS } = await import('./lessons.js');
  
  for (const lesson of LESSONS) {
    promises.push(getResults(npm, lesson.id));
  }
  
  const responses = await Promise.all(promises);
  
  // Flatten all results
  const allResults = [];
  responses.forEach(resp => {
    if (resp.ok && resp.results) {
      allResults.push(...resp.results);
    }
  });
  
  return allResults;
}

/**
 * Fetch all results (instructor only).
 * @returns {{ ok: true, results: [] } | { ok: false, status, error }}
 */
export async function getAllResults() {
  const token = getInstructorToken();
  const { ok, status, data } = await get('/api/results/all', token);
  if (ok)           return { ok: true, results: data.results || [] };
  if (status === 403) return { ok: false, status: 403, error: 'Instructor authentication required' };
  return { ok: false, status, error: data.error || 'Could not fetch results' };
}

/**
 * Admin reset — zero the attempt counter for a specific student + lesson.
 * @returns {{ ok: true, ... } | { ok: false, status, error }}
 */
export async function adminReset(npm, lessonId) {
  const token = getInstructorToken();
  const { ok, status, data } = await post('/api/admin/reset', { npm, lessonId }, token);
  if (ok) return { ok: true, ...data };
  if (status === 403) return { ok: false, status: 403, error: 'Instructor authentication required' };
  if (status === 404) return { ok: false, status: 404, error: 'Lesson ID not recognised' };
  return { ok: false, status, error: data.error || 'Reset could not be completed' };
}

/**
 * Bulk create students (instructor only).
 * @param {Array<{name: string, npm: string}>} students
 * @returns {{ ok: true, results: [] } | { ok: false, status, error }}
 */
export async function bulkCreateStudents(students) {
  const token = getInstructorToken();
  const { ok, status, data } = await post('/api/admin/students/bulk', { students }, token);
  if (ok) return { ok: true, results: data.results || [] };
  if (status === 403) return { ok: false, status: 403, error: 'Instructor authentication required' };
  return { ok: false, status, error: data.error || 'Bulk creation failed' };
}

/**
 * Get all students with stats (instructor only).
 * @returns {{ ok: true, students: [] } | { ok: false, status, error }}
 */
export async function getAllStudents() {
  const token = getInstructorToken();
  const { ok, status, data } = await get('/api/admin/students', token);
  if (ok) return { ok: true, students: data.students || [] };
  if (status === 403) return { ok: false, status: 403, error: 'Instructor authentication required' };
  return { ok: false, status, error: data.error || 'Could not fetch students' };
}

/**
 * Delete selected students (instructor only).
 * @param {string[]} npms - Array of NPMs to delete
 * @returns {{ ok: true, deleted: [] } | { ok: false, status, error }}
 */
export async function deleteStudents(npms) {
  const token = getInstructorToken();
  try {
    const res = await fetch(BASE + '/api/admin/students', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ npms }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, deleted: data.deleted || [] };
    if (res.status === 403) return { ok: false, status: 403, error: 'Instructor authentication required' };
    return { ok: false, status: res.status, error: data.error || 'Delete failed' };
  } catch {
    return { ok: false, status: 0, error: 'Network error — backend may be unavailable' };
  }
}

/**
 * Bulk reset attempt counters for selected students on a specific lesson (instructor only).
 * @param {string[]} npms - Array of NPMs to reset
 * @param {string} lessonId - Lesson ID to reset attempts for
 * @returns {{ ok: true, results: [], message: string } | { ok: false, status, error }}
 */
export async function bulkResetAttempts(npms, lessonId) {
  const token = getInstructorToken();
  const { ok, status, data } = await post('/api/admin/reset/bulk', { npms, lessonId }, token);
  if (ok) return { ok: true, results: data.results || [], message: data.message };
  if (status === 403) return { ok: false, status: 403, error: 'Instructor authentication required' };
  if (status === 404) return { ok: false, status: 404, error: 'Lesson ID not recognised' };
  return { ok: false, status, error: data.error || 'Bulk reset failed' };
}

export async function fetchLeaderboard({ lesson = 'overall', sort = 'score', minScore = 80, limit = 50, offset = 0 } = {}) {
  const qs = new URLSearchParams({ lesson, sort, minScore, limit, offset });
  const { ok, status, data } = await get('/api/leaderboard?' + qs.toString());
  if (ok) return { ok: true, rows: Array.isArray(data) ? data : [] };
  return { ok: false, status, error: (data && data.error) || 'Could not load leaderboard' };
}

export async function updateDisplayName(displayName) {
  const token = getSessionToken();
  const { ok, status, data, sessionExpired } = await patch('/api/auth/display-name', { displayName }, token);
  if (ok) return { ok: true, displayName: data.displayName };
  return { ok: false, status, error: data.error || 'Could not save display name', sessionExpired: !!sessionExpired };
}
