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

// Run all tests
(async () => {
  try {
    console.log('=== POST /api/results Integration Tests ===');
    console.log(`Temp DB: ${tempDbPath}`);

    await setup();
    await test1_incorrectOutcomeScoresZero();
    await test2_correctWithPenaltiesScores70();
    await test3_reusingAttemptIdReturns409();
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
