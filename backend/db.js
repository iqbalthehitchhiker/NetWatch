/**
 * backend/db.js
 * Opens (or creates) the SQLite database using Node.js built-in node:sqlite (Node 22.5+).
 * No native addons required.
 *
 * NOTE: node:sqlite is currently "experimental" but stable enough for Node 24.
 *       Run the server with --experimental-sqlite if needed (handled in server.js launch).
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = process.env.DB_PATH || path.join(__dirname, '..', 'netwatch.db');

const db = new DatabaseSync(DB_PATH);

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS Student_Accounts (
    npm           TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS Instructor_Accounts (
    username      TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS Attempt_Counters (
    npm        TEXT NOT NULL,
    lesson_id  TEXT NOT NULL,
    count      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (npm, lesson_id)
  );

  CREATE TABLE IF NOT EXISTS Result_Records (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    npm          TEXT NOT NULL,
    lesson_id    TEXT NOT NULL,
    outcome      TEXT NOT NULL CHECK(outcome IN ('correct','incorrect')),
    score        INTEGER NOT NULL DEFAULT 0,
    hints_used   INTEGER NOT NULL DEFAULT 0,
    wrong_answers INTEGER NOT NULL DEFAULT 0,
    recorded_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Add scoring columns to existing databases that were created before this
  -- migration.  ALTER TABLE ... ADD COLUMN is idempotent in SQLite when the
  -- column does not exist; we swallow the error if it does.
  -- (SQLite does not support IF NOT EXISTS on ADD COLUMN before 3.37.0)
  

  CREATE TABLE IF NOT EXISTS Attempt_Counter_Backups (
    npm         TEXT NOT NULL,
    lesson_id   TEXT NOT NULL,
    prior_count INTEGER NOT NULL,
    reset_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

// ─── Schema migration: add scoring columns to pre-existing databases ───────────
// ALTER TABLE ADD COLUMN throws if the column already exists (SQLite < 3.37.0).
// We catch those errors silently — the CREATE TABLE above handles new databases.
for (const col of [
  'ALTER TABLE Result_Records ADD COLUMN score         INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE Result_Records ADD COLUMN hints_used    INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE Result_Records ADD COLUMN wrong_answers INTEGER NOT NULL DEFAULT 0',
]) {
  try { db.exec(col); } catch (_) { /* column already exists — safe to ignore */ }
}

// ─── Query helpers ─────────────────────────────────────────────────────────────

/** @returns {object|undefined} Student row or undefined */
export function findStudentByNpm(npm) {
  return db.prepare('SELECT * FROM Student_Accounts WHERE npm = ?').get(npm);
}

/** @returns {object|undefined} Instructor row or undefined */
export function findInstructorByUsername(username) {
  return db.prepare('SELECT * FROM Instructor_Accounts WHERE username = ?').get(username);
}

/** @returns {number} Current attempt count (0 if no row) */
export function getAttemptCount(npm, lessonId) {
  const row = db.prepare(
    'SELECT count FROM Attempt_Counters WHERE npm = ? AND lesson_id = ?'
  ).get(npm, lessonId);
  return row ? row.count : 0;
}

/**
 * Atomically increment the attempt counter for a (npm, lessonId) pair.
 * @returns {number} New count after increment
 */
export function incrementAttempt(npm, lessonId) {
  db.prepare(`
    INSERT INTO Attempt_Counters (npm, lesson_id, count)
    VALUES (?, ?, 1)
    ON CONFLICT(npm, lesson_id) DO UPDATE SET count = count + 1
  `).run(npm, lessonId);
  return getAttemptCount(npm, lessonId);
}

/**
 * Reset the attempt counter to 0, backing up the prior count.
 * @returns {number} The prior count
 */
export function resetAttempt(npm, lessonId) {
  const prior = getAttemptCount(npm, lessonId);
  db.prepare(`
    INSERT INTO Attempt_Counter_Backups (npm, lesson_id, prior_count)
    VALUES (?, ?, ?)
  `).run(npm, lessonId, prior);
  db.prepare(`
    INSERT INTO Attempt_Counters (npm, lesson_id, count)
    VALUES (?, ?, 0)
    ON CONFLICT(npm, lesson_id) DO UPDATE SET count = 0
  `).run(npm, lessonId);
  return prior;
}

/**
 * Insert a new Result_Record row (append-only — never updates existing rows).
 * @param {string}  npm
 * @param {string}  lessonId
 * @param {string}  outcome       'correct' | 'incorrect'
 * @param {number}  [score=0]     Computed score for this attempt (0–100)
 * @param {number}  [hintsUsed=0] Number of hints opened during the attempt
 * @param {number}  [wrongAnswers=0] Number of wrong diagnosis submissions before this one
 * @returns {{ id: number, recordedAt: string }}
 */
export function insertResult(npm, lessonId, outcome, score = 0, hintsUsed = 0, wrongAnswers = 0) {
  const stmt = db.prepare(
    'INSERT INTO Result_Records (npm, lesson_id, outcome, score, hints_used, wrong_answers) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const info = stmt.run(npm, lessonId, outcome, score, hintsUsed, wrongAnswers);
  const row  = db.prepare('SELECT * FROM Result_Records WHERE id = ?').get(info.lastInsertRowid);
  return { id: row.id, recordedAt: row.recorded_at };
}

/** @returns {object[]} All attempt rows for this student+lesson, oldest first */
export function getResults(npm, lessonId) {
  return db.prepare(
    'SELECT * FROM Result_Records WHERE npm = ? AND lesson_id = ? ORDER BY recorded_at ASC'
  ).all(npm, lessonId);
}

/**
 * Return the best (highest) score achieved by a student on a lesson across
 * all their attempts.  Returns 0 if no attempts exist.
 * @returns {number}
 */
export function getBestScore(npm, lessonId) {
  const row = db.prepare(
    'SELECT COALESCE(MAX(score), 0) AS best FROM Result_Records WHERE npm = ? AND lesson_id = ?'
  ).get(npm, lessonId);
  return row ? row.best : 0;
}

/** @returns {object[]} All rows across all students, newest first (instructor view) */
export function getAllResults() {
  return db.prepare(
    'SELECT * FROM Result_Records ORDER BY recorded_at DESC'
  ).all();
}

export default db;
