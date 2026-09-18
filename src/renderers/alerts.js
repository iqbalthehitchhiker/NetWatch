/**
 * src/renderers/alerts.js
 * Renders the alert list panel from simulation state.
 */

import { findNode } from '../engine.js';

export function renderAlerts(state) {
  const list = document.getElementById('alert-list');
  const section = document.querySelector('#pane-alerts .section-header');
  
  if (!state.alerts.length) {
    list.innerHTML = '<div class="empty-note">No alerts yet — start the simulation and keep watching the dashboard.</div>';
    // Remove priority classes
    list.classList.remove('priority-critical', 'priority-warning');
    if (section) section.classList.remove('has-alert', 'has-warning');
    return;
  }

  // Add Linux-style priority indicators to panel and section header
  const hasCrit = state.alerts.some(a => a.level === 'critical');
  const hasWarn = state.alerts.some(a => a.level === 'warning');
  
  list.classList.remove('priority-critical', 'priority-warning');
  if (hasCrit) list.classList.add('priority-critical');
  else if (hasWarn) list.classList.add('priority-warning');
  
  if (section) {
    section.classList.remove('has-alert', 'has-warning');
    if (hasCrit) section.classList.add('has-alert');
    else if (hasWarn) section.classList.add('has-warning');
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
