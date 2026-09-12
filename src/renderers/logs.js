/**
 * src/renderers/logs.js
 * Renders the event log console from simulation state.
 */

const CLS = { info: 'log-info', warn: 'log-warn', err: 'log-err', ok: 'log-ok' };

export function renderLogs(state) {
  const box = document.getElementById('log-box');
  box.innerHTML = state.logs.map(l =>
    `<div class="log-line"><span class="log-ts">[${l.ts}]</span><span class="${CLS[l.level] || 'log-info'}">${l.text}</span></div>`
  ).join('');
  box.scrollTop = box.scrollHeight;
}
