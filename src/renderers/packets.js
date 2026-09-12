/**
 * src/renderers/packets.js
 * Renders the packet evidence table from simulation state.
 */

export function renderPackets(state, packetFilter = 'all') {
  const body = document.getElementById('packet-table-body');
  let list = state.packets;
  if (packetFilter === 'flagged')     list = list.filter(p => p.flagged);
  else if (packetFilter !== 'all')    list = list.filter(p => p.proto === packetFilter);

  body.innerHTML = list.slice(0, 60).map(p => `
    <tr class="${p.flagged ? 'flagged' : ''}" data-proto="${p.proto}" data-explain-key="proto:${p.proto}">
      <td>${p.ts}</td>
      <td>${p.src}</td>
      <td>${p.dst}</td>
      <td><span class="proto-tag proto-${p.proto}">${p.proto}</span></td>
      <td>${p.len}</td>
      <td style="color:${p.flagged ? '#F87171' : 'var(--muted2)'}">${p.info}</td>
    </tr>`).join('')
    || '<tr><td colspan="6" style="color:var(--muted);padding:14px;">No packets captured yet — start the simulation.</td></tr>';
}
