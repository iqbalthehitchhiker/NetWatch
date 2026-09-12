/**
 * src/renderers/alerts.js
 * Renders the alert list panel from simulation state.
 */

import { findNode } from '../engine.js';

export function renderAlerts(state) {
  const list = document.getElementById('alert-list');
  if (!state.alerts.length) {
    list.innerHTML = '<div class="empty-note">No alerts yet — start the simulation and keep watching the dashboard.</div>';
    return;
  }
  list.innerHTML = state.alerts.map(a => {
    const cls    = a.level === 'critical' ? 'crit' : a.level === 'warning' ? 'warn' : 'info';
    const lvlCls = a.level === 'critical' ? 'lvl-crit' : a.level === 'warning' ? 'lvl-warn' : 'lvl-info';
    const node   = findNode(state, a.deviceId);
    return `
      <div class="alert-item ${cls}" data-level="${a.level}">
        <div class="alert-ts font-mono">${a.ts}</div>
        <div class="alert-body">
          <div class="alert-title">${a.title} <span class="alert-lvl ${lvlCls}">${a.level.toUpperCase()}</span></div>
          <div class="alert-sub">${a.detail}${node ? ' · Device: ' + node.label : ''}</div>
        </div>
      </div>`;
  }).join('');
}
