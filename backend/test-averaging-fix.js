/**
 * Test the corrected averaging logic with real data
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'netwatch.db');

const db = new DatabaseSync(DB_PATH);

console.log('\n=== TESTING CORRECTED AVERAGING LOGIC ===\n');

const students = ['12345678', '1234567890'];

students.forEach(npm => {
  const student = db.prepare('SELECT * FROM Student_Accounts WHERE npm = ?').get(npm);
  console.log(`\n--- ${student.name} (${npm}) ---`);
  
  // Simulate backend logic
  const attemptedLessons = db.prepare(`
    SELECT lesson_id, count FROM Attempt_Counters WHERE npm = ?
  `).all(npm);
  
  const lessonMap = new Map();
  
  attemptedLessons.forEach(row => {
    lessonMap.set(row.lesson_id, {
      lessonId: row.lesson_id,
      attemptsUsed: row.count,
      bestScore: 0,
      hasResults: false
    });
  });
  
  const lessonScores = db.prepare(`
    SELECT lesson_id, MAX(score) as best_score FROM Result_Records WHERE npm = ? GROUP BY lesson_id
  `).all(npm);
  
  lessonScores.forEach(row => {
    if (lessonMap.has(row.lesson_id)) {
      lessonMap.get(row.lesson_id).bestScore = row.best_score;
      lessonMap.get(row.lesson_id).hasResults = true;
    } else {
      lessonMap.set(row.lesson_id, {
        lessonId: row.lesson_id,
        attemptsUsed: 0,
        bestScore: row.best_score,
        hasResults: true
      });
    }
  });
  
  const breakdown = Array.from(lessonMap.values()).sort((a, b) => 
    a.lessonId.localeCompare(b.lessonId)
  );
  
  console.log('\nPer-lesson breakdown:');
  breakdown.forEach(l => {
    console.log(`  ${l.lessonId}:`);
    console.log(`    Attempts: ${l.attemptsUsed}`);
    console.log(`    Best Score: ${l.hasResults ? l.bestScore : 'Not completed'}`);
    console.log(`    Has Results: ${l.hasResults}`);
  });
  
  // OLD LOGIC (incorrect)
  const oldAvg = breakdown.length > 0
    ? Math.round(breakdown.reduce((sum, l) => sum + l.bestScore, 0) / breakdown.length)
    : 0;
  
  // NEW LOGIC (correct - only count lessons with results)
  const lessonsWithScores = breakdown.filter(l => l.hasResults);
  const newAvg = lessonsWithScores.length > 0
    ? Math.round(lessonsWithScores.reduce((sum, l) => sum + l.bestScore, 0) / lessonsWithScores.length)
    : 0;
  
  console.log(`\n❌ OLD AVERAGE (incorrect, includes non-completed): ${oldAvg}`);
  console.log(`   Averaged ${breakdown.length} lessons (including ${breakdown.length - lessonsWithScores.length} without results)`);
  
  console.log(`\n✅ NEW AVERAGE (correct, only completed): ${newAvg}`);
  console.log(`   Averaged ${lessonsWithScores.length} completed lessons (excluded ${breakdown.length - lessonsWithScores.length} not completed)`);
  
  const summary = breakdown.length > 0
    ? lessonsWithScores.length > 0
      ? `${lessonsWithScores.length} of ${breakdown.length} completed, avg score ${newAvg}`
      : `${breakdown.length} lesson(s) started, none completed yet`
    : 'No attempts yet';
  
  console.log(`\n📊 SUMMARY: "${summary}"`);
});

console.log('\n');
