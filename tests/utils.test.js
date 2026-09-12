/**
 * tests/utils.test.js
 * Property tests for pure utility functions using fast-check.
 *
 * Feature: teach-quiz-mode
 * Property 1:  NPM validation rejects all non-digit and out-of-range inputs
 * Property 2:  Admin Reset form rejects all whitespace/empty inputs
 * Property 13: Welcome name truncation
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateLoginForm,
  formatWelcomeName,
  validateAdminResetForm,
} from '../src/utils.js';

// ─── Property 1: NPM validation ──────────────────────────────────────────────

describe('validateLoginForm — NPM field', () => {
  it('accepts strings of 1–20 digits', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\d{1,20}$/),
        npm => {
          const r = validateLoginForm(npm, 'somepass');
          expect(r.npmErr, `Expected no npmErr for "${npm}"`).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('rejects empty string', () => {
    const r = validateLoginForm('', 'pass');
    expect(r.npmErr).not.toBeNull();
    expect(r.ok).toBe(false);
  });

  it('rejects strings with letters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /[^0-9]/.test(s)),
        npm => {
          const r = validateLoginForm(npm, 'somepass');
          expect(r.npmErr, `Expected npmErr for "${npm}"`).not.toBeNull();
          expect(r.ok).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('rejects strings longer than 20 digits', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\d{21,30}$/),
        npm => {
          const r = validateLoginForm(npm, 'somepass');
          expect(r.npmErr).not.toBeNull();
          expect(r.ok).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('validateLoginForm — password field', () => {
  it('rejects empty or whitespace-only password', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n', '  \t  '),
        pw => {
          const r = validateLoginForm('1234567890', pw);
          expect(r.passwordErr).not.toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('accepts non-empty password', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }).filter(s => s.trim().length > 0),
        pw => {
          const r = validateLoginForm('1234567890', pw);
          expect(r.passwordErr).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 13: Welcome name truncation ─────────────────────────────────────

describe('formatWelcomeName', () => {
  it('returns "Student" for falsy or empty input', () => {
    expect(formatWelcomeName(null)).toBe('Student');
    expect(formatWelcomeName(undefined)).toBe('Student');
    expect(formatWelcomeName('')).toBe('Student');
    expect(formatWelcomeName('   ')).toBe('Student');
  });

  it('returns name unchanged when ≤ 50 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        name => {
          expect(formatWelcomeName(name)).toBe(name);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('truncates names longer than 50 characters to exactly 51 chars (50 + ellipsis)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 51, maxLength: 200 }),
        name => {
          const result = formatWelcomeName(name);
          expect(result.length).toBe(51);                // 50 chars + U+2026
          expect(result.endsWith('\u2026')).toBe(true);
          expect(result.slice(0, 50)).toBe(name.slice(0, 50));
        }
      ),
      { numRuns: 200 }
    );
  });

  it('result length is always ≤ 51 for any input length', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        name => {
          // "Student" is 7 chars, so always ≤ 51
          expect(formatWelcomeName(name).length).toBeLessThanOrEqual(51);
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ─── Property 2: Admin Reset form validation ──────────────────────────────────

describe('validateAdminResetForm', () => {
  const whitespace = fc.constantFrom('', '   ', '\t', '\n', '  \t  ');

  it('rejects empty/whitespace npm', () => {
    fc.assert(
      fc.property(
        whitespace,
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (npm, lessonId) => {
          const r = validateAdminResetForm(npm, lessonId);
          expect(r.npmErr).not.toBeNull();
          expect(r.ok).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects empty/whitespace lessonId', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        whitespace,
        (npm, lessonId) => {
          const r = validateAdminResetForm(npm, lessonId);
          expect(r.lessonIdErr).not.toBeNull();
          expect(r.ok).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts non-empty non-whitespace values for both fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (npm, lessonId) => {
          const r = validateAdminResetForm(npm, lessonId);
          expect(r.ok).toBe(true);
          expect(r.npmErr).toBeNull();
          expect(r.lessonIdErr).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });
});
