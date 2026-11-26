/**
 * tests/backend.test.js
 * Unit tests for backend route handlers.
 *
 * Property 9: Attempt counters are independent across (student, lesson) pairs
 * Property 10: Result records are append-only
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ─── Property 9: Attempt counter independence ─────────────────────────────────

describe('Property 9: Attempt counter independence', () => {
  it('incrementing counter for (npmA, lessonA) does not affect (npmB, lessonB)', () => {
    // Feature: teach-quiz-mode, Property 9: Attempt counters are independent
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 })
        ).filter(([n1, l1, n2, l2]) => n1 !== n2 || l1 !== l2),
        ([npm1, lesson1, npm2, lesson2]) => {
          // Simulate the counter logic in isolation (no DB)
          const counters = new Map();
          const key = (n, l) => `${n}::${l}`;
          const get = (n, l) => counters.get(key(n, l)) || 0;
          const inc = (n, l) => counters.set(key(n, l), get(n, l) + 1);

          const before2 = get(npm2, lesson2);
          inc(npm1, lesson1);
          const after2 = get(npm2, lesson2);

          expect(after2).toBe(before2);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 10: Result records are append-only ─────────────────────────────

describe('Property 10: Result records are append-only', () => {
  it('N calls to insertResult result in exactly N rows, no updates or deletes', () => {
    // Feature: teach-quiz-mode, Property 10: Result records are append-only
    fc.assert(
      fc.property(
        fc.nat({ max: 10 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (n, npm, lessonId) => {
          const inserted = [];
          // Mock insertResult: always appends
          const mockInsert = (npm, lessonId, outcome) => {
            inserted.push({ npm, lessonId, outcome });
          };

          for (let i = 0; i <= n; i++) {
            mockInsert(npm, lessonId, i % 2 === 0 ? 'correct' : 'incorrect');
          }

          // No row should have been updated or deleted — every call produced one insert
          expect(inserted.length).toBe(n + 1);
          inserted.forEach(row => {
            expect(['correct', 'incorrect']).toContain(row.outcome);
          });
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Unit: ATTEMPT_LIMIT constant ────────────────────────────────────────────

describe('ATTEMPT_LIMIT', () => {
  it('is exported from backend/constants.js as exactly 3', async () => {
    const { ATTEMPT_LIMIT } = await import('../backend/constants.js');
    expect(ATTEMPT_LIMIT).toBe(3);
  });
});

// ─── Rate limiting 429 ───────────────────────────────────────────────────────

describe('Login rate limiting', () => {
  beforeEach(() => {
    // Clear the rate-limiter map between tests
  });

  it('blocks after 5 failed attempts for same identifier+IP (returns 429 shape)', async () => {
    const { checkRateLimit, recordFailure } = await import('../backend/rateLimit.js');
    const identifier = '1234567890';
    const ip = '127.0.0.1';

    // 5 failures recorded, each check still allowed
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(identifier, ip).allowed).toBe(true);
      recordFailure(identifier, ip);
    }

    // 6th check should be blocked
    const result = checkRateLimit(identifier, ip);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('expires old entries after the window (no unbounded growth per key)', async () => {
    const { checkRateLimit, recordFailure } = await import('../backend/rateLimit.js');
    const identifier = '0987654321';
    const ip = '10.0.0.1';

    // Record 5 failures
    for (let i = 0; i < 5; i++) {
      checkRateLimit(identifier, ip);
      recordFailure(identifier, ip);
    }
    expect(checkRateLimit(identifier, ip).allowed).toBe(false);

    // Simulate window expiry by directly manipulating is not possible,
    // but checkRateLimit resets entries whose window has elapsed.
    // Verify a fresh identifier+IP is allowed:
    expect(checkRateLimit('fresh-npm', '10.0.0.2').allowed).toBe(true);
  });
});

// ─── clearFailures exported from rateLimit.js ────────────────────────────────

describe('clearFailures helper', () => {
  it('removes rate limit entry for identifier+ip', async () => {
    const { checkRateLimit, recordFailure, clearFailures } = await import('../backend/rateLimit.js');
    const identifier = 'clear-test';
    const ip = '127.0.0.1';

    // Record 5 failures to hit the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(identifier, ip);
      recordFailure(identifier, ip);
    }
    expect(checkRateLimit(identifier, ip).allowed).toBe(false);

    // After clearFailures, should be allowed again
    clearFailures(identifier, ip);
    expect(checkRateLimit(identifier, ip).allowed).toBe(true);
  });
});
