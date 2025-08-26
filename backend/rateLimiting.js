// === RATE LIMITING CONFIGURATION ===
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// === PRIVACY-FIRST RATE LIMITING ===
// Uses session ID instead of IP address for privacy
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,              // 15 minutes
  max: 50,                               // 50 requests per session per window
  keyGenerator: (req) => {
    // Use session ID instead of IP for privacy
    if (req.sessionID) {
      return req.sessionID;
    }
    // Fallback: hash IP with daily salt (no permanent tracking)
    const date = new Date().toDateString();
    const salt = process.env.RATE_LIMIT_SALT || 'default-salt';
    return crypto.createHash('sha256')
                 .update(req.ip + date + salt)
                 .digest('hex');
  },
  message: {
    error: 'Too many requests from this session, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: false,                // Don't expose rate limit headers (privacy)
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// === PUBLIC RATE LIMITING (More restrictive for unauthenticated users) ===
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs (more restrictive)
  message: { error: 'Too many requests from this IP. Please sign up for more access.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address for public rate limiting
    return req.ip || req.connection.remoteAddress
  }
});

const setupRateLimiting = (app) => {
  app.use('/api/', limiter); // Apply rate limiting to all API routes
  app.locals.publicRateLimit = publicRateLimit;
};

module.exports = { setupRateLimiting, publicRateLimit };
