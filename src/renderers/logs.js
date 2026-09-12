/**
 * src/renderers/logs.js
 * Renders the event log console from simulation state.
 */

const CLS    = { info: 'log-info', warn: 'log-warn', err: 'log-err', ok: 'log-ok' };
// Non-color prefix labels so warn vs err is distinguishable without color (a11y)
const PREFIX = { info: 'INFO ', warn: 'WARN ', err: 'ERR  ', ok: 'OK   ' };

export function renderLogs(state) {
  const box = document.getElementById('log-box');
  box.innerHTML = state.logs.map(l => {
    const cls    = CLS[l.level]    || 'log-info';
    const prefix = PREFIX[l.level] || 'INFO ';
    return `<div class="log-line"><span class="log-ts">[${l.ts}]</span><span class="${cls}"><span class="log-prefix" aria-hidden="true">${prefix}</span>${l.text}</span></div>`;
  }).join('');
  box.scrollTop = box.scrollHeight;
}
