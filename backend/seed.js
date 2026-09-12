/**
 * backend/seed.js
 * CLI tool for creating student and instructor accounts.
 *
 * Usage:
 *   node backend/seed.js --npm 1234567890 --name "Jane Doe" --password secret123 --role student
 *   node backend/seed.js --username admin --name "Prof. Smith" --password secret456 --role instructor
 */

import bcrypt from 'bcryptjs';
import db from './db.js';
import { BCRYPT_ROUNDS } from './constants.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    result[key] = args[i + 1];
  }
  return result;
}

async function main() {
  const { npm, username, name, password, role = 'student' } = parseArgs();

  if (!name || !password) {
    console.error('Usage: node backend/seed.js [--npm|--username] ID --name NAME --password PASS [--role student|instructor]');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (role === 'instructor') {
    if (!username) { console.error('--username is required for role=instructor'); process.exit(1); }
    db.prepare(
      'INSERT OR REPLACE INTO Instructor_Accounts (username, name, password_hash) VALUES (?, ?, ?)'
    ).run(username, name, hash);
    console.log(`Seeded instructor: ${username} (${name})`);
  } else {
    if (!npm) { console.error('--npm is required for role=student'); process.exit(1); }
    db.prepare(
      'INSERT OR REPLACE INTO Student_Accounts (npm, name, password_hash) VALUES (?, ?, ?)'
    ).run(npm, name, hash);
    console.log(`Seeded student: ${npm} (${name})`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
