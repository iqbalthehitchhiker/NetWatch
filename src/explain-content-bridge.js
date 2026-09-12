/**
 * src/explain-content-bridge.js
 *
 * Thin module that exposes showExplainPanel() without importing the full
 * app.js controller (which registers DOMContentLoaded listeners and would
 * crash in a Node/vitest environment with no DOM).
 *
 * Used exclusively by tests. Not imported by the application.
 */

import { EXPLAIN_CONTENT } from './explain-content.js';
import { getCurrentMode } from './auth.js';

/**
 * Show the Explain Panel for the given key.
 * No-op when the current session mode is not 'teach' (Req 6 — quiz suppression).
 * Falls back to EXPLAIN_CONTENT['fallback'] if the key has no matching entry (Req 3.8).
 *
 * @param {string} key  e.g. 'device:gateway', 'metric:cpu', 'proto:TCP', 'alert:critical'
 */
export function showExplainPanel(key) {
  if (getCurrentMode() !== 'teach') return;
  const entry = EXPLAIN_CONTENT[key] ?? EXPLAIN_CONTENT['fallback'];
  document.getElementById('ep-title').textContent = entry.title;
  document.getElementById('ep-body').textContent  = entry.body;
  document.getElementById('explain-panel').classList.remove('hidden');
}
