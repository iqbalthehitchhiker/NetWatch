/**
 * backend/server.js
 * Express entry point. Reads JWT_SECRET from environment — throws if absent.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter    from './routes/auth.js';
import attemptsRouter from './routes/attempts.js';
import resultsRouter from './routes/results.js';
import adminRouter   from './routes/admin.js';

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
app.use('/api/auth',     authRouter);
app.use('/api/attempts', attemptsRouter);
app.use('/api/results',  resultsRouter);
app.use('/api/admin',    adminRouter);

// ─── Static frontend ─────────────────────────────────────────────────────────
const publicRoot = path.join(__dirname, '..');
app.use(express.static(publicRoot, { index: false }));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicRoot, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NetWatch backend listening on http://localhost:${PORT}`);
});

export default app;
