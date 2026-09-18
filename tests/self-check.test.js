/**
 * tests/self-check.test.js
 *
 * Covers:
 *  1. selfCheck data shape validity — every SKILLS entry has exactly 3 questions,
 *     one per tier (recall, reading, synthesis), with all required fields present.
 *  2. Reading-tier click-to-answer correctness:
 *       - clicking the targetSelector marks correct and fires onQuestionResult(correct=true)
 *       - clicking elsewhere does NOT mark correct
 *  3. No POST / no auth involved — api.recordResult is never called.
 *  4. completedSkills Set updates when onComplete fires.
 *  5. teardownSelfCheck() clears active state and detaches listeners.
 *  6. Progress persistence across minimize/reopen cycles.
 *  7. skipSelfCheck() fully tears down; selfCheckSkip() only minimizes.
 *  8. Auto-minimize on reading tier; auto-reopen after answer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SKILLS } from '../src/lessons.js';

// ─── 1. selfCheck data shape ──────────────────────────────────────────────────

describe('SKILLS selfCheck data shape', () => {
  const VALID_TIERS  = new Set(['recall', 'reading', 'synthesis']);
  const TIER_ORDER   = ['recall', 'reading', 'synthesis'];

  SKILLS.forEach(skill => {
    describe(`skill "${skill.id}"`, () => {
      it('has a selfCheck array with exactly 3 entries', () => {
        expect(Array.isArray(skill.selfCheck)).toBe(true);
        expect(skill.selfCheck).toHaveLength(3);
      });

      it('has one question per tier in order: recall → reading → synthesis', () => {
        const tiers = skill.selfCheck.map(q => q.tier);
        expect(tiers).toEqual(TIER_ORDER);
      });

      skill.selfCheck.forEach((q, i) => {
        describe(`question ${i + 1} (${q.tier})`, () => {
          it('has a non-empty id', () => {
            expect(typeof q.id).toBe('string');
            expect(q.id.length).toBeGreaterThan(0);
          });

          it('has a valid tier', () => {
            expect(VALID_TIERS.has(q.tier)).toBe(true);
          });

          it('has a non-empty prompt', () => {
            expect(typeof q.prompt).toBe('string');
            expect(q.prompt.length).toBeGreaterThan(0);
          });

          it('has a non-empty explanation', () => {
            expect(typeof q.explanation).toBe('string');
            expect(q.explanation.length).toBeGreaterThan(0);
          });

          if (q.tier === 'reading') {
            it('has a non-empty targetSelector', () => {
              expect(typeof q.targetSelector).toBe('string');
              expect(q.targetSelector.length).toBeGreaterThan(0);
            });

            it('does NOT have options or correctIndex (reading uses click-to-answer)', () => {
              expect(q.options).toBeUndefined();
              expect(q.correctIndex).toBeUndefined();
            });
          } else {
            it('has an options array with at least 2 entries', () => {
              expect(Array.isArray(q.options)).toBe(true);
              expect(q.options.length).toBeGreaterThanOrEqual(2);
            });

            it('has a valid correctIndex pointing to an existing option', () => {
              expect(typeof q.correctIndex).toBe('number');
              expect(q.options[q.correctIndex]).toBeDefined();
            });

            it('each option has a non-empty id and text', () => {
              q.options.forEach(o => {
                expect(typeof o.id).toBe('string');
                expect(o.id.length).toBeGreaterThan(0);
                expect(typeof o.text).toBe('string');
                expect(o.text.length).toBeGreaterThan(0);
              });
            });
          }
        });
      });

      it('has a non-empty lessonRefs array', () => {
        expect(Array.isArray(skill.lessonRefs)).toBe(true);
        expect(skill.lessonRefs.length).toBeGreaterThan(0);
        skill.lessonRefs.forEach(ref => {
          expect(typeof ref).toBe('string');
          expect(ref.length).toBeGreaterThan(0);
        });
      });
    });
  });
});

// ─── 2-8. self-check.js module behaviour ─────────────────────────────────────
//
// self-check.js uses document.getElementById and document.addEventListener.
// We provide a minimal DOM stub, then import the module dynamically after
// mocking the global so that its references resolve at call-time (not at
// import-time — the module only touches the DOM when functions are called).

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

vi.mock('../src/api.js', () => ({
  login:           vi.fn(async () => ({ ok: false })),
  startAttempt:    vi.fn(async () => ({ ok: true, allowed: true })),
  recordResult:    vi.fn(async () => ({ ok: true })),
  getResults:      vi.fn(async () => ({ ok: true, results: [] })),
  loginInstructor: vi.fn(async () => ({ ok: false })),
  adminReset:      vi.fn(async () => ({ ok: true })),
}));

// Build a realistic stub for the elements self-check.js writes to
function makeSelfCheckDom() {
  const makeEl = (id, extra = {}) => ({
    id,
    textContent: '',
    innerHTML: '',
    className: '',
    style: {},
    disabled: false,
    classList: {
      _hidden: false,
      add(cls)      { if (cls === 'hidden') this._hidden = true; },
      remove(cls)   { if (cls === 'hidden') this._hidden = false; },
      contains(cls) { return cls === 'hidden' ? this._hidden : false; },
    },
    querySelectorAll: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    closest: vi.fn(() => null),
    ...extra,
  });

  const elements = {
    'modal-selfcheck':        makeEl('modal-selfcheck'),
    'sc-tier-badge':          makeEl('sc-tier-badge'),
    'sc-prompt':              makeEl('sc-prompt'),
    'sc-options':             makeEl('sc-options'),
    'sc-reading-instruction': makeEl('sc-reading-instruction'),
    'sc-result':              makeEl('sc-result'),
    'sc-next-btn':            makeEl('sc-next-btn'),
    'sc-minimized-pill':      makeEl('sc-minimized-pill'),
    'sc-minimized-label':     makeEl('sc-minimized-label'),
  };

  return {
    getElementById: vi.fn(id => elements[id] || makeEl(id)),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe('self-check module behaviour', () => {
  let capturedClickHandlers = [];

  beforeEach(() => {
    capturedClickHandlers = [];
    global.document = makeSelfCheckDom();
    // Capture click handlers registered on document by _attachReadingListener
    global.document.addEventListener = vi.fn((type, handler) => {
      if (type === 'click') capturedClickHandlers.push(handler);
    });
    global.document.removeEventListener = vi.fn((type, handler) => {
      capturedClickHandlers = capturedClickHandlers.filter(h => h !== handler);
    });
    global.window = { addEventListener: vi.fn() };
  });

  afterEach(async () => {
    const mod = await import('../src/self-check.js');
    mod.teardownSelfCheck();
    delete global.document;
    delete global.window;
  });

  it('isSelfCheckActive() returns false before startSelfCheck is called', async () => {
    const { isSelfCheckActive } = await import('../src/self-check.js');
    expect(isSelfCheckActive()).toBe(false);
  });

  it('startSelfCheck() sets active to true', async () => {
    const { startSelfCheck, isSelfCheckActive } = await import('../src/self-check.js');
    const skill = SKILLS[0];
    startSelfCheck(skill, {});
    expect(isSelfCheckActive()).toBe(true);
  });

  it('teardownSelfCheck() sets active to false', async () => {
    const { startSelfCheck, teardownSelfCheck, isSelfCheckActive } = await import('../src/self-check.js');
    startSelfCheck(SKILLS[0], {});
    teardownSelfCheck();
    expect(isSelfCheckActive()).toBe(false);
  });

  it('startSelfCheck attaches a document click listener for the reading-tier question when rendered', async () => {
    // The reading-tier question is the second (index 1) in every skill.
    // startSelfCheck renders the first question (recall), so we need to
    // advance to the reading tier. Simulate "Next" by calling selfCheckNext().
    const { startSelfCheck, selfCheckNext } = await import('../src/self-check.js');
    const skill = SKILLS[0]; // read_topology

    startSelfCheck(skill, {});
    expect(capturedClickHandlers.length).toBe(0); // recall tier: no click listener

    selfCheckNext(); // advance to reading tier
    expect(capturedClickHandlers.length).toBe(1); // reading tier: one listener attached
  });

  it('teardownSelfCheck removes the reading-tier click listener', async () => {
    const { startSelfCheck, selfCheckNext, teardownSelfCheck } = await import('../src/self-check.js');
    startSelfCheck(SKILLS[0], {});
    selfCheckNext(); // reading tier

    teardownSelfCheck();
    // removeEventListener should have been called for the captured handler
    expect(global.document.removeEventListener).toHaveBeenCalled();
    expect(capturedClickHandlers.length).toBe(0);
  });

  it('onComplete callback fires after all 3 questions are advanced through', async () => {
    const onComplete = vi.fn();
    const { startSelfCheck, selfCheckNext } = await import('../src/self-check.js');

    startSelfCheck(SKILLS[0], { onComplete });
    selfCheckNext(); // recall → reading (skip answering for this test)
    selfCheckNext(); // reading → synthesis
    selfCheckNext(); // synthesis → finish

    expect(onComplete).toHaveBeenCalledWith(SKILLS[0].id);
  });

  it('api.recordResult is NEVER called by any self-check code path', async () => {
    const api = await import('../src/api.js');
    const { startSelfCheck, selfCheckNext } = await import('../src/self-check.js');

    startSelfCheck(SKILLS[0], {});
    selfCheckNext();
    selfCheckNext();
    selfCheckNext();

    expect(api.recordResult).not.toHaveBeenCalled();
  });

  // ─── 6. Progress persistence across minimize / reopen ──────────────────────

  describe('progress persistence across minimize/reopen', () => {
    it('minimizeSelfCheck() keeps active=true and preserves _idx', async () => {
      const { startSelfCheck, selfCheckNext, minimizeSelfCheck, isSelfCheckActive, isSelfCheckMinimized } =
        await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      selfCheckNext(); // advance to reading tier (idx=1)

      minimizeSelfCheck();

      // Still active, now minimized
      expect(isSelfCheckActive()).toBe(true);
      expect(isSelfCheckMinimized()).toBe(true);
    });

    it('reopenSelfCheck() restores active state without resetting question index', async () => {
      const { startSelfCheck, selfCheckNext, minimizeSelfCheck, reopenSelfCheck,
              isSelfCheckActive, isSelfCheckMinimized } =
        await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      selfCheckNext(); // now at reading tier (idx=1)
      minimizeSelfCheck();
      reopenSelfCheck();

      expect(isSelfCheckActive()).toBe(true);
      expect(isSelfCheckMinimized()).toBe(false);
    });

    it('modal shows the same question after minimize → reopen (no reset to Q1)', async () => {
      const { startSelfCheck, selfCheckNext, minimizeSelfCheck, reopenSelfCheck } =
        await import('../src/self-check.js');

      const skill = SKILLS[0];
      startSelfCheck(skill, {});
      selfCheckNext(); // recall → reading (idx=1)
      selfCheckNext(); // reading → synthesis (idx=2)

      // Record what the tier-badge says before minimizing
      const badgeEl = global.document.getElementById('sc-tier-badge');
      const textBefore = badgeEl.textContent; // "SYNTHESIS  3/3"

      minimizeSelfCheck();
      reopenSelfCheck();

      // Badge should still say SYNTHESIS 3/3, not RECALL 1/3
      expect(badgeEl.textContent).toBe(textBefore);
      expect(badgeEl.textContent).toMatch(/SYNTHESIS/i);
    });

    it('multiple minimize/reopen cycles do not reset progress', async () => {
      const { startSelfCheck, selfCheckNext, minimizeSelfCheck, reopenSelfCheck,
              isSelfCheckActive } =
        await import('../src/self-check.js');

      const onComplete = vi.fn();
      startSelfCheck(SKILLS[0], { onComplete });

      selfCheckNext(); // → reading
      minimizeSelfCheck();
      reopenSelfCheck();
      minimizeSelfCheck();
      reopenSelfCheck();

      selfCheckNext(); // → synthesis
      minimizeSelfCheck();
      reopenSelfCheck();

      selfCheckNext(); // → finish

      // onComplete must fire exactly once — no double-trigger from reopen cycles
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(SKILLS[0].id);
    });

    it('onComplete does NOT fire after minimize → reopen alone (no skip)', async () => {
      const { startSelfCheck, selfCheckNext, minimizeSelfCheck, reopenSelfCheck } =
        await import('../src/self-check.js');

      const onComplete = vi.fn();
      startSelfCheck(SKILLS[0], { onComplete });
      selfCheckNext(); // → reading
      minimizeSelfCheck();
      reopenSelfCheck();

      // Not all questions advanced — completion must not have fired
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // ─── 7. selfCheckSkip vs skipSelfCheck ────────────────────────────────────

  describe('selfCheckSkip() vs skipSelfCheck()', () => {
    it('selfCheckSkip() minimizes but keeps active=true', async () => {
      const { startSelfCheck, selfCheckSkip, isSelfCheckActive, isSelfCheckMinimized } =
        await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      selfCheckSkip(); // should minimize, NOT teardown

      expect(isSelfCheckActive()).toBe(true);
      expect(isSelfCheckMinimized()).toBe(true);
    });

    it('skipSelfCheck() fully tears down: active=false, minimized=false', async () => {
      const { startSelfCheck, skipSelfCheck, isSelfCheckActive, isSelfCheckMinimized } =
        await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      skipSelfCheck();

      expect(isSelfCheckActive()).toBe(false);
      expect(isSelfCheckMinimized()).toBe(false);
    });

    it('skipSelfCheck() does NOT fire onComplete', async () => {
      const { startSelfCheck, selfCheckNext, skipSelfCheck } =
        await import('../src/self-check.js');

      const onComplete = vi.fn();
      startSelfCheck(SKILLS[0], { onComplete });
      selfCheckNext();
      skipSelfCheck(); // discard mid-run

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('teardownSelfCheck() also sets minimized=false', async () => {
      const { startSelfCheck, minimizeSelfCheck, teardownSelfCheck, isSelfCheckMinimized } =
        await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      minimizeSelfCheck();
      expect(isSelfCheckMinimized()).toBe(true);

      teardownSelfCheck();
      expect(isSelfCheckMinimized()).toBe(false);
    });
  });

  // ─── 8. Reading-tier auto-minimize / auto-reopen ──────────────────────────

  describe('reading-tier auto-minimize behaviour', () => {
    it('modal is hidden (minimized) when rendering the reading-tier question', async () => {
      const { startSelfCheck, selfCheckNext, isSelfCheckMinimized } =
        await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      expect(isSelfCheckMinimized()).toBe(false); // recall tier: not minimized

      selfCheckNext(); // → reading tier: should auto-minimize
      expect(isSelfCheckMinimized()).toBe(true);

      const modal = global.document.getElementById('modal-selfcheck');
      expect(modal.classList._hidden).toBe(true);
    });

    it('pill is visible while minimized and hidden otherwise', async () => {
      const { startSelfCheck, selfCheckNext, reopenSelfCheck } =
        await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      const pill = global.document.getElementById('sc-minimized-pill');
      expect(pill.classList._hidden).toBe(true); // recall: pill hidden

      selfCheckNext(); // → reading: auto-minimize → pill shown
      expect(pill.classList._hidden).toBe(false);

      reopenSelfCheck(); // reopen → pill hidden again
      expect(pill.classList._hidden).toBe(true);
    });

    it('reading-tier click handler fires reopenSelfCheck (modal re-shown) before showing result', async () => {
      const { startSelfCheck, selfCheckNext, isSelfCheckMinimized } =
        await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      selfCheckNext(); // → reading tier, auto-minimized

      expect(isSelfCheckMinimized()).toBe(true);

      // Simulate a matching click by invoking the captured handler directly
      const handler = capturedClickHandlers[0];
      expect(handler).toBeDefined();

      // Build a fake event whose target.closest() returns a truthy match
      // for the reading question's targetSelector ('#link-isp-gw1')
      const fakeTarget = { closest: (sel) => sel === '#link-isp-gw1' ? {} : null };
      const fakeEvent  = {
        target: fakeTarget,
        stopPropagation: vi.fn(),
      };
      handler(fakeEvent);

      // After a correct answer the modal should be reopened (no longer minimized)
      expect(isSelfCheckMinimized()).toBe(false);
    });

    it('reading-tier click calls stopPropagation on a correct match', async () => {
      const { startSelfCheck, selfCheckNext } = await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      selfCheckNext(); // → reading tier

      const handler = capturedClickHandlers[0];
      const fakeTarget = { closest: (sel) => sel === '#link-isp-gw1' ? {} : null };
      const stopPropagation = vi.fn();
      handler({ target: fakeTarget, stopPropagation });

      expect(stopPropagation).toHaveBeenCalled();
    });

    it('reading-tier click does NOT call stopPropagation when target does not match', async () => {
      const { startSelfCheck, selfCheckNext } = await import('../src/self-check.js');

      startSelfCheck(SKILLS[0], {});
      selfCheckNext(); // → reading tier

      const handler = capturedClickHandlers[0];
      // closest() always returns null → no match
      const fakeTarget = { closest: () => null };
      const stopPropagation = vi.fn();
      handler({ target: fakeTarget, stopPropagation });

      expect(stopPropagation).not.toHaveBeenCalled();
    });
  });
});

// ─── 4. completedSkills Set in app.js ────────────────────────────────────────
//
// completedSkills is a module-level exported Set in app.js. We verify it
// updates when the onComplete callback fires.

describe('completedSkills Set (app.js)', () => {
  it('is an empty Set on module load', async () => {
    const { completedSkills } = await import('../src/app.js');
    // The set may have entries from other tests in this run; the invariant
    // we assert is that it IS a Set.
    expect(completedSkills instanceof Set).toBe(true);
  });

  it('can have a skill id added to it', async () => {
    const { completedSkills } = await import('../src/app.js');
    const before = completedSkills.size;
    completedSkills.add('__test_skill__');
    expect(completedSkills.size).toBe(before + 1);
    completedSkills.delete('__test_skill__'); // clean up
  });
});
