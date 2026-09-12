/**
 * src/explain-content.js
 * Pure data module — no DOM, no runtime logic.
 *
 * Lookup table keyed by element type (device type, metric name, alert category,
 * protocol). Used by the Explain Panel in Teach Mode. Exported separately from
 * app.js so tests can import it without triggering DOM-dependent side effects.
 *
 * Contract:
 *   - Every device type in DEVICE_TYPES (lessons.js) must have a 'device:<type>' entry.
 *   - Every metric shown in the UI must have a 'metric:<key>' entry.
 *   - Every alert level the engine can emit must have an 'alert:<level>' entry.
 *   - Every protocol the engine can generate must have a 'proto:<PROTO>' entry.
 *   - A 'fallback' entry must exist for unknown keys.
 *
 * The test in tests/explain-content.test.js enforces these contracts automatically,
 * so any new device type, metric, alert level, or protocol added to lessons.js will
 * immediately fail the test until an explanation is added here.
 */

export const EXPLAIN_CONTENT = {
  // ── Device types ─────────────────────────────────────────────────────────────
  'device:gateway': {
    title: 'Gateway / Router',
    body: 'The gateway is the network\'s border crossing. It routes packets between your internal LAN and the ISP uplink, tracks NAT connection state, and enforces firewall rules. Watch its CPU and traffic graphs together — CPU rising while uplink traffic also rises points to a volumetric flood; CPU rising while traffic stays flat points to connection-table exhaustion from inside.',
  },
  'device:web': {
    title: 'Web / App Server',
    body: 'This server handles HTTP requests from clients and talks to the database tier. Its CPU, memory, and inbound-traffic metrics normally move together during load spikes. If memory climbs while traffic is flat, suspect a leak. If response times rise while the server looks calm, look one hop downstream at the database link.',
  },
  'device:database': {
    title: 'Database Server',
    body: 'Databases are I/O-heavy. The key metric pair here is CPU + disk I/O together. A long-running query scanning large tables drives both high simultaneously. High disk without high CPU is normal bulk read/write; high CPU without high disk might be a computation problem. Watch the link latency to the web server — it\'s the first place downstream effects appear.',
  },
  'device:aicompute': {
    title: 'AI / GPU Compute Node',
    body: 'GPU compute nodes are judged by GPU utilization and temperature together, not CPU. Sustained 90–100% GPU utilization produces heat; once temperature crosses the thermal throttle threshold (≈85–90°C for most hardware), the driver forcibly reduces clock speed. You\'ll see GPU utilization drop back down even though the job isn\'t finished — that\'s throttling, not completion.',
  },
  'device:client': {
    title: 'Client Workstation',
    body: 'Workstations are usually observers of network problems, not their cause — unless one is generating abnormal outbound traffic or connection churn. A workstation with normal bandwidth but extremely high new-connection rate can exhaust a router\'s connection-tracking table. Use packet evidence to distinguish "a workstation is a victim" from "a workstation is the source."',
  },
  'device:switch': {
    title: 'Network Switch',
    body: 'A switch operates at Layer 2 (Ethernet frames). Its CPU should stay low unless it\'s under attack or has a loop. Broadcast storms — caused by a switching loop — make switch CPU and traffic spike dramatically while every attached device loses connectivity simultaneously. The tell: multiple devices all fail at the same moment, and the switch itself is the shared upstream point.',
  },

  // ── Metrics ──────────────────────────────────────────────────────────────────
  'metric:cpu': {
    title: 'CPU Utilization',
    body: 'CPU measures the fraction of processor time actually in use. Normal idle servers sit between 10–40%; a sustained spike above 90% usually points to a runaway process, heavy query, or traffic flood. Look at what else is moving simultaneously: high CPU + high disk → I/O-bound query; high CPU + high traffic on a gateway → volumetric flood; high CPU + rising memory → system entering swap.',
  },
  'metric:memory': {
    title: 'Memory / RAM',
    body: 'Memory rising steadily over time — without a matching increase in traffic or load — is the signature of a memory leak. Normal server utilization is 30–70%; once exhausted, the OS starts swapping to disk, which is slow and drags CPU up as a secondary effect. The causal order is always: memory climbs first, then CPU rises, then latency follows.',
  },
  'metric:traffic': {
    title: 'Network Traffic (Mbps)',
    body: 'Traffic measures bytes flowing through a device per second. A sudden spike at the gateway from many external sources points to an inbound flood. Normal gateway traffic at baseline while an internal device spikes points to a lateral problem. Flat traffic while response times rise means the bottleneck is compute or memory, not the network link.',
  },
  'metric:disk': {
    title: 'Disk I/O',
    body: 'Disk I/O measures how much data is being read from or written to storage, as a percentage of the drive\'s capacity. Normal is under 40% for most servers. High disk I/O together with high CPU on a database server almost always means a heavy query doing full-table scans; on a web server it usually means the system has run out of RAM and is swapping.',
  },
  'metric:temperature': {
    title: 'Hardware Temperature',
    body: 'Temperature matters most for GPU compute nodes. Safe GPU operating range is roughly 30–85°C; many drivers enforce thermal throttling above that, forcibly reducing clock speed. You\'ll see GPU utilization drop back down even though the job is still running — that drop is throttling, not task completion.',
  },
  'metric:gpu': {
    title: 'GPU Utilization',
    body: 'GPU utilization shows what fraction of the graphics or compute cores are active. A node held at 95–100% for extended periods will overheat if cooling is insufficient. The pattern to watch for: utilization climbs to near-100%, temperature follows, then utilization drops back — that drop is thermal throttling kicking in, not work finishing.',
  },
  'metric:vram': {
    title: 'VRAM (Video RAM)',
    body: 'VRAM is the dedicated memory on a GPU used to hold model weights, activations, and intermediate tensors during computation. Normal utilization for a busy training job is 70–95%. If VRAM hits 100%, the GPU must spill overflow to slower system RAM or disk, which can dramatically slow or crash a training run.',
  },
  'metric:latency': {
    title: 'Network Latency (ms)',
    body: 'Latency is the round-trip time for a packet to travel between two points. Baseline LAN latency is typically under 10 ms; values above 50 ms on internal links suggest congestion or CPU overload at the near end. Values above 150 ms usually correspond to user-visible timeouts and dropped TCP connections.',
  },
  'metric:pktloss': {
    title: 'Packet Loss (%)',
    body: 'Packet loss is the fraction of packets that never arrive. Even 1–2% loss causes TCP to trigger retransmits, effectively multiplying latency. Above 5%, connections become unreliable and applications time out. A gateway showing both high traffic volume and high packet loss is a strong indicator of an inbound flood or uplink saturation.',
  },
  'metric:jitter': {
    title: 'Jitter (ms)',
    body: 'Jitter measures how much latency varies from packet to packet. Low, steady latency is fine; high jitter means packets are arriving in bursts, which forces receive buffers to hold frames longer and degrades real-time protocols like VoIP or video. Jitter above 20 ms on a LAN typically points to queue buildup or CPU scheduling delays on a heavily loaded device.',
  },
  'metric:bandwidth': {
    title: 'Bandwidth Utilization (%)',
    body: 'Bandwidth utilization is how much of a link\'s total capacity is currently in use. A well-run LAN link stays below 50–60% under normal load. Sustained utilization above 80% causes queuing — packets wait, adding latency. At 100%, packets are dropped. Unlike raw traffic (Mbps), utilization contextualizes the traffic against the link\'s actual capacity.',
  },
  'metric:retransmissions': {
    title: 'Retransmissions (per minute)',
    body: 'A retransmission happens when TCP doesn\'t receive an acknowledgment in time and re-sends a packet. A few per minute is normal; a high rate means packets are being lost or delayed badly enough that the sender is giving up waiting. High retransmissions combined with high packet loss confirms congestion or link degradation — not a server-side compute problem.',
  },
  'metric:pkt_in': {
    title: 'Packets In (pps)',
    body: 'Packets per second inbound measures how many individual network frames are arriving at this device. Normal office LAN traffic is a few hundred to a few thousand pps. A sudden spike to tens of thousands of pps — especially if most packets are small and from many different sources — is a classic volumetric DDoS or SYN flood signature.',
  },
  'metric:pkt_out': {
    title: 'Packets Out (pps)',
    body: 'Packets per second outbound measures the device\'s response traffic. It normally tracks inbound pps closely; a large imbalance where in >> out means many requests are arriving but few are being answered — consistent with a server being overwhelmed, or a flood of SYN packets that never get SYN-ACK responses.',
  },
  'metric:hotlink': {
    title: 'Most Loaded Link',
    body: 'The most loaded link is whichever network connection between two devices currently has the highest bandwidth utilization. Investigating this link first is a good shortcut when looking for a bottleneck. If the hottest link is the ISP uplink, the problem is likely inbound; if it\'s an internal server-to-server link, the problem originates inside the network.',
  },
  'metric:latency_avg': {
    title: 'Average Latency',
    body: 'A rising network-wide average means multiple links are degrading simultaneously — which points upstream to a shared bottleneck like a gateway or switch rather than to a single isolated device. If average is high but one specific link is the outlier, use the Topology view to locate that link.',
  },
  'metric:cpu_avg': {
    title: 'Average CPU',
    body: 'Average CPU across all devices helps distinguish a network-wide load event from a single noisy device. If the average is high but only one device is responsible, the other devices are likely downstream victims rather than root causes. Isolate the high-CPU device and cross-check its disk, memory, and traffic.',
  },
  'metric:devices_healthy': {
    title: 'Devices Healthy',
    body: 'This counter shows how many devices are currently in a healthy state. If it drops suddenly for multiple devices at the same instant, look for a shared upstream device — gateway or switch — rather than individual hardware failures, which are statistically unlikely to happen simultaneously.',
  },
  'metric:sim_time': {
    title: 'Simulation Time',
    body: 'The simulation clock shows elapsed time since the lesson started. Use it to correlate when symptoms first appeared: note the exact second a metric crossed a threshold, then look at which other metrics changed around that same time. The order of events is itself diagnostic evidence.',
  },
  'metric:alerts': {
    title: 'Active Alerts',
    body: 'Active alerts is a count of all events that have fired during this session. Critical alerts indicate active service degradation and require immediate attention. Warning alerts often point to secondary effects of the primary fault. Trace the causal chain from the first critical alert outward to understand how the incident propagated.',
  },
  'metric:traffic_chart': {
    title: 'Traffic Chart (Mbps)',
    body: 'This rolling chart shows network traffic averaged across all devices over the last 30 seconds. A spike here means the network is carrying more data than usual. Look at the shape of the spike: a sudden vertical jump suggests an event (DDoS, burst); a gradual slope suggests a growing problem like a runaway process or leak.',
  },
  'metric:cpu_chart': {
    title: 'CPU Chart (%)',
    body: 'This rolling chart shows average CPU utilization across all monitored devices. A climbing CPU line means one or more devices are under increasing load. Cross-reference with the traffic chart: if traffic is flat while CPU climbs, the load is compute-driven (query, leak, loop) rather than network-driven.',
  },
  'metric:latency_chart': {
    title: 'Latency Chart (ms)',
    body: 'This rolling chart shows average round-trip latency across all network links. Latency rising after a traffic or CPU spike tells you the network is now queuing packets, not just processing them. Latency that rises before traffic spikes often points to a CPU-bound device slowing down its ability to forward packets.',
  },

  // ── Alert categories ──────────────────────────────────────────────────────────
  'alert:critical': {
    title: 'Critical Alert',
    body: 'A device or link has crossed a threshold causing active service degradation right now. Start at the device named in the alert, open its detail panel, and cross-reference its metrics with the Topology view to trace which upstream or downstream devices are affected.',
  },
  'alert:warning': {
    title: 'Warning Alert',
    body: 'A device is approaching a dangerous threshold, or is showing a secondary effect caused by another device\'s problem. Warning alerts often appear a few seconds after the critical alert that triggered them. Trace the causal chain from the critical device to this warning device to understand how the fault is propagating.',
  },
  'alert:info': {
    title: 'Informational Alert',
    body: 'Records state changes that are not themselves problems — a simulation starting, a link recovering, or a device returning to healthy. Info alerts provide timeline context that helps you understand when the incident started and when individual devices began recovering.',
  },

  // ── Protocols ─────────────────────────────────────────────────────────────────
  'proto:TCP': {
    title: 'TCP Packet',
    body: 'TCP provides reliable, ordered delivery using a handshake (SYN → SYN-ACK → ACK). A flood of SYN packets with no matching SYN-ACK responses is the signature of a SYN flood. Source-address diversity tells you whether it\'s from many external sources (DDoS) or one internal host opening connections rapidly (connection-tracking exhaustion).',
  },
  'proto:UDP': {
    title: 'UDP Packet',
    body: 'UDP is connectionless — no handshake, no built-in retransmit. It\'s used for DNS queries, video streaming, and inter-node sync in distributed compute jobs. Large UDP packets between GPU nodes are typically gradient synchronization traffic. If those packets are retransmitting, the underlying link is lossy or congested.',
  },
  'proto:ICMP': {
    title: 'ICMP Packet',
    body: 'ICMP is the network\'s diagnostic protocol — it carries ping (echo request/reply) and router error messages like "destination unreachable." Sudden ICMP floods can be used as an attack vector. An ICMP error message from a device means that device is actively rejecting or cannot forward the traffic it\'s receiving.',
  },
  'proto:DNS': {
    title: 'DNS Packet',
    body: 'DNS translates human-readable names (like example.com) into IP addresses. DNS failures cascade quickly because almost every application relies on name resolution before it can make a connection. Unusual DNS query volumes can indicate malware trying to phone home or data being smuggled out through DNS queries.',
  },
  'proto:ARP': {
    title: 'ARP Packet',
    body: 'ARP (Address Resolution Protocol) maps an IP address to a MAC address on the same local network. Repeated ARP broadcasts from the same source, or the same ARP frame re-entering a switch on multiple ports, is the classic fingerprint of a switching loop creating a broadcast storm.',
  },
  'proto:STP': {
    title: 'STP — Spanning Tree Protocol',
    body: 'STP prevents Ethernet loops by automatically blocking redundant switch ports. A continuous stream of Topology Change Notifications (TCN) means the spanning tree is reconverging repeatedly — a strong indicator of a physical loop or a port that keeps flapping up and down.',
  },

  // ── Fallback ──────────────────────────────────────────────────────────────────
  'fallback': {
    title: 'No Explanation Available',
    body: 'No explanation is available for this element. Try clicking a device node on the Topology or Overview tab, a stat card in the bar above, an alert entry, or a packet row.',
  },
};
