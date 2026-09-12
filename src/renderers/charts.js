/**
 * src/renderers/charts.js
 * Chart.js chart creation and update logic.
 * Charts is a module-level object shared between initCharts and updateCharts.
 */

let charts = {};

export function initCharts() {
  // Destroy any existing chart instances first
  Object.values(charts).forEach(c => c && c.destroy());
  charts = {};

  const Chart = window.Chart;
  if (!Chart) {
    console.warn('[charts] Chart.js not loaded — charts will not render');
    return;
  }

  const mkLine = (id, color) => new Chart(document.getElementById(id).getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [], borderColor: color, backgroundColor: color + '22',
        fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false } },
      scales:  { x: { display: false }, y: { display: false } },
    },
  });

  charts.traffic = mkLine('ch-traffic', '#06B6D4');
  charts.cpu     = mkLine('ch-cpu',     '#F59E0B');
  charts.latency = mkLine('ch-latency', '#A78BFA');

  charts.history = new Chart(document.getElementById('ch-history').getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Traffic', data: [], borderColor: '#06B6D4', backgroundColor: 'transparent', tension: 0.3, pointRadius: 0, borderWidth: 2 },
        { label: 'CPU',     data: [], borderColor: '#F59E0B', backgroundColor: 'transparent', tension: 0.3, pointRadius: 0, borderWidth: 2 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: '#94A3B8', font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: '#64748B', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#64748B', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
    },
  });
}

export function updateCharts(state) {
  if (!charts.traffic) return; // Chart.js not loaded

  const setLine = (chart, arr) => {
    chart.data.labels          = arr.map((_, i) => i);
    chart.data.datasets[0].data = arr;
    chart.update('none');
  };

  setLine(charts.traffic, state.series.traffic);
  setLine(charts.cpu,     state.series.cpu);
  setLine(charts.latency, state.series.latency);

  document.getElementById('chv-traffic').textContent = state.series.traffic.length ? `${state.series.traffic.at(-1).toFixed(0)} Mbps` : '—';
  document.getElementById('chv-cpu').textContent     = state.series.cpu.length     ? `${state.series.cpu.at(-1).toFixed(0)}%`        : '—';
  document.getElementById('chv-latency').textContent = state.series.latency.length ? `${state.series.latency.at(-1).toFixed(0)} ms`  : '—';

  // History chart
  charts.history.data.labels              = state.history.labels;
  charts.history.data.datasets[0].data   = state.history.traffic;
  charts.history.data.datasets[1].data   = state.history.cpu;
  charts.history.update('none');
}
