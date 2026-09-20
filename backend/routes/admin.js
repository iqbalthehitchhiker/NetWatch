/**
 * backend/routes/admin.js
 * POST /api/admin/reset        — Reset a student's attempt counter for a lesson
 * POST /api/admin/students/bulk — Bulk student creation
 * GET  /api/admin/students     — List all students with attempt/score stats
 *
 * Requires an authenticated instructor JWT.
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireInstructor } from '../middleware/auth.js';
import { resetAttempt } from '../db.js';
import { LESSONS } from '../../src/lessons.js';
import db from '../db.js';

const router = Router();
const KNOWN_LESSON_IDS = new Set(LESSONS.map(l => l.id));

/**
 * Generate a readable random password (8 alphanumeric characters).
 * Uses uppercase, lowercase, and numbers for readability.
 * Avoids ambiguous chars like O/0, I/l/1.
 */
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

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

/**
 * POST /api/admin/students/bulk
 * Bulk create students from an array of { name, npm } pairs.
 * Returns per-entry status: created | duplicate | invalid
 */
router.post('/students/bulk', requireInstructor, async (req, res) => {
  const { students } = req.body || {};

  if (!Array.isArray(students)) {
    return res.status(400).json({ error: 'students must be an array' });
  }

  const results = [];

  for (const entry of students) {
    const { name, npm } = entry || {};

    // Validate npm
    if (!npm || String(npm).trim().length === 0) {
      results.push({
        npm: npm || '',
        name: name || '',
        status: 'invalid',
        error: 'npm is required'
      });
      continue;
    }

    const trimmedNpm = String(npm).trim();
    const trimmedName = String(name || '').trim() || trimmedNpm;

    // Check for duplicate
    const existing = db.prepare('SELECT npm FROM Student_Accounts WHERE npm = ?').get(trimmedNpm);
    if (existing) {
      results.push({
        npm: trimmedNpm,
        name: trimmedName,
        status: 'duplicate',
        error: 'npm already exists'
      });
      continue;
    }

    // Generate password and hash it using bcrypt (same as auth.js)
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // Insert student
    try {
      db.prepare(
        'INSERT INTO Student_Accounts (npm, name, password_hash) VALUES (?, ?, ?)'
      ).run(trimmedNpm, trimmedName, passwordHash);

      results.push({
        npm: trimmedNpm,
        name: trimmedName,
        status: 'created',
        password: plainPassword  // One-time return only
      });
    } catch (err) {
      results.push({
        npm: trimmedNpm,
        name: trimmedName,
        status: 'invalid',
        error: err.message
      });
    }
  }

  return res.json({ results });
});

/**
 * GET /api/admin/students
 * List all students with attempts used and best score per lesson.
 */
router.get('/students', requireInstructor, (req, res) => {
  // Get all students
  const students = db.prepare('SELECT npm, name, created_at FROM Student_Accounts ORDER BY created_at DESC').all();

  // For each student, calculate total attempts across all lessons and best overall score
  const enriched = students.map(student => {
    // Total attempts across all lessons
    const attemptsRow = db.prepare(`
      SELECT COALESCE(SUM(count), 0) as total
      FROM Attempt_Counters
      WHERE npm = ?
    `).get(student.npm);

    // Best score across all lessons (if scoring is implemented)
    const bestScoreRow = db.prepare(`
      SELECT COALESCE(MAX(score), 0) as best
      FROM Result_Records
      WHERE npm = ?
    `).get(student.npm);

    return {
      npm: student.npm,
      name: student.name,
      attemptsUsed: attemptsRow ? attemptsRow.total : 0,
      bestScore: bestScoreRow ? bestScoreRow.best : 0,
      createdAt: student.created_at
    };
  });

  return res.json({ students: enriched });
});

export default router;
