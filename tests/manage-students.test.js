/**
 * tests/manage-students.test.js
 * Tests for bulk student creation and management endpoints.
 * Uses vi.mock to replace db.js, avoiding node:sqlite import entirely.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ─── Mock db.js BEFORE any imports that depend on it ──────────────────────────

const mockDb = {
  prepare: vi.fn(),
  exec: vi.fn(),
};

const mockPreparedStatement = {
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
};

// Mock the db module entirely - this prevents node:sqlite from ever being loaded
vi.mock('../backend/db.js', () => ({
  default: mockDb,
  resetAttempt: vi.fn(() => 5), // Mock reset function
  findStudentByNpm: vi.fn(),
  findInstructorByUsername: vi.fn(),
}));

// ─── Setup test environment after mocking ──────────────────────────────────────

const TEST_JWT_SECRET = 'test-secret-manage-students';
process.env.JWT_SECRET = TEST_JWT_SECRET;

// Now safe to import admin router (db.js is mocked, so no node:sqlite)
const { default: adminRouter } = await import('../backend/routes/admin.js');

// Create minimal test app
const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

// ─── Test fixtures ────────────────────────────────────────────────────────────

let instructorToken;
let studentToken;

beforeAll(() => {
  instructorToken = jwt.sign(
    { sub: 'test-instructor', role: 'instructor', name: 'Test Instructor' },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );

  studentToken = jwt.sign(
    { sub: '9999999999', role: 'student', name: 'Test Student' },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
});

beforeEach(() => {
  vi.clearAllMocks();
  
  // Setup default mock behavior
  mockDb.prepare.mockReturnValue(mockPreparedStatement);
  mockPreparedStatement.run.mockReturnValue({ lastInsertRowid: 1 });
  mockPreparedStatement.get.mockReturnValue(null); // Default: no existing student
  mockPreparedStatement.all.mockReturnValue([]);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/admin/students/bulk', () => {
  
  it('should create students and return generated passwords', async () => {
    const students = [
      { name: 'Alice Test', npm: 'test-001' },
      { name: 'Bob Test', npm: 'test-002' },
    ];

    const res = await request(app)
      .post('/api/admin/students/bulk')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ students })
      .expect(200);

    expect(res.body.results).toHaveLength(2);
    
    // Verify both created
    res.body.results.forEach(r => {
      expect(r.status).toBe('created');
      expect(r.password).toBeDefined();
      expect(r.password.length).toBe(8);
      expect(typeof r.password).toBe('string');
    });

    // Verify db.prepare was called for inserts
    expect(mockDb.prepare).toHaveBeenCalled();
  });

  it('should handle mixed valid/duplicate/invalid entries', async () => {
    // Setup: npm 'existing' already exists
    mockPreparedStatement.get.mockImplementation((npm) => {
      if (npm === 'existing') return { npm: 'existing' };
      return null;
    });

    const students = [
      { name: 'New', npm: 'new-001' },
      { name: 'Duplicate', npm: 'existing' },
      { name: 'Invalid', npm: '' },
    ];

    const res = await request(app)
      .post('/api/admin/students/bulk')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ students })
      .expect(200);

    expect(res.body.results).toHaveLength(3);

    const created = res.body.results.filter(r => r.status === 'created');
    const duplicate = res.body.results.find(r => r.status === 'duplicate');
    const invalid = res.body.results.find(r => r.status === 'invalid');

    expect(created).toHaveLength(1);
    expect(created[0].password).toBeDefined();

    expect(duplicate).toBeDefined();
    expect(duplicate.npm).toBe('existing');
    expect(duplicate.password).toBeUndefined();

    expect(invalid).toBeDefined();
    expect(invalid.password).toBeUndefined();
    expect(invalid.error).toMatch(/npm is required/i);
  });

  it('should hash passwords using bcrypt', async () => {
    const students = [{ name: 'Test', npm: 'test-hash' }];

    const res = await request(app)
      .post('/api/admin/students/bulk')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ students })
      .expect(200);

    const plainPassword = res.body.results[0].password;

    // Check that run was called with bcrypt hash
    const insertCalls = mockPreparedStatement.run.mock.calls;
    expect(insertCalls.length).toBeGreaterThan(0);
    
    const [npm, name, hash] = insertCalls[0];
    expect(npm).toBe('test-hash');
    
    // Verify hash is bcrypt format
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash starts with $2a$, $2b$, or $2y$
    
    // Verify hash validates against plain password
    const isValid = await bcrypt.compare(plainPassword, hash);
    expect(isValid).toBe(true);
  });

  it('should generate passwords without ambiguous characters', async () => {
    const students = Array.from({ length: 10 }, (_, i) => ({
      name: `User ${i}`,
      npm: `test-${i}`,
    }));

    const res = await request(app)
      .post('/api/admin/students/bulk')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ students })
      .expect(200);

    res.body.results.forEach(r => {
      const pwd = r.password;
      expect(pwd.length).toBe(8);
      expect(/^[A-Za-z0-9]+$/.test(pwd)).toBe(true);
      expect(pwd).not.toMatch(/[O0Il1]/);
    });
  });

  it('should reject without instructor token (401)', async () => {
    const res = await request(app)
      .post('/api/admin/students/bulk')
      .send({ students: [{ name: 'Test', npm: 'test' }] })
      .expect(401);

    expect(res.body.error).toMatch(/authentication required/i);
  });

  it('should reject with student token (403)', async () => {
    const res = await request(app)
      .post('/api/admin/students/bulk')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ students: [{ name: 'Test', npm: 'test' }] })
      .expect(403);

    expect(res.body.error).toMatch(/instructor account required/i);
  });

  it('should return 400 if students is not an array', async () => {
    const res = await request(app)
      .post('/api/admin/students/bulk')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ students: 'not-an-array' })
      .expect(400);

    expect(res.body.error).toMatch(/must be an array/i);
  });
});

describe('GET /api/admin/students', () => {
  
  it('should return students list with stats', async () => {
    // Mock student data
    mockPreparedStatement.all.mockReturnValueOnce([
      { npm: 'student-1', name: 'Student One', created_at: '2024-01-01' },
      { npm: 'student-2', name: 'Student Two', created_at: '2024-01-02' },
    ]);

    // Mock attempts and scores
    mockPreparedStatement.get
      .mockReturnValueOnce({ total: 3 })  // student-1 attempts
      .mockReturnValueOnce({ best: 85 })  // student-1 score
      .mockReturnValueOnce({ total: 0 })  // student-2 attempts
      .mockReturnValueOnce({ best: 0 });  // student-2 score

    const res = await request(app)
      .get('/api/admin/students')
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200);

    expect(res.body.students).toHaveLength(2);
    
    expect(res.body.students[0]).toMatchObject({
      npm: 'student-1',
      name: 'Student One',
      attemptsUsed: 3,
      bestScore: 85,
    });

    expect(res.body.students[1]).toMatchObject({
      npm: 'student-2',
      name: 'Student Two',
      attemptsUsed: 0,
      bestScore: 0,
    });
  });

  it('should never return password fields', async () => {
    mockPreparedStatement.all.mockReturnValueOnce([
      { npm: 'test-sec', name: 'Security Test', created_at: '2024-01-01' },
    ]);
    mockPreparedStatement.get
      .mockReturnValueOnce({ total: 0 })
      .mockReturnValueOnce({ best: 0 });

    const res = await request(app)
      .get('/api/admin/students')
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200);

    const student = res.body.students[0];
    expect(student.password).toBeUndefined();
    expect(student.password_hash).toBeUndefined();
    expect(student.passwordHash).toBeUndefined();
  });

  it('should reject without instructor token (401)', async () => {
    await request(app)
      .get('/api/admin/students')
      .expect(401);
  });

  it('should reject with student token (403)', async () => {
    await request(app)
      .get('/api/admin/students')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });
});

describe('POST /api/admin/reset (per-student)', () => {
  
  it('should accept per-student reset requests', async () => {
    const res = await request(app)
      .post('/api/admin/reset')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ npm: '9999999999', lessonId: 'ddos_edge' })
      .expect(200);

    expect(res.body.message).toMatch(/reset/i);
    expect(res.body.priorCount).toBe(5); // From mocked resetAttempt
  });

  it('should be gated by instructor authentication', async () => {
    await request(app)
      .post('/api/admin/reset')
      .send({ npm: '9999999999', lessonId: 'ddos_edge' })
      .expect(401);

    await request(app)
      .post('/api/admin/reset')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ npm: '9999999999', lessonId: 'ddos_edge' })
      .expect(403);
  });
});
