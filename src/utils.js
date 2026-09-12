/**
 * src/utils.js
 * Pure utility functions — no side effects, no DOM access, no imports.
 * All functions are independently testable with fast-check.
 */

// ─── Login form validation ─────────────────────────────────────────────────────
// Feature: teach-quiz-mode, Property 1: NPM validation rejects all non-digit inputs

/**
 * Validate the Quiz Mode login form fields.
 * @param {string} npm      - Raw NPM field value
 * @param {string} password - Raw password field value
 * @returns {{ ok: boolean, npmErr: string|null, passwordErr: string|null }}
 */
export function validateLoginForm(npm, password) {
  let npmErr      = null;
  let passwordErr = null;

  if (!npm || !/^\d{1,20}$/.test(npm)) {
    npmErr = 'NPM must be 1–20 digits';
  }
  if (!password || String(password).trim().length < 1) {
    passwordErr = 'Password is required';
  }

  return { ok: npmErr === null && passwordErr === null, npmErr, passwordErr };
}

// ─── Welcome name formatting ───────────────────────────────────────────────────
// Feature: teach-quiz-mode, Property 13: Welcome name truncation

/**
 * Format a student's display name for the topbar welcome message.
 * @param {string|null|undefined} name
 * @returns {string}
 */
export function formatWelcomeName(name) {
  if (!name || String(name).trim().length === 0) return 'Student';
  if (name.length <= 50) return name;
  return name.slice(0, 50) + '\u2026'; // U+2026 HORIZONTAL ELLIPSIS
}

// ─── Admin Reset form validation ───────────────────────────────────────────────
// Feature: teach-quiz-mode, Property 2: Admin Reset form rejects whitespace/empty

/**
 * Validate the Admin Reset form fields.
 * @param {string} npm      - Raw NPM field value
 * @param {string} lessonId - Raw lesson ID field value
 * @returns {{ ok: boolean, npmErr: string|null, lessonIdErr: string|null }}
 */
export function validateAdminResetForm(npm, lessonId) {
  const npmErr      = !(npm      && String(npm).trim().length      > 0) ? 'NPM is required'       : null;
  const lessonIdErr = !(lessonId && String(lessonId).trim().length > 0) ? 'Lesson ID is required' : null;
  return { ok: npmErr === null && lessonIdErr === null, npmErr, lessonIdErr };
}
