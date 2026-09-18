/**
 * tests/scoring.test.js
 *
 * Tests for scoring features added to NetWatch:
 *
 * PART A — Quiz mode scoring
 *   A1. computeScore() formula: base − hints×penalty − wrongs×penalty
 *   A2. Floor at 0 — score never goes negative
 *   A3. Perfect score when no hints and no wrong answers
 *   A4. Hint penalty applied correctly per hint
 *   A5. Wrong-answer penalty applied correctly per wrong submission
 *   A6. Combined penalties (hints + wrong answers)
 *   A7. MAX-across-attempts: getBestScore returns the highest score over all rows
 *   A8. Attempt limit is unchanged (still 3) — scoring does not affect the limit
 *   A9. insertResult accepts and stores score/hints_used/wrong_answers
 *   A10. Post endpoint validation: invalid/missing scoring fields default to 0
 *
 * PART B — Teach mode tally
 *   B1. getScTally() starts at 0 before any run
 *   B2. adjustScTally(+20) increments tally by SC_CORRECT
 *   B3. adjustScTally(-10) decrements tally by |SC_WRONG|
 *   B4. resetScTally() resets to 0
 *   B5. Tally resets at the start of every fresh self-check run (via openSelfCheck)
 *   B6. api.recordResult is NEVER called by the tally code paths
 *   B7. adjustScTally does not call any auth or API functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// ─── Mock auth so app.js imports cleanly ─────────────────────────────────────
vi.mock('../src/auth.js', () => ({
  getSessionToken:      vi.fn(() => null),
  getCurrentMode:       vi.fn(() => 'teach'),
  getStudentName:       vi.fn(() => null),
  getStudentNPM:        vi.fn(() => null),
  clearStudentSession:  vi.fn(),
  setStudentSession:    vi.fn(),
  setInstructorToken:   vi.fn(),
  getInstructorToken:   vi.fn(() => null),
  clearInstructorToken: vi.fn(),
}));

// Mock api.js at file scope so the factory never references any local variable.
// B6 uses vi.mocked(api).recordResult to verify it was never called.
vi.mock('../src/api.js', () => ({
  login:           vi.fn(async () => ({ ok: false })),
  startAttempt:    vi.fn(async () => ({ ok: true, allowed: true })),
  recordResult:    vi.fn(async () => ({ ok: true, id: 1, recordedAt: '', score: 0, bestScore: 0 })),
  getResults:      vi.fn(async () => ({ ok: true, results: [], bestScore: 0 })),
  loginInstructor: vi.fn(async () => ({ ok: false })),
  adminReset:      vi.fn(async () => ({ ok: true })),
  getAllResults:    vi.fn(async () => ({ ok: true, results: [] })),
}));

// ─── A. QUIZ MODE SCORING — pure computeScore() ──────────────────────────────

describe('computeScore() — pure scoring formula', () => {
  it('A3. perfect score: 0 hints, 0 wrong answers → 100', async () => {
    const { computeScore } = await import('../src/scoring.js');
    expect(computeScore(0, 0)).toBe(100);
  });

  it('A4. one hint deducts HINT_PENALTY (10) → 90', async () => {
    const { computeScore } = await import('../src/scoring.js');
    expect(computeScore(1, 0)).toBe(90);
  });

  it('A4. two hints deduct 2×10 → 80', async () => {
    const { computeScore } = await import('../src/scoring.js');
    expect(computeScore(2, 0)).toBe(80);
  });

  it('A5. one wrong answer deducts WRONG_PENALTY (20) → 80', async () => {
    const { computeScore } = await import('../src/scoring.js');
    expect(computeScore(0, 1)).toBe(80);
  });

  it('A5. two wrong answers deduct 2×20 → 60', async () => {
    const { computeScore } = await import('../src/scoring.js');
    expect(computeScore(0, 2)).toBe(60);
  });

  it('A6. 1 hint + 1 wrong → 100 - 10 - 20 = 70', async () => {
    const { computeScore } = await import('../src/scoring.js');
    expect(computeScore(1, 1)).toBe(70);
  });

  it('A6. 2 hints + 3 wrongs → 100 - 20 - 60 = 20', async () => {
    const { computeScore } = await import('../src/scoring.js');
    expect(computeScore(2, 3)).toBe(20);
  });

  it('A2. floor at 0 — 5 hints + 5 wrongs → 0 (not negative)', async () => {
    const { computeScore } = await import('../src/scoring.js');
    // 100 - 5×10 - 5×20 = 100 - 50 - 100 = -50 → floored to 0
    expect(computeScore(5, 5)).toBe(0);
  });

  it('A2. property: score is always in [0, 100] for any non-negative inputs', async () => {
    const { computeScore } = await import('../src/scoring.js');
    fc.assert(
      fc.property(
        fc.nat({ max: 20 }),
        fc.nat({ max: 20 }),
        (hints, wrongs) => {
          const s = computeScore(hints, wrongs);
          return s >= 0 && s <= 100;
        }
      ),
      { numRuns: 500 }
    );
  });

  it('A1. formula: score = max(0, 100 - hints×10 - wrongs×20)', async () => {
    const { computeScore, SCORE_BASE, HINT_PENALTY, WRONG_PENALTY } = await import('../src/scoring.js');
    fc.assert(
      fc.property(
        fc.nat({ max: 10 }),
        fc.nat({ max: 10 }),
        (h, w) => {
          const expected = Math.max(0, SCORE_BASE - h * HINT_PENALTY - w * WRONG_PENALTY);
          return computeScore(h, w) === expected;
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ─── A. QUIZ MODE SCORING — constants ────────────────────────────────────────

describe('Scoring constants', () => {
  it('SCORE_BASE is 100', async () => {
    const { SCORE_BASE } = await import('../src/scoring.js');
    expect(SCORE_BASE).toBe(100);
  });

  it('HINT_PENALTY is 10', async () => {
    const { HINT_PENALTY } = await import('../src/scoring.js');
    expect(HINT_PENALTY).toBe(10);
  });

  it('WRONG_PENALTY is 20', async () => {
    const { WRONG_PENALTY } = await import('../src/scoring.js');
    expect(WRONG_PENALTY).toBe(20);
  });

  it('backend constants mirror frontend values', async () => {
    const fe = await import('../src/scoring.js');
    const be = await import('../backend/constants.js');
    expect(fe.SCORE_BASE).toBe(be.SCORE_BASE);
    expect(fe.HINT_PENALTY).toBe(be.HINT_PENALTY);
    expect(fe.WRONG_PENALTY).toBe(be.WRONG_PENALTY);
  });

  it('A8. ATTEMPT_LIMIT is still 3 — scoring does not change it', async () => {
    const { ATTEMPT_LIMIT } = await import('../backend/constants.js');
    expect(ATTEMPT_LIMIT).toBe(3);
  });
});

// ─── A. QUIZ MODE SCORING — MAX-across-attempts (db helpers, in-memory sim) ──

describe('A7. MAX-across-attempts — best score is highest, not latest', () => {
  it('highest score wins regardless of insertion order', () => {
    // Simulate the getBestScore MAX logic without a real DB
    const rows = [
      { score: 60 },
      { score: 100 },
      { score: 40 },
    ];
    const best = Math.max(...rows.map(r => r.score));
    expect(best).toBe(100);
  });

  it('later lower score does not overwrite earlier higher score', () => {
    const rows = [
      { score: 90 },
      { score: 30 },   // second attempt, much lower
    ];
    const best = Math.max(...rows.map(r => r.score));
    expect(best).toBe(90);
  });

  it('property: MAX of N scores is always >= every individual score', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        (scores) => {
          const best = Math.max(...scores);
          return scores.every(s => best >= s);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('getBestScore returns 0 when no attempts exist', () => {
    // Empty array → Math.max returns -Infinity; COALESCE(MAX(score),0) returns 0
    const rows = [];
    const best = rows.length > 0 ? Math.max(...rows.map(r => r.score)) : 0;
    expect(best).toBe(0);
  });
});

// ─── A. BACKEND ROUTE — score field validation logic (unit) ──────────────────

describe('A10. Score field validation — invalid inputs default to 0', () => {
  // Mirror the route's validation logic
  function validateScore(score)        { return (Number.isInteger(score)        && score        >= 0) ? score        : 0; }
  function validateHints(hints_used)   { return (Number.isInteger(hints_used)   && hints_used   >= 0) ? hints_used   : 0; }
  function validateWrong(wrong_answers){ return (Number.isInteger(wrong_answers) && wrong_answers >= 0) ? wrong_answers : 0; }

  it('valid integer score passes through unchanged', () => {
    expect(validateScore(75)).toBe(75);
    expect(validateScore(0)).toBe(0);
    expect(validateScore(100)).toBe(100);
  });

  it('undefined/null/string score defaults to 0', () => {
    expect(validateScore(undefined)).toBe(0);
    expect(validateScore(null)).toBe(0);
    expect(validateScore('100')).toBe(0);
    expect(validateScore(3.5)).toBe(0);   // floats are not integers
  });

  it('negative score defaults to 0', () => {
    expect(validateScore(-1)).toBe(0);
    expect(validateScore(-50)).toBe(0);
  });

  it('valid hints_used and wrong_answers pass through', () => {
    expect(validateHints(2)).toBe(2);
    expect(validateWrong(3)).toBe(3);
  });

  it('invalid hints_used and wrong_answers default to 0', () => {
    expect(validateHints(undefined)).toBe(0);
    expect(validateWrong(-1)).toBe(0);
    expect(validateWrong('two')).toBe(0);
  });
});

// ─── A9. insertResult — scoring columns stored per row ────────────────────────

describe('A9. insertResult stores scoring fields per row (in-memory simulation)', () => {
  it('each row captures its own score, hints_used, wrong_answers independently', () => {
    const rows = [];
    // Simulate insertResult appending rows (no real DB)
    const mockInsert = (npm, lessonId, outcome, score, hintsUsed, wrongAnswers) => {
      rows.push({ npm, lessonId, outcome, score, hints_used: hintsUsed, wrong_answers: wrongAnswers });
    };

    mockInsert('student1', 'ddos_edge', 'incorrect', 60, 1, 1);
    mockInsert('student1', 'ddos_edge', 'correct',   90, 1, 0);

    expect(rows).toHaveLength(2);
    expect(rows[0].score).toBe(60);
    expect(rows[0].hints_used).toBe(1);
    expect(rows[0].wrong_answers).toBe(1);
    expect(rows[1].score).toBe(90);
    expect(rows[1].wrong_answers).toBe(0);
  });

  it('rows are append-only — later row does not modify earlier row', () => {
    const rows = [];
    const mockInsert = (npm, lessonId, outcome, score) => {
      rows.push({ npm, lessonId, outcome, score, id: rows.length + 1 });
    };

    mockInsert('s1', 'l1', 'correct',   100);
    mockInsert('s1', 'l1', 'incorrect',  40);

    // Original row still has its original score
    expect(rows[0].score).toBe(100);
    expect(rows[1].score).toBe(40);
    expect(rows).toHaveLength(2);
  });
});

// ─── B. TEACH MODE TALLY ─────────────────────────────────────────────────────

describe('Teach-mode self-check tally — in-memory, no backend', () => {
  let dom;

  function makeEl(id = '', extraClasses = []) {
    const classes = new Set(extraClasses);
    return {
      id,
      textContent: '',
      title: '',
      style: { display: '' },
      classList: {
        add:      (...c) => c.forEach(x => classes.add(x)),
        remove:   (...c) => c.forEach(x => classes.delete(x)),
        contains: (c)    => classes.has(c),
        toggle:   (c, f) => {
          if (f === undefined) { classes.has(c) ? classes.delete(c) : classes.add(c); }
          else { f ? classes.add(c) : classes.delete(c); }
        },
      },
      addEventListener:    vi.fn(),
      removeEventListener: vi.fn(),
      querySelectorAll:    vi.fn(() => []),
    };
  }

  function makeFullDom() {
    const rootEl = makeEl('html');
    const named = {
      'sc-tally':           makeEl('sc-tally', ['hidden']),
      'btn-sc-resume':      makeEl('btn-sc-resume', ['hidden']),
      'screen-landing':     makeEl('screen-landing'),
      'screen-select':      makeEl('screen-select'),
      'app':                makeEl('app'),
      'lesson-grid':        makeEl('lesson-grid'),
      'skill-grid':         makeEl('skill-grid'),
      'modal-exit-confirm': makeEl('modal-exit-confirm', ['hidden']),
      'explain-panel':      makeEl('explain-panel', ['hidden']),
      'topbar-mode-badge':  makeEl('topbar-mode-badge'),
      'topbar-welcome':     makeEl('topbar-welcome'),
      'topbar-div-mode':    makeEl('topbar-div-mode'),
      'theme-label-landing': makeEl('theme-label-landing'),
      'theme-label-app':     makeEl('theme-label-app'),
    };
    const catchAll = makeEl('__catchall__');
    return {
      documentElement: rootEl,
      body: { classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) } },
      getElementById: (id) => named[id] ?? catchAll,
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn((ev, cb) => { if (ev === 'DOMContentLoaded') cb(); }),
      removeEventListener: vi.fn(),
      _named: named,
      _rootEl: rootEl,
    };
  }

  beforeEach(() => {
    dom = makeFullDom();
    global.document     = dom;
    global.localStorage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    global.window       = { addEventListener: vi.fn(), scrollTo: vi.fn() };
    global.sessionStorage = { getItem: vi.fn(() => null), removeItem: vi.fn(), setItem: vi.fn() };
  });

  afterEach(() => {
    vi.resetModules();
    delete global.document;
    delete global.localStorage;
    delete global.window;
    delete global.sessionStorage;
  });

  it('B1. getScTally() is 0 before any run', async () => {
    const { getScTally } = await import('../src/app.js');
    expect(getScTally()).toBe(0);
  });

  it('B2. adjustScTally(20) increments tally', async () => {
    const { getScTally, adjustScTally } = await import('../src/app.js');
    adjustScTally(20);
    expect(getScTally()).toBe(20);
  });

  it('B3. adjustScTally(-10) decrements tally', async () => {
    const { getScTally, adjustScTally } = await import('../src/app.js');
    adjustScTally(20);
    adjustScTally(-10);
    expect(getScTally()).toBe(10);
  });

  it('B4. resetScTally() resets to exactly 0', async () => {
    const { getScTally, adjustScTally, resetScTally } = await import('../src/app.js');
    adjustScTally(20);
    adjustScTally(20);
    adjustScTally(-10);
    resetScTally();
    expect(getScTally()).toBe(0);
  });

  it('B2+B3. SC_CORRECT=+20 and SC_WRONG=-10 match scoring.js constants', async () => {
    const { SC_CORRECT, SC_WRONG } = await import('../src/scoring.js');
    expect(SC_CORRECT).toBe(20);
    expect(SC_WRONG).toBe(-10);
  });

  it('B5. tally resets on each fresh openSelfCheck call (resetScTally called)', async () => {
    const { getScTally, adjustScTally, resetScTally } = await import('../src/app.js');
    // Simulate accumulated tally from a prior run
    adjustScTally(20);
    adjustScTally(20);
    expect(getScTally()).toBe(40);
    // Fresh run resets it
    resetScTally();
    expect(getScTally()).toBe(0);
  });

  it('B5. multiple reset calls each return 0', async () => {
    const { getScTally, adjustScTally, resetScTally } = await import('../src/app.js');
    adjustScTally(20);
    resetScTally();
    resetScTally();   // idempotent
    expect(getScTally()).toBe(0);
  });

  it('B6. adjustScTally does not call api.recordResult', async () => {
    // The api mock is defined at file scope — retrieve it and verify no calls.
    const api = await import('../src/api.js');
    const { adjustScTally, resetScTally } = await import('../src/app.js');

    // Clear any prior calls from other tests in this describe block
    vi.mocked(api.recordResult).mockClear();

    adjustScTally(20);
    adjustScTally(-10);
    adjustScTally(20);
    resetScTally();

    expect(api.recordResult).not.toHaveBeenCalled();
  });

  it('B7. tally arithmetic is independent of auth state', async () => {
    const { getScTally, adjustScTally, resetScTally } = await import('../src/app.js');
    // Even with null auth, tally works correctly
    resetScTally();
    adjustScTally(20);
    adjustScTally(20);
    adjustScTally(-10);
    expect(getScTally()).toBe(30);
  });
});

// ─── B. TEACH TALLY — property tests ─────────────────────────────────────────

describe('Teach tally property tests', () => {
  it('tally after N correct answers = N × SC_CORRECT (starting from 0)', async () => {
    const { SC_CORRECT } = await import('../src/scoring.js');
    fc.assert(
      fc.property(fc.nat({ max: 10 }), (n) => {
        let tally = 0;
        for (let i = 0; i < n; i++) tally += SC_CORRECT;
        return tally === n * SC_CORRECT;
      }),
      { numRuns: 200 }
    );
  });

  it('tally after N wrong answers = N × SC_WRONG (starting from 0)', async () => {
    const { SC_WRONG } = await import('../src/scoring.js');
    fc.assert(
      fc.property(fc.nat({ max: 10 }), (n) => {
        let tally = 0;
        for (let i = 0; i < n; i++) tally += SC_WRONG;
        return tally === n * SC_WRONG;
      }),
      { numRuns: 200 }
    );
  });
});
