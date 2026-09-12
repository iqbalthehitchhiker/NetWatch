/**
 * backend/routes/results.js
 *
 * POST /api/results            — record a diagnosis submission (student)
 * GET  /api/results?studentId&lessonId — get results for one student+lesson (student)
 * GET  /api/results/all        — get all results across all students (instructor)
 */

import { Router } from 'express';
import { requireStudent, requireInstructor } from '../middleware/auth.js';
import { insertResult, getResults, getAllResults } from '../db.js';

const router = Router();

// GET /all must be registered before GET / so Express matches it correctly
router.get('/all', requireInstructor, (_req, res) => {
  const results = getAllResults();
  return res.json({ results });
});

router.post('/', requireStudent, (req, res) => {
  const { lessonId, outcome } = req.body || {};
  const npm = req.user.sub;

  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId is required' });
  }
  if (outcome !== 'correct' && outcome !== 'incorrect') {
    return res.status(400).json({ error: 'outcome must be "correct" or "incorrect"' });
  }

  const { id, recordedAt } = insertResult(npm, lessonId, outcome);
  return res.status(201).json({ id, recordedAt });
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

  const results = getResults(studentId, lessonId);
  return res.json({ results });
});

export default router;
