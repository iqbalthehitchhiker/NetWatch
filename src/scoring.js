/**
 * src/scoring.js
 *
 * Pure scoring logic for Quiz mode.  No DOM, no auth, no backend calls.
 * Imported by app.js (for live scoring) and by tests.
 *
 * Teach-mode self-check tally uses the same penalty constants for consistency
 * but is kept in separate in-memory state inside app.js and never persisted.
 *
 * Point values (mirrored from backend/constants.js — keep in sync):
 *   SCORE_BASE    100  — maximum score for a correct diagnosis
 *   HINT_PENALTY   10  — deducted per hint opened during the attempt
 *   WRONG_PENALTY  20  — deducted per wrong diagnosis submission
 *
 * Teach-mode self-check tally (Part B):
 *   SC_CORRECT    +20  — points added for a correct self-check answer
 *   SC_WRONG      -10  — points deducted for a wrong self-check answer
 *   (self-check has no hints, so no hint penalty applies to the tally)
 */

export const SCORE_BASE    = 100;
export const HINT_PENALTY  =  10;
export const WRONG_PENALTY =  20;

export const SC_CORRECT    =  20;   // Teach mode self-check tally
export const SC_WRONG      = -10;

/**
 * Compute the Quiz-mode score for a single attempt.
 *
 * @param {number} hintsUsed    — number of hints opened (>= 0)
 * @param {number} wrongAnswers — number of wrong submissions before the correct one (>= 0)
 * @returns {number} Score in range [0, SCORE_BASE]
 */
export function computeScore(hintsUsed, wrongAnswers) {
  const raw = SCORE_BASE
    - hintsUsed    * HINT_PENALTY
    - wrongAnswers * WRONG_PENALTY;
  return Math.max(0, raw);
}
