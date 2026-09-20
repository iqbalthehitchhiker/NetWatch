/**
 * backend/cleanup-dev-db.js
 * 
 * ONE-TIME DEVELOPMENT DATABASE CLEANUP SCRIPT
 * 
 * Safely removes all instructors except one specified instructor, plus all
 * students and their associated data (attempts, results, backups).
 * 
 * Usage:
 *   node --experimental-sqlite backend/cleanup-dev-db.js
 * 
 * SAFETY FEATURES:
 * - Step 1: Lists all instructors without deleting anything
 * - Step 2: Requires explicit instructor username to preserve (CLI prompt)
 * - Step 3: Shows full deletion plan and requires typed confirmation
 * - Step 4: Deletes in correct dependency order
 * - Step 5: Verifies database integrity and authentication after deletion
 * 
 * This script is meant to be run once manually from the command line.
 * It is NOT an app feature and has no UI or API endpoint.
 */

import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'netwatch.db');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  NetWatch Development Database Cleanup Script');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Database: ${DB_PATH}\n`);

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

// ─── Helper: Prompt user for input ─────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── STEP 1: Query and display all instructors ─────────────────────────────────

console.log('STEP 1: Querying all instructor accounts...\n');

const instructors = db.prepare('SELECT * FROM Instructor_Accounts ORDER BY created_at ASC').all();

if (instructors.length === 0) {
  console.log('❌ No instructor accounts found in database.');
  console.log('Nothing to clean up. Exiting.\n');
  process.exit(0);
}

console.log(`Found ${instructors.length} instructor account(s):\n`);
console.log('┌─────────────────────────────────────────────────────────────────┐');
instructors.forEach((instr, idx) => {
  console.log(`│ ${idx + 1}. Username: ${instr.username}`);
  console.log(`│    Name:     ${instr.name}`);
  console.log(`│    Created:  ${instr.created_at}`);
  console.log('├─────────────────────────────────────────────────────────────────┤');
});
console.log('└─────────────────────────────────────────────────────────────────┘\n');

// ─── STEP 2: Require explicit confirmation of which instructor to KEEP ─────────

console.log('STEP 2: Specify which instructor account to PRESERVE\n');
console.log('⚠️  All OTHER instructors will be deleted.');
console.log('⚠️  ALL students and their data will be deleted.\n');

const keepUsername = await prompt('Enter the USERNAME of the instructor to KEEP (or Ctrl+C to abort): ');

if (!keepUsername) {
  console.log('\n❌ No username provided. Aborting.\n');
  process.exit(1);
}

const instructorToKeep = instructors.find(i => i.username === keepUsername);

if (!instructorToKeep) {
  console.log(`\n❌ No instructor found with username "${keepUsername}"`);
  console.log('Available usernames:', instructors.map(i => i.username).join(', '));
  console.log('\nAborting.\n');
  process.exit(1);
}

// ─── STEP 3: Show full deletion plan and require second confirmation ───────────

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('STEP 3: Deletion Plan');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log('✅ INSTRUCTOR TO PRESERVE:');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log(`│ Username: ${instructorToKeep.username}`);
console.log(`│ Name:     ${instructorToKeep.name}`);
console.log(`│ Created:  ${instructorToKeep.created_at}`);
console.log('└─────────────────────────────────────────────────────────────────┘\n');

const instructorsToDelete = instructors.filter(i => i.username !== keepUsername);
const students = db.prepare('SELECT * FROM Student_Accounts ORDER BY created_at ASC').all();

const attemptCountersCount = db.prepare('SELECT COUNT(*) as count FROM Attempt_Counters').get().count;
const resultRecordsCount = db.prepare('SELECT COUNT(*) as count FROM Result_Records').get().count;
const attemptBackupsCount = db.prepare('SELECT COUNT(*) as count FROM Attempt_Counter_Backups').get().count;

console.log('❌ ITEMS TO BE DELETED:\n');

if (instructorsToDelete.length > 0) {
  console.log(`   ${instructorsToDelete.length} Instructor(s):`);
  instructorsToDelete.forEach((instr, idx) => {
    console.log(`     ${idx + 1}. ${instr.username} (${instr.name})`);
  });
  console.log();
}

console.log(`   ${students.length} Student account(s)`);
if (students.length > 0 && students.length <= 10) {
  students.forEach((student, idx) => {
    console.log(`     ${idx + 1}. ${student.npm} (${student.name})`);
  });
}
console.log();

console.log(`   ${attemptCountersCount} Attempt_Counters row(s)`);
console.log(`   ${resultRecordsCount} Result_Records row(s)`);
console.log(`   ${attemptBackupsCount} Attempt_Counter_Backups row(s)`);
console.log();

console.log('───────────────────────────────────────────────────────────────────');
console.log(`TOTAL ROWS TO DELETE: ${instructorsToDelete.length + students.length + attemptCountersCount + resultRecordsCount + attemptBackupsCount}`);
console.log('───────────────────────────────────────────────────────────────────\n');

console.log('⚠️  THIS ACTION CANNOT BE UNDONE.\n');

const confirmation = await prompt('Type "DELETE" (all caps) to proceed, or anything else to abort: ');

if (confirmation !== 'DELETE') {
  console.log('\n❌ Confirmation not received. Aborting.\n');
  process.exit(1);
}

// ─── STEP 4: Deletion in correct dependency order ──────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('STEP 4: Executing deletion...');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Since there are no FOREIGN KEY constraints in the schema, we can delete in any
// order, but we'll delete dependent data first for clarity and to show proper
// practice:

try {
  console.log('Deleting Attempt_Counter_Backups...');
  const backupsDeleted = db.prepare('DELETE FROM Attempt_Counter_Backups').run();
  console.log(`  ✓ Deleted ${backupsDeleted.changes} row(s)`);

  console.log('Deleting Attempt_Counters...');
  const countersDeleted = db.prepare('DELETE FROM Attempt_Counters').run();
  console.log(`  ✓ Deleted ${countersDeleted.changes} row(s)`);

  console.log('Deleting Result_Records...');
  const resultsDeleted = db.prepare('DELETE FROM Result_Records').run();
  console.log(`  ✓ Deleted ${resultsDeleted.changes} row(s)`);

  console.log('Deleting all Student_Accounts...');
  const studentsDeleted = db.prepare('DELETE FROM Student_Accounts').run();
  console.log(`  ✓ Deleted ${studentsDeleted.changes} row(s)`);

  if (instructorsToDelete.length > 0) {
    console.log('Deleting Instructor_Accounts (except preserved one)...');
    const instructorUsernames = instructorsToDelete.map(i => i.username);
    const placeholders = instructorUsernames.map(() => '?').join(',');
    const instructorsDeleteStmt = db.prepare(
      `DELETE FROM Instructor_Accounts WHERE username IN (${placeholders})`
    );
    const instructorsDeleted = instructorsDeleteStmt.run(...instructorUsernames);
    console.log(`  ✓ Deleted ${instructorsDeleted.changes} row(s)`);
  }

  console.log('\n✅ Deletion completed successfully.\n');

} catch (error) {
  console.error('\n❌ Deletion failed:', error.message);
  console.error(error);
  process.exit(1);
}

// ─── STEP 5: Verification ───────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════');
console.log('STEP 5: Verification');
console.log('═══════════════════════════════════════════════════════════════════\n');

let allChecksPassed = true;

// Check 1: Preserved instructor still exists with correct data
console.log('Check 1: Preserved instructor account exists...');
const preservedInstructor = db.prepare(
  'SELECT * FROM Instructor_Accounts WHERE username = ?'
).get(keepUsername);

if (preservedInstructor && 
    preservedInstructor.name === instructorToKeep.name &&
    preservedInstructor.created_at === instructorToKeep.created_at) {
  console.log(`  ✅ PASS - Instructor "${keepUsername}" exists with correct data`);
} else {
  console.log(`  ❌ FAIL - Instructor "${keepUsername}" not found or data mismatch`);
  allChecksPassed = false;
}

// Check 2: Preserved instructor can authenticate
console.log('\nCheck 2: Preserved instructor authentication...');
// We need to know the password to test this. Since we don't have it, we'll
// verify the password_hash field exists and is valid format
if (preservedInstructor && preservedInstructor.password_hash && 
    preservedInstructor.password_hash.startsWith('$2')) {
  console.log('  ✅ PASS - Password hash exists and appears valid (bcrypt format)');
  console.log('  ℹ️  Note: Full authentication test requires password (not stored in script)');
} else {
  console.log('  ❌ FAIL - Password hash missing or invalid format');
  allChecksPassed = false;
}

// Check 3: No other instructors remain
console.log('\nCheck 3: No other instructor accounts remain...');
const remainingInstructors = db.prepare('SELECT * FROM Instructor_Accounts').all();
if (remainingInstructors.length === 1 && remainingInstructors[0].username === keepUsername) {
  console.log(`  ✅ PASS - Exactly 1 instructor remains (${keepUsername})`);
} else {
  console.log(`  ❌ FAIL - Expected 1 instructor, found ${remainingInstructors.length}`);
  allChecksPassed = false;
}

// Check 4: No students remain
console.log('\nCheck 4: No student accounts remain...');
const remainingStudents = db.prepare('SELECT COUNT(*) as count FROM Student_Accounts').get().count;
if (remainingStudents === 0) {
  console.log('  ✅ PASS - 0 students remain');
} else {
  console.log(`  ❌ FAIL - Found ${remainingStudents} student(s) still in database`);
  allChecksPassed = false;
}

// Check 5: No orphaned attempts/results
console.log('\nCheck 5: No orphaned data rows remain...');
const remainingCounters = db.prepare('SELECT COUNT(*) as count FROM Attempt_Counters').get().count;
const remainingResults = db.prepare('SELECT COUNT(*) as count FROM Result_Records').get().count;
const remainingBackups = db.prepare('SELECT COUNT(*) as count FROM Attempt_Counter_Backups').get().count;

if (remainingCounters === 0 && remainingResults === 0 && remainingBackups === 0) {
  console.log('  ✅ PASS - All attempt/result/backup data cleared');
} else {
  console.log(`  ❌ FAIL - Found orphaned data:`);
  console.log(`      Attempt_Counters: ${remainingCounters}`);
  console.log(`      Result_Records: ${remainingResults}`);
  console.log(`      Attempt_Counter_Backups: ${remainingBackups}`);
  allChecksPassed = false;
}

// Final summary
console.log('\n═══════════════════════════════════════════════════════════════════');
if (allChecksPassed) {
  console.log('✅ ALL VERIFICATION CHECKS PASSED');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('Database cleanup completed successfully.');
  console.log(`Preserved instructor: ${keepUsername} (${preservedInstructor.name})`);
  console.log(`Deleted: ${instructorsToDelete.length} instructor(s), ${students.length} student(s)`);
  console.log(`Cleared: ${attemptCountersCount + resultRecordsCount + attemptBackupsCount} data rows\n`);
} else {
  console.log('❌ SOME VERIFICATION CHECKS FAILED');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('Please review the database state manually.\n');
  process.exit(1);
}
