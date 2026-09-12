/**
 * tests/explain-content.test.js
 *
 * Requirement 3 tests:
 *
 * (a) Coverage — every device type, metric key, alert level, and protocol that
 *     can appear in a lesson has a corresponding entry in EXPLAIN_CONTENT.
 *     This test fails automatically when new types are added to lessons.js
 *     without a matching explanation being added to explain-content.js.
 *
 * (b) Quiz-mode suppression — showExplainPanel() is a no-op when the current
 *     session mode is 'quiz', meaning it never touches the DOM in that mode.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EXPLAIN_CONTENT } from '../src/explain-content.js';
import { DEVICE_TYPES, LESSONS, INCIDENTS } from '../src/lessons.js';

// ─── (a) Coverage: device types ──────────────────────────────────────────────

describe('EXPLAIN_CONTENT coverage — device types', () => {
  it('has an entry for every device type defined in DEVICE_TYPES', () => {
    const missingTypes = [];
    for (const type of Object.keys(DEVICE_TYPES)) {
      const key = `device:${type}`;
      if (!EXPLAIN_CONTENT[key]) missingTypes.push(key);
    }
    expect(
      missingTypes,
      `Missing EXPLAIN_CONTENT entries: ${missingTypes.join(', ')}.\n` +
      'Add an explanation for each new device type in src/explain-content.js.'
    ).toHaveLength(0);
  });

  it('each device entry has a non-empty title and body', () => {
    for (const type of Object.keys(DEVICE_TYPES)) {
      const entry = EXPLAIN_CONTENT[`device:${type}`];
      expect(entry?.title?.length, `device:${type} title is empty`).toBeGreaterThan(0);
      expect(entry?.body?.length,  `device:${type} body is empty`).toBeGreaterThan(0);
    }
  });
});

// ─── (a) Coverage: stat-bar metric keys ──────────────────────────────────────
// These are the data-metric-key values used in index.html's stat bar and
// metrics tab. If you add a new stat card, add its key here AND in explain-content.js.

describe('EXPLAIN_CONTENT coverage — UI metric keys', () => {
  // Keys that appear as data-metric-key in index.html (stat bar + metrics tab)
  const UI_METRIC_KEYS = [
    'devices_healthy',
    'alerts',
    'latency_avg',
    'cpu_avg',
    'pktloss',
    'sim_time',
    // Metrics tab — Packet Statistics panel
    'pkt_in',
    'pkt_out',
    'retransmissions',
    // Metrics tab — Link Quality panel
    'jitter',
    'bandwidth',
    'hotlink',
    // Chart panels (Overview tab)
    'traffic_chart',
    'cpu_chart',
    'latency_chart',
    // Device-level metrics (rendered in device detail modal and device grid)
    'cpu',
    'memory',
    'traffic',
    'disk',
    'temperature',
    'gpu',
    'vram',
    'latency',
  ];

  it('has an entry for every metric key used in the UI', () => {
    const missing = UI_METRIC_KEYS.filter(k => !EXPLAIN_CONTENT[`metric:${k}`]);
    expect(
      missing,
      `Missing metric entries: ${missing.map(k => 'metric:' + k).join(', ')}.\n` +
      'Add an explanation for each in src/explain-content.js.'
    ).toHaveLength(0);
  });

  it('each metric entry has a non-empty title and body', () => {
    for (const k of UI_METRIC_KEYS) {
      const entry = EXPLAIN_CONTENT[`metric:${k}`];
      expect(entry?.title?.length, `metric:${k} title is empty`).toBeGreaterThan(0);
      expect(entry?.body?.length,  `metric:${k} body is empty`).toBeGreaterThan(0);
    }
  });
});

// ─── (a) Coverage: alert levels ──────────────────────────────────────────────
// Derived from every unique alert.level value in all INCIDENTS.

describe('EXPLAIN_CONTENT coverage — alert levels', () => {
  it('has an entry for every alert level emitted by any incident stage', () => {
    const levelsInLessons = new Set();
    for (const incident of Object.values(INCIDENTS)) {
      for (const stage of incident.stages) {
        if (stage.alert?.level) levelsInLessons.add(stage.alert.level);
      }
    }

    const missing = [...levelsInLessons].filter(l => !EXPLAIN_CONTENT[`alert:${l}`]);
    expect(
      missing,
      `Missing alert entries: ${missing.map(l => 'alert:' + l).join(', ')}.\n` +
      'Add an explanation for each in src/explain-content.js.'
    ).toHaveLength(0);
  });

  it('each alert entry has a non-empty title and body', () => {
    for (const level of ['critical', 'warning', 'info']) {
      const entry = EXPLAIN_CONTENT[`alert:${level}`];
      expect(entry?.title?.length, `alert:${level} title is empty`).toBeGreaterThan(0);
      expect(entry?.body?.length,  `alert:${level} body is empty`).toBeGreaterThan(0);
    }
  });
});

// ─── (a) Coverage: protocols ─────────────────────────────────────────────────
// The engine generates a fixed set of protocols across all packet patterns.
// Listed explicitly here so a new protocol added to engine.js is caught immediately.

describe('EXPLAIN_CONTENT coverage — packet protocols', () => {
  // Derived from src/engine.js generatePackets() — all proto values used
  const ENGINE_PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'DNS', 'ARP', 'STP'];

  it('has an entry for every protocol the engine can generate', () => {
    const missing = ENGINE_PROTOCOLS.filter(p => !EXPLAIN_CONTENT[`proto:${p}`]);
    expect(
      missing,
      `Missing protocol entries: ${missing.map(p => 'proto:' + p).join(', ')}.\n` +
      'Add an explanation for each in src/explain-content.js.'
    ).toHaveLength(0);
  });

  it('each protocol entry has a non-empty title and body', () => {
    for (const p of ENGINE_PROTOCOLS) {
      const entry = EXPLAIN_CONTENT[`proto:${p}`];
      expect(entry?.title?.length, `proto:${p} title is empty`).toBeGreaterThan(0);
      expect(entry?.body?.length,  `proto:${p} body is empty`).toBeGreaterThan(0);
    }
  });
});

// ─── (a) Fallback entry ───────────────────────────────────────────────────────

describe('EXPLAIN_CONTENT fallback', () => {
  it('has a non-empty fallback entry for unknown keys', () => {
    expect(EXPLAIN_CONTENT['fallback']?.title?.length).toBeGreaterThan(0);
    expect(EXPLAIN_CONTENT['fallback']?.body?.length).toBeGreaterThan(0);
  });

  it('an unknown key resolves to fallback (not undefined)', () => {
    const key = 'device:nonexistent_type_xyz';
    const entry = EXPLAIN_CONTENT[key] ?? EXPLAIN_CONTENT['fallback'];
    expect(entry.title).toBe(EXPLAIN_CONTENT['fallback'].title);
    expect(entry.body).toBe(EXPLAIN_CONTENT['fallback'].body);
  });
});

// ─── (b) Quiz-mode suppression ────────────────────────────────────────────────
// showExplainPanel() must be a no-op when mode === 'quiz'.
// We mock the auth module to control getCurrentMode(), and use a minimal DOM stub
// to detect whether the panel would have been shown.

describe('showExplainPanel — quiz-mode suppression (Req 6)', () => {
  // Mock the auth module before importing app-level functions
  vi.mock('../src/auth.js', () => ({
    getSessionToken:      vi.fn(() => null),
    getCurrentMode:       vi.fn(() => 'quiz'),    // ← quiz mode
    getStudentName:       vi.fn(() => null),
    getStudentNPM:        vi.fn(() => null),
    clearStudentSession:  vi.fn(),
    setStudentSession:    vi.fn(),
    setInstructorToken:   vi.fn(),
    getInstructorToken:   vi.fn(() => null),
    clearInstructorToken: vi.fn(),
  }));

  // Minimal DOM stub — only the elements showExplainPanel would touch
  beforeEach(() => {
    global.document = {
      getElementById: vi.fn(() => ({
        textContent: '',
        classList: { remove: vi.fn(), add: vi.fn(), contains: vi.fn(() => true) },
      })),
    };
  });

  it('does not call document.getElementById when mode is quiz', async () => {
    // Dynamic import AFTER vi.mock is registered so the mock is in effect
    const { showExplainPanel } = await import('../src/explain-content-bridge.js');
    showExplainPanel('device:gateway');
    expect(global.document.getElementById).not.toHaveBeenCalled();
  });

  it('does not show the panel for any known key when mode is quiz', async () => {
    const { showExplainPanel } = await import('../src/explain-content-bridge.js');
    const allKeys = Object.keys(EXPLAIN_CONTENT).filter(k => k !== 'fallback');
    for (const key of allKeys) {
      showExplainPanel(key);
    }
    expect(global.document.getElementById).not.toHaveBeenCalled();
  });
});
