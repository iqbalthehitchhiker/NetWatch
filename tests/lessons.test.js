/**
 * tests/lessons.test.js
 * Structural tests for the lessons.js data model.
 *
 * Assertions:
 *   1. Every lesson has all 4 step types, in the required order.
 *   2. Every course.lessonIds entry resolves to a real lesson id.
 *   3. getSimulationConfig(lesson) returns a valid topology + incident for every lesson.
 */

import { describe, it, expect } from 'vitest';
import { LESSONS, COURSES, TOPOLOGIES, INCIDENTS, getSimulationConfig } from '../src/lessons.js';

// ─── 1. Step structure ────────────────────────────────────────────────────────

describe('LESSONS step structure', () => {
  const REQUIRED_STEP_TYPES = ['concept', 'watchFor', 'simulation', 'quiz'];

  LESSONS.forEach(lesson => {
    describe(`lesson "${lesson.id}"`, () => {
      it('has a steps array', () => {
        expect(Array.isArray(lesson.steps)).toBe(true);
      });

      it('has exactly 4 steps', () => {
        expect(lesson.steps).toHaveLength(4);
      });

      it('has all 4 required step types in order', () => {
        const types = lesson.steps.map(s => s.type);
        expect(types).toEqual(REQUIRED_STEP_TYPES);
      });

      it('concept step has title and body', () => {
        const step = lesson.steps.find(s => s.type === 'concept');
        expect(typeof step.title).toBe('string');
        expect(step.title.length).toBeGreaterThan(0);
        expect(typeof step.body).toBe('string');
        expect(step.body.length).toBeGreaterThan(0);
      });

      it('watchFor step has title, body, and metricKeys array', () => {
        const step = lesson.steps.find(s => s.type === 'watchFor');
        expect(typeof step.title).toBe('string');
        expect(step.title.length).toBeGreaterThan(0);
        expect(typeof step.body).toBe('string');
        expect(step.body.length).toBeGreaterThan(0);
        expect(Array.isArray(step.metricKeys)).toBe(true);
        expect(step.metricKeys.length).toBeGreaterThan(0);
      });

      it('watchFor metricKeys only reference valid engine state keys', () => {
        // Valid keys: state.series (traffic, cpu, latency) and state.history (labels, traffic, cpu)
        const VALID_METRIC_KEYS = new Set(['traffic', 'cpu', 'latency', 'labels']);
        const step = lesson.steps.find(s => s.type === 'watchFor');
        step.metricKeys.forEach(key => {
          expect(VALID_METRIC_KEYS.has(key), `unknown metricKey "${key}" in lesson "${lesson.id}"`).toBe(true);
        });
      });

      it('simulation step has topologyId and incidentId', () => {
        const step = lesson.steps.find(s => s.type === 'simulation');
        expect(typeof step.topologyId).toBe('string');
        expect(step.topologyId.length).toBeGreaterThan(0);
        expect(typeof step.incidentId).toBe('string');
        expect(step.incidentId.length).toBeGreaterThan(0);
      });

      it('simulation step topologyId resolves to a known topology', () => {
        const step = lesson.steps.find(s => s.type === 'simulation');
        expect(TOPOLOGIES[step.topologyId], `unknown topologyId "${step.topologyId}"`).toBeDefined();
      });

      it('simulation step incidentId resolves to a known incident', () => {
        const step = lesson.steps.find(s => s.type === 'simulation');
        expect(INCIDENTS[step.incidentId], `unknown incidentId "${step.incidentId}"`).toBeDefined();
      });

      it('quiz step has options, correctIndex, hints, and explanation', () => {
        const step = lesson.steps.find(s => s.type === 'quiz');
        expect(Array.isArray(step.options)).toBe(true);
        expect(step.options.length).toBeGreaterThan(0);
        expect(typeof step.correctIndex).toBe('number');
        expect(Array.isArray(step.hints)).toBe(true);
        expect(step.hints.length).toBeGreaterThan(0);
        expect(typeof step.explanation).toBe('string');
        expect(step.explanation.length).toBeGreaterThan(0);
      });

      it('quiz step correctIndex points to the correct option', () => {
        const step = lesson.steps.find(s => s.type === 'quiz');
        const pointed = step.options[step.correctIndex];
        expect(pointed, 'correctIndex out of bounds').toBeDefined();
        expect(pointed.correct).toBe(true);
      });
    });
  });
});

// ─── 2. Course integrity ──────────────────────────────────────────────────────

describe('COURSES integrity', () => {
  const lessonIdSet = new Set(LESSONS.map(l => l.id));

  it('COURSES is a non-empty array', () => {
    expect(Array.isArray(COURSES)).toBe(true);
    expect(COURSES.length).toBeGreaterThan(0);
  });

  COURSES.forEach(course => {
    describe(`course "${course.id}"`, () => {
      it('has required fields: id, title, description, estimatedMinutes, lessonIds', () => {
        expect(typeof course.id).toBe('string');
        expect(typeof course.title).toBe('string');
        expect(typeof course.description).toBe('string');
        expect(typeof course.estimatedMinutes).toBe('number');
        expect(Array.isArray(course.lessonIds)).toBe(true);
      });

      it('lessonIds is non-empty', () => {
        expect(course.lessonIds.length).toBeGreaterThan(0);
      });

      course.lessonIds.forEach(lid => {
        it(`lessonId "${lid}" resolves to a real lesson`, () => {
          expect(lessonIdSet.has(lid), `course "${course.id}" references unknown lessonId "${lid}"`).toBe(true);
        });
      });
    });
  });

  it('every lesson is covered by exactly one course', () => {
    const covered = COURSES.flatMap(c => c.lessonIds);
    // Each lesson appears at least once
    LESSONS.forEach(lesson => {
      expect(covered, `lesson "${lesson.id}" is not in any course`).toContain(lesson.id);
    });
    // No duplicates (each lesson in exactly one course)
    const counts = {};
    covered.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    Object.entries(counts).forEach(([id, count]) => {
      expect(count, `lesson "${id}" appears in ${count} courses`).toBe(1);
    });
  });
});

// ─── 3. getSimulationConfig ───────────────────────────────────────────────────

describe('getSimulationConfig', () => {
  LESSONS.forEach(lesson => {
    it(`returns valid topology and incident for lesson "${lesson.id}"`, () => {
      const config = getSimulationConfig(lesson);

      // Shape: two keys
      expect(config).toHaveProperty('topology');
      expect(config).toHaveProperty('incident');

      // topology has the fields engine.js reads (name, nodes, links)
      expect(typeof config.topology.name).toBe('string');
      expect(Array.isArray(config.topology.nodes)).toBe(true);
      expect(Array.isArray(config.topology.links)).toBe(true);

      // incident has the fields engine.js reads (packetPattern, focusDevice, stages)
      expect(typeof config.incident.packetPattern).toBe('string');
      expect(typeof config.incident.focusDevice).toBe('string');
      expect(Array.isArray(config.incident.stages)).toBe(true);
    });
  });

  it('throws on a lesson with an unknown topologyId', () => {
    const bad = { id: 'test', steps: [{ type: 'concept' }, { type: 'watchFor' }, { type: 'simulation', topologyId: '__bad__', incidentId: 'ddos_incident' }, { type: 'quiz' }] };
    expect(() => getSimulationConfig(bad)).toThrow(/unknown topologyId/);
  });

  it('throws on a lesson with an unknown incidentId', () => {
    const bad = { id: 'test', steps: [{ type: 'concept' }, { type: 'watchFor' }, { type: 'simulation', topologyId: 'branch_office', incidentId: '__bad__' }, { type: 'quiz' }] };
    expect(() => getSimulationConfig(bad)).toThrow(/unknown incidentId/);
  });

  it('falls back to lesson.topology / lesson.incident when no steps array exists (legacy compatibility)', () => {
    const legacy = { id: 'legacy', topology: 'small_lan', incident: 'loop_storm_incident' };
    const config = getSimulationConfig(legacy);
    expect(config.topology).toBe(TOPOLOGIES['small_lan']);
    expect(config.incident).toBe(INCIDENTS['loop_storm_incident']);
  });
});

// ─── 4. TODO placeholder coverage report ─────────────────────────────────────

describe('TODO placeholder tracking', () => {
  it('lessons 1-2 have no TODO placeholders in concept/watchFor bodies', () => {
    const firstTwo = ['ddos_edge', 'db_slowdown'];
    firstTwo.forEach(id => {
      const lesson = LESSONS.find(l => l.id === id);
      ['concept', 'watchFor'].forEach(type => {
        const step = lesson.steps.find(s => s.type === type);
        expect(step.body, `lesson "${id}" step "${type}" should not contain TODO`).not.toMatch(/TODO/i);
      });
    });
  });

  it('lessons 3-6 have TODO placeholders in concept/watchFor bodies (still pending real content)', () => {
    const remaining = ['gpu_thermal', 'internal_overload', 'web_leak', 'loop_storm'];
    remaining.forEach(id => {
      const lesson = LESSONS.find(l => l.id === id);
      ['concept', 'watchFor'].forEach(type => {
        const step = lesson.steps.find(s => s.type === type);
        expect(step.body, `lesson "${id}" step "${type}" should contain a TODO placeholder`).toMatch(/TODO/i);
      });
    });
  });
});
