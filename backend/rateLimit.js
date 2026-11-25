// ─── In-memory login rate limiter (no new dependency, no db import) ───
// Key: identifier + ':' + ip -> { failures, windowStart }

const loginAttempts = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function rateLimitKey(identifier, ip) {
  return identifier + ':' + (ip || 'unknown');
}

export function checkRateLimit(identifier, ip) {
  const key = rateLimitKey(identifier, ip);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(key, { failures: 0, windowStart: now });
    return { allowed: true };
  }

  if (entry.failures >= RATE_LIMIT_MAX) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart);
    return {
      allowed: false,
      retryAfter: Math.ceil(retryAfterMs / 1000),
    };
  }

  return { allowed: true };
}

export function recordFailure(identifier, ip) {
  const key = rateLimitKey(identifier, ip);
  const now = Date.now();
  const entry = loginAttempts.get(key) || { failures: 0, windowStart: now };

  if (!loginAttempts.has(key) || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.failures = 1;
    entry.windowStart = now;
  } else {
    entry.failures += 1;
  }
  loginAttempts.set(key, entry);
}

export function clearRateLimit(identifier, ip) {
  loginAttempts.delete(rateLimitKey(identifier, ip));
}
