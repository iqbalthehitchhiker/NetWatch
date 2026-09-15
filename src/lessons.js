/**
 * src/lessons.js
 * Pure data module — no runtime logic.
 * Lesson definitions, topology templates, and incident scripts.
 * Extracted verbatim from NetWatch_V1.0.1.html.
 */

export const DEVICE_TYPES = {
  gateway:  { label: 'Gateway / Router',    icon: 'GW',  color: '#F59E0B' },
  web:      { label: 'Web / App Server',    icon: 'WEB', color: '#06B6D4' },
  database: { label: 'Database Server',     icon: 'DB',  color: '#A78BFA' },
  aicompute:{ label: 'AI / GPU Compute',    icon: 'GPU', color: '#22C55E' },
  client:   { label: 'Client Workstation',  icon: 'PC',  color: '#64748B' },
  switch:   { label: 'Switch',              icon: 'SW',  color: '#38BDF8' },
};

/* baseline "resting" telemetry per device type */
export const BASELINE = {
  gateway:  { cpu: 22, mem: 35, traffic: 60,  disk: 8,  temp: 38, gpu: 0,  vram: 0  },
  web:      { cpu: 28, mem: 44, traffic: 40,  disk: 15, temp: 40, gpu: 0,  vram: 0  },
  database: { cpu: 24, mem: 55, traffic: 18,  disk: 30, temp: 39, gpu: 0,  vram: 0  },
  aicompute:{ cpu: 30, mem: 40, traffic: 25,  disk: 20, temp: 52, gpu: 35, vram: 40 },
  client:   { cpu: 12, mem: 30, traffic: 4,   disk: 4,  temp: 34, gpu: 0,  vram: 0  },
  switch:   { cpu: 15, mem: 22, traffic: 80,  disk: 5,  temp: 35, gpu: 0,  vram: 0  },
};

/* ─────────────────────────── TOPOLOGY TEMPLATES ─────────────────────────── */
export const TOPOLOGIES = {
  branch_office: {
    name: 'Branch Office Network',
    nodes: [
      { id: 'isp',  label: 'ISP Uplink',   type: 'client',   x: 60,  y: 190, isExternal: true },
      { id: 'gw1',  label: 'GW-1',         type: 'gateway',  x: 220, y: 190 },
      { id: 'web1', label: 'SRV-WEB-1',    type: 'web',      x: 420, y: 90  },
      { id: 'db1',  label: 'SRV-DB-1',     type: 'database', x: 420, y: 290 },
      { id: 'wks1', label: 'WKS-01',       type: 'client',   x: 620, y: 40  },
      { id: 'wks2', label: 'WKS-02',       type: 'client',   x: 620, y: 140 },
      { id: 'wks3', label: 'WKS-03',       type: 'client',   x: 620, y: 340 },
    ],
    links: [
      { a: 'isp',  b: 'gw1'  },
      { a: 'gw1',  b: 'web1' },
      { a: 'gw1',  b: 'db1'  },
      { a: 'web1', b: 'db1'  },
      { a: 'web1', b: 'wks1' },
      { a: 'web1', b: 'wks2' },
      { a: 'db1',  b: 'wks3' },
    ],
  },
  ai_cluster: {
    name: 'AI Training Cluster',
    nodes: [
      { id: 'isp',   label: 'ISP Uplink',    type: 'client',    x: 60,  y: 190, isExternal: true },
      { id: 'gw1',   label: 'GW-1',          type: 'gateway',   x: 200, y: 190 },
      { id: 'sched', label: 'SRV-SCHED',     type: 'web',       x: 360, y: 190 },
      { id: 'gpu1',  label: 'GPU-NODE-01',   type: 'aicompute', x: 540, y: 80  },
      { id: 'gpu2',  label: 'GPU-NODE-02',   type: 'aicompute', x: 540, y: 190 },
      { id: 'gpu3',  label: 'GPU-NODE-03',   type: 'aicompute', x: 540, y: 300 },
      { id: 'store', label: 'SRV-STORAGE',   type: 'database',  x: 700, y: 190 },
    ],
    links: [
      { a: 'isp',   b: 'gw1'   },
      { a: 'gw1',   b: 'sched' },
      { a: 'sched', b: 'gpu1'  },
      { a: 'sched', b: 'gpu2'  },
      { a: 'sched', b: 'gpu3'  },
      { a: 'gpu1',  b: 'store' },
      { a: 'gpu2',  b: 'store' },
      { a: 'gpu3',  b: 'store' },
    ],
  },
  small_lan: {
    name: 'Small Office LAN',
    nodes: [
      { id: 'isp',  label: 'ISP Uplink',   type: 'client',  x: 60,  y: 190, isExternal: true },
      { id: 'gw1',  label: 'GW-1',         type: 'gateway', x: 210, y: 190 },
      { id: 'web1', label: 'SRV-WEB-1',    type: 'web',     x: 400, y: 90  },
      { id: 'sw1',  label: 'SW-1',         type: 'switch',  x: 400, y: 290 },
      { id: 'wks1', label: 'WKS-01',       type: 'client',  x: 610, y: 150 },
      { id: 'wks2', label: 'WKS-02',       type: 'client',  x: 610, y: 230 },
      { id: 'wks3', label: 'WKS-03',       type: 'client',  x: 610, y: 330 },
    ],
    links: [
      { a: 'isp',  b: 'gw1'  },
      { a: 'gw1',  b: 'web1' },
      { a: 'gw1',  b: 'sw1'  },
      { a: 'sw1',  b: 'wks1' },
      { a: 'sw1',  b: 'wks2' },
      { a: 'sw1',  b: 'wks3' },
    ],
  },
};

/* ─────────────────────────── INCIDENT SCRIPTS ─────────────────────────── */
export const INCIDENTS = {
  ddos_incident: {
    packetPattern: 'ddos',
    focusDevice: 'gw1',
    stages: [
      { atSecond: 0,  log: { level: 'info', text: 'Baseline monitoring active. All systems nominal.' } },
      { atSecond: 6,  targets: { gw1: { cpu: 58, traffic: 220 } },
        links: [{ a:'isp', b:'gw1', latency: 60, loss: 1.2 }],
        log: { level: 'warn', text: 'GW-1: inbound traffic climbing above baseline.' } },
      { atSecond: 14, targets: { gw1: { cpu: 95, traffic: 480, mem: 70 } },
        links: [{ a:'isp', b:'gw1', latency: 240, loss: 7.5 }],
        alert: { level: 'critical', device: 'gw1', title: 'GW-1: Abnormal inbound traffic flood', detail: 'Inbound packet rate is ~8x baseline from many distinct source addresses.' },
        log: { level: 'err', text: 'ALERT: GW-1 CPU 95% — uplink saturated, packet loss rising.' } },
      { atSecond: 26, targets: { web1: { cpu: 46, traffic: 20 } },
        alert: { level: 'warning', device: 'web1', title: 'SRV-WEB-1: reduced throughput', detail: 'Traffic reaching SRV-WEB-1 has dropped — likely starved behind the congested gateway.' },
        log: { level: 'warn', text: 'SRV-WEB-1: inbound traffic dropped, requests timing out.' } },
    ],
  },
  db_slowdown_incident: {
    packetPattern: 'dbslow',
    focusDevice: 'db1',
    stages: [
      { atSecond: 0,  log: { level: 'info', text: 'Baseline monitoring active. All systems nominal.' } },
      { atSecond: 7,  targets: { db1: { cpu: 55, disk: 60, mem: 66 } },
        log: { level: 'warn', text: 'SRV-DB-1: disk I/O pressure increasing.' } },
      { atSecond: 15, targets: { db1: { cpu: 92, disk: 96, mem: 88 } },
        alert: { level: 'critical', device: 'db1', title: 'SRV-DB-1: sustained high disk I/O + CPU', detail: 'A long-running query appears to be scanning large tables repeatedly, saturating disk I/O.' },
        log: { level: 'err', text: 'ALERT: SRV-DB-1 disk I/O at 96% — query latency spiking.' } },
      { atSecond: 24, targets: { web1: { cpu: 50 } },
        links: [{ a:'web1', b:'db1', latency: 180, loss: 0.4 }],
        alert: { level: 'warning', device: 'web1', title: 'SRV-WEB-1: elevated response times', detail: 'SRV-WEB-1 is waiting on slow database responses, causing request queues to build.' },
        log: { level: 'warn', text: 'SRV-WEB-1: DB query latency now above 150ms, requests queueing.' } },
    ],
  },
  gpu_thermal_incident: {
    packetPattern: 'gpu_net',
    focusDevice: 'gpu2',
    stages: [
      { atSecond: 0,  log: { level: 'info', text: 'Baseline monitoring active. All systems nominal.' } },
      { atSecond: 6,  targets: { gpu2: { gpu: 92, temp: 78, cpu: 60 } },
        log: { level: 'warn', text: 'GPU-NODE-02: utilization and temperature climbing during checkpoint sync.' } },
      { atSecond: 15, targets: { gpu2: { gpu: 99, temp: 94, cpu: 80, vram: 97 } },
        alert: { level: 'critical', device: 'gpu2', title: 'GPU-NODE-02: thermal threshold exceeded', detail: 'Sustained near-100% GPU utilization has pushed core temperature past safe limits; thermal throttling is likely.' },
        log: { level: 'err', text: 'ALERT: GPU-NODE-02 temp 94°C — thermal throttling engaged, clocks reduced.' } },
      { atSecond: 24, targets: { gpu2: { gpu: 55, cpu: 55 } },
        links: [{ a:'sched', b:'gpu2', latency: 90, loss: 3.5 }],
        alert: { level: 'warning', device: 'gpu2', title: 'GPU-NODE-02: degraded training throughput', detail: 'Throttling has cut effective compute throughput; job progress on this node has stalled relative to its peers.' },
        log: { level: 'warn', text: 'GPU-NODE-02: throughput dropped ~40% after throttle, sync traffic retrying.' } },
    ],
  },
  internal_overload_incident: {
    packetPattern: 'connflood',
    focusDevice: 'gw1',
    stages: [
      { atSecond: 0,  log: { level: 'info', text: 'Baseline monitoring active. All systems nominal.' } },
      { atSecond: 6,  targets: { gw1: { cpu: 52, mem: 50 } },
        log: { level: 'warn', text: 'GW-1: new-connection rate rising steadily.' } },
      { atSecond: 15, targets: { gw1: { cpu: 94, mem: 83 } },
        alert: { level: 'critical', device: 'gw1', title: 'GW-1: connection-tracking table near exhaustion', detail: 'An internal host is opening new connections at an unusually high rate; GW-1\'s session table is filling up, degrading forwarding for every device behind it.' },
        log: { level: 'err', text: 'ALERT: GW-1 CPU 94%, connection table 96% full — not an inbound flood.' } },
      { atSecond: 24, targets: { web1: { cpu: 42 } },
        links: [{ a:'web1', b:'wks2', latency: 150, loss: 2.0 }],
        alert: { level: 'warning', device: 'web1', title: 'WKS-02: connection churn straining shared services', detail: 'WKS-02\'s own bandwidth use looks normal, but the sheer rate of new connections it is opening is what is straining GW-1.' },
        log: { level: 'warn', text: 'WKS-02 identified as source of new-connection churn; ISP uplink traffic itself is not elevated.' } },
    ],
  },
  web_leak_incident: {
    packetPattern: 'webleak',
    focusDevice: 'web1',
    stages: [
      { atSecond: 0,  log: { level: 'info', text: 'Baseline monitoring active. All systems nominal.' } },
      { atSecond: 8,  targets: { web1: { mem: 70 } },
        log: { level: 'warn', text: 'SRV-WEB-1: memory usage climbing steadily, no corresponding traffic increase.' } },
      { atSecond: 18, targets: { web1: { mem: 96, cpu: 58 } },
        alert: { level: 'critical', device: 'web1', title: 'SRV-WEB-1: memory near exhaustion', detail: 'Memory has climbed continuously without leveling off — consistent with a memory leak. CPU is only now rising as the system begins swapping.' },
        log: { level: 'err', text: 'ALERT: SRV-WEB-1 memory 96% — swapping, worker processes slow to respond.' } },
      { atSecond: 27, targets: { web1: { cpu: 84 } },
        links: [{ a:'gw1', b:'web1', latency: 170, loss: 1.5 }],
        alert: { level: 'warning', device: 'web1', title: 'SRV-WEB-1: requests timing out', detail: 'Downstream clients are now seeing timeouts as the overloaded worker processes fail to keep up with the request queue.' },
        log: { level: 'warn', text: 'WKS-01 and WKS-02 report timeouts reaching SRV-WEB-1.' } },
    ],
  },
  loop_storm_incident: {
    packetPattern: 'loop',
    focusDevice: 'sw1',
    stages: [
      { atSecond: 0,  log: { level: 'info', text: 'Baseline monitoring active. All systems nominal.' } },
      { atSecond: 5,  targets: { sw1: { cpu: 55, traffic: 320 } },
        log: { level: 'warn', text: 'SW-1: broadcast traffic climbing — possible duplicate link forming a loop.' } },
      { atSecond: 13, targets: { sw1: { cpu: 97, traffic: 960 } },
        links: [{ a:'sw1', b:'wks1', latency: 220, loss: 6 }, { a:'sw1', b:'wks2', latency: 230, loss: 6.5 }, { a:'sw1', b:'wks3', latency: 210, loss: 5.5 }],
        alert: { level: 'critical', device: 'sw1', title: 'SW-1: broadcast storm detected', detail: 'Broadcast/multicast frames are being endlessly re-forwarded around a loop, consuming nearly all of SW-1\'s switching capacity.' },
        log: { level: 'err', text: 'ALERT: SW-1 traffic near link capacity — all attached workstations losing connectivity.' } },
      { atSecond: 22, log: { level: 'warn', text: 'GW-1 and SRV-WEB-1 (upstream of SW-1) remain unaffected — the storm is confined to the SW-1 LAN segment.' } },
    ],
  },
};

/* ─────────────────────────── LESSONS ─────────────────────────── */
export const LESSONS = [
  {
    id: 'ddos_edge',
    title: 'DDoS at the Edge',
    difficulty: 'Beginner',
    focus: 'Gateway / Router',
    accent: '#F59E0B',
    topology: 'branch_office',
    incident: 'ddos_incident',
    description: 'Users report the branch office site is unreachable and slow. Watch the network react and find the affected device.',
    objective: 'Traffic into the branch office has spiked and users report slow or failed connections. Determine what is happening and which device is affected.',
    diagQuestion: 'Based on the telemetry, topology, and packet evidence, what is the most likely root cause?',
    options: [
      { id: 'a', text: 'GW-1 is being overwhelmed by a traffic flood (DDoS) from many external sources.', correct: true },
      { id: 'b', text: 'SRV-DB-1 has run out of disk space.', correct: false },
      { id: 'c', text: 'A workstation NIC has failed.', correct: false },
      { id: 'd', text: 'This is normal end-of-month backup traffic and nothing is wrong.', correct: false },
    ],
    hints: [
      'Start on the Overview tab — which device shows the largest change in CPU and traffic once the simulation starts?',
      'Open Topology and watch link color between the ISP uplink and GW-1 as the incident develops.',
      'Check the Packets tab: do you see many different source addresses all hitting the same destination and port in a short window?',
    ],
    explanation: 'GW-1 received an abnormal surge of inbound connections from many distinct source addresses in a short window — a volumetric/SYN-style flood. That drove GW-1\'s CPU and uplink utilization to their limits, which is why packet loss and latency rose on the ISP link, and why SRV-WEB-1 then looked starved (it simply stopped receiving as much traffic, because it was stuck behind a congested gateway). The fix in the real world is upstream filtering/rate-limiting at the edge — not touching the web or database servers, which were never the actual problem.',
    steps: [
      {
        type: 'concept',
        title: 'What is a Volumetric DDoS Attack?',
        body: 'A Distributed Denial-of-Service (DDoS) attack overwhelms a target by flooding it with traffic from many sources simultaneously. The "volumetric" variant — the most common — does not exploit a software bug; it simply sends more packets than the target\'s uplink or CPU can handle. Because the sources are distributed (often thousands of compromised hosts), blocking a single IP address has no effect. The attack succeeds when the target or the link leading to it reaches 100% utilization, making it unavailable to legitimate users even though nothing is technically "broken." Key signatures to watch for: a sudden spike in inbound traffic on the edge device, many distinct source IPs hitting the same destination port in a tight time window, and downstream devices going quiet (not because they failed, but because they stopped receiving traffic).',
      },
      {
        type: 'watchFor',
        title: 'Metrics That Give Away a DDoS',
        body: 'Keep your eye on three specific signals as the simulation runs. First, watch the traffic metric on GW-1: a DDoS will push it far above its baseline of ~60 Mbps — expect it to climb into the hundreds. Second, watch link latency on the ISP→GW-1 segment in the Topology view: as the uplink saturates, queuing delay will make latency balloon from milliseconds into hundreds of milliseconds. Third, notice what happens to SRV-WEB-1\'s traffic metric: it will drop, not spike — that counter-intuitive dip is because GW-1 can no longer forward legitimate traffic downstream. All three signals together — edge CPU spike, ISP link latency explosion, downstream traffic starvation — form the DDoS fingerprint.',
        metricKeys: ['traffic', 'cpu', 'latency'],
      },
      {
        type: 'simulation',
        topologyId: 'branch_office',
        incidentId: 'ddos_incident',
      },
      {
        type: 'quiz',
        options: [
          { id: 'a', text: 'GW-1 is being overwhelmed by a traffic flood (DDoS) from many external sources.', correct: true },
          { id: 'b', text: 'SRV-DB-1 has run out of disk space.', correct: false },
          { id: 'c', text: 'A workstation NIC has failed.', correct: false },
          { id: 'd', text: 'This is normal end-of-month backup traffic and nothing is wrong.', correct: false },
        ],
        correctIndex: 0,
        hints: [
          'Start on the Overview tab — which device shows the largest change in CPU and traffic once the simulation starts?',
          'Open Topology and watch link color between the ISP uplink and GW-1 as the incident develops.',
          'Check the Packets tab: do you see many different source addresses all hitting the same destination and port in a short window?',
        ],
        explanation: 'GW-1 received an abnormal surge of inbound connections from many distinct source addresses in a short window — a volumetric/SYN-style flood. That drove GW-1\'s CPU and uplink utilization to their limits, which is why packet loss and latency rose on the ISP link, and why SRV-WEB-1 then looked starved (it simply stopped receiving as much traffic, because it was stuck behind a congested gateway). The fix in the real world is upstream filtering/rate-limiting at the edge — not touching the web or database servers, which were never the actual problem.',
      },
    ],
  },
  {
    id: 'db_slowdown',
    title: 'Runaway Database Query',
    difficulty: 'Intermediate',
    focus: 'Database Server',
    accent: '#A78BFA',
    topology: 'branch_office',
    incident: 'db_slowdown_incident',
    description: 'The web app feels sluggish for everyone. No obvious network flood this time — dig into the database tier.',
    objective: 'SRV-WEB-1 is responding slowly to all requests, but there is no unusual inbound traffic at the edge. Find the underlying cause.',
    diagQuestion: 'What is most likely causing the slow web responses?',
    options: [
      { id: 'a', text: 'SRV-DB-1 is disk-I/O bound from a heavy/long-running query, and SRV-WEB-1 is waiting on it.', correct: true },
      { id: 'b', text: 'GW-1 is under a DDoS attack.', correct: false },
      { id: 'c', text: 'WKS-03 is offline.', correct: false },
      { id: 'd', text: 'The ISP uplink has been disconnected.', correct: false },
    ],
    hints: [
      'The Gateway looks calm this time — traffic in is normal. Check Devices and compare CPU/disk across all servers, not just the gateway.',
      'Open Metrics and look at "Per-Device Snapshot" — which device has both high CPU and high disk I/O together?',
      'Look at the SRV-WEB-1 ↔ SRV-DB-1 link latency in Topology once the incident is underway.',
    ],
    explanation: 'SRV-DB-1 shows high CPU together with high disk I/O — the signature of a query doing heavy, repeated disk scans rather than a network problem. Because SRV-WEB-1 depends on SRV-DB-1 for every request, its response times rise in lockstep once the database falls behind, even though nothing at the network edge changed. The evidence chain (DB disk I/O → DB CPU → web↔db link latency → web app slowness) is what separates this from a network-layer incident like the DDoS lesson.',
    steps: [
      {
        type: 'concept',
        title: 'How a Slow Query Poisons the Whole Application',
        body: 'Web applications are typically thin layers over a database: almost every user-facing request triggers one or more queries, and the response cannot be sent until the query returns. When a single long-running or unoptimized query holds database resources — saturating disk I/O or locking rows — every subsequent request queues up behind it. From a network-monitoring perspective this looks deceptively like a network problem: link latency between the web and database servers climbs, and throughput on the web server falls. The important distinguishing signal is that the edge (gateway, ISP link) stays completely calm, and the degradation is limited to the web↔database segment. High disk I/O on the database server, co-occurring with high CPU, is the application-layer root cause wearing a "slow network" costume.',
      },
      {
        type: 'watchFor',
        title: 'The DB-Slowdown Fingerprint',
        body: 'Look for this sequence of signals as the incident unfolds. First, SRV-DB-1\'s cpu metric climbs and stays elevated — a query consuming CPU in a tight loop. Simultaneously, the disk metric on SRV-DB-1 will spike, reflecting repeated I/O as the database engine scans large table segments without an effective index. Second, the latency metric on the WEB↔DB link in the Topology view will balloon: the web server is waiting, accumulating TCP retransmissions. Third and finally, SRV-WEB-1\'s own cpu rises as its worker processes pile up waiting for responses. The ISP link and GW-1 remain flat throughout — that calm edge is the crucial evidence separating this from an inbound-traffic incident.',
        metricKeys: ['cpu', 'traffic', 'latency'],
      },
      {
        type: 'simulation',
        topologyId: 'branch_office',
        incidentId: 'db_slowdown_incident',
      },
      {
        type: 'quiz',
        options: [
          { id: 'a', text: 'SRV-DB-1 is disk-I/O bound from a heavy/long-running query, and SRV-WEB-1 is waiting on it.', correct: true },
          { id: 'b', text: 'GW-1 is under a DDoS attack.', correct: false },
          { id: 'c', text: 'WKS-03 is offline.', correct: false },
          { id: 'd', text: 'The ISP uplink has been disconnected.', correct: false },
        ],
        correctIndex: 0,
        hints: [
          'The Gateway looks calm this time — traffic in is normal. Check Devices and compare CPU/disk across all servers, not just the gateway.',
          'Open Metrics and look at "Per-Device Snapshot" — which device has both high CPU and high disk I/O together?',
          'Look at the SRV-WEB-1 ↔ SRV-DB-1 link latency in Topology once the incident is underway.',
        ],
        explanation: 'SRV-DB-1 shows high CPU together with high disk I/O — the signature of a query doing heavy, repeated disk scans rather than a network problem. Because SRV-WEB-1 depends on SRV-DB-1 for every request, its response times rise in lockstep once the database falls behind, even though nothing at the network edge changed. The evidence chain (DB disk I/O → DB CPU → web↔db link latency → web app slowness) is what separates this from a network-layer incident like the DDoS lesson.',
      },
    ],
  },
  {
    id: 'gpu_thermal',
    title: 'GPU Cluster Thermal Throttling',
    difficulty: 'Advanced',
    focus: 'AI / GPU Compute',
    accent: '#22C55E',
    topology: 'ai_cluster',
    incident: 'gpu_thermal_incident',
    description: 'One node in the training cluster is slowing everyone else down. Use monitoring to find which node, and why.',
    objective: 'A distributed training job across three GPU nodes has slowed down overall. One node is suspected. Identify it and explain the mechanism.',
    diagQuestion: 'What is happening to the affected GPU node, and why does it slow the whole job down?',
    options: [
      { id: 'a', text: 'GPU-NODE-02 overheated under sustained load and is now thermal-throttling, which stalls its sync traffic with the other nodes.', correct: true },
      { id: 'b', text: 'SRV-STORAGE has run out of disk space, stopping all checkpoints.', correct: false },
      { id: 'c', text: 'GW-1 is dropping all packets to the AI cluster.', correct: false },
      { id: 'd', text: 'GPU-NODE-02 is idle and simply not doing any work.', correct: false },
    ],
    hints: [
      'Compare the three GPU nodes on the Devices tab — GPU utilization alone won\'t tell the whole story, also check temperature.',
      'A node that throttles will show GPU load fall back down even though the job is not finished — check the trend, not just one snapshot.',
      'Check the link between SRV-SCHED and the affected node in Topology/Metrics for rising latency or loss once throttling kicks in.',
    ],
    explanation: 'GPU-NODE-02 ran at sustained near-100% GPU utilization long enough for its temperature to cross a safe threshold, triggering thermal throttling. Throttling forces the node to reduce clock speed, which cuts its effective throughput — visible as GPU utilization dropping back down even though the job isn\'t finished. Because distributed training nodes must synchronize with each other, the slow node\'s sync traffic to SRV-SCHED starts showing added latency/loss, and the whole job\'s pace drops to match its slowest member. This is a compute/thermal problem wearing a "network slowness" costume — the topology and link metrics are evidence of the cause, not the cause itself.',
    steps: [
      {
        type: 'concept',
        title: 'GPU Thermal Throttling and Distributed Training',
        body: 'TODO: Write concept content explaining thermal throttling, how GPUs reduce clock speed when temperature crosses safe thresholds, and why that creates a bottleneck in distributed training jobs where all nodes must stay in sync.',
      },
      {
        type: 'watchFor',
        title: 'Spotting Thermal Throttle in the Metrics',
        body: 'TODO: Describe which metric keys to watch (cpu, traffic, latency) and the specific pattern — GPU util spike followed by a drop-back, temperature climb, then latency rise on the SCHED↔GPU-NODE-02 link — that distinguishes throttling from a network or storage fault.',
        metricKeys: ['cpu', 'traffic', 'latency'],
      },
      {
        type: 'simulation',
        topologyId: 'ai_cluster',
        incidentId: 'gpu_thermal_incident',
      },
      {
        type: 'quiz',
        options: [
          { id: 'a', text: 'GPU-NODE-02 overheated under sustained load and is now thermal-throttling, which stalls its sync traffic with the other nodes.', correct: true },
          { id: 'b', text: 'SRV-STORAGE has run out of disk space, stopping all checkpoints.', correct: false },
          { id: 'c', text: 'GW-1 is dropping all packets to the AI cluster.', correct: false },
          { id: 'd', text: 'GPU-NODE-02 is idle and simply not doing any work.', correct: false },
        ],
        correctIndex: 0,
        hints: [
          'Compare the three GPU nodes on the Devices tab — GPU utilization alone won\'t tell the whole story, also check temperature.',
          'A node that throttles will show GPU load fall back down even though the job is not finished — check the trend, not just one snapshot.',
          'Check the link between SRV-SCHED and the affected node in Topology/Metrics for rising latency or loss once throttling kicks in.',
        ],
        explanation: 'GPU-NODE-02 ran at sustained near-100% GPU utilization long enough for its temperature to cross a safe threshold, triggering thermal throttling. Throttling forces the node to reduce clock speed, which cuts its effective throughput — visible as GPU utilization dropping back down even though the job isn\'t finished. Because distributed training nodes must synchronize with each other, the slow node\'s sync traffic to SRV-SCHED starts showing added latency/loss, and the whole job\'s pace drops to match its slowest member. This is a compute/thermal problem wearing a "network slowness" costume — the topology and link metrics are evidence of the cause, not the cause itself.',
      },
    ],
  },
  {
    id: 'internal_overload',
    title: 'The Overload That Came From Inside',
    difficulty: 'Intermediate',
    focus: 'Gateway / Router',
    accent: '#EF4444',
    topology: 'branch_office',
    incident: 'internal_overload_incident',
    description: 'GW-1 is struggling again — but this time the WAN link looks calm. If it isn\'t a flood from outside, where is the load actually coming from?',
    objective: 'GW-1\'s CPU and memory are climbing even though inbound WAN traffic is normal. Determine whether this is an external attack or something originating inside the network.',
    diagQuestion: 'GW-1 is overloaded, but the ISP uplink shows no unusual traffic volume. What is the most likely explanation?',
    options: [
      { id: 'a', text: 'An internal host is opening new connections at an abnormally high rate, exhausting GW-1\'s connection-tracking table from the inside.', correct: true },
      { id: 'b', text: 'GW-1 is being hit by an external DDoS attack, identical to the branch office\'s earlier incident.', correct: false },
      { id: 'c', text: 'SRV-DB-1\'s disk has failed, forcing GW-1 to compensate.', correct: false },
      { id: 'd', text: 'The ISP has throttled the uplink bandwidth.', correct: false },
    ],
    hints: [
      'Compare this incident to the DDoS lesson: is the ISP-uplink link showing the same traffic spike this time?',
      'Open Packets — where is the flood of new connections actually coming from: outside addresses, or one particular internal device?',
      'A connection-tracking table can fill up from connection *count*, not just raw bandwidth — a device can overload a router without pushing much data at all.',
    ],
    explanation: 'Unlike the DDoS lesson, the ISP uplink here stays calm — inbound WAN traffic never spikes. The packet evidence instead shows WKS-02 opening an unusually high rate of new outbound connections. Each connection needs an entry in GW-1\'s connection-tracking (NAT) table, and enough of them opened fast enough exhausts that table regardless of how much actual data flows through it. That is why GW-1\'s CPU and memory climb while its traffic volume barely moves — a good reminder that "overloaded" and "flooded with bandwidth" are not the same thing, and that the fix here is investigating WKS-02, not the network edge.',
    steps: [
      {
        type: 'concept',
        title: 'Connection Tracking and Internal Overload',
        body: 'TODO: Write concept content explaining NAT connection-tracking tables, why connection *count* (not bandwidth) exhausts them, and how an internal host can overload a gateway without generating unusual WAN traffic volume.',
      },
      {
        type: 'watchFor',
        title: 'Inside vs. Outside: Reading the Traffic Evidence',
        body: 'TODO: Describe which metric keys to watch (cpu, traffic) and how to distinguish internal-origin overload from an inbound DDoS — specifically the calm ISP-link traffic metric paired with rising GW-1 cpu and the packet evidence pointing to a single internal IP.',
        metricKeys: ['cpu', 'traffic'],
      },
      {
        type: 'simulation',
        topologyId: 'branch_office',
        incidentId: 'internal_overload_incident',
      },
      {
        type: 'quiz',
        options: [
          { id: 'a', text: 'An internal host is opening new connections at an abnormally high rate, exhausting GW-1\'s connection-tracking table from the inside.', correct: true },
          { id: 'b', text: 'GW-1 is being hit by an external DDoS attack, identical to the branch office\'s earlier incident.', correct: false },
          { id: 'c', text: 'SRV-DB-1\'s disk has failed, forcing GW-1 to compensate.', correct: false },
          { id: 'd', text: 'The ISP has throttled the uplink bandwidth.', correct: false },
        ],
        correctIndex: 0,
        hints: [
          'Compare this incident to the DDoS lesson: is the ISP-uplink link showing the same traffic spike this time?',
          'Open Packets — where is the flood of new connections actually coming from: outside addresses, or one particular internal device?',
          'A connection-tracking table can fill up from connection *count*, not just raw bandwidth — a device can overload a router without pushing much data at all.',
        ],
        explanation: 'Unlike the DDoS lesson, the ISP uplink here stays calm — inbound WAN traffic never spikes. The packet evidence instead shows WKS-02 opening an unusually high rate of new outbound connections. Each connection needs an entry in GW-1\'s connection-tracking (NAT) table, and enough of them opened fast enough exhausts that table regardless of how much actual data flows through it. That is why GW-1\'s CPU and memory climb while its traffic volume barely moves — a good reminder that "overloaded" and "flooded with bandwidth" are not the same thing, and that the fix here is investigating WKS-02, not the network edge.',
      },
    ],
  },
  {
    id: 'web_leak',
    title: 'The Web Server That Forgot to Let Go',
    difficulty: 'Intermediate',
    focus: 'Web / App Server',
    accent: '#06B6D4',
    topology: 'branch_office',
    incident: 'web_leak_incident',
    description: 'SRV-WEB-1 gets slower and slower over several minutes with no traffic spike anywhere. Something on the server itself isn\'t releasing memory.',
    objective: 'SRV-WEB-1\'s response times are steadily degrading with no change in incoming traffic. Identify the resource that is failing and explain the order symptoms appeared in.',
    diagQuestion: 'Memory on SRV-WEB-1 rises continuously well before CPU or latency move at all. What does that ordering point to?',
    options: [
      { id: 'a', text: 'A memory leak in the web application — memory exhaustion forces swapping, which is what eventually drags CPU and response time down with it.', correct: true },
      { id: 'b', text: 'SRV-DB-1 is under heavy disk I/O load.', correct: false },
      { id: 'c', text: 'GW-1 is being flooded with inbound traffic.', correct: false },
      { id: 'd', text: 'WKS-01 has a failing network cable.', correct: false },
    ],
    hints: [
      'Check the Overview traffic chart for SRV-WEB-1 — has inbound traffic actually changed at all during the incident?',
      'On the Devices tab, watch the order metrics change: which one moves first, memory or CPU?',
      'Once a system\'s memory is exhausted it starts swapping to disk — what does that do to CPU usage and response latency?',
    ],
    explanation: 'The timeline is the evidence: SRV-WEB-1\'s memory climbs steadily from early in the incident while traffic stays flat and CPU barely moves — ruling out a network or load-driven cause. Only once memory is nearly exhausted does CPU start climbing too, because the system has begun swapping memory to disk, which is slow and CPU-intensive. Response times then degrade for everyone downstream (WKS-01, WKS-02) purely as a consequence of that swapping, not because of anything happening on the network. That memory-first, CPU-and-latency-second ordering is the signature of an application-level memory leak, distinct from the disk-I/O-driven database incident elsewhere in this trainer.',
    steps: [
      {
        type: 'concept',
        title: 'Memory Leaks and the Slow Degradation Pattern',
        body: 'TODO: Write concept content explaining what a memory leak is, why memory rises steadily without a traffic cause, and how eventual swap usage drags CPU and response latency down as a secondary effect.',
      },
      {
        type: 'watchFor',
        title: 'Reading the Memory-First Timeline',
        body: 'TODO: Describe which metric keys to watch (cpu, traffic, latency) and specifically the ordering — memory rising first while traffic is flat, then cpu climbing only once memory is nearly exhausted — that distinguishes a leak from load-driven or network-driven causes.',
        metricKeys: ['cpu', 'traffic', 'latency'],
      },
      {
        type: 'simulation',
        topologyId: 'branch_office',
        incidentId: 'web_leak_incident',
      },
      {
        type: 'quiz',
        options: [
          { id: 'a', text: 'A memory leak in the web application — memory exhaustion forces swapping, which is what eventually drags CPU and response time down with it.', correct: true },
          { id: 'b', text: 'SRV-DB-1 is under heavy disk I/O load.', correct: false },
          { id: 'c', text: 'GW-1 is being flooded with inbound traffic.', correct: false },
          { id: 'd', text: 'WKS-01 has a failing network cable.', correct: false },
        ],
        correctIndex: 0,
        hints: [
          'Check the Overview traffic chart for SRV-WEB-1 — has inbound traffic actually changed at all during the incident?',
          'On the Devices tab, watch the order metrics change: which one moves first, memory or CPU?',
          'Once a system\'s memory is exhausted it starts swapping to disk — what does that do to CPU usage and response latency?',
        ],
        explanation: 'The timeline is the evidence: SRV-WEB-1\'s memory climbs steadily from early in the incident while traffic stays flat and CPU barely moves — ruling out a network or load-driven cause. Only once memory is nearly exhausted does CPU start climbing too, because the system has begun swapping memory to disk, which is slow and CPU-intensive. Response times then degrade for everyone downstream (WKS-01, WKS-02) purely as a consequence of that swapping, not because of anything happening on the network. That memory-first, CPU-and-latency-second ordering is the signature of an application-level memory leak, distinct from the disk-I/O-driven database incident elsewhere in this trainer.',
      },
    ],
  },
  {
    id: 'loop_storm',
    title: 'Broadcast Storm on the LAN',
    difficulty: 'Beginner',
    focus: 'Switch',
    accent: '#38BDF8',
    topology: 'small_lan',
    incident: 'loop_storm_incident',
    description: 'Every workstation on one switch suddenly loses its connection at the same time, while the router and web server upstream look completely fine.',
    objective: 'WKS-01, WKS-02, and WKS-03 all degrade at once while GW-1 and SRV-WEB-1 stay healthy. Localize the fault to the correct layer of the network.',
    diagQuestion: 'All three workstations behind SW-1 degrade simultaneously, while GW-1 and SRV-WEB-1 — both upstream of SW-1 — stay perfectly healthy. What does this pattern indicate?',
    options: [
      { id: 'a', text: 'SW-1 is experiencing a broadcast storm, likely from a switching loop, flooding the LAN segment behind it while everything upstream is unaffected.', correct: true },
      { id: 'b', text: 'GW-1 has lost its connection to the ISP.', correct: false },
      { id: 'c', text: 'SRV-WEB-1 has crashed.', correct: false },
      { id: 'd', text: 'All three workstations independently developed hardware faults at the same moment.', correct: false },
    ],
    hints: [
      'Three unrelated devices failing at the exact same instant is unlikely to be three coincidental hardware faults — look for a shared point they all pass through.',
      'Check SW-1\'s own CPU and traffic on the Devices tab — how do they compare to GW-1 and SRV-WEB-1, which sit one hop further upstream?',
      'Open Packets: repeated broadcast frames and Spanning Tree Protocol topology-change notifications are the classic signature of a network loop.',
    ],
    explanation: 'SW-1 sits directly between the three workstations and the rest of the network, and it is the only device whose traffic and CPU spike toward their limits — a broadcast storm, almost certainly caused by a physical loop (two cables connecting the same two switches/ports without loop protection). Broadcast frames get endlessly duplicated and re-forwarded around the loop, consuming nearly all of SW-1\'s switching capacity and starving every port behind it — which is exactly why all three workstations degrade at once. GW-1 and SRV-WEB-1 sit one hop further upstream, on the other side of SW-1, so they never see the storm. Three devices failing in perfect unison is a strong clue to look for a shared upstream device rather than three independent faults, and the packet evidence (repeated broadcasts, STP topology-change notifications) confirms a Layer-2 loop rather than a routing or server problem.',
    steps: [
      {
        type: 'concept',
        title: 'Switching Loops and Broadcast Storms',
        body: 'TODO: Write concept content explaining Layer-2 switching loops, why Ethernet has no TTL (unlike IP), how a single looped cable causes broadcast frames to circulate forever, and what Spanning Tree Protocol does to prevent this.',
      },
      {
        type: 'watchFor',
        title: 'Spotting a Storm: Simultaneous Multi-Device Degradation',
        body: 'TODO: Describe which metric keys to watch (cpu, traffic, latency) and the pattern — SW-1 traffic and cpu hitting limits while GW-1/SRV-WEB-1 stay healthy, and all downstream workstations degrading in unison — that localizes the fault to the switch layer.',
        metricKeys: ['cpu', 'traffic', 'latency'],
      },
      {
        type: 'simulation',
        topologyId: 'small_lan',
        incidentId: 'loop_storm_incident',
      },
      {
        type: 'quiz',
        options: [
          { id: 'a', text: 'SW-1 is experiencing a broadcast storm, likely from a switching loop, flooding the LAN segment behind it while everything upstream is unaffected.', correct: true },
          { id: 'b', text: 'GW-1 has lost its connection to the ISP.', correct: false },
          { id: 'c', text: 'SRV-WEB-1 has crashed.', correct: false },
          { id: 'd', text: 'All three workstations independently developed hardware faults at the same moment.', correct: false },
        ],
        correctIndex: 0,
        hints: [
          'Three unrelated devices failing at the exact same instant is unlikely to be three coincidental hardware faults — look for a shared point they all pass through.',
          'Check SW-1\'s own CPU and traffic on the Devices tab — how do they compare to GW-1 and SRV-WEB-1, which sit one hop further upstream?',
          'Open Packets: repeated broadcast frames and Spanning Tree Protocol topology-change notifications are the classic signature of a network loop.',
        ],
        explanation: 'SW-1 sits directly between the three workstations and the rest of the network, and it is the only device whose traffic and CPU spike toward their limits — a broadcast storm, almost certainly caused by a physical loop (two cables connecting the same two switches/ports without loop protection). Broadcast frames get endlessly duplicated and re-forwarded around the loop, consuming nearly all of SW-1\'s switching capacity and starving every port behind it — which is exactly why all three workstations degrade at once. GW-1 and SRV-WEB-1 sit one hop further upstream, on the other side of SW-1, so they never see the storm. Three devices failing in perfect unison is a strong clue to look for a shared upstream device rather than three independent faults, and the packet evidence (repeated broadcasts, STP topology-change notifications) confirms a Layer-2 loop rather than a routing or server problem.',
      },
    ],
  },
];

/* ─────────────────────────── COURSES ─────────────────────────── */

/**
 * Courses group related lessons into a logical learning progression.
 * Two natural groupings emerge from the incident topics:
 *
 *  Course 1 — Edge & Gateway Attacks (branch_office topology, gateway-focused
 *              incidents that share the "something is overloading GW-1" premise)
 *              Covers: DDoS from outside, internal connection-flood from inside.
 *
 *  Course 2 — Server-Tier Degradation (branch_office topology, incidents where
 *              the edge is healthy but a server-tier resource is exhausted)
 *              Covers: DB heavy query, web server memory leak.
 *
 *  Course 3 — Specialised Infrastructure (non-branch_office topologies or
 *              device types not covered in the two core courses)
 *              Covers: GPU cluster thermal throttling, LAN broadcast storm.
 */
export const COURSES = [
  {
    id: 'edge_attacks',
    title: 'Edge & Gateway Attacks',
    description: 'Learn to distinguish external volumetric floods from internal connection-table exhaustion — two incidents that look identical on the gateway but have opposite remedies.',
    estimatedMinutes: 30,
    lessonIds: ['ddos_edge', 'internal_overload'],
  },
  {
    id: 'server_degradation',
    title: 'Server-Tier Degradation',
    description: 'Trace slow web responses to their true origin: a disk-bound database query and an application-level memory leak — both invisible at the network edge.',
    estimatedMinutes: 35,
    lessonIds: ['db_slowdown', 'web_leak'],
  },
  {
    id: 'specialised_infra',
    title: 'Specialised Infrastructure',
    description: 'Tackle two incidents unique to their device types: thermal throttling in an AI GPU training cluster, and a Layer-2 broadcast storm on a switched LAN.',
    estimatedMinutes: 35,
    lessonIds: ['gpu_thermal', 'loop_storm'],
  },
];

/* ─────────────────────────── SKILLS ─────────────────────────── */

/**
 * SKILLS — teach-mode reference cards that explain how to read each
 * simulation panel. Content is grounded in what the renderers actually
 * render; nothing here describes features that don't exist.
 *
 * targetPanel values correspond to the pane-* tab IDs in the simulation
 * screen: 'topology' | 'charts' | 'alerts' | 'packets' | null
 */
export const SKILLS = [
  // ─────────────────────────── Skill 1: Topology ───────────────────────────
  {
    id: 'read_topology',
    title: 'Reading the Topology Map',
    body: 'Each node circle is outlined and tinted with a health colour: green (healthy), amber (warning or degraded), red (critical), and grey (offline). A text label below the node name — WARN, DEGRADED, CRIT — duplicates the colour so health state is never conveyed by colour alone. Links between nodes change colour by latency and packet loss: grey is normal; amber appears when latency exceeds 50 ms or loss exceeds 1.5%; red and thicker when latency exceeds 200 ms or loss exceeds 5%. In Teach mode, clicking any non-external node opens the Explain panel for that device type.',
    targetPanel: 'topology',
    lessonRefs: [
      'DDoS at the Edge',
      'The Overload That Came From Inside',
      'GPU Cluster Thermal Throttling',
      'Broadcast Storm on the LAN',
    ],
    // Topology maps to lessons where the primary signal is visible on links or
    // node health colours: DDoS (ISP→GW link goes red), Internal Overload
    // (GW node health degrades), GPU Thermal (SCHED→GPU link degrades),
    // Broadcast Storm (SW node goes critical, all attached links degrade).
    selfCheck: [
      {
        id: 'topo_recall_1',
        tier: 'recall',
        prompt: 'A node circle in the topology map has turned red and its border is thick. What does this state indicate?',
        options: [
          { id: 'a', text: 'The device is offline and not reachable.' },
          { id: 'b', text: 'The device has crossed a critical threshold — CPU above 90%, switch traffic above 700 Mbps, or GPU temperature above 88°C.' },
          { id: 'c', text: 'The device is warming up and not yet part of the network.' },
          { id: 'd', text: 'The device is running a scheduled maintenance job.' },
        ],
        correctIndex: 1,
        explanation: 'Red (critical) fires when a hard threshold is crossed: CPU > 90%, disk I/O > 92%, switch traffic > 700 Mbps, or aicompute temperature > 88°C. Grey means offline. Amber covers warning and degraded states. The text label (CRIT / WARN / DEGRADED) below the node name repeats the colour information for accessibility.',
      },
      {
        id: 'topo_reading_1',
        tier: 'reading',
        prompt: 'Click on the link (the line between two nodes) that connects the ISP uplink to the first gateway node in the topology diagram.',
        // renderTopologySVG generates <line id="link-{a}-{b}"> for every link.
        // The ISP-to-gateway link always exists as link-isp-gw1 across all
        // three topologies (branch_office, ai_cluster, small_lan).
        targetSelector: '#link-isp-gw1',
        explanation: 'The ISP→GW-1 line is the edge link between the external uplink and the internal gateway. Its colour directly shows whether the WAN path is healthy: grey = normal, amber = rising latency or low loss, red = severe congestion or high packet loss. This is the first link to watch during any suspected inbound-traffic incident.',
      },
      {
        id: 'topo_synthesis_1',
        tier: 'synthesis',
        prompt: 'A gateway node has turned amber AND the link connecting it to the ISP uplink has also turned amber. Compared to the gateway turning amber alone, what does the link colour add to your understanding?',
        options: [
          { id: 'a', text: 'Nothing — the link colour just mirrors whatever the node colour is.' },
          { id: 'b', text: 'The amber link confirms that the pressure on the gateway is coming from the WAN side, not from internal devices behind it.' },
          { id: 'c', text: 'The amber link means the ISP itself has reported an outage.' },
          { id: 'd', text: 'The amber link indicates that a firmware update is in progress on the gateway.' },
        ],
        correctIndex: 1,
        explanation: 'Node colour shows the health of the device itself; link colour shows the health of the connection between two devices. An amber gateway with an amber ISP link means both the device AND the upstream path are under stress together — strong evidence the load is inbound from the WAN. An amber gateway with healthy links would point inward, toward the devices behind it.',
      },
    ],
  },

  // ─────────────────────────── Skill 2: Charts ─────────────────────────────
  {
    id: 'read_charts',
    title: 'Reading the Chart Widgets',
    body: 'The Overview tab shows three small sparklines — Traffic (cyan), CPU (amber), and Latency (purple) — each plotting the last 30 simulation ticks (one per second). Below them, the History chart overlays Traffic and CPU over a longer 24-point window; its labelled x-axis lets you see when a metric started moving. The current value is displayed as a live number next to each sparkline (Mbps, %, or ms). A flat line means nothing has changed; any slope is the first signal to investigate.',
    targetPanel: 'charts',
    lessonRefs: [
      'DDoS at the Edge',
      'Runaway Database Query',
      'The Web Server That Forgot to Let Go',
      'The Overload That Came From Inside',
    ],
    // Charts are the primary first-look tool in all branch_office lessons:
    // DDoS (traffic spike visible on the traffic sparkline), DB Slowdown
    // (CPU and latency climb without a traffic spike), Web Leak (memory
    // proxy not in charts but CPU second-order effect is), Internal Overload
    // (CPU rises, traffic stays flat — chart contrast is the key signal).
    selfCheck: [
      {
        id: 'charts_recall_1',
        tier: 'recall',
        prompt: 'How many simulation ticks (data points) does each of the three small sparklines on the Overview tab plot?',
        options: [
          { id: 'a', text: '10 ticks — the last 10 seconds.' },
          { id: 'b', text: '24 ticks — one for every hour of a typical workday.' },
          { id: 'c', text: '30 ticks — the last 30 seconds of the simulation.' },
          { id: 'd', text: '60 ticks — one full minute of data.' },
        ],
        correctIndex: 2,
        explanation: 'Each sparkline stores its data in state.series.traffic, state.series.cpu, and state.series.latency, which are each capped at 30 entries. The History chart uses a separate 24-point window (state.history). 30 seconds of sparkline history gives enough resolution to see a sudden spike, while 24 history points let you see a slower build-up.',
      },
      {
        id: 'charts_reading_1',
        tier: 'reading',
        prompt: 'Click on the History chart — the chart that overlays both Traffic and CPU together over a longer window.',
        // The history canvas has id="ch-history" and lives inside
        // #pane-history (.tab-pane id="pane-history").
        targetSelector: '#ch-history',
        explanation: 'The History chart (#ch-history) plots state.history.traffic and state.history.cpu together over 24 data points sampled less frequently than the sparklines. Its x-axis shows tick labels so you can see when each metric started moving. The three sparklines (#ch-traffic, #ch-cpu, #ch-latency) show only the last 30 ticks and have no x-axis labels — they\'re for current-value monitoring, not timeline analysis.',
      },
      {
        id: 'charts_synthesis_1',
        tier: 'synthesis',
        prompt: 'The CPU sparkline is climbing steadily, but the Traffic (Mbps) sparkline is completely flat. What type of bottleneck does this pattern suggest?',
        options: [
          { id: 'a', text: 'A volumetric inbound traffic flood — too many packets arriving at once.' },
          { id: 'b', text: 'A compute-driven bottleneck: something on the server itself (a query, a leak, a loop) is consuming CPU without needing more network bandwidth.' },
          { id: 'c', text: 'A failed network cable causing retransmissions.' },
          { id: 'd', text: 'A DNS lookup failure slowing all connections.' },
        ],
        correctIndex: 1,
        explanation: 'If traffic were the cause of high CPU, both metrics would climb together — more packets to process means more CPU. A flat traffic line with a rising CPU line means the load is internal: a query consuming database CPU, a process leaking memory and triggering swaps, or a runaway loop. This chart-pair contrast is one of the fastest ways to narrow the search space before opening other tabs.',
      },
    ],
  },

  // ─────────────────────────── Skill 3: Alerts ─────────────────────────────
  {
    id: 'read_alerts',
    title: 'Interpreting Alerts',
    body: 'Alerts appear in the Alerts tab, newest first. Each entry shows a timestamp, a severity badge (CRITICAL in red, WARNING in amber, INFO in blue), the affected device label, and a plain-English detail line. CRITICAL fires when a metric crosses a hard threshold — CPU above 90%, switch traffic above 700 Mbps, or GPU temperature above 88°C. WARNING fires at intermediate thresholds or when a secondary device starts to show impact from the primary fault. In Teach mode, clicking an alert row opens the Explain panel for that severity level.',
    targetPanel: 'alerts',
    lessonRefs: [
      'DDoS at the Edge',
      'Runaway Database Query',
      'GPU Cluster Thermal Throttling',
      'Broadcast Storm on the LAN',
    ],
    // Every lesson fires both CRITICAL and WARNING alerts; these four are
    // representative because their alert sequences clearly show primary and
    // secondary-effect patterns (DDoS: GW critical then WEB warning;
    // DB Slowdown: DB critical then WEB warning; GPU: GPU critical then
    // throughput warning; Loop Storm: SW critical immediately).
    selfCheck: [
      {
        id: 'alerts_recall_1',
        tier: 'recall',
        prompt: 'In the Alerts panel, what does a WARNING alert indicate, as distinct from CRITICAL?',
        options: [
          { id: 'a', text: 'WARNING means the simulation has paused and is waiting for your input.' },
          { id: 'b', text: 'WARNING fires when a device is approaching a dangerous threshold, or is showing a secondary effect caused by another device\'s problem.' },
          { id: 'c', text: 'WARNING means the same as CRITICAL but is shown in a different colour for visual variety.' },
          { id: 'd', text: 'WARNING alerts are only ever informational and can be safely ignored.' },
        ],
        correctIndex: 1,
        explanation: 'CRITICAL means a threshold has already been crossed and active degradation is happening now. WARNING appears when a device is approaching a threshold, or — importantly — when it is showing downstream effects of another device\'s fault. For example, in the database-slowdown scenario, SRV-WEB-1 receives a WARNING not because it failed, but because it is waiting on SRV-DB-1.',
      },
      {
        id: 'alerts_reading_1',
        tier: 'reading',
        prompt: 'Click on any alert row in the Alerts panel to open its explanation in the Explain panel.',
        // renderAlerts() generates .alert-item[data-level] rows inside #alert-list.
        // Any such row qualifies — the self-check listener matches the class.
        targetSelector: '.alert-item',
        explanation: 'Alert rows (.alert-item elements in #alert-list) are clickable in Teach mode. Each click passes the alert\'s severity level (data-level attribute) to showExplainPanel(\'alert:\' + level), opening a description of what that severity means and how to trace the causal chain from it. In Quiz mode these rows are not interactive.',
      },
      {
        id: 'alerts_synthesis_1',
        tier: 'synthesis',
        prompt: 'A CRITICAL alert fires for Device A at +14 s, then a WARNING alert fires for Device B at +26 s. What does the timing gap between these two alerts suggest about the relationship between the devices?',
        options: [
          { id: 'a', text: 'The two alerts are unrelated; timing gaps are coincidental in a simulation.' },
          { id: 'b', text: 'Device B likely caused Device A\'s failure — the warning arrived first.' },
          { id: 'c', text: 'Device A reached its threshold first, and the downstream effect on Device B took additional seconds to propagate — consistent with Device A being the root cause and Device B being a secondary victim.' },
          { id: 'd', text: 'The gap means the monitoring system was delayed in detecting Device B\'s problem.' },
        ],
        correctIndex: 2,
        explanation: 'Alert ordering is diagnostic evidence. A critical alert on one device followed seconds later by a warning on another device strongly suggests the first device is the cause and the second is feeling the effect. This pattern appears in the database-slowdown lesson (DB critical at +15 s, web warning at +24 s) and the DDoS lesson (GW critical at +14 s, web warning at +26 s). Reading the timestamps is as important as reading the severity labels.',
      },
    ],
  },

  // ─────────────────────────── Skill 4: Packets ────────────────────────────
  {
    id: 'read_packets',
    title: 'Reading Packet Evidence',
    body: 'The Packets tab shows the last 60 captured frames, each with timestamp, source IP, destination, protocol tag, byte length, and an Info field. Rows highlighted in red are flagged as anomalous by the simulation engine — many flagged rows in a short window directly fingerprint the active incident (e.g. repeated SYN packets from many external IPs during a DDoS, or slow-query frames during a database overload). Use the filter buttons (All / Flagged / TCP / UDP / …) to isolate the signal. In Teach mode, clicking any row opens the Explain panel for that protocol.',
    targetPanel: 'packets',
    lessonRefs: [
      'DDoS at the Edge',
      'Runaway Database Query',
      'The Overload That Came From Inside',
      'Broadcast Storm on the LAN',
    ],
    // Packet evidence is most diagnostic in these four lessons: DDoS (many
    // external source IPs, all flagged SYN packets), DB Slowdown (flagged
    // slow-query frames on the WEB→DB connection), Internal Overload (internal
    // source IP opening many connections — distinguishes from DDoS), Broadcast
    // Storm (repeated ARP and STP frames are the loop fingerprint).
    selfCheck: [
      {
        id: 'packets_recall_1',
        tier: 'recall',
        prompt: 'In the packet table, what does a row highlighted in red (the "flagged" style) mean?',
        options: [
          { id: 'a', text: 'The packet was dropped and never delivered.' },
          { id: 'b', text: 'The packet is part of normal baseline traffic and can be safely ignored.' },
          { id: 'c', text: 'The simulation engine has marked this packet as anomalous — its source, destination, or content matches the active incident\'s signature.' },
          { id: 'd', text: 'The packet contains an encryption error.' },
        ],
        correctIndex: 2,
        explanation: 'Flagged packets (rendered with the CSS class "flagged", styled with a red background via .packet-table tr.flagged td) are marked by the engine\'s generatePackets() function when the packet\'s characteristics match the active incident pattern. Filtering to "Flagged only" removes baseline noise and isolates the evidence directly relevant to what\'s wrong.',
      },
      {
        id: 'packets_reading_1',
        tier: 'reading',
        prompt: 'Click on any row in the packet table to open the Explain panel for that packet\'s protocol.',
        // renderPackets() generates <tr data-proto="..."> rows inside #packet-table-body.
        // Any row qualifies — the self-check listener matches the tbody parent.
        targetSelector: '#packet-table-body tr',
        explanation: 'Packet rows (<tr> elements in #packet-table-body) carry a data-proto attribute set to the protocol name (TCP, UDP, ICMP, DNS, ARP, STP). Clicking any row in Teach mode passes that protocol to showExplainPanel(\'proto:\' + proto), opening a description of what that protocol is and what its presence in the capture typically indicates about the incident in progress.',
      },
      {
        id: 'packets_synthesis_1',
        tier: 'synthesis',
        prompt: 'The packet table is filling with flagged TCP rows, each showing a different source IP address but the same destination device and port. What property of this evidence distinguishes a distributed external flood from a single internal host opening many connections?',
        options: [
          { id: 'a', text: 'The packet length — floods use shorter packets than internal connections.' },
          { id: 'b', text: 'The source IP diversity — many distinct external source addresses point to a distributed inbound flood; a single repeating internal source IP points to one host generating connection churn from inside.' },
          { id: 'c', text: 'The protocol — distributed floods always use UDP, not TCP.' },
          { id: 'd', text: 'The destination port — internal connections always use high-numbered ephemeral ports.' },
        ],
        correctIndex: 1,
        explanation: 'Source IP diversity is the key distinguishing signal. In the DDoS lesson, randExternalIp() generates many distinct external addresses — no single source repeats. In the Internal Overload lesson, WKS-02 (one internal host) appears repeatedly as the source. Both scenarios produce high volumes of TCP packets to the same destination, but the source pattern tells you whether to look outward (block at the edge) or inward (investigate the internal host).',
      },
    ],
  },
];

/* ─────────────────────────── ACCESSOR ─────────────────────────── */

/**
 * getSimulationConfig(lesson)
 *
 * Resolves a lesson's simulation step to the full topology and incident
 * objects that engine.js expects. Returns the same shape that
 * createInitialState currently reads off `lesson` directly.
 *
 * @param  {object} lesson  – one entry from LESSONS
 * @returns {{ topology: object, incident: object }}
 */
export function getSimulationConfig(lesson) {
  const simStep = lesson.steps && lesson.steps.find(s => s.type === 'simulation');
  const topologyId = simStep ? simStep.topologyId : lesson.topology;
  const incidentId = simStep ? simStep.incidentId : lesson.incident;

  const topology = TOPOLOGIES[topologyId];
  const incident = INCIDENTS[incidentId];

  if (!topology) throw new Error(`getSimulationConfig: unknown topologyId "${topologyId}" (lesson "${lesson.id}")`);
  if (!incident) throw new Error(`getSimulationConfig: unknown incidentId "${incidentId}" (lesson "${lesson.id}")`);

  return { topology, incident };
}
