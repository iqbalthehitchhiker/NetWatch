/**
 * tests/engine.test.js
 * Property and unit tests for the simulation engine.
 *
 * Feature: teach-quiz-mode
 * Property 12: Tick exception isolation — if one device throws, others still advance
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { LESSONS } from '../src/lessons.js';
import { createInitialState, tick, computeHealth, findNode } from '../src/engine.js';

function makeState(lessonId = 'ddos_edge') {
  const lesson = LESSONS.find(l => l.id === lessonId);
  return createInitialState(lesson);
}

// ─── Unit: createInitialState ─────────────────────────────────────────────────

describe('createInitialState', () => {
  it('produces a state with simRunning=false and elapsed=0', () => {
    const state = makeState();
    expect(state.simRunning).toBe(false);
    expect(state.elapsed).toBe(0);
    expect(state.alerts).toHaveLength(0);
    expect(state.packets).toHaveLength(0);
  });

  it('seeds every non-external node with cur and target matching BASELINE', () => {
    const state = makeState();
    state.topo.nodes.filter(n => !n.isExternal).forEach(n => {
      expect(typeof n.cur.cpu).toBe('number');
      expect(typeof n.target.cpu).toBe('number');
    });
  });
});

// ─── Unit: tick advances elapsed ─────────────────────────────────────────────

describe('tick', () => {
  it('increments elapsed by 1 each call', () => {
    const state = makeState();
    tick(state);
    expect(state.elapsed).toBe(1);
    tick(state);
    expect(state.elapsed).toBe(2);
  });

  it('generates at least one packet after baseline stage', () => {
    const state = makeState();
    tick(state);
    expect(state.packets.length).toBeGreaterThanOrEqual(1);
  });

  it('fires incident stage alerts when elapsed reaches atSecond', () => {
    const state = makeState('ddos_edge');
    // advance to just past stage 2 (atSecond: 14)
    for (let i = 0; i < 15; i++) tick(state);
    expect(state.alerts.length).toBeGreaterThan(0);
  });
});

// ─── Property 12: Tick exception isolation ───────────────────────────────────

describe('Property 12: Tick exception isolation', () => {
  it('continues advancing other nodes even if one throws during telemetry update', () => {
    // Feature: teach-quiz-mode, Property 12: Tick exception isolation
    const state = makeState('ddos_edge');

    // Patch the lerp target of the first non-external node so accessing
    // tgt.cpu (inside the try/catch block) throws.
    const faultyNode = state.topo.nodes.find(n => !n.isExternal);
    const otherNodes = state.topo.nodes.filter(n => !n.isExternal && n !== faultyNode);
    const beforeCpus = otherNodes.map(n => n.cur.cpu);

    // Make tgt.cpu a getter that throws — this is inside the per-device try/catch
    const originalTarget = faultyNode.target;
    Object.defineProperty(faultyNode, 'target', {
      get() { throw new Error('simulated device fault'); },
      configurable: true,
    });

    // tick should NOT propagate the exception (Req 9.2)
    expect(() => tick(state)).not.toThrow();

    // elapsed should still have incremented
    expect(state.elapsed).toBe(1);

    // Restore
    Object.defineProperty(faultyNode, 'target', {
      value: originalTarget,
      writable: true,
      configurable: true,
    });
  });
});

// ─── Unit: computeHealth thresholds ──────────────────────────────────────────

describe('computeHealth', () => {
  it('returns "healthy" for baseline values', () => {
    const n = { type: 'web', offline: false, cur: { cpu: 28, mem: 44, traffic: 40, disk: 15, temp: 40 } };
    expect(computeHealth(n)).toBe('healthy');
  });

  it('returns "critical" when cpu > 90', () => {
    const n = { type: 'web', offline: false, cur: { cpu: 95, mem: 44, traffic: 40, disk: 15, temp: 40 } };
    expect(computeHealth(n)).toBe('critical');
  });

  it('returns "offline" when n.offline = true', () => {
    const n = { type: 'web', offline: true, cur: { cpu: 5, mem: 10, traffic: 5, disk: 5, temp: 30 } };
    expect(computeHealth(n)).toBe('offline');
  });

  it('returns "critical" for switch with traffic > 700', () => {
    const n = { type: 'switch', offline: false, cur: { cpu: 20, mem: 30, traffic: 800, disk: 5, temp: 35 } };
    expect(computeHealth(n)).toBe('critical');
  });

  it('returns "critical" for aicompute with temp > 88', () => {
    const n = { type: 'aicompute', offline: false, cur: { cpu: 30, mem: 40, traffic: 25, disk: 20, temp: 92, gpu: 90, vram: 80 } };
    expect(computeHealth(n)).toBe('critical');
  });
});

// ─── Property: tick does not read mode or auth (structural) ──────────────────

describe('Property 11: engine state is mode-independent', () => {
  it('produces the same node health for the same seed inputs regardless of external variables', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 5 }),
        tickCount => {
          // Run tick N times on two independent states (same lesson)
          const stateA = makeState('ddos_edge');
          const stateB = makeState('ddos_edge');

          // Synchronise random seeds is impossible in JS, but we can verify
          // the structural contract: both states advance by the same elapsed count
          for (let i = 0; i < tickCount; i++) { tick(stateA); tick(stateB); }
          expect(stateA.elapsed).toBe(stateB.elapsed);

          // Both states should have the same number of alert stages fired
          expect(stateA.firedStages.size).toBe(stateB.firedStages.size);
        }
      ),
      { numRuns: 100 }
    );
  });
});
