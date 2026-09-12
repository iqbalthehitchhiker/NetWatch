/**
 * backend/routes/admin.js
 * POST /api/admin/reset
 *
 * Resets a student's attempt counter for a given lesson.
 * Requires an authenticated instructor JWT.
 * Does NOT touch Result_Records.
 */

import { Router } from 'express';
import { requireInstructor } from '../middleware/auth.js';
import { resetAttempt } from '../db.js';
import { LESSONS } from '../../src/lessons.js';

const router = Router();
const KNOWN_LESSON_IDS = new Set(LESSONS.map(l => l.id));

router.post('/reset', requireInstructor, (req, res) => {
  const { npm, lessonId } = req.body || {};

  // Field validation
  const errors = {};
  if (!(npm      && String(npm).trim().length      > 0)) errors.npm      = 'npm is required';
  if (!(lessonId && String(lessonId).trim().length > 0)) errors.lessonId = 'lessonId is required';
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Validation failed', fields: errors });
  }

  // Lesson existence check
  if (!KNOWN_LESSON_IDS.has(lessonId.trim())) {
    return res.status(404).json({ error: 'Lesson ID not recognised' });
  }

  const priorCount = resetAttempt(npm.trim(), lessonId.trim());

  return res.json({
    message: 'Attempt counter reset',
    npm: npm.trim(),
    lessonId: lessonId.trim(),
    priorCount,
  });
});

export default router;
