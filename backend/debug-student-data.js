/**
 * Debug script to check which students have attempt/result data
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'netwatch.db');

const db = new DatabaseSync(DB_PATH);

console.log('\n=== ATTEMPT COUNTERS ===');
const attempts = db.prepare('SELECT * FROM Attempt_Counters').all();
attempts.forEach(a => console.log(`  ${a.npm} / ${a.lesson_id}: ${a.count} attempts`));

console.log('\n=== RESULT RECORDS ===');
const results = db.prepare('SELECT * FROM Result_Records').all();
results.forEach(r => console.log(`  ${r.npm} / ${r.lesson_id}: outcome=${r.outcome}, score=${r.score}`));

console.log('\n=== TESTING GET /api/admin/students QUERY LOGIC ===');

const students = db.prepare('SELECT npm, name, created_at FROM Student_Accounts ORDER BY created_at DESC LIMIT 5').all();

students.forEach(student => {
  console.log(`\nStudent: ${student.name} (${student.npm})`);
  
  // Get all lessons this student has attempted (from Attempt_Counters)
  const attemptedLessons = db.prepare(`
    SELECT lesson_id, count
    FROM Attempt_Counters
    WHERE npm = ?
  `).all(student.npm);
  
  console.log(`  Attempted lessons from Attempt_Counters: ${attemptedLessons.length}`);
  attemptedLessons.forEach(row => {
    console.log(`    - ${row.lesson_id}: ${row.count} attempts`);
  });

  // Get best scores per lesson from Result_Records
  const lessonScores = db.prepare(`
    SELECT lesson_id, MAX(score) as best_score
    FROM Result_Records
    WHERE npm = ?
    GROUP BY lesson_id
  `).all(student.npm);
  
  console.log(`  Lesson scores from Result_Records: ${lessonScores.length}`);
  lessonScores.forEach(row => {
    console.log(`    - ${row.lesson_id}: best score ${row.best_score}`);
  });
});
