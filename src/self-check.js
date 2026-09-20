/**
 * src/self-check.js
 *
 * Drives the three-question self-check sequence attached to each SKILL entry.
 * Fully decoupled from Quiz mode: no auth, no attempt gate, no POST to any
 * endpoint.  Progression is recall → reading → synthesis (the tier order
 * defined on each selfCheck entry).
 *
 * Architecture note: the reading-tier "click to answer" listener is kept here
 * rather than reusing explain-content-bridge.js because the bridge's
 * showExplainPanel() always writes to #ep-title/#ep-body and opens the panel.
 * We need to intercept a click, mark correct/incorrect in the self-check modal,
 * and NOT open the explain panel as a side-effect.  A separate scoped listener
 * is cleaner and avoids coupling two independent concerns.
 *
 * Public API (all functions exported):
 *   startSelfCheck(skill, callbacks)   — begin a 3-question sequence
 *   isSelfCheckActive()                — true while a sequence is running
 *   getSelfCheckProgress()             — { active, idx, total } snapshot
 *   teardownSelfCheck()                — cancel / clean up (called on exitSimulation)
 *   minimizeSelfCheck()                — hide modal without losing progress
 *   reopenSelfCheck()                  — restore modal after minimizing
 *
 * Callbacks shape:
 *   { onComplete(skillId), onQuestionResult(skillId, questionId, correct) }
 *   Both are optional; omitting them is safe.
 *
 * DOM contract (elements that must exist in index.html):
 *   #modal-selfcheck          — modal wrapper (.modal-overlay)
 *   #sc-tier-badge            — e.g. "RECALL 1/3"
 *   #sc-prompt                — question prompt text
 *   #sc-options               — MCQ option container (recall/synthesis)
 *   #sc-reading-instruction   — instruction text for reading tier
 *   #sc-result                — feedback area (.diag-result)
 *   #sc-next-btn              — "Next Question →" / "Finish" button
 *   #sc-minimized-pill        — floating pill shown while modal is hidden
 *   #sc-minimized-label       — text label inside the pill
 */

// ─── Module state ─────────────────────────────────────────────────────────────

let _active        = false;   // true while a self-check is in progress
let _skill         = null;    // the SKILL object currently being checked
let _questions     = [];      // ordered selfCheck questions for this skill
let _idx           = 0;       // current question index (0-based)
let _answered      = false;   // has the current question been answered?
let _minimized     = false;   // true when modal is hidden but progress is preserved
let _clickHandler  = null;    // the reading-tier document click listener (teardown ref)
let _callbacks     = {};      // { onComplete, onQuestionResult }

// ─── Public API ───────────────────────────────────────────────────────────────

export function isSelfCheckActive()  { return _active; }
export function isSelfCheckMinimized() { return _minimized; }

/**
 * Return the current self-check progress snapshot for external callers
 * (e.g. to decide whether to show a Resume button).
 *
 * @returns {{ active: boolean, idx: number, total: number }}
 */
export function getSelfCheckProgress() {
  return {
    active: _active,
    idx:    _idx,
    total:  _questions.length,
  };
}

/**
 * Start a self-check sequence for the given skill.
 * Safe to call multiple times — tears down any in-progress check first.
 *
 * @param {object} skill      — one entry from SKILLS (must have selfCheck array)
 * @param {object} callbacks  — { onComplete(skillId), onQuestionResult(skillId, qId, correct) }
 */
export function startSelfCheck(skill, callbacks = {}) {
  teardownSelfCheck();

  if (!skill.selfCheck || skill.selfCheck.length === 0) return;

  _skill     = skill;
  _questions = skill.selfCheck.slice();   // own copy, original tier order
  _idx       = 0;
  _answered  = false;
  _minimized = false;
  _callbacks = callbacks;
  _active    = true;

  _openModal();
  _renderQuestion();
}

/**
 * Minimize: hide the modal overlay without resetting any progress state.
 * The floating pill (#sc-minimized-pill) becomes visible so the student
 * knows they can resume.  Called automatically when a reading-tier question
 * is rendered, and available as a manual action via the ✕ button.
 */
export function minimizeSelfCheck() {
  if (!_active) return;
  _minimized = true;
  const modal = _el('modal-selfcheck');
  if (modal) modal.classList.add('hidden');
  _updatePill();
}

/**
 * Reopen the modal after minimizing.  State (_idx, _answered, _questions) is
 * fully preserved — the student resumes exactly where they left off.
 * Called by the pill's "Resume" button and automatically after a reading-tier
 * answer is registered.
 */
export function reopenSelfCheck() {
  if (!_active) return;
  _minimized = false;
  _openModal();
  _updatePill();
}

/**
 * Tear down the self-check: detach any listeners, close the modal, reset ALL
 * state.  Called by exitSimulation() and by the explicit "Skip" text button.
 * This is the only path that resets _idx / _skill / _callbacks.
 */
export function teardownSelfCheck() {
  _detachReadingListener();
  _active    = false;
  _minimized = false;
  _skill     = null;
  _questions = [];
  _idx       = 0;
  _answered  = false;
  _callbacks = {};

  const modal = _el('modal-selfcheck');
  if (modal) modal.classList.add('hidden');
  _updatePill();
}

// ─── Internal: rendering ──────────────────────────────────────────────────────

function _renderQuestion() {
  if (_idx >= _questions.length) {
    _finish();
    return;
  }

  const q = _questions[_idx];
  _answered = false;
  _detachReadingListener();

  // Tier badge  e.g. "RECALL  1/3"
  const badge = _el('sc-tier-badge');
  if (badge) badge.textContent = `${q.tier.toUpperCase()}  ${_idx + 1}/${_questions.length}`;

  // Prompt
  const prompt = _el('sc-prompt');
  if (prompt) prompt.textContent = q.prompt;

  // Clear result area
  const result = _el('sc-result');
  if (result) { result.className = 'diag-result'; result.innerHTML = ''; }

  // Next button state
  const nextBtn = _el('sc-next-btn');
  if (nextBtn) {
    nextBtn.disabled    = true;
    nextBtn.textContent = _idx < _questions.length - 1 ? 'Next Question →' : 'Finish ✓';
  }

  if (q.tier === 'reading') {
    _renderReadingTier(q);
  } else {
    _renderMcqTier(q);
  }
}

function _renderMcqTier(q) {
  // Show options, hide reading instruction
  const optionsEl = _el('sc-options');
  const instrEl   = _el('sc-reading-instruction');
  if (instrEl) instrEl.style.display = 'none';
  if (!optionsEl) return;

  optionsEl.style.display = '';
  optionsEl.innerHTML = q.options.map((o, i) => `
    <div class="diag-option sc-option" data-idx="${i}" role="button" tabindex="0"
         aria-label="Option ${i + 1}: ${o.text}">
      <span class="sc-option-letter">${String.fromCharCode(65 + i)}.</span>
      ${o.text}
    </div>
  `).join('');

  // Delegated click on options container
  optionsEl.addEventListener('click', _handleMcqClick, { once: false });
}

function _renderReadingTier(q) {
  // Hide MCQ options, show reading instruction
  const optionsEl = _el('sc-options');
  const instrEl   = _el('sc-reading-instruction');
  if (optionsEl) { optionsEl.style.display = 'none'; optionsEl.innerHTML = ''; }
  if (instrEl)   { instrEl.style.display = ''; instrEl.textContent = q.prompt; }

  // Attach the scoped click listener before minimizing so it's live as soon
  // as the modal disappears.
  _attachReadingListener(q);

  // Auto-minimize: hide the modal so the target element is reachable.
  // The pill shows the student what to do and lets them reopen if needed.
  minimizeSelfCheck();
}

// ─── Internal: event handling ─────────────────────────────────────────────────

function _handleMcqClick(e) {
  if (_answered) return;

  const optEl = e.target.closest('.sc-option[data-idx]');
  if (!optEl) return;

  const q           = _questions[_idx];
  const chosenIdx   = parseInt(optEl.dataset.idx, 10);
  const correct     = chosenIdx === q.correctIndex;

  _answered = true;

  // Style all options
  const optionsEl = _el('sc-options');
  if (optionsEl) {
    optionsEl.querySelectorAll('.sc-option').forEach((el, i) => {
      if (i === q.correctIndex)    el.classList.add('correct');
      else if (i === chosenIdx)    el.classList.add('wrong');
    });
    // Remove the listener so double-clicks don't fire again
    optionsEl.removeEventListener('click', _handleMcqClick);
  }

  _showResult(correct, q.explanation);
  _fireQuestionResult(q.id, correct);
}

function _attachReadingListener(q) {
  _clickHandler = (e) => {
    if (!_active || _answered) return;

    // Check if the clicked element matches the targetSelector.
    // closest() handles both the element itself and its children.
    const matched = e.target.closest(q.targetSelector);
    if (!matched) return;

    // Stop propagation so bubble-phase explain-panel delegation does not
    // also fire for the same click (e.g. .alert-item and packet table rows
    // are both explain-panel targets and reading-tier targets).
    e.stopPropagation();

    _answered = true;
    _detachReadingListener();

    // Reopen the self-check modal to show the result, then render feedback.
    reopenSelfCheck();
    _showResult(true, q.explanation);
    _fireQuestionResult(q.id, true);
  };

  document.addEventListener('click', _clickHandler, { capture: true });
}

function _detachReadingListener() {
  if (_clickHandler) {
    document.removeEventListener('click', _clickHandler, { capture: true });
    _clickHandler = null;
  }
}

// ─── Internal: result display and progression ─────────────────────────────────

function _showResult(correct, explanation) {
  const result = _el('sc-result');
  if (result) {
    result.className = `diag-result show ${correct ? 'ok' : 'no'}`;
    result.innerHTML = correct
      ? `<b>Correct.</b> ${explanation}`
      : `<b>Not quite.</b> ${explanation}`;
  }

  const nextBtn = _el('sc-next-btn');
  if (nextBtn) nextBtn.disabled = false;
}

function _fireQuestionResult(questionId, correct) {
  if (typeof _callbacks.onQuestionResult === 'function') {
    _callbacks.onQuestionResult(_skill.id, questionId, correct);
  }
}

function _finish() {
  _active    = false;
  _minimized = false;
  _detachReadingListener();

  const modal = _el('modal-selfcheck');
  if (modal) modal.classList.add('hidden');
  _updatePill();

  // PART C: Show completion summary with student name and score
  // This is ONLY for display — never sent to backend, never stored permanently
  if (typeof _callbacks.onComplete === 'function') {
    _callbacks.onComplete(_skill.id);
  }
  
  _showCompletionSummary();
}

/**
 * Display a one-time completion message after finishing all self-check questions.
 * Uses the ephemeral tally from app.js (not stored, not sent to backend).
 * Student-facing only — does NOT appear in Manage Students or any instructor view.
 */
function _showCompletionSummary() {
  // Skip toast in test environment (JSDOM may not fully support createElement)
  if (typeof document === 'undefined' || !document.createElement || !document.body) {
    return;
  }
  
  // Get student name from session storage (if available)
  let studentName = 'there';
  try {
    const session = JSON.parse(sessionStorage.getItem('nw_session') || '{}');
    if (session.name) {
      studentName = session.name.split(' ')[0]; // First name only
    }
  } catch (_) { /* ignore */ }
  
  const skillName = _skill ? (_skill.name || _skill.id) : 'this skill';
  
  // Get the score from app.js's tally
  // We'll pass this through the callback context
  const currentTally = window.getScTally ? window.getScTally() : 0;
  
  const allCorrect = _questions.length > 0 && _questions.every((_, idx) => idx < _questions.length);
  
  let message;
  if (allCorrect && currentTally >= _questions.length * 10) {
    message = `Nice work, ${studentName}! You answered all questions correctly and scored ${currentTally} points on ${skillName}!`;
  } else if (currentTally > 0) {
    message = `Good effort, ${studentName}! You completed ${skillName} and scored ${currentTally} points. Review the explanations to strengthen your understanding.`;
  } else {
    message = `You've completed the self-check for ${skillName}. Review the explanations to build your understanding.`;
  }
  
  // Show a temporary toast/banner (not a blocking alert)
  _showCompletionToast(message);
}

/**
 * Show a temporary completion toast message that auto-dismisses.
 */
function _showCompletionToast(message) {
  const existing = document.getElementById('sc-completion-toast');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
  
  const toast = document.createElement('div');
  toast.id = 'sc-completion-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--healthy);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-size: 14px;
    font-family: var(--font-sans);
    max-width: 500px;
    text-align: center;
    z-index: 1000;
    animation: slideUp 0.3s ease-out;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 5000);
}

// ─── Internal: modal open/close helpers ──────────────────────────────────────

function _openModal() {
  const modal = _el('modal-selfcheck');
  if (modal) modal.classList.remove('hidden');
}

/**
 * Update the minimized pill visibility and label to match current state.
 * The pill is shown only when _active && _minimized.
 */
function _updatePill() {
  const pill = _el('sc-minimized-pill');
  if (!pill) return;

  if (_active && _minimized) {
    const label = _el('sc-minimized-label');
    if (label && _questions[_idx]) {
      label.textContent = `Self-Check · Q${_idx + 1}/${_questions.length} · Click target to answer`;
    }
    pill.classList.remove('hidden');
  } else {
    pill.classList.add('hidden');
  }
}

// ─── Public: wired to HTML buttons ───────────────────────────────────────────

// Called by index.html's "Next Question →" / "Finish ✓" button.
export function selfCheckNext() {
  if (!_active) return;
  _idx++;
  _renderQuestion();
}

/**
 * selfCheckSkip() — wired to the ✕ (close) button in the modal header.
 * Minimizes without losing progress so the student can resume.
 * This is NOT a full teardown — use skipSelfCheck() for that.
 */
export function selfCheckSkip() {
  minimizeSelfCheck();
}

/**
 * skipSelfCheck() — wired to the "Skip self-check" text button.
 * Full teardown: discards all progress and fires no callbacks.
 */
export function skipSelfCheck() {
  teardownSelfCheck();
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function _el(id) { return document.getElementById(id); }
