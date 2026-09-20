/**
 * Quick query script to show current database state
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'netwatch.db');

const db = new DatabaseSync(DB_PATH);

console.log('\n=== CURRENT DATABASE STATE ===\n');

const instructors = db.prepare('SELECT * FROM Instructor_Accounts').all();
console.log(`Instructors: ${instructors.length}`);
instructors.forEach(i => console.log(`  - ${i.username} (${i.name}, created ${i.created_at})`));

const students = db.prepare('SELECT * FROM Student_Accounts').all();
console.log(`\nStudents: ${students.length}`);
students.forEach(s => console.log(`  - ${s.npm} (${s.name}, created ${s.created_at})`));

const counters = db.prepare('SELECT COUNT(*) as count FROM Attempt_Counters').get();
console.log(`\nAttempt_Counters: ${counters.count} rows`);

const results = db.prepare('SELECT COUNT(*) as count FROM Result_Records').get();
console.log(`Result_Records: ${results.count} rows`);

const backups = db.prepare('SELECT COUNT(*) as count FROM Attempt_Counter_Backups').get();
console.log(`Attempt_Counter_Backups: ${backups.count} rows`);

console.log(`\nTotal data rows to be cleared: ${counters.count + results.count + backups.count}`);
console.log('');
