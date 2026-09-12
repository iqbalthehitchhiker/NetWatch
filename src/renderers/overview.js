/**
 * src/renderers/overview.js
 * Renders the stat bar and device grid from simulation state.
 * No auth/mode reads — those are handled by the caller (app.js).
 */

import { DEVICE_TYPES } from '../lessons.js';

export const HEALTH_COLOR = {
  healthy:  '#4ADE80',
  warning:  '#FCD34D',
  degraded: '#FB923C',
  critical: '#F87171',
  offline:  '#64748B',
};

export function renderStatBar(state) {
  const nodes   = state.topo.nodes.filter(n => !n.isExternal);
  const healthy = nodes.filter(n => n.health === 'healthy').length;

  document.getElementById('card-devices').textContent     = `${healthy}/${nodes.length}`;
  document.getElementById('card-devices-sub').textContent = healthy === nodes.length ? 'All nominal' : 'Investigate degraded devices';

  const crit = state.alerts.filter(a => a.level === 'critical').length;
  const warn = state.alerts.filter(a => a.level === 'warning').length;
  document.getElementById('card-alerts').textContent    = state.alerts.length;
  document.getElementById('alert-sev-label').textContent = state.alerts.length ? `${crit} Crit / ${warn} Warn` : 'None';

  const avgLat = state.topo.links.reduce((a, l) => a + l.cur.latency, 0) / state.topo.links.length;
  document.getElementById('card-latency').textContent  = `${avgLat.toFixed(0)} ms`;
  document.getElementById('latency-trend').textContent = avgLat > 100 ? 'Elevated' : 'Stable';

  const avgCpu = state.series.cpu.length ? state.series.cpu[state.series.cpu.length - 1] : 0;
  document.getElementById('card-cpu').textContent  = `${avgCpu.toFixed(0)}%`;
  document.getElementById('cpu-trend').textContent = avgCpu > 70 ? 'High' : 'Stable';

  const avgLoss = state.topo.links.reduce((a, l) => a + l.cur.loss, 0) / state.topo.links.length;
  const lossEl  = document.getElementById('card-pktloss');
  lossEl.textContent  = `${avgLoss.toFixed(2)}%`;
  lossEl.style.color  = avgLoss > 3 ? 'var(--red)' : avgLoss > 1 ? 'var(--amber)' : 'var(--green)';
  const lossTrend = document.getElementById('pktloss-trend');
  lossTrend.textContent = avgLoss > 3 ? 'Above SLA' : 'Within SLA';
  lossTrend.style.color = avgLoss > 3 ? 'var(--red)' : 'var(--green)';

  const m = Math.floor(state.elapsed / 60), s = state.elapsed % 60;
  document.getElementById('card-simtime').textContent          = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  document.getElementById('incident-phase-label').textContent  =
    state.firedStages.size <= 1 ? 'Baseline'
    : state.firedStages.size >= state.incident.stages.length ? 'Incident active'
    : 'Developing';

  const alertNavDot = document.getElementById('alert-nav-dot');
  const alertBadge  = document.getElementById('alert-count-badge');
  if (state.alerts.length) {
    alertNavDot.style.background = crit ? 'var(--red)' : 'var(--amber)';
    alertBadge.textContent = state.alerts.length;
    alertBadge.classList.remove('hidden');
  } else {
    alertNavDot.style.background = 'var(--muted)';
    alertBadge.classList.add('hidden');
  }
}

export function renderDeviceGrid(state) {
  const grid = document.getElementById('ov-device-grid');
  grid.innerHTML = state.topo.nodes.filter(n => !n.isExternal).map(n => {
    const type  = DEVICE_TYPES[n.type];
    const color = HEALTH_COLOR[n.health || 'healthy'];
    return `
      <div class="panel dm-card" data-node-id="${n.id}" data-explain-key="device:${n.type}">
        <div class="dm-card-header">
          <div class="dm-card-name">${n.label}</div>
          <span class="status-badge s-${n.health || 'healthy'}"><span class="s-dot"></span>${(n.health || 'healthy').toUpperCase()}</span>
        </div>
        <div class="dm-card-usage" style="color:${color}">${n.cur.cpu.toFixed(0)}% CPU</div>
        <div class="dm-bar-track"><div class="dm-bar-fill" style="width:${n.cur.cpu}%;background:${color}"></div></div>
        <div class="dm-card-sub">${type.label} · mem ${n.cur.mem.toFixed(0)}%${n.type === 'aicompute' ? ' · gpu ' + n.cur.gpu.toFixed(0) + '%' : ''}${n.type === 'switch' ? ' · traffic ' + n.cur.traffic.toFixed(0) + ' Mbps' : ''}</div>
      </div>`;
  }).join('');
}
