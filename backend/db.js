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

db.exec(`
  CREATE TABLE IF NOT EXISTS Attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    npm        TEXT NOT NULL,
    lesson_id  TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

const resultCols = db.prepare(`PRAGMA table_info(Result_Records)`).all().map(c => c.name);
if (!resultCols.includes('attempt_id'))       db.exec(`ALTER TABLE Result_Records ADD COLUMN attempt_id INTEGER`);
if (!resultCols.includes('duration_seconds')) db.exec(`ALTER TABLE Result_Records ADD COLUMN duration_seconds INTEGER`);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_result_attempt ON Result_Records(attempt_id)`);

const studentCols = db.prepare("PRAGMA table_info(Student_Accounts)").all();
if (!studentCols.some(c => c.name === 'display_name')) {
  db.exec("ALTER TABLE Student_Accounts ADD COLUMN display_name TEXT");
}

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

export function createAttempt(npm, lessonId) {
  return db.prepare(`INSERT INTO Attempts (npm, lesson_id) VALUES (?, ?)`)
           .run(npm, lessonId).lastInsertRowid;
}

// Seconds since start, or null if the attempt doesn't exist, isn't yours, or already has a result
export function openAttemptSeconds(attemptId, npm, lessonId) {
  const row = db.prepare(`
    SELECT a.started_at FROM Attempts a
    LEFT JOIN Result_Records r ON r.attempt_id = a.id
    WHERE a.id = ? AND a.npm = ? AND a.lesson_id = ? AND r.id IS NULL
  `).get(attemptId, npm, lessonId);
  return row ? Math.max(0, Math.round((Date.now() - Date.parse(row.started_at)) / 1000)) : null;
}

/**
 * Insert a new Result_Record row (append-only — never updates existing rows).
 * @param {string}  npm
 * @param {string}  lessonId
 * @param {string}  outcome       'correct' | 'incorrect'
 * @param {number}  [score=0]     Computed score for this attempt (0–100)
 * @param {number}  [hintsUsed=0] Number of hints opened during the attempt
 * @param {number}  [wrongAnswers=0] Number of wrong diagnosis submissions before this one
 * @param {number}  [attemptId=null] ID from Attempts table
 * @param {number}  [durationSeconds=null] Duration in seconds
 * @returns {{ id: number, recordedAt: string }}
 */
export function insertResult(npm, lessonId, outcome, score = 0, hintsUsed = 0, wrongAnswers = 0, attemptId = null, durationSeconds = null) {
  const stmt = db.prepare(
    'INSERT INTO Result_Records (npm, lesson_id, outcome, score, hints_used, wrong_answers, attempt_id, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const info = stmt.run(npm, lessonId, outcome, score, hintsUsed, wrongAnswers, attemptId, durationSeconds);
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

export function deriveDisplayName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Student';
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length - 1][0].toUpperCase() + '.';
}

export function sanitizeDisplayName(input) {
  const s = String(input ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ');
  if (s.length < 2 || s.length > 24) return null;
  return s;
}

export function getDisplayName(npm) {
  const row = db.prepare('SELECT name, display_name FROM Student_Accounts WHERE npm = ?').get(npm);
  if (!row) return null;
  return row.display_name || deriveDisplayName(row.name);
}

export function setDisplayName(npm, input) {
  const clean = sanitizeDisplayName(input);
  if (!clean) return null;
  db.prepare('UPDATE Student_Accounts SET display_name = ? WHERE npm = ?').run(clean, npm);
  return clean;
}

export function getLeaderboard({ lessonId = null, sort = 'score', minScore = 80, limit = 50, offset = 0 }) {
  const speed = sort === 'speed';
  const lessonFilter = lessonId ? 'AND lesson_id = ?' : '';
  const params = [];
  if (speed) params.push(minScore);
  if (lessonId) params.push(lessonId);
  const bestRows = speed
    ? `SELECT npm, lesson_id, score, duration_seconds,
              ROW_NUMBER() OVER (PARTITION BY npm, lesson_id
                                 ORDER BY duration_seconds ASC, score DESC) AS rn
       FROM Result_Records
       WHERE outcome = 'correct' AND duration_seconds IS NOT NULL AND score >= ? ${lessonFilter}`
    : `SELECT npm, lesson_id, score, duration_seconds,
              ROW_NUMBER() OVER (PARTITION BY npm, lesson_id
                                 ORDER BY score DESC, duration_seconds ASC) AS rn
       FROM Result_Records
       WHERE outcome = 'correct' AND duration_seconds IS NOT NULL ${lessonFilter}`;
  let sql;
  if (lessonId) {
    const order = speed
      ? 'b.duration_seconds ASC, b.score DESC, a.name ASC, b.npm ASC'
      : 'b.score DESC, b.duration_seconds ASC, a.name ASC, b.npm ASC';
    sql = `WITH best AS (${bestRows})
           SELECT a.name AS name, a.display_name AS displayNameRaw, b.score AS score, b.duration_seconds AS durationSeconds
           FROM best b JOIN Student_Accounts a ON a.npm = b.npm
           WHERE b.rn = 1
           ORDER BY ${order}
           LIMIT ? OFFSET ?`;
  } else {
    const order = speed
      ? 'lessonsDone DESC, durationSeconds ASC, name ASC, b.npm ASC'
      : 'score DESC, durationSeconds ASC, name ASC, b.npm ASC';
    sql = `WITH best AS (${bestRows})
           SELECT a.name AS name, a.display_name AS displayNameRaw, SUM(b.score) AS score, SUM(b.duration_seconds) AS durationSeconds,
                  COUNT(*) AS lessonsDone, ROUND(AVG(b.score), 1) AS avgScore
           FROM best b JOIN Student_Accounts a ON a.npm = b.npm
           WHERE b.rn = 1
           GROUP BY b.npm
           ORDER BY ${order}
           LIMIT ? OFFSET ?`;
  }
  return db.prepare(sql).all(...params, limit, offset).map(({ name, displayNameRaw, ...rest }) => ({
    ...rest,
    displayName: displayNameRaw || deriveDisplayName(name),
  }));
}
