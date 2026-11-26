import { Router } from 'express';
import { getLeaderboard } from '../db.js';

const router = Router();

function intParam(value, fallback, min, max) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

router.get('/', (req, res) => {
  const lessonId = typeof req.query.lesson === 'string' && req.query.lesson !== 'overall'
    ? req.query.lesson : null;
  const sort = req.query.sort === 'speed' ? 'speed' : 'score';
  const minScore = intParam(req.query.minScore, 80, 0, 100);
  const limit = intParam(req.query.limit, 50, 1, 100);
  const offset = intParam(req.query.offset, 0, 0, 1000000);
  const rows = getLeaderboard({ lessonId, sort, minScore, limit, offset });
  res.json(rows.map((r, i) => ({
    rank: offset + i + 1,
    displayName: r.name,
    score: r.score,
    durationSeconds: r.durationSeconds,
    ...(lessonId ? {} : { lessonsDone: r.lessonsDone, avgScore: r.avgScore }),
  })));
});

export default router;
