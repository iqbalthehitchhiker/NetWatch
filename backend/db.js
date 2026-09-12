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
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    npm         TEXT NOT NULL,
    lesson_id   TEXT NOT NULL,
    outcome     TEXT NOT NULL CHECK(outcome IN ('correct','incorrect')),
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS Attempt_Counter_Backups (
    npm         TEXT NOT NULL,
    lesson_id   TEXT NOT NULL,
    prior_count INTEGER NOT NULL,
    reset_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

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
 * @returns {{ id: number, recordedAt: string }}
 */
export function insertResult(npm, lessonId, outcome) {
  const stmt = db.prepare(
    'INSERT INTO Result_Records (npm, lesson_id, outcome) VALUES (?, ?, ?)'
  );
  const info = stmt.run(npm, lessonId, outcome);
  const row  = db.prepare('SELECT * FROM Result_Records WHERE id = ?').get(info.lastInsertRowid);
  return { id: row.id, recordedAt: row.recorded_at };
}

/** @returns {object[]} */
export function getResults(npm, lessonId) {
  return db.prepare(
    'SELECT * FROM Result_Records WHERE npm = ? AND lesson_id = ? ORDER BY recorded_at ASC'
  ).all(npm, lessonId);
}

/** @returns {object[]} */
export function getAllResults() {
  return db.prepare(
    'SELECT * FROM Result_Records ORDER BY recorded_at DESC'
  ).all();
}

export default db;
