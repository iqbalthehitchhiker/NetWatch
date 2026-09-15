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
 *   teardownSelfCheck()                — cancel / clean up (called on exitSimulation)
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
 *   #sc-skip-btn              — "Skip" button
 */

// ─── Module state ─────────────────────────────────────────────────────────────

let _active        = false;   // true while a self-check is in progress
let _skill         = null;    // the SKILL object currently being checked
let _questions     = [];      // ordered selfCheck questions for this skill
let _idx           = 0;       // current question index (0-based)
let _answered      = false;   // has the current question been answered?
let _clickHandler  = null;    // the reading-tier document click listener (teardown ref)
let _callbacks     = {};      // { onComplete, onQuestionResult }

// ─── Public API ───────────────────────────────────────────────────────────────

export function isSelfCheckActive() { return _active; }

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
  _callbacks = callbacks;
  _active    = true;

  _openModal();
  _renderQuestion();
}

/**
 * Tear down the self-check: detach any listeners, close the modal, reset state.
 * Called by exitSimulation() and by the "Skip" button.
 */
export function teardownSelfCheck() {
  _detachReadingListener();
  _active   = false;
  _skill    = null;
  _questions = [];
  _idx      = 0;
  _answered = false;
  _callbacks = {};

  const modal = _el('modal-selfcheck');
  if (modal) modal.classList.add('hidden');
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

  // Attach the scoped click listener
  _attachReadingListener(q);
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

    _answered = true;
    _detachReadingListener();
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
  _active = false;
  _detachReadingListener();

  const modal = _el('modal-selfcheck');
  if (modal) modal.classList.add('hidden');

  if (typeof _callbacks.onComplete === 'function') {
    _callbacks.onComplete(_skill.id);
  }
}

// ─── Internal: modal open/close, next/skip wiring ────────────────────────────

function _openModal() {
  const modal = _el('modal-selfcheck');
  if (modal) modal.classList.remove('hidden');
}

// Called by index.html's "Next Question →" / "Finish ✓" button.
export function selfCheckNext() {
  if (!_active) return;
  _idx++;
  _renderQuestion();
}

// Called by index.html's "Skip" button.
export function selfCheckSkip() {
  teardownSelfCheck();
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function _el(id) { return document.getElementById(id); }
