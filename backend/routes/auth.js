/**
 * backend/routes/auth.js
 * POST /api/auth/login
 *
 * Accepts student login:     { npm, password }
 * Accepts instructor login:  { username, password, role: "instructor" }
 *
 * Returns on success: { token, name, role }
 * Returns on failure: 401 { error: "Invalid credentials" }
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findStudentByNpm, findInstructorByUsername } from '../db.js';
import { JWT_EXPIRY } from '../constants.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { npm, username, password, role } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  try {
    if (role === 'instructor') {
      // ─── Instructor path ──────────────────────────────────────────────────
      if (!username) {
        return res.status(400).json({ error: 'username is required for instructor login' });
      }
      const account = findInstructorByUsername(username);
      if (!account) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const match = await bcrypt.compare(password, account.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign(
        { sub: account.username, role: 'instructor', name: account.name },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      return res.json({ token, name: account.name, role: 'instructor' });

    } else {
      // ─── Student path ─────────────────────────────────────────────────────
      if (!npm) {
        return res.status(400).json({ error: 'npm is required for student login' });
      }
      const account = findStudentByNpm(npm);
      if (!account) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const match = await bcrypt.compare(password, account.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign(
        { sub: account.npm, role: 'student', name: account.name },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      return res.json({ token, name: account.name, role: 'student' });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
