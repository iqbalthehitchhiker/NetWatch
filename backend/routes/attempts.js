/**
 * backend/routes/attempts.js
 * POST /api/attempts
 *
 * Checks attempt count for an authenticated student + lessonId.
 * If under limit, increments atomically and returns allowed:true.
 * If at/over limit, returns allowed:false without incrementing.
 */

import { Router } from 'express';
import { requireStudent } from '../middleware/auth.js';
import { getAttemptCount, incrementAttempt } from '../db.js';
import { ATTEMPT_LIMIT } from '../constants.js';

const router = Router();

router.post('/', requireStudent, (req, res) => {
  const { lessonId } = req.body || {};
  const npm = req.user.sub;

  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId is required' });
  }

  const count = getAttemptCount(npm, lessonId);

  if (count >= ATTEMPT_LIMIT) {
    return res.json({
      allowed: false,
      attemptsUsed: count,
      attemptLimit: ATTEMPT_LIMIT,
    });
  }

  const newCount = incrementAttempt(npm, lessonId);
  return res.json({
    allowed: true,
    attemptsUsed: newCount,
    attemptLimit: ATTEMPT_LIMIT,
  });
});

export default router;
