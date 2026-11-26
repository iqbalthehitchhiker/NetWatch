/**
 * tests/results-integration.test.js
 * Integration test for POST /api/results using plain Node.js (no vitest due to node:sqlite incompatibility)
 * Run with: node tests/results-integration.test.js
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set up temp database BEFORE any imports that use db.js
const tempDbPath = path.join(os.tmpdir(), `netwatch-test-${Date.now()}.db`);
process.env.DB_PATH = tempDbPath;
process.env.JWT_SECRET = 'test-secret-results-integration';

// Now safe to import app and db
const { default: app } = await import('../backend/app.js');
const { default: db } = await import('../backend/db.js');

const testNpm = '9876543210';
const testLesson = 'ddos_edge';
let studentToken;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    testsFailed++;
    throw new Error(message);
  }
  testsPassed++;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`FAIL ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual: ${actual}`);
    testsFailed++;
    throw new Error(message);
  }
  testsPassed++;
}

async function setup() {
  // Create test student account
  const passwordHash = bcrypt.hashSync('password123', 10);
  db.prepare('INSERT INTO Student_Accounts (npm, name, password_hash) VALUES (?, ?, ?)')
    .run(testNpm, 'Test Student', passwordHash);

  // Generate valid JWT token (same as real login route)
  studentToken = jwt.sign({ sub: testNpm, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  console.log('Setup complete: test student created, token generated');
}

async function teardown() {
  // Clean up temp database file
  db.close();
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }
  console.log(`\nTeardown complete: ${tempDbPath} removed`);
}

async function test1_incorrectOutcomeScoresZero() {
  console.log('\n[Test 1] outcome=incorrect with 0 hints and 0 wrong answers stores score=0');

  // Create an attempt
  const attemptRes = await request(app)
    .post('/api/attempts')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ lessonId: testLesson });

  assertEqual(attemptRes.status, 200, 'POST /api/attempts should return 200');
  const { attemptId } = attemptRes.body;

  // Submit incorrect result
  const resultRes = await request(app)
    .post('/api/results')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      lessonId: testLesson,
      outcome: 'incorrect',
      hints_used: 0,
      wrong_answers: 0,
      attemptId,
    });

  assertEqual(resultRes.status, 201, 'POST /api/results should return 201');
  assertEqual(resultRes.body.score, 0, 'Response score should be 0');

  // Verify in database
  const record = db.prepare('SELECT score, outcome FROM Result_Records WHERE attempt_id = ?').get(attemptId);
  assertEqual(record.score, 0, 'Stored score should be 0');
  assertEqual(record.outcome, 'incorrect', 'Stored outcome should be incorrect');

  console.log('PASS Test 1 passed');
}

async function test2_correctWithPenaltiesScores70() {
  console.log('\n[Test 2] outcome=correct with hints_used=1 and wrong_answers=1 stores score=70');

  // Create an attempt
  const attemptRes = await request(app)
    .post('/api/attempts')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ lessonId: testLesson });

  assertEqual(attemptRes.status, 200, 'POST /api/attempts should return 200');
  const { attemptId } = attemptRes.body;

  // Submit correct result with penalties: 100 - 10 - 20 = 70
  const resultRes = await request(app)
    .post('/api/results')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      lessonId: testLesson,
      outcome: 'correct',
      hints_used: 1,
      wrong_answers: 1,
      attemptId,
    });

  assertEqual(resultRes.status, 201, 'POST /api/results should return 201');
  assertEqual(resultRes.body.score, 70, 'Response score should be 70');

  // Verify in database
  const record = db.prepare('SELECT score, outcome, hints_used, wrong_answers FROM Result_Records WHERE attempt_id = ?').get(attemptId);
  assertEqual(record.score, 70, 'Stored score should be 70');
  assertEqual(record.outcome, 'correct', 'Stored outcome should be correct');
  assertEqual(record.hints_used, 1, 'Stored hints_used should be 1');
  assertEqual(record.wrong_answers, 1, 'Stored wrong_answers should be 1');

  console.log('PASS Test 2 passed');
}

async function test3_reusingAttemptIdReturns409() {
  console.log('\n[Test 3] reusing the same attemptId returns 409');

  // Create an attempt
  const attemptRes = await request(app)
    .post('/api/attempts')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ lessonId: testLesson });

  assertEqual(attemptRes.status, 200, 'POST /api/attempts should return 200');
  const { attemptId } = attemptRes.body;

  // Submit first result
  const firstRes = await request(app)
    .post('/api/results')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      lessonId: testLesson,
      outcome: 'correct',
      hints_used: 0,
      wrong_answers: 0,
      attemptId,
    });

  assertEqual(firstRes.status, 201, 'First POST /api/results should return 201');

  // Try to reuse the same attemptId
  const secondRes = await request(app)
    .post('/api/results')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      lessonId: testLesson,
      outcome: 'incorrect',
      hints_used: 2,
      wrong_answers: 1,
      attemptId,
    });

  assertEqual(secondRes.status, 409, 'Second POST /api/results should return 409');
  assert(secondRes.body.error.includes('Invalid attempt'), 'Error message should mention invalid attempt');

  console.log('PASS Test 3 passed');
}

async function test4_leaderboardHidesIdentity() {
  console.log('\n[Test 4] leaderboard exposes display name only');
  const res = await request(app).get('/api/leaderboard?lesson=' + testLesson + '&sort=score');
  assertEqual(res.status, 200, 'GET /api/leaderboard should return 200');
  assertEqual(res.body.length, 1, 'Leaderboard should have 1 row');
  const row = res.body[0];
  assertEqual(row.displayName, 'Test S.', 'Default display name should be first name + last initial');
  assertEqual(JSON.stringify(Object.keys(row)), JSON.stringify(['rank', 'displayName', 'score', 'durationSeconds']), 'Row must have exactly these keys');
  const raw = JSON.stringify(res.body);
  assert(!raw.includes('Test Student'), 'Full name must not appear');
  assert(!raw.includes(testNpm), 'npm must not appear');
  console.log('PASS Test 4 passed');
}

async function test5_displayNameEditing() {
  console.log('\n[Test 5] display name can be edited and is validated');
  const bad = await request(app).patch('/api/auth/display-name')
    .set('Authorization', `Bearer ${studentToken}`).send({ displayName: 'x' });
  assertEqual(bad.status, 400, 'Too-short display name should return 400');
  const ok = await request(app).patch('/api/auth/display-name')
    .set('Authorization', `Bearer ${studentToken}`).send({ displayName: '  Budi   S  ' });
  assertEqual(ok.status, 200, 'Valid display name should return 200');
  assertEqual(ok.body.displayName, 'Budi S', 'Display name should be trimmed and collapsed');
  const lb = await request(app).get('/api/leaderboard?lesson=' + testLesson + '&sort=score');
  assertEqual(lb.body[0].displayName, 'Budi S', 'Leaderboard should show the edited name');
  const noAuth = await request(app).patch('/api/auth/display-name').send({ displayName: 'Hacker' });
  assertEqual(noAuth.status, 401, 'PATCH without a token should return 401');
  console.log('PASS Test 5 passed');
}

async function test6_loginReturnsDisplayName() {
  console.log('\n[Test 6] login returns displayName');
  const res = await request(app).post('/api/auth/login').send({ npm: testNpm, password: 'password123' });
  assertEqual(res.status, 200, 'Login should return 200');
  assertEqual(res.body.displayName, 'Budi S', 'Login should return the saved display name');
  console.log('PASS Test 6 passed');
}

async function test7_bulkStudentHardening() {
  console.log('\n[Test 7] bulk student creation hardening (quotes stripped, numeric names, digits-only validation)');
  
  // Sign an instructor token
  const instructorToken = jwt.sign({ sub: 'instructor1', role: 'instructor', name: 'Test Instructor' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  const res = await request(app)
    .post('/api/admin/students/bulk')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      students: [
        { name: '"Quote Test', npm: '5550001"' },
        { name: 'Bad', npm: 'abc123' },
        { name: '', npm: '5550002' },
      ]
    });
  
  if (res.status === 401) {
    console.error('FAIL Instructor token was rejected. Response:', res.body);
    throw new Error('requireInstructor rejected the instructor token. Check middleware.');
  }
  
  assertEqual(res.status, 200, 'POST /api/admin/students/bulk should return 200');
  assertEqual(res.body.results.length, 3, 'Should process 3 entries');
  
  // Entry 1: quotes stripped -> 5550001 and "Quote Test"
  const r1 = res.body.results[0];
  assertEqual(r1.npm, '5550001', 'First entry npm should be 5550001 (quote stripped)');
  assertEqual(r1.name, 'Quote Test', 'First entry name should be Quote Test (quote stripped)');
  assertEqual(r1.status, 'created', 'First entry should be created');
  
  // Entry 2: abc123 is not digits-only
  const r2 = res.body.results[1];
  assertEqual(r2.status, 'invalid', 'Second entry should be invalid');
  
  // Entry 3: empty name, npm is numeric -> should be created
  const r3 = res.body.results[2];
  assertEqual(r3.npm, '5550002', 'Third entry npm should be 5550002');
  assertEqual(r3.status, 'created', 'Third entry should be created');
  
  // Check leaderboard does NOT contain '5550002' anywhere (no results yet)
  const lb = await request(app).get('/api/leaderboard?lesson=' + testLesson + '&sort=score');
  const lbJson = JSON.stringify(lb.body);
  assert(!lbJson.includes('5550002'), 'Leaderboard must not contain 5550002 (no results)');
  
  // Check deriveDisplayName('5550002') === 'Student'
  const { deriveDisplayName } = await import('../backend/db.js');
  assertEqual(deriveDisplayName('5550002'), 'Student', 'deriveDisplayName for numeric name should return Student');
  
  console.log('PASS Test 7 passed');
}

// Run all tests
(async () => {
  try {
    console.log('=== POST /api/results Integration Tests ===');
    console.log(`Temp DB: ${tempDbPath}`);

    await setup();
    await test1_incorrectOutcomeScoresZero();
    await test2_correctWithPenaltiesScores70();
    await test3_reusingAttemptIdReturns409();
    await test4_leaderboardHidesIdentity();
    await test5_displayNameEditing();
    await test6_loginReturnsDisplayName();
    await test7_bulkStudentHardening();
    await teardown();

    console.log(`\n=== SUMMARY ===`);
    console.log(`PASS Passed: ${testsPassed}`);
    console.log(`FAIL Failed: ${testsFailed}`);

    if (testsFailed === 0) {
      console.log('\nAll tests passed!');
      process.exit(0);
    } else {
      console.error(`\nFAIL ${testsFailed} test(s) failed`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\nFAIL Test suite failed with error:`, error.message);
    await teardown();
    process.exit(1);
  }
})();
