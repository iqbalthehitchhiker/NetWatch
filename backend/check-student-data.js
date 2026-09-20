/**
 * Check which students have attempt/result data
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'netwatch.db');

const db = new DatabaseSync(DB_PATH);

console.log('\n=== STUDENTS WITH ATTEMPT/RESULT DATA ===\n');

const students = ['12345678', '1234567890'];

students.forEach(npm => {
  console.log(`Student: ${npm}`);
  
  const attempts = db.prepare('SELECT lesson_id, count FROM Attempt_Counters WHERE npm = ?').all(npm);
  console.log(`  Attempts: ${attempts.length > 0 ? '' : 'none'}`);
  attempts.forEach(a => console.log(`    - ${a.lesson_id}: ${a.count} attempts`));
  
  const results = db.prepare('SELECT lesson_id, outcome, score FROM Result_Records WHERE npm = ? ORDER BY recorded_at DESC').all(npm);
  console.log(`  Results: ${results.length > 0 ? '' : 'none'}`);
  results.forEach(r => console.log(`    - ${r.lesson_id}: ${r.outcome}, score ${r.score}`));
  
  console.log('');
});
