// Backend constants — single source of truth.
// Change ATTEMPT_LIMIT here to affect all lessons uniformly.

export const ATTEMPT_LIMIT   = 3;
export const JWT_EXPIRY      = '8h';
export const BCRYPT_ROUNDS   = 12;

// ─── Quiz mode scoring ────────────────────────────────────────────────────────
// These values are used by the frontend to compute the score locally before
// submitting, and referenced by tests.  The backend stores whatever score the
// client sends; it does not recompute — trust is enforced by auth (student JWT).
export const SCORE_BASE       = 100;   // perfect score for a correct diagnosis
export const HINT_PENALTY     =  10;   // deducted per hint opened
export const WRONG_PENALTY    =  20;   // deducted per wrong diagnosis submission
