/**
 * src/app.js
 * Entry point and application controller.
 * Owns: screen routing, modal logic, explain panel, sim bootstrap, event wiring.
 */

import { LESSONS, SKILLS, DEVICE_TYPES } from './lessons.js';
import { EXPLAIN_CONTENT } from './explain-content.js';
import { createInitialState, tick, findNode, pushLog } from './engine.js';
import {
  setStudentSession, getSessionToken, getCurrentMode,
  getStudentName, getStudentNPM, clearStudentSession,
  setInstructorToken, getInstructorToken, clearInstructorToken,
} from './auth.js';
import * as api from './api.js';
import { validateLoginForm, formatWelcomeName, validateAdminResetForm } from './utils.js';
import { renderStatBar, renderDeviceGrid }  from './renderers/overview.js';
import { renderTopologySVG, renderTopologyColors } from './renderers/topology.js';
import { renderAlerts }  from './renderers/alerts.js';
import { renderPackets } from './renderers/packets.js';
import { initCharts, updateCharts } from './renderers/charts.js';
import { renderLogs }    from './renderers/logs.js';
import {
  startSelfCheck, teardownSelfCheck, isSelfCheckActive,
  selfCheckNext, selfCheckSkip, skipSelfCheck,
  minimizeSelfCheck, reopenSelfCheck,
} from './self-check.js';

// ─── Module-level state ───────────────────────────────────────────────────────

let simState       = null;
let simTimer       = null;
let clockTimer     = null;
let packetFilter   = 'all';
let pendingLessonId = null;
let _pendingSkill   = null;   // skill whose self-check should run when student clicks the button

// ─── Teach-mode completion markers (in-memory, no backend) ───────────────────
// Tracks which skill IDs have had their self-check completed this session.
// Exported for test introspection.
export const completedSkills = new Set();

// ─── Explain Panel ────────────────────────────────────────────────────────────
// EXPLAIN_CONTENT is imported from ./explain-content.js (pure data, no DOM dependency)

export function showExplainPanel(key) {
  if (getCurrentMode() !== 'teach') return;
  const entry = EXPLAIN_CONTENT[key] || EXPLAIN_CONTENT['fallback'];
  document.getElementById('ep-title').textContent = entry.title;
  document.getElementById('ep-body').textContent  = entry.body;
  document.getElementById('explain-panel').classList.remove('hidden');
}

export function closeExplainPanel() {
  document.getElementById('explain-panel').classList.add('hidden');
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function closeAllModals() {
  ['modal-login','modal-blocked','modal-admin-reset',
   'modal-hint','modal-diagnosis','modal-device'].forEach(closeModal);
}

// ─── Landing screen ───────────────────────────────────────────────────────────

/**
 * showLessonSelectScreen()
 *
 * The canonical function for navigating TO the lesson-select screen.
 * Always shows #lesson-grid and hides #skill-grid, so no prior mode state
 * can bleed into this entry point.
 *
 * Rule: every navigation action that should land on "lesson select" calls
 * this function — never raw classList manipulation on #screen-select at
 * call sites. proceedToTeach() is the ONLY exception, because it
 * intentionally shows the skill grid instead.
 */
function showLessonSelectScreen() {
  document.getElementById('lesson-grid').style.display = '';
  document.getElementById('skill-grid').style.display  = 'none';
  document.getElementById('screen-select').classList.remove('hidden');
}

/**
 * showSkillSelectScreen()
 *
 * Mirror of showLessonSelectScreen() for the Teach path.
 * Atomically shows #skill-grid, hides #lesson-grid, and unhides #screen-select.
 * Called by exitSimulation() when the session mode is 'teach'.
 */
function showSkillSelectScreen() {
  document.getElementById('skill-grid').style.display  = '';
  document.getElementById('lesson-grid').style.display = 'none';
  document.getElementById('screen-select').classList.remove('hidden');
}

/**
 * proceedToLessons() — "Take a scenario" path from landing.
 * Goes to lesson select (quiz grid). Mode is already decided: Quiz.
 */
export function proceedToLessons() {
  sessionStorage.setItem('nw_intro_seen', '1');
  document.getElementById('screen-landing').classList.add('hidden');
  showLessonSelectScreen();
}

/**
 * proceedToTeach() — "Learn the tool" path from landing.
 * Goes to skill select (teach grid). Mode is already decided: Teach.
 * No login required.
 */
export function proceedToTeach() {
  sessionStorage.setItem('nw_intro_seen', '1');
  document.getElementById('screen-landing').classList.add('hidden');
  // Show skill grid, hide lesson grid — teach path
  document.getElementById('lesson-grid').style.display = 'none';
  document.getElementById('skill-grid').style.display  = '';
  document.getElementById('screen-select').classList.remove('hidden');
}

/**
 * Return to the landing screen from anywhere in the app.
 *
 * No confirmation prompt is shown, even mid-simulation in Quiz Mode.
 * Reasoning: the attempt counter is incremented server-side when the
 * simulation loads (POST /api/attempts), before any diagnosis is submitted.
 * Navigating away is therefore identical in effect to closing the tab —
 * the attempt is already counted, no result record exists yet. Adding a
 * prompt would imply the student can save or pause their attempt, which
 * is not supported. The cost of navigating away (one consumed attempt) is
 * the same whether or not a prompt is shown.
 */
export function goToLanding() {
  // Stop simulation timers and clean up session state (same as exitSimulation)
  stopSimTimers();
  clearStudentSession();
  clearInstructorToken();
  simState        = null;
  pendingLessonId = null;
  packetFilter    = 'all';

  document.body.classList.remove('quiz-mode');
  document.getElementById('topbar-mode-badge').classList.add('hidden');
  document.getElementById('topbar-welcome').classList.add('hidden');
  document.getElementById('topbar-div-mode').style.display = 'none';
  closeExplainPanel();
  closeAllModals();

  // Hide everything else, show landing
  document.getElementById('app').classList.remove('active');
  document.getElementById('screen-select').classList.add('hidden');

  // Clear the "seen" flag so the landing screen renders fully again
  sessionStorage.removeItem('nw_intro_seen');
  document.getElementById('screen-landing').classList.remove('hidden');

  // Scroll back to top in case the user had scrolled down
  window.scrollTo(0, 0);
}

// ─── Lesson select screen ─────────────────────────────────────────────────────

function renderLessonSelect() {
  const grid = document.getElementById('lesson-grid');
  grid.innerHTML = LESSONS.map(l => `
    <div class="lesson-card" style="--accent:${l.accent}" data-lesson-id="${l.id}">
      <span class="lesson-diff diff-${l.difficulty.toLowerCase()}">${l.difficulty}</span>
      <div class="lesson-card-title">${l.title}</div>
      <div class="lesson-card-focus">Focus device: ${l.focus}</div>
      <div class="lesson-card-desc">${l.description}</div>
      <div class="lesson-card-foot">
        <div class="lesson-card-topo">—</div>
        <div class="lesson-start-btn">Start Lesson →</div>
      </div>
    </div>
  `).join('');

  // Delegated click — arriving here means Quiz mode (user took "Take a scenario" path).
  // Go straight to login; no mode-select modal.
  grid.addEventListener('click', e => {
    const card = e.target.closest('.lesson-card[data-lesson-id]');
    if (!card) return;
    pendingLessonId = card.dataset.lessonId;
    openModal('modal-login');
  });
}

// ─── Skill select screen (Teach mode entry) ───────────────────────────────────

function renderSkillSelect() {
  const grid = document.getElementById('skill-grid');
  grid.innerHTML = SKILLS.map(s => `
    <div class="lesson-card" style="--accent:#06B6D4" data-skill-id="${s.id}">
      ${completedSkills.has(s.id) ? '<span class="skill-card-done">✓ COMPLETE</span>' : ''}
      <div class="lesson-card-title">${s.title}</div>
      <div class="lesson-card-desc">${s.body}</div>
      <div class="lesson-card-foot">
        <div class="lesson-card-topo">${s.targetPanel ? 'Panel: ' + s.targetPanel : 'General'}</div>
        <div class="lesson-start-btn">Practice →</div>
      </div>
      ${s.lessonRefs && s.lessonRefs.length
        ? `<div style="margin-top:10px;font-size:10px;color:var(--muted);font-family:var(--font-mono);">Comes up in: ${s.lessonRefs.join(', ')}</div>`
        : ''}
    </div>
  `).join('');

  // Delegated click — launch simulation in Teach mode, then start self-check
  grid.addEventListener('click', e => {
    const card = e.target.closest('.lesson-card[data-skill-id]');
    if (!card) return;
    const skillId = card.dataset.skillId;
    const skill   = SKILLS.find(s => s.id === skillId);
    if (!skill) return;

    setStudentSession(null, null, null, 'teach');
    // Use the lesson whose incident best matches the skill's targetPanel.
    // topology/alerts/packets → ddos_edge (branch_office, vivid link/alert/packet signals)
    // charts → db_slowdown (chart signals — flat traffic, climbing CPU — are the key story)
    const lessonIdMap = {
      topology: 'ddos_edge',
      charts:   'db_slowdown',
      alerts:   'ddos_edge',
      packets:  'ddos_edge',
    };
    const lessonId = lessonIdMap[skill.targetPanel] || LESSONS[0].id;
    launchSimulation(lessonId);
    // Self-check is now triggered by the student clicking "🎯 Self-Check"
    // in the lesson bar, not automatically on simulation start.
    // Store the current skill so openSelfCheck() can find it.
    _pendingSkill = skill;
  });
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

export function submitLogin() {
  const npm      = document.getElementById('login-npm').value.trim();
  const password = document.getElementById('login-password').value;
  const result   = validateLoginForm(npm, password);

  _setLoginErrors(result.npmErr, result.passwordErr, null);
  if (!result.ok) return;

  // Show loading state
  const btn = document.getElementById('login-submit-btn');
  btn.disabled   = true;
  btn.textContent = 'Signing in…';

  api.login(npm, password).then(res => {
    btn.disabled   = false;
    btn.textContent = 'Sign In →';
    if (res.ok) {
      setStudentSession(res.token, res.name, npm, 'quiz');
      closeModal('modal-login');
      _startAttemptGate(pendingLessonId);
    } else if (res.status === 401) {
      _setLoginErrors(null, null, 'Invalid NPM or password');
    } else {
      _setLoginErrors(null, null, 'Login could not be completed — please try again');
    }
  });
}

function _setLoginErrors(npmErr, passwordErr, generalErr) {
  _setFieldError('login-npm-err',      npmErr);
  _setFieldError('login-password-err', passwordErr);
  _setFieldError('login-general-err',  generalErr);
}

export function backFromLogin() {
  document.getElementById('login-npm').value      = '';
  document.getElementById('login-password').value = '';
  _setLoginErrors(null, null, null);
  closeModal('modal-login');
  // Return to Lesson Select (Quiz grid) — no mode modal exists any more.
  showLessonSelectScreen();
}

// ─── Attempt Gate ─────────────────────────────────────────────────────────────

async function _startAttemptGate(lessonId) {
  const res = await api.startAttempt(lessonId);
  if (!res.ok) {
    _setLoginErrors(null, null, res.error || 'Could not start attempt — please try again');
    openModal('modal-login'); // re-show login with error
    return;
  }
  if (res.allowed) {
    launchSimulation(lessonId);
  } else {
    _showBlockedScreen(lessonId);
  }
}

async function _showBlockedScreen(lessonId) {
  const npm  = getStudentNPM();
  const name = getStudentName();
  document.getElementById('blocked-identity').textContent =
    `Name: ${name || '—'}  ·  NPM: ${npm || '—'}`;

  // Show prior correct result if any
  let bestHtml = '';
  if (npm) {
    const r = await api.getResults(npm, lessonId);
    if (r.ok) {
      const correct = r.results.find(e => e.outcome === 'correct');
      if (correct) {
        bestHtml = `<div style="margin-top:10px;font-size:12px;color:var(--green)">✔ Best result: Correct — recorded at ${correct.recorded_at}</div>`;
      }
    }
  }
  document.getElementById('blocked-best-result').innerHTML = bestHtml;

  document.getElementById('screen-select').classList.add('hidden');
  document.getElementById('app').classList.add('active');
  openModal('modal-blocked');
}

// ─── Simulation bootstrap ─────────────────────────────────────────────────────

function launchSimulation(lessonId) {
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return;

  simState = createInitialState(lesson);
  const mode = getCurrentMode();

  // Apply mode class to body
  document.body.classList.toggle('quiz-mode', mode === 'quiz');

  // Topbar mode badge
  const badge = document.getElementById('topbar-mode-badge');
  badge.textContent = mode === 'teach' ? 'TEACH' : 'QUIZ';
  badge.className   = `mode-badge mode-badge-${mode}`;
  badge.classList.remove('hidden');
  document.getElementById('topbar-div-mode').style.display = '';

  // Welcome name (quiz only)
  const welcomeEl = document.getElementById('topbar-welcome');
  if (mode === 'quiz') {
    const name = formatWelcomeName(getStudentName());
    welcomeEl.textContent = `Welcome, ${name}`;
    welcomeEl.classList.remove('hidden');
  } else {
    welcomeEl.classList.add('hidden');
  }

  // Swap the Diagnose/Self-Check button based on mode.
  // In teach mode: clicking it opens the self-check (not a graded diagnosis).
  // In quiz mode:  clicking it opens the standard MCQ diagnosis modal.
  const diagBtn = document.getElementById('btn-diagnose');
  if (diagBtn) {
    if (mode === 'teach') {
      diagBtn.textContent = '🎯 Self-Check';
      diagBtn.onclick     = openSelfCheck;
    } else {
      diagBtn.textContent = '🩺 Diagnose';
      diagBtn.onclick     = openDiagnosis;
    }
  }

  // Lesson info
  document.getElementById('topbar-lesson-name').textContent = lesson.title;
  document.getElementById('lb-objective-text').textContent  = lesson.objective;
  document.getElementById('ov-topo-name').textContent        = simState.topo.name;
  document.getElementById('notes-area').value = '';
  document.getElementById('sim-override').value = 0;
  document.getElementById('d-override-val').textContent = 0;

  closeAllModals();
  closeExplainPanel();
  document.getElementById('screen-select').classList.add('hidden');
  document.getElementById('app').classList.add('active');

  pushLog(simState, 'info', `Lesson loaded: "${lesson.title}" — topology: ${simState.topo.name}. ${simState.topo.nodes.length} devices mapped.`);

  initCharts();
  renderTopologySVG(simState);
  renderAll();
  switchTab('overview');
  startClock();
  updateRunBadge();

  // Attach explain-panel listeners for Teach mode.
  // attachExplainListeners() is idempotent — safe to call on every teach launch.
  if (getCurrentMode() === 'teach') {
    attachExplainListeners();
  }
}

/**
 * exitSimulation()
 *
 * "Back" from a running (or stopped) simulation.
 * Cleans up timers, session state, and topbar, then returns the student
 * to the screen they came from:
 *   - Teach mode → Skill select screen  (showSkillSelectScreen)
 *   - Quiz mode (or any other/default)  → Lesson select screen (showLessonSelectScreen)
 *
 * Renamed from exitToLessons, which was misleading once Teach mode was added
 * as a first-class entry path with its own select screen.
 */
export function exitSimulation() {
  // Capture mode BEFORE clearStudentSession nulls it.
  const mode = getCurrentMode();

  teardownSelfCheck();   // cancel any in-progress self-check, detach listeners
  stopSimTimers();
  clearStudentSession();
  simState        = null;
  pendingLessonId = null;
  _pendingSkill   = null;
  packetFilter    = 'all';

  document.body.classList.remove('quiz-mode');
  document.getElementById('topbar-mode-badge').classList.add('hidden');
  document.getElementById('topbar-welcome').classList.add('hidden');
  document.getElementById('topbar-div-mode').style.display = 'none';
  closeExplainPanel();
  closeAllModals();
  document.getElementById('app').classList.remove('active');

  if (mode === 'teach') {
    showSkillSelectScreen();
  } else {
    showLessonSelectScreen();
  }
}

// ─── Simulation controls ──────────────────────────────────────────────────────

export function startSimulation() {
  if (!simState || simState.simRunning) return;
  simState.simRunning = true;
  updateRunBadge();
  pushLog(simState, 'ok', 'Simulation started. Telemetry feed live.');
  simTimer = setInterval(() => {
    tick(simState);
    renderAll();
  }, 1000);
}

export function resetSimulation() {
  stopSimTimers();
  if (simState) launchSimulation(simState.lesson.id);
}

function stopSimTimers() {
  if (simTimer)  { clearInterval(simTimer);  simTimer  = null; }
  if (clockTimer){ clearInterval(clockTimer); clockTimer = null; }
}

function updateRunBadge() {
  if (!simState) return;
  const badge   = document.getElementById('lb-run-badge');
  const text    = document.getElementById('lb-run-text');
  const startBtn = document.getElementById('btn-start-sim');
  if (simState.simRunning) {
    badge.classList.add('running');
    text.textContent      = 'Sim Running';
    startBtn.disabled     = true;
    startBtn.textContent  = '▶ Running…';
  } else {
    badge.classList.remove('running');
    text.textContent      = 'Sim Stopped';
    startBtn.disabled     = false;
    startBtn.textContent  = '▶ Start Simulation';
  }
}

function startClock() {
  const el = document.getElementById('clock');
  const fmt = () => new Date().toTimeString().slice(0, 8);
  el.textContent = fmt();
  clockTimer = setInterval(() => { el.textContent = fmt(); }, 1000);
}

// ─── Render all ───────────────────────────────────────────────────────────────

function renderAll() {
  if (!simState) return;
  renderStatBar(simState);
  updateCharts(simState);
  renderTopologyColors(simState);
  renderDeviceGrid(simState);
  renderDeviceTable();
  renderAlerts(simState);
  renderMetrics();
  renderPackets(simState, packetFilter);
  renderLogs(simState);
}

function switchTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t  => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-'  + tab).classList.add('active');
  document.getElementById('pane-' + tab).classList.add('active');
}

// ─── Device table (inline — reads simState) ───────────────────────────────────

function renderDeviceTable() {
  const body = document.getElementById('device-table-body');
  body.innerHTML = simState.topo.nodes.filter(n => !n.isExternal).map(n => {
    const type  = DEVICE_TYPES[n.type];
    const color = { healthy:'#4a9e6e', warning:'#c8893a', degraded:'#c8893a', critical:'#c85a4a', offline:'#8891a0' }[n.health || 'healthy'];
    const extra = n.type === 'aicompute' ? `GPU ${n.cur.gpu.toFixed(0)}% · ${n.cur.temp.toFixed(0)}°C`
      : n.type === 'switch' ? `Traffic ${n.cur.traffic.toFixed(0)} Mbps · ${n.cur.temp.toFixed(0)}°C`
      : `Disk ${n.cur.disk.toFixed(0)}% · ${n.cur.temp.toFixed(0)}°C`;
    return `
      <tr data-node-id="${n.id}">
        <td class="font-mono">${n.label}</td>
        <td>${type.label}</td>
        <td><span class="status-badge s-${n.health || 'healthy'}"><span class="s-dot"></span>${(n.health||'healthy').toUpperCase()}</span></td>
        <td><span class="mini-bar"><span class="mini-bar-fill" style="width:${n.cur.cpu}%;background:${color}"></span></span> ${n.cur.cpu.toFixed(0)}%</td>
        <td>${n.cur.mem.toFixed(0)}%</td>
        <td class="font-mono" style="color:var(--muted2)">${extra}</td>
        <td style="color:var(--cyan);font-size:11px;">Inspect →</td>
      </tr>`;
  }).join('');
}

// ─── Metrics (inline) ─────────────────────────────────────────────────────────

function renderMetrics() {
  const links  = simState.topo.links;
  const avgLat = links.reduce((a, l) => a + l.cur.latency, 0) / links.length;
  const avgJit = links.reduce((a, l) => a + l.cur.jitter,  0) / links.length;
  const avgUtil= links.reduce((a, l) => a + l.cur.util,    0) / links.length;
  const avgLoss= links.reduce((a, l) => a + l.cur.loss,    0) / links.length;
  const hot    = [...links].sort((a, b) => b.cur.util - a.cur.util)[0];
  const hotA   = findNode(simState, hot.a);
  const hotB   = findNode(simState, hot.b);

  document.getElementById('m-pkt-in').textContent   = `${Math.round(20 + (simState.series.traffic.at(-1) || 0) * 1.4)} pps`;
  document.getElementById('m-pkt-out').textContent  = `${Math.round(15 + (simState.series.traffic.at(-1) || 0) * 1.1)} pps`;
  document.getElementById('m-pkt-loss').textContent = `${avgLoss.toFixed(2)}%`;
  document.getElementById('m-retrans').textContent  = `${Math.round(avgLoss * 12)} / min`;
  document.getElementById('m-lat').textContent      = `${avgLat.toFixed(0)} ms`;
  document.getElementById('m-jitter').textContent   = `${avgJit.toFixed(1)} ms`;
  document.getElementById('m-bwutil').textContent   = `${avgUtil.toFixed(0)}%`;
  document.getElementById('m-hotlink').textContent  = `${hotA.label} ↔ ${hotB.label}`;

  const dl = document.getElementById('metrics-device-list');
  dl.innerHTML = simState.topo.nodes.filter(n => !n.isExternal).map(n => `
    <div class="metric-row">
      <span class="metric-name">${n.label}</span>
      <span class="metric-val">cpu ${n.cur.cpu.toFixed(0)}% · mem ${n.cur.mem.toFixed(0)}% · traffic ${n.cur.traffic.toFixed(0)} Mbps</span>
    </div>`).join('');
}

// ─── Device detail modal ──────────────────────────────────────────────────────

function openDeviceDetail(id) {
  const n = findNode(simState, id);
  if (!n) return;
  const type = DEVICE_TYPES[n.type];
  document.getElementById('dd-title').textContent = n.label;
  document.getElementById('dd-sub').textContent   = `${type.label} · Status: ${(n.health || 'healthy').toUpperCase()}`;
  const rows = [
    ['CPU',         `${n.cur.cpu.toFixed(0)}%`],
    ['Memory',      `${n.cur.mem.toFixed(0)}%`],
    ['Traffic',     `${n.cur.traffic.toFixed(0)} Mbps`],
    ['Disk I/O',    `${n.cur.disk.toFixed(0)}%`],
    ['Temperature', `${n.cur.temp.toFixed(0)}°C`],
  ];
  if (n.type === 'aicompute') {
    rows.push(['GPU Utilization', `${n.cur.gpu.toFixed(0)}%`]);
    rows.push(['VRAM', `${n.cur.vram.toFixed(0)}%`]);
  }
  simState.topo.links.filter(l => l.a === n.id || l.b === n.id).forEach(l => {
    const other = findNode(simState, l.a === n.id ? l.b : l.a);
    rows.push([`Link → ${other.label}`, `${l.cur.latency.toFixed(0)}ms lat · ${l.cur.loss.toFixed(2)}% loss`]);
  });
  document.getElementById('dd-rows').innerHTML = rows.map(r =>
    `<div class="dd-row"><span>${r[0]}</span><span>${r[1]}</span></div>`
  ).join('');
  openModal('modal-device');
}

// ─── Hint modal ───────────────────────────────────────────────────────────────

export function openHint() {
  simState.hintIndex = 0;
  _renderHint();
  openModal('modal-hint');
}

export function nextHint() {
  // Req 1.7: in Quiz Mode only first hint is allowed
  if (getCurrentMode() === 'quiz') return;
  if (simState.hintIndex < simState.lesson.hints.length - 1) simState.hintIndex++;
  _renderHint();
}

function _renderHint() {
  const hints  = simState.lesson.hints.slice(0, simState.hintIndex + 1);
  document.getElementById('hint-content').innerHTML =
    hints.map((h, i) => `<div class="hint-box"><b>Hint ${i+1}:</b> ${h}</div>`).join('');
  const nextBtn = document.querySelector('#modal-hint .btn-primary');
  if (nextBtn) {
    const atCap = getCurrentMode() === 'quiz' || simState.hintIndex >= simState.lesson.hints.length - 1;
    nextBtn.disabled    = atCap;
    nextBtn.textContent = atCap ? 'No More Hints' : 'Next Hint';
  }
}

// ─── Self-Check (Teach mode) ──────────────────────────────────────────────────

/**
 * openSelfCheck()
 * Called by the "🎯 Self-Check" button in the lesson bar (Teach mode only).
 * Starts (or resumes from the beginning) the self-check for the skill that
 * launched the current simulation.  No-op if no skill is pending.
 */
export function openSelfCheck() {
  if (!_pendingSkill) return;
  startSelfCheck(_pendingSkill, {
    onComplete: (completedSkillId) => {
      completedSkills.add(completedSkillId);
      renderSkillSelect();   // refresh ✓ badge on skill grid
    },
  });
}

// ─── Diagnosis modal (Quiz mode) ──────────────────────────────────────────────

export function openDiagnosis() {
  simState.diagSelected = null;
  document.getElementById('diag-question').textContent = simState.lesson.diagQuestion;
  document.getElementById('diag-options').innerHTML = simState.lesson.options.map(o => `
    <div class="diag-option" data-id="${o.id}">${o.text}</div>
  `).join('');
  document.getElementById('diag-result').className   = 'diag-result';
  document.getElementById('diag-result').textContent = '';
  document.getElementById('diag-submit-btn').disabled = false;
  openModal('modal-diagnosis');
}

export function pickDiagOption(id) {
  simState.diagSelected = id;
  document.querySelectorAll('.diag-option').forEach(el => {
    el.classList.toggle('picked', el.dataset.id === id);
  });
}

export async function submitDiagnosis() {
  if (!simState.diagSelected) { alert('Pick an option first.'); return; }
  const opt      = simState.lesson.options.find(o => o.id === simState.diagSelected);
  const outcome  = opt.correct ? 'correct' : 'incorrect';
  const resultEl = document.getElementById('diag-result');

  document.querySelectorAll('.diag-option').forEach(el => {
    const o = simState.lesson.options.find(x => x.id === el.dataset.id);
    if (o.correct)                                 el.classList.add('correct');
    else if (el.dataset.id === simState.diagSelected) el.classList.add('wrong');
  });

  if (opt.correct) {
    resultEl.className = 'diag-result show ok';
    resultEl.innerHTML = `<b>Correct.</b> ${simState.lesson.explanation}`;
    document.getElementById('diag-submit-btn').disabled = true;
    pushLog(simState, 'ok', 'Diagnosis correct — lesson objective met.');
  } else {
    resultEl.className = 'diag-result show no';
    resultEl.textContent = 'Not quite — that doesn\'t match the evidence. Re-check the dashboard, topology and packet evidence, or open a hint.';
    pushLog(simState, 'warn', 'Diagnosis attempt incorrect — investigation continues.');
  }

  const mode = getCurrentMode();
  const npm  = getStudentNPM();
  const name = getStudentName();

  if (mode === 'quiz' && npm) {
    // Show student identity in result
    const identityDiv = document.createElement('div');
    identityDiv.style.cssText = 'margin-top:10px;font-size:11px;font-family:var(--font-mono);';
    identityDiv.style.color   = opt.correct ? 'var(--green)' : 'var(--amber)';
    identityDiv.textContent   = `Student: ${name || '—'} · NPM: ${npm}`;
    resultEl.appendChild(identityDiv);

    await recordQuizResult(simState.lesson.id, outcome);
  } else if (mode === 'teach') {
    // Teach mode: show full explanation automatically and record anonymous progress
    recordTeachProgress(simState.lesson.id, opt.correct);
    // Teach mode: reveal all remaining hints automatically (the explanation IS shown)
  }

  renderLogs(simState);
}

// ─── Result recording ─────────────────────────────────────────────────────────

// Feature: teach-quiz-mode, Property 10: Result records are append-only (enforced server-side)
async function recordQuizResult(lessonId, outcome) {
  if (getCurrentMode() !== 'quiz' || !getStudentNPM()) return;
  const res = await api.recordResult(lessonId, outcome);
  if (!res.ok) {
    // Show inline error inside Diagnosis Modal (Req 7.3)
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'margin-top:8px;font-size:11px;color:var(--red);';
    errDiv.textContent   = `⚠ Result could not be saved: ${res.error}`;
    document.getElementById('diag-result').appendChild(errDiv);
  }
}

// Feature: teach-quiz-mode, Property 7: Teach progress key never contains student identity
function recordTeachProgress(lessonId, correct) {
  if (getCurrentMode() !== 'teach') return;
  const key   = `nw_teach_${lessonId}`;  // key contains only lessonId — no NPM or name
  const entry = { lessonId, attempted: true, correct, lastTs: new Date().toISOString() };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (_) { /* silent — teach mode has no mandatory persistence */ }
}

// ─── Admin Reset ──────────────────────────────────────────────────────────────

export function openAdminReset() {
  // Clear form fields
  ['ar-npm','ar-lesson'].forEach(id => { document.getElementById(id).value = ''; });
  ['ar-instructor-username','ar-instructor-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['ar-npm-err','ar-lesson-err','ar-general-err','ar-instructor-err'].forEach(id => {
    _setFieldError(id, null);
  });
  document.getElementById('ar-success').classList.add('hidden');
  document.getElementById('ar-success').innerHTML = '';

  // Show appropriate sub-form
  if (getInstructorToken()) {
    _showArResetForm();
  } else {
    _showArInstructorForm();
  }
  openModal('modal-admin-reset');
}

function _showArInstructorForm() {
  document.getElementById('ar-instructor-form').classList.remove('hidden');
  document.getElementById('ar-reset-form').classList.add('hidden');
}

function _showArResetForm() {
  document.getElementById('ar-instructor-form').classList.add('hidden');
  document.getElementById('ar-reset-form').classList.remove('hidden');
}

export function submitInstructorLogin() {
  const username = (document.getElementById('ar-instructor-username')?.value || '').trim();
  const password = document.getElementById('ar-instructor-password')?.value || '';
  if (!username || !password) {
    _setFieldError('ar-instructor-err', 'Username and password are required');
    return;
  }
  const btn = document.getElementById('ar-instructor-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  api.loginInstructor(username, password).then(res => {
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    if (res.ok) {
      setInstructorToken(res.token);
      _setFieldError('ar-instructor-err', null);
      _showArResetForm();
    } else if (res.status === 401) {
      _setFieldError('ar-instructor-err', 'Invalid credentials');
    } else {
      _setFieldError('ar-instructor-err', 'Login could not be completed');
    }
  });
}

export function submitAdminReset() {
  const npm      = (document.getElementById('ar-npm')?.value    || '').trim();
  const lessonId = (document.getElementById('ar-lesson')?.value || '').trim();
  const v = validateAdminResetForm(npm, lessonId);

  _setFieldError('ar-npm-err',   v.npmErr);
  _setFieldError('ar-lesson-err', v.lessonIdErr);
  if (!v.ok) return;

  api.adminReset(npm, lessonId).then(res => {
    if (res.ok) {
      document.getElementById('ar-reset-form').classList.add('hidden');
      const el = document.getElementById('ar-success');
      el.innerHTML = `<div style="padding:14px;background:var(--green-dim);border:1px solid rgba(34,197,94,.3);border-radius:8px;color:#BBF7D0;font-size:12px;line-height:1.6;">
        <b>✔ Attempt counter reset.</b><br>
        NPM: <span style="font-family:var(--font-mono)">${npm}</span> — Lesson: <span style="font-family:var(--font-mono)">${lessonId}</span><br>
        The student may now attempt this lesson again. Their recorded results were not modified.
      </div>`;
      el.classList.remove('hidden');
    } else if (res.status === 403) {
      _setFieldError('ar-general-err', 'This action requires instructor authentication. Please sign in again.');
      clearInstructorToken();
      _showArInstructorForm();
    } else if (res.status === 404) {
      _setFieldError('ar-lesson-err', 'Lesson ID not recognised');
    } else {
      _setFieldError('ar-general-err', res.error || 'Reset could not be completed');
    }
  });
}

// ─── Sandbox drawer ───────────────────────────────────────────────────────────

export function toggleDrawer() { document.getElementById('settings-drawer').classList.toggle('open'); }

export function setManualOverride(v) {
  if (simState) simState.manualOverride = v;
}

export function dismissAlertBanner() {
  document.getElementById('alert-banner').classList.add('hidden');
}

export function setPacketFilter(f, el) {
  packetFilter = f;
  document.querySelectorAll('#pane-packets .filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  if (simState) renderPackets(simState, packetFilter);
}

export function clearLog() {
  if (simState) { simState.logs = []; renderLogs(simState); }
}

export function saveNotes() { /* in-memory only */ }

// ─── Alert banner ─────────────────────────────────────────────────────────────

function showAlertBanner(text) {
  document.getElementById('alert-text').textContent = text;
  document.getElementById('alert-banner').classList.remove('hidden');
}

export function injectAlert(level) {
  if (!simState) return;
  const focus  = findNode(simState, simState.incident.focusDevice) || simState.topo.nodes[0];
  const titles = {
    critical: 'Manually injected critical test alert',
    warning:  'Manually injected warning test alert',
    info:     'Manually injected info test alert',
  };
  simState.alerts.unshift({ id: Date.now(), level, deviceId: focus.id, title: titles[level], detail: 'This alert was injected manually from the sandbox drawer.', ts: `+${simState.elapsed}s` });
  showAlertBanner(titles[level]);
  renderAll();
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function _setFieldError(elId, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.classList.remove('hidden');
  } else {
    el.textContent = '';
    el.classList.add('hidden');
  }
}

// ─── Global event wiring ──────────────────────────────────────────────────────

// Expose functions needed by inline HTML event attributes
// (kept here so index.html has no inline scripts)
// Export for test introspection — lets tests assert listener attachment state
// without needing DOM access.
export function isExplainListenersAttached() { return _explainListenersAttached; }
export function resetExplainListenersFlag()  { _explainListenersAttached = false; }

if (typeof window !== 'undefined') {
  Object.assign(window, {
    // Nav
    exitSimulation, switchTab,
    // Landing
    proceedToLessons, proceedToTeach, goToLanding,
    // Sim controls
    startSimulation, resetSimulation,
    // Login
    submitLogin, backFromLogin,
    // Diagnosis (Quiz mode only)
    openDiagnosis, pickDiagOption, submitDiagnosis,
    // Hint
    openHint, nextHint,
    // Self-check (Teach mode only)
    openSelfCheck, selfCheckNext, selfCheckSkip, skipSelfCheck,
    minimizeSelfCheck, reopenSelfCheck,
    // Admin reset
    openAdminReset, submitInstructorLogin, submitAdminReset,
    // Explain panel
    closeExplainPanel,
    // Sandbox
    toggleDrawer, setManualOverride, dismissAlertBanner,
    setPacketFilter, clearLog, saveNotes, injectAlert,
    // Modal close
    closeModal,
  });
}

// Delegated event listeners ─────────────────────────────────────────────────────

// ─── Explain-panel listeners (Teach mode only) ────────────────────────────────
// Extracted so they can be attached conditionally and only once per session.
// The guard flag prevents double-attachment if a student goes Teach → back →
// Teach again in the same page session.
let _explainListenersAttached = false;

function attachExplainListeners() {
  if (_explainListenersAttached) return;
  _explainListenersAttached = true;

  // Stat bar
  document.getElementById('stat-bar').addEventListener('click', e => {
    const sc = e.target.closest('.sc[data-metric-key]');
    if (sc) showExplainPanel('metric:' + sc.dataset.metricKey);
  });

  // Topology SVG — teach mode shows explain panel; otherwise opens device detail
  document.getElementById('topo-svg').addEventListener('click', e => {
    const g = e.target.closest('.topo-node[data-node-id]');
    if (!g) return;
    const nodeId = g.dataset.nodeId;
    if (getCurrentMode() === 'teach') {
      showExplainPanel(g.dataset.explainKey || ('device:' + (findNode(simState, nodeId)?.type || '')));
    } else {
      if (simState) openDeviceDetail(nodeId);
    }
  });

  // Alert list
  document.getElementById('alert-list').addEventListener('click', e => {
    const item = e.target.closest('.alert-item[data-level]');
    if (item) showExplainPanel('alert:' + item.dataset.level);
  });

  // Packet table
  document.getElementById('packet-table-body').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-proto]');
    if (tr) showExplainPanel('proto:' + tr.dataset.proto);
  });

  // Chart panels (Overview tab)
  document.getElementById('pane-overview').addEventListener('click', e => {
    const panel = e.target.closest('.chart-panel[data-metric-key]');
    if (panel) showExplainPanel('metric:' + panel.dataset.metricKey);
  });

  // Metrics tab rows
  document.getElementById('pane-metrics').addEventListener('click', e => {
    const row = e.target.closest('.metric-row[data-metric-key]');
    if (row) showExplainPanel('metric:' + row.dataset.metricKey);
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
  // ── Initial screen routing ────────────────────────────────────────────────
  // Show the landing screen on first visit in this session.
  // If already seen (sessionStorage flag set), skip straight to lesson select.
  if (sessionStorage.getItem('nw_intro_seen')) {
    document.getElementById('screen-landing').classList.add('hidden');
    showLessonSelectScreen();  // always canonical: lesson-grid visible, skill-grid hidden
  }
  // (If not seen: screen-landing is visible by default, screen-select is hidden)

  // Populate both grids up front so clicking either mode feels instant.
  // renderLessonSelect targets #lesson-grid (Quiz path); renderSkillSelect
  // targets #skill-grid (Teach path). proceedToLessons/proceedToTeach on the
  // landing page determine which grid is shown.
  renderLessonSelect();
  renderSkillSelect();

  // Escape closes explain panel — only when the panel is actually visible (Req 3.6)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const panel = document.getElementById('explain-panel');
      if (panel && !panel.classList.contains('hidden')) closeExplainPanel();
    }
  });

  // Device grid — in teach mode show explain panel; otherwise open device detail
  document.getElementById('ov-device-grid').addEventListener('click', e => {
    const card = e.target.closest('.dm-card[data-node-id]');
    if (!card) return;
    if (getCurrentMode() === 'teach' && card.dataset.explainKey) {
      showExplainPanel(card.dataset.explainKey);
    } else {
      openDeviceDetail(card.dataset.nodeId);
    }
  });

  // Device table — open device detail (mode-independent)
  document.getElementById('device-table-body').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-node-id]');
    if (tr) openDeviceDetail(tr.dataset.nodeId);
  });

  // Diagnosis options — delegated (Quiz mode; no-op in Teach because the
  // submit button is hidden by CSS when mode !== quiz)
  document.getElementById('diag-options').addEventListener('click', e => {
    const opt = e.target.closest('.diag-option[data-id]');
    if (opt) pickDiagOption(opt.dataset.id);
  });
}); // end DOMContentLoaded
} // end typeof document guard

