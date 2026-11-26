/**
 * backend/routes/results.js
 *
 * POST /api/results            — record a diagnosis submission (student)
 * GET  /api/results?studentId&lessonId — get results for one student+lesson (student)
 * GET  /api/results/all        — get all results across all students (instructor)
 */

import { Router } from 'express';
import { requireStudent, requireInstructor } from '../middleware/auth.js';
import { insertResult, getResults, getAllResults, getBestScore, openAttemptSeconds } from '../db.js';

const router = Router();

// GET /all must be registered before GET / so Express matches it correctly
router.get('/all', requireInstructor, (_req, res) => {
  const results = getAllResults();
  return res.json({ results });
});

router.post('/', requireStudent, (req, res) => {
  const { lessonId, outcome, hints_used, wrong_answers, attemptId } = req.body || {};
  const npm = req.user.sub;

  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId is required' });
  }
  if (outcome !== 'correct' && outcome !== 'incorrect') {
    return res.status(400).json({ error: 'outcome must be "correct" or "incorrect"' });
  }
  if (!attemptId) {
    return res.status(400).json({ error: 'attemptId is required' });
  }

  // Validate optional scoring fields — default to 0 if absent/invalid
  const safeHints        = (Number.isInteger(hints_used)   && hints_used   >= 0) ? hints_used   : 0;
  const safeWrong        = (Number.isInteger(wrong_answers) && wrong_answers >= 0) ? wrong_answers : 0;

  // Verify the attempt is valid and compute duration
  const durationSeconds = openAttemptSeconds(attemptId, npm, lessonId);
  if (durationSeconds === null) {
    return res.status(409).json({ error: 'Invalid attempt: not found, already submitted, or not yours' });
  }

  // Compute score server-side: BASE - (hints × HINT_PENALTY) - (wrong × WRONG_PENALTY), clamped to 0-100
  const SCORE_BASE = 100;
  const HINT_PENALTY = 10;
  const WRONG_PENALTY = 20;
  const computedScore = Math.max(0, Math.min(100, SCORE_BASE - (safeHints * HINT_PENALTY) - (safeWrong * WRONG_PENALTY)));

  const { id, recordedAt } = insertResult(npm, lessonId, outcome, computedScore, safeHints, safeWrong, attemptId, durationSeconds);
  const bestScore = getBestScore(npm, lessonId);
  return res.status(201).json({ id, recordedAt, score: computedScore, bestScore });
});

router.get('/', requireStudent, (req, res) => {
  const { studentId, lessonId } = req.query;

  if (!studentId || !lessonId) {
    return res.status(400).json({ error: 'studentId and lessonId query params are required' });
  }

  // Students may only query their own results
  if (req.user.sub !== studentId) {
    return res.status(403).json({ error: 'You may only view your own results' });
  }

  const results   = getResults(studentId, lessonId);
  const bestScore = getBestScore(studentId, lessonId);
  return res.json({ results, bestScore });
});

export default router;
