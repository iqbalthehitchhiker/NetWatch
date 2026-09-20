/**
 * Investigate whether 0 attempts + score showing is from reset behavior
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'netwatch.db');

const db = new DatabaseSync(DB_PATH);

console.log('\n=== INVESTIGATING STUDENTS 12345678 and 1234567890 ===\n');

const students = ['12345678', '1234567890'];

students.forEach(npm => {
  console.log(`\n--- STUDENT ${npm} ---`);
  
  // Get attempt counters
  const attempts = db.prepare('SELECT * FROM Attempt_Counters WHERE npm = ?').all(npm);
  console.log(`\nAttempt Counters (${attempts.length}):`);
  attempts.forEach(a => {
    console.log(`  ${a.lesson_id}: count=${a.count}`);
  });
  
  // Get result records
  const results = db.prepare('SELECT * FROM Result_Records WHERE npm = ? ORDER BY lesson_id, recorded_at').all(npm);
  console.log(`\nResult Records (${results.length}):`);
  results.forEach(r => {
    console.log(`  ${r.lesson_id}: outcome=${r.outcome}, score=${r.score}, recorded_at=${r.recorded_at}`);
  });
  
  // Get reset history
  const resets = db.prepare('SELECT * FROM Attempt_Counter_Backups WHERE npm = ? ORDER BY reset_at').all(npm);
  console.log(`\nReset History (${resets.length}):`);
  resets.forEach(r => {
    console.log(`  ${r.lesson_id}: prior_count=${r.prior_count}, reset_at=${r.reset_at}`);
  });
  
  // Check for lessons with 0 attempts but results exist
  const lessonsWithResults = new Set(results.map(r => r.lesson_id));
  const zeroAttemptLessons = attempts.filter(a => a.count === 0 && lessonsWithResults.has(a.lesson_id));
  
  if (zeroAttemptLessons.length > 0) {
    console.log(`\n⚠️  POTENTIAL ISSUE: Lessons with 0 attempts but results exist:`);
    zeroAttemptLessons.forEach(a => {
      const lessonResults = results.filter(r => r.lesson_id === a.lesson_id);
      const bestScore = Math.max(...lessonResults.map(r => r.score));
      console.log(`  ${a.lesson_id}: count=0, but has ${lessonResults.length} result(s), best score=${bestScore}`);
      
      // Check if this lesson was reset
      const wasReset = resets.some(r => r.lesson_id === a.lesson_id);
      if (wasReset) {
        console.log(`    ✓ This lesson WAS reset - explaining the 0 count with preserved results`);
      } else {
        console.log(`    ? No reset record found - unusual state`);
      }
    });
  }
});

console.log('\n\n=== SUMMARY ===');
console.log('If lessons show 0 attempts but have scores, and reset history exists,');
console.log('this is CORRECT BEHAVIOR: resets clear attempt counters but preserve results.\n');
