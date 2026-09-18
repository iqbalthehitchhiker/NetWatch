/**
 * backend/routes/results.js
 *
 * POST /api/results            — record a diagnosis submission (student)
 * GET  /api/results?studentId&lessonId — get results for one student+lesson (student)
 * GET  /api/results/all        — get all results across all students (instructor)
 */

import { Router } from 'express';
import { requireStudent, requireInstructor } from '../middleware/auth.js';
import { insertResult, getResults, getAllResults, getBestScore } from '../db.js';

const router = Router();

// GET /all must be registered before GET / so Express matches it correctly
router.get('/all', requireInstructor, (_req, res) => {
  const results = getAllResults();
  return res.json({ results });
});

router.post('/', requireStudent, (req, res) => {
  const { lessonId, outcome, score, hints_used, wrong_answers } = req.body || {};
  const npm = req.user.sub;

  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId is required' });
  }
  if (outcome !== 'correct' && outcome !== 'incorrect') {
    return res.status(400).json({ error: 'outcome must be "correct" or "incorrect"' });
  }

  // Validate optional scoring fields — default to 0 if absent/invalid
  const safeScore        = (Number.isInteger(score)        && score        >= 0) ? score        : 0;
  const safeHints        = (Number.isInteger(hints_used)   && hints_used   >= 0) ? hints_used   : 0;
  const safeWrong        = (Number.isInteger(wrong_answers) && wrong_answers >= 0) ? wrong_answers : 0;

  const { id, recordedAt } = insertResult(npm, lessonId, outcome, safeScore, safeHints, safeWrong);
  const bestScore = getBestScore(npm, lessonId);
  return res.status(201).json({ id, recordedAt, score: safeScore, bestScore });
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
