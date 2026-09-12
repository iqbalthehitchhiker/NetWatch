/**
 * tests/smoke.test.js
 * Static smoke tests — no DOM, no network.
 *
 * Task 6.2: engine.js must contain zero forbidden references.
 * Task 14.2: frontend src/ must contain no plaintext password constants.
 * Task 14.3: backend/constants.js must export ATTEMPT_LIMIT === 3.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ─── Task 6.2 — engine.js must not reference auth/mode/DOM ──────────────────

describe('engine.js static analysis', () => {
  const engineSrc = readFileSync(path.join(ROOT, 'src', 'engine.js'), 'utf8');
  const forbidden = ['currentMode', 'sessionToken', 'instructorToken', 'localStorage', 'sessionStorage', 'document\\.'];

  forbidden.forEach(pattern => {
    it(`must not contain "${pattern}"`, () => {
      const re = new RegExp(pattern);
      expect(re.test(engineSrc), `engine.js contains forbidden pattern: ${pattern}`).toBe(false);
    });
  });
});

// ─── Task 14.2 — no plaintext password constants in src/ ────────────────────

describe('frontend src/ has no hardcoded password constants', () => {
  const BANNED = [
    /RESET_PASSWORD\s*=\s*['"]/,
    /=\s*['"]netwatch[-_]?reset/i,
    /password\s*[=:]\s*['"][a-zA-Z0-9@#$%]{4,}/,  // password = 'literal' patterns
  ];

  function collectJsFiles(dir) {
    const results = [];
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...collectJsFiles(full));
      else if (entry.endsWith('.js')) results.push(full);
    }
    return results;
  }

  const srcFiles = collectJsFiles(path.join(ROOT, 'src'));

  srcFiles.forEach(file => {
    BANNED.forEach(pattern => {
      it(`${path.relative(ROOT, file)} must not match ${pattern}`, () => {
        const src = readFileSync(file, 'utf8');
        expect(pattern.test(src),
          `File ${path.relative(ROOT, file)} contains a banned pattern: ${pattern}`
        ).toBe(false);
      });
    });
  });
});

// ─── Task 14.3 — ATTEMPT_LIMIT === 3 ─────────────────────────────────────────

describe('backend/constants.js', () => {
  it('exports ATTEMPT_LIMIT === 3', async () => {
    const { ATTEMPT_LIMIT } = await import('../backend/constants.js');
    expect(ATTEMPT_LIMIT).toBe(3);
  });
});
