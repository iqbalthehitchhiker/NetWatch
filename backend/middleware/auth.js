/**
 * backend/middleware/auth.js
 * JWT verification middleware.
 *
 * requireAuth       — any valid token
 * requireStudent    — token with role === 'student'
 * requireInstructor — token with role === 'instructor'
 */

import jwt from 'jsonwebtoken';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAuth(req, res, next) {
  verifyToken(req, res, next);
}

export function requireStudent(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student account required' });
    }
    next();
  });
}

export function requireInstructor(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ error: 'Instructor account required' });
    }
    next();
  });
}
