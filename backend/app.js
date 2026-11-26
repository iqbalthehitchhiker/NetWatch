/**
 * backend/app.js
 * Express application setup. Exported without calling listen().
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter       from './routes/auth.js';
import attemptsRouter   from './routes/attempts.js';
import resultsRouter    from './routes/results.js';
import adminRouter      from './routes/admin.js';
import leaderboardRouter from './routes/leaderboard.js';

// Guard — refuse to start without a signing secret
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Copy .env.example to .env and fill it in.');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter);
app.use('/api/attempts',    attemptsRouter);
app.use('/api/results',     resultsRouter);
app.use('/api/admin',       adminRouter);
app.use('/api/leaderboard', leaderboardRouter);

// ─── Static frontend ─────────────────────────────────────────────────────────
const publicRoot = path.join(__dirname, '..');
app.use(express.static(publicRoot, { index: false }));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicRoot, 'index.html'));
});

export default app;
