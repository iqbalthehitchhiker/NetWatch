/**
 * src/renderers/topology.js
 * Renders the SVG topology and updates link/node colors each tick.
 */

import { DEVICE_TYPES } from '../lessons.js';
import { HEALTH_COLOR } from './overview.js';

export function renderTopologySVG(state) {
  const svg  = document.getElementById('topo-svg');
  const topo = state.topo;
  let html = '';

  topo.links.forEach(link => {
    const a = topo.nodes.find(n => n.id === link.a);
    const b = topo.nodes.find(n => n.id === link.b);
    if (!a || !b) return;
    html += `<line id="link-${link.a}-${link.b}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#334155" stroke-width="2" />`;
  });

  topo.nodes.forEach(n => {
    const type = DEVICE_TYPES[n.type];
    const r    = n.isExternal ? 18 : 24;
    // data-node-id and data-explain-key used by delegated listeners in app.js
    html += `
      <g class="topo-node"
         data-node-id="${n.id}"
         data-explain-key="device:${n.type}"
         style="cursor:${n.isExternal ? 'default' : 'pointer'}">
        <circle id="node-${n.id}" cx="${n.x}" cy="${n.y}" r="${r}"
                fill="#111827" stroke="${HEALTH_COLOR.healthy}" stroke-width="2.5" />
        <text x="${n.x}" y="${n.y + 4}" text-anchor="middle"
              class="topo-node-label" font-weight="700">${type.icon}</text>
        <text x="${n.x}" y="${n.y + r + 14}" text-anchor="middle"
              class="topo-node-sub">${n.label}</text>
      </g>`;
  });

  svg.innerHTML = html;
}

export function renderTopologyColors(state) {
  state.topo.nodes.forEach(n => {
    const el = document.getElementById(`node-${n.id}`);
    if (!el) return;
    const color = n.isExternal ? '#334155' : HEALTH_COLOR[n.health || 'healthy'];
    el.setAttribute('stroke', color);
    el.setAttribute('fill', n.isExternal ? '#111827' : color + '1A');
  });

  state.topo.links.forEach(link => {
    const el = document.getElementById(`link-${link.a}-${link.b}`);
    if (!el) return;
    let color = '#334155', width = 2;
    if (link.cur.loss > 5 || link.cur.latency > 200)        { color = '#F87171'; width = 3.5; }
    else if (link.cur.loss > 1.5 || link.cur.latency > 100) { color = '#FB923C'; width = 3;   }
    else if (link.cur.latency > 50)                          { color = '#FCD34D'; width = 2.5; }
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', width);
  });
}
