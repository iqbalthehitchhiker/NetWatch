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
 * POST /api/admin/reset/bulk
 * Bulk reset attempt counters for selected students on a specific lesson.
 * 
 * Accepts: { npms: ['npm1', 'npm2', ...], lessonId: 'ddos_edge' }
 * 
 * Reuses the existing resetAttempt() logic for each student.
 * Does NOT touch Result_Records (preserves recorded results).
 * Returns per-student status (npm, name, priorCount, status: 'reset' | 'skipped').
 */
router.post('/reset/bulk', requireInstructor, (req, res) => {
  const { npms, lessonId } = req.body || {};

  // Validation
  if (!Array.isArray(npms) || npms.length === 0) {
    return res.status(400).json({ error: 'npms must be a non-empty array' });
  }

  if (!lessonId || String(lessonId).trim().length === 0) {
    return res.status(400).json({ error: 'lessonId is required' });
  }

  const trimmedLessonId = String(lessonId).trim();

  // Lesson existence check
  if (!KNOWN_LESSON_IDS.has(trimmedLessonId)) {
    return res.status(404).json({ error: 'Lesson ID not recognised' });
  }

  const results = [];

  for (const npm of npms) {
    const trimmedNpm = String(npm).trim();

    // Check if student exists
    const student = db.prepare('SELECT npm, name FROM Student_Accounts WHERE npm = ?').get(trimmedNpm);
    
    if (!student) {
      results.push({
        npm: trimmedNpm,
        name: null,
        priorCount: 0,
        status: 'skipped',
        reason: 'student not found'
      });
      continue;
    }

    // Reset attempt counter (reuses existing logic)
    const priorCount = resetAttempt(trimmedNpm, trimmedLessonId);

    results.push({
      npm: trimmedNpm,
      name: student.name,
      priorCount,
      status: 'reset'
    });
  }

  const resetCount = results.filter(r => r.status === 'reset').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  return res.json({
    message: `Reset ${resetCount} student(s), skipped ${skippedCount}`,
    lessonId: trimmedLessonId,
    results
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
 * DELETE /api/admin/students
 * Delete selected students and their dependent data.
 * 
 * Expects: { npms: ['npm1', 'npm2', ...] }
 * 
 * Deletes in correct order:
 * 1. Attempt_Counter_Backups (references npm)
 * 2. Result_Records (references npm)
 * 3. Attempt_Counters (references npm)
 * 4. Student_Accounts (primary table)
 * 
 * No explicit foreign keys exist in the schema, so we must delete manually in dependency order.
 */
router.delete('/students', requireInstructor, (req, res) => {
  const { npms } = req.body || {};

  if (!Array.isArray(npms) || npms.length === 0) {
    return res.status(400).json({ error: 'npms array is required and must not be empty' });
  }

  // Validate all NPMs exist and gather their info for confirmation response
  const students = [];
  for (const npm of npms) {
    const student = db.prepare('SELECT npm, name FROM Student_Accounts WHERE npm = ?').get(npm);
    if (!student) {
      return res.status(404).json({ error: `Student not found: ${npm}` });
    }
    students.push(student);
  }

  // Count dependent records per student for reporting
  const deletionSummary = students.map(student => {
    const resultsCount = db.prepare('SELECT COUNT(*) as count FROM Result_Records WHERE npm = ?').get(student.npm).count;
    const attemptsCount = db.prepare('SELECT COUNT(*) as count FROM Attempt_Counters WHERE npm = ?').get(student.npm).count;
    const backupsCount = db.prepare('SELECT COUNT(*) as count FROM Attempt_Counter_Backups WHERE npm = ?').get(student.npm).count;
    
    return {
      npm: student.npm,
      name: student.name,
      resultsDeleted: resultsCount,
      attemptsDeleted: attemptsCount,
      backupsDeleted: backupsCount
    };
  });

  // Delete in correct dependency order
  const placeholders = npms.map(() => '?').join(',');
  
  try {
    // Delete dependent records first
    db.prepare(`DELETE FROM Attempt_Counter_Backups WHERE npm IN (${placeholders})`).run(...npms);
    db.prepare(`DELETE FROM Result_Records WHERE npm IN (${placeholders})`).run(...npms);
    db.prepare(`DELETE FROM Attempt_Counters WHERE npm IN (${placeholders})`).run(...npms);
    
    // Finally delete the student accounts
    const result = db.prepare(`DELETE FROM Student_Accounts WHERE npm IN (${placeholders})`).run(...npms);

    return res.json({ 
      message: `Deleted ${result.changes} student(s)`,
      deleted: deletionSummary
    });
  } catch (err) {
    console.error('Delete students error:', err);
    return res.status(500).json({ error: 'Failed to delete students: ' + err.message });
  }
});

/**
 * GET /api/admin/students
 * List all students with per-lesson attempts and best scores.
 * 
 * Returns per-lesson breakdown for each student:
 * - lessonId: the lesson identifier
 * - attemptsUsed: attempt count for this lesson (0 if never attempted)
 * - bestScore: highest score achieved for this lesson (0 if never attempted)
 * 
 * Only lessons that have been attempted are included in the breakdown array.
 * Lessons never attempted are omitted (not shown as zero).
 */
router.get('/students', requireInstructor, (req, res) => {
  // Get all students
  const students = db.prepare('SELECT npm, name, created_at FROM Student_Accounts ORDER BY created_at DESC').all();

  // For each student, get per-lesson breakdown
  const enriched = students.map(student => {
    // Get all lessons this student has attempted (from Attempt_Counters)
    const attemptedLessons = db.prepare(`
      SELECT lesson_id, count
      FROM Attempt_Counters
      WHERE npm = ?
    `).all(student.npm);

    // Build a map of lessonId -> { attemptsUsed, bestScore, hasResults }
    const lessonMap = new Map();
    
    attemptedLessons.forEach(row => {
      lessonMap.set(row.lesson_id, {
        lessonId: row.lesson_id,
        attemptsUsed: row.count,
        bestScore: 0,
        hasResults: false  // Track whether actual results exist
      });
    });

    // Get best scores per lesson from Result_Records
    const lessonScores = db.prepare(`
      SELECT lesson_id, MAX(score) as best_score
      FROM Result_Records
      WHERE npm = ?
      GROUP BY lesson_id
    `).all(student.npm);

    lessonScores.forEach(row => {
      if (lessonMap.has(row.lesson_id)) {
        lessonMap.get(row.lesson_id).bestScore = row.best_score;
        lessonMap.get(row.lesson_id).hasResults = true;
      } else {
        // Has results but no attempt counter (shouldn't happen, but handle it)
        lessonMap.set(row.lesson_id, {
          lessonId: row.lesson_id,
          attemptsUsed: 0,
          bestScore: row.best_score,
          hasResults: true
        });
      }
    });

    // Convert map to array, sorted by lessonId for consistent display
    const lessonBreakdown = Array.from(lessonMap.values()).sort((a, b) => 
      a.lessonId.localeCompare(b.lessonId)
    );

    return {
      npm: student.npm,
      name: student.name,
      createdAt: student.created_at,
      lessonBreakdown  // Array of { lessonId, attemptsUsed, bestScore }
    };
  });

  return res.json({ students: enriched });
});

export default router;
