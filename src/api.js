/**
 * src/api.js
 * Fetch wrappers for all backend endpoints.
 * Reads tokens from src/auth.js — never touches DOM or global state.
 */

import { getSessionToken, getInstructorToken } from './auth.js';

const BASE = '';  // Same-origin; adjust if backend runs on a different port in dev

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
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error — backend may be unavailable' } };
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Student login.
 * @returns {{ ok: true, token, name, role } | { ok: false, status, error }}
 */
export async function login(npm, password) {
  const { ok, status, data } = await post('/api/auth/login', { npm, password });
  if (ok)           return { ok: true,  token: data.token, name: data.name, role: data.role };
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
 * @returns {{ ok: true, allowed, attemptsUsed, attemptLimit } | { ok: false, error }}
 */
export async function startAttempt(lessonId) {
  const token = getSessionToken();
  const { ok, status, data } = await post('/api/attempts', { lessonId }, token);
  if (ok) return { ok: true, allowed: data.allowed, attemptsUsed: data.attemptsUsed, attemptLimit: data.attemptLimit };
  return { ok: false, status, error: data.error || 'Could not start attempt' };
}

// ─── Results ──────────────────────────────────────────────────────────────────

/**
 * Record a diagnosis result. Retries once on failure (500 ms delay).
 * @returns {{ ok: true, id, recordedAt } | { ok: false, error }}
 */
export async function recordResult(lessonId, outcome) {
  const token = getSessionToken();
  const attempt = async () => post('/api/results', { lessonId, outcome }, token);

  const first = await attempt();
  if (first.ok) return { ok: true, id: first.data.id, recordedAt: first.data.recordedAt };

  // Single retry after 500 ms
  await new Promise(r => setTimeout(r, 500));
  const second = await attempt();
  if (second.ok) return { ok: true, id: second.data.id, recordedAt: second.data.recordedAt };

  return { ok: false, error: second.data.error || 'Result could not be saved' };
}

/**
 * Fetch results for a specific student + lesson.
 * @returns {{ ok: true, results: [] } | { ok: false, error }}
 */
export async function getResults(npm, lessonId) {
  const token = getSessionToken();
  const { ok, status, data } = await get(`/api/results?studentId=${encodeURIComponent(npm)}&lessonId=${encodeURIComponent(lessonId)}`, token);
  if (ok) return { ok: true, results: data.results || [] };
  return { ok: false, status, error: data.error || 'Could not fetch results' };
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
