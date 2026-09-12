/**
 * src/engine.js
 * Simulation engine — extracted verbatim from NetWatch_V1.0.1.html.
 *
 * CONTRACT (enforced by smoke test in tests/smoke.test.js):
 *   - No auth/mode/DOM references (see smoke test for the full forbidden list).
 *   - No conditional branches that read auth or mode state.
 *   - All DOM updates happen via the returned state object only.
 *
 * This module is pure logic — it receives state and returns mutated state.
 * It never imports from auth.js, api.js, or app.js.
 */

import { BASELINE, TOPOLOGIES, INCIDENTS } from './lessons.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function lerp(cur, target, rate) { return cur + (target - cur) * rate; }
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function noise(amount) { return (Math.random() - 0.5) * amount; }

function nowTs() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

// ─── Health thresholds ────────────────────────────────────────────────────────

export function computeHealth(n) {
  if (n.offline) return 'offline';
  const { cpu, temp, disk, traffic } = n.cur;
  const gpuHot      = n.type === 'aicompute' && temp > 88;
  const trafficCrit = n.type === 'switch' && traffic > 700;
  const trafficDeg  = n.type === 'switch' && traffic > 400;
  const trafficWarn = n.type === 'switch' && traffic > 200;
  if (cpu > 90 || gpuHot || disk > 92 || trafficCrit) return 'critical';
  if (cpu > 72 || temp > 75 || disk > 75 || trafficDeg) return 'degraded';
  if (cpu > 50 || temp > 60 || disk > 55 || trafficWarn) return 'warning';
  return 'healthy';
}

// ─── State factory ────────────────────────────────────────────────────────────

export function createInitialState(lesson) {
  const incident = INCIDENTS[lesson.incident];
  const srcTopo  = TOPOLOGIES[lesson.topology];

  const topo = {
    name:  srcTopo.name,
    nodes: srcTopo.nodes.map(n => ({ ...n })),
    links: srcTopo.links.map(l => ({ ...l })),
  };

  topo.nodes.forEach(n => {
    const base = BASELINE[n.type];
    n.cur    = { ...base };
    n.target = { ...base };
    n.offline = false;
  });

  topo.links.forEach(link => {
    link.cur    = { latency: 8 + Math.random() * 6, loss: 0.05, jitter: 1, util: 15 + Math.random() * 10 };
    link.target = { ...link.cur };
  });

  return {
    lesson,
    incident,
    topo,
    simRunning:  false,
    elapsed:     0,
    firedStages: new Set(),
    alerts:      [],
    logs:        [],
    packets:     [],
    hintIndex:   0,
    diagAnswered:false,
    diagSelected:null,
    manualOverride: 0,
    history: { labels: [], traffic: [], cpu: [] },
    series:  { traffic: [], cpu: [], latency: [] },
  };
}

export function resetState(lessonId, lessons) {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) throw new Error(`Unknown lessonId: ${lessonId}`);
  return createInitialState(lesson);
}

// ─── Node / link lookups ──────────────────────────────────────────────────────

export function findNode(state, id)    { return state.topo.nodes.find(n => n.id === id); }
export function findLink(state, a, b)  { return state.topo.links.find(l => (l.a === a && l.b === b) || (l.a === b && l.b === a)); }

// ─── Packet generation helpers ────────────────────────────────────────────────

function randIp()         { return `10.${40+Math.floor(Math.random()*4)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`; }
function randExternalIp() { return `${10+Math.floor(Math.random()*200)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`; }

function generatePackets(state) {
  const pattern = state.incident.packetPattern;
  const active  = state.firedStages.size > 1;
  const focus   = findNode(state, state.incident.focusDevice);
  const focusLabel = focus ? focus.label : 'TARGET';
  const ts = nowTs();

  if (!active) {
    addPacket(state, { src: randIp(), dst: randIp(), proto: 'TCP', len: 120 + Math.floor(Math.random()*400), info: 'Normal session traffic', flagged: false, ts });
    return;
  }

  if (pattern === 'ddos') {
    for (let i = 0; i < 4; i++) {
      addPacket(state, { src: randExternalIp(), dst: focusLabel, proto: 'TCP', len: 60, info: 'SYN → :80 (no matching session)', flagged: true, ts });
    }
  } else if (pattern === 'dbslow') {
    addPacket(state, { src: 'SRV-WEB-1', dst: focusLabel, proto: 'TCP', len: 512, info: 'Query request (large table scan, slow response)', flagged: true, ts });
    addPacket(state, { src: randIp(), dst: 'SRV-WEB-1', proto: 'TCP', len: 200, info: 'HTTP request (queued, waiting on DB)', flagged: false, ts });
  } else if (pattern === 'gpu_net') {
    addPacket(state, { src: focusLabel, dst: 'SRV-SCHED', proto: 'UDP', len: 8900, info: 'Gradient sync (retransmit, high latency)', flagged: true, ts });
    addPacket(state, { src: 'GPU-NODE-01', dst: 'SRV-SCHED', proto: 'UDP', len: 8900, info: 'Gradient sync (on time)', flagged: false, ts });
  } else if (pattern === 'connflood') {
    addPacket(state, { src: 'WKS-02', dst: randExternalIp(), proto: 'TCP', len: 64, info: `SYN — new connection (ephemeral port ${10000 + Math.floor(Math.random()*50000)})`, flagged: true, ts });
    addPacket(state, { src: focusLabel, dst: 'WKS-02', proto: 'TCP', len: 64, info: 'Connection-tracking table 96% full', flagged: true, ts });
  } else if (pattern === 'webleak') {
    addPacket(state, { src: focusLabel, dst: 'localhost', proto: 'UDP', len: 0, info: 'heap RSS climbing, no memory recovered after GC', flagged: true, ts });
    addPacket(state, { src: randIp(), dst: focusLabel, proto: 'TCP', len: 200, info: 'HTTP request queued — worker unresponsive', flagged: false, ts });
  } else if (pattern === 'loop') {
    addPacket(state, { src: focusLabel, dst: 'FF:FF:FF:FF:FF:FF', proto: 'ARP', len: 60, info: 'Broadcast frame flood — same source seen re-entering on two ports', flagged: true, ts });
    addPacket(state, { src: focusLabel, dst: 'ALL-SWITCHES', proto: 'STP', len: 64, info: 'Topology Change Notification (repeating)', flagged: true, ts });
  }
}

function addPacket(state, pkt) {
  state.packets.unshift(pkt);
  if (state.packets.length > 150) state.packets.pop();
}

// ─── Alert / log helpers ──────────────────────────────────────────────────────

export function pushAlert(state, level, deviceId, title, detail) {
  state.alerts.unshift({ id: Date.now() + Math.random(), level, deviceId, title, detail, ts: `+${state.elapsed}s` });
}

export function pushLog(state, level, text) {
  state.logs.push({ level, text, ts: `+${state.elapsed}s` });
  if (state.logs.length > 300) state.logs.shift();
}

// ─── Series helper ────────────────────────────────────────────────────────────

function pushSeries(state, key, val) {
  state.series[key].push(val);
  if (state.series[key].length > 30) state.series[key].shift();
}

// ─── Stage application ────────────────────────────────────────────────────────

function applyStage(state, stage) {
  if (stage.targets) {
    Object.entries(stage.targets).forEach(([id, vals]) => {
      const n = findNode(state, id);
      if (n) Object.assign(n.target, vals);
    });
  }
  if (stage.links) {
    stage.links.forEach(spec => {
      const link = findLink(state, spec.a, spec.b);
      if (link) {
        if (spec.latency !== undefined) link.target.latency = spec.latency;
        if (spec.loss    !== undefined) link.target.loss    = spec.loss;
        if (spec.util    !== undefined) link.target.util    = spec.util;
      }
    });
  }
  if (stage.log)   pushLog(state, stage.log.level, stage.log.text);
  if (stage.alert) pushAlert(state, stage.alert.level, stage.alert.device, stage.alert.title, stage.alert.detail);
}

// ─── Main tick function ────────────────────────────────────────────────────────
//
// Called once per second while the simulation is running.
// Mutates state in place, returns state for convenience.
// No DOM access. No mode or auth reads.

export function tick(state) {
  state.elapsed += 1;

  // 1. Fire any incident stages whose time has come (once each)
  state.incident.stages.forEach((stage, idx) => {
    if (state.elapsed >= stage.atSecond && !state.firedStages.has(idx)) {
      state.firedStages.add(idx);
      try {
        applyStage(state, stage);
      } catch (err) {
        console.error(`[engine] applyStage(${idx}) threw:`, err);
      }
    }
  });

  // 2. Ease every node's telemetry toward its target
  state.topo.nodes.forEach(n => {
    if (n.isExternal) return;
    try {
      const cur = n.cur, tgt = n.target;
      cur.cpu     = clamp(lerp(cur.cpu,     tgt.cpu,     0.35) + noise(2),   1, 100);
      cur.mem     = clamp(lerp(cur.mem,     tgt.mem,     0.25) + noise(1.5), 1, 100);
      cur.traffic = clamp(lerp(cur.traffic, tgt.traffic, 0.35) + noise(4),   0, 1000);
      cur.disk    = clamp(lerp(cur.disk,    tgt.disk,    0.3)  + noise(2),   0, 100);
      cur.temp    = clamp(lerp(cur.temp,    tgt.temp,    0.2)  + noise(0.6), 20, 110);
      if (n.type === 'aicompute') {
        cur.gpu  = clamp(lerp(cur.gpu,  tgt.gpu,  0.3)  + noise(2),   0, 100);
        cur.vram = clamp(lerp(cur.vram, tgt.vram, 0.25) + noise(1.5), 0, 100);
      }
    } catch (err) {
      // Per Req 9.2: catch per-device exception, log, continue other devices
      console.error(`[engine] tick advance threw for node ${n.id}:`, err);
    }
  });

  // Manual sandbox override nudges the focus device (does not replace the script)
  if (state.manualOverride > 0) {
    const focus = findNode(state, state.incident.focusDevice);
    if (focus) {
      focus.cur.cpu = clamp(focus.cur.cpu + state.manualOverride * 0.15, 1, 100);
    }
  }

  // 3. Ease every link toward its target
  state.topo.links.forEach(link => {
    const cur = link.cur, tgt = link.target;
    cur.latency = clamp(lerp(cur.latency, tgt.latency, 0.3) + noise(2),    1, 500);
    cur.loss    = clamp(lerp(cur.loss,    tgt.loss,    0.3) + noise(0.15), 0, 20);
    cur.jitter  = clamp(cur.latency * 0.05 + noise(1), 0, 60);
    cur.util    = clamp(lerp(cur.util,    tgt.util !== undefined ? tgt.util : cur.util, 0.3) + noise(3), 0, 100);
  });

  // 4. Derive health status from thresholds
  state.topo.nodes.forEach(n => { if (!n.isExternal) n.health = computeHealth(n); });

  // 5. Update rolling series for charts + history
  const avg = key => {
    const vals = state.topo.nodes.filter(n => !n.isExternal).map(n => n.cur[key]);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const avgLink = key => {
    const vals = state.topo.links.map(l => l.cur[key]);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  pushSeries(state, 'traffic', avg('traffic'));
  pushSeries(state, 'cpu',     avg('cpu'));
  pushSeries(state, 'latency', avgLink('latency'));

  if (state.elapsed % 5 === 0) {
    state.history.labels.push(`${state.elapsed}s`);
    state.history.traffic.push(Math.round(avg('traffic')));
    state.history.cpu.push(Math.round(avg('cpu')));
    if (state.history.labels.length > 24) {
      state.history.labels.shift();
      state.history.traffic.shift();
      state.history.cpu.shift();
    }
  }

  // 6. Generate packet evidence
  generatePackets(state);

  return state;
}
