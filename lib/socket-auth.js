// lib/socket-auth.js
/**
 * Socket.io authentication middleware using JWT
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token from NextAuth
 */
async function verifyToken(token, secret) {
  try {
    const decoded = jwt.verify(token, secret);
    return { valid: true, userId: decoded.sub || decoded.id, email: decoded.email };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Socket.io authentication middleware
 */
function socketAuthMiddleware(secret) {
  return async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        console.log('[SocketAuth] No token provided');
        return next(new Error('Authentication required'));
      }

      const result = await verifyToken(token, secret);

      if (!result.valid) {
        console.log('[SocketAuth] Invalid token:', result.error);
        return next(new Error('Invalid authentication token'));
      }

      // Attach user info to socket
      socket.userId = result.userId;
      socket.userEmail = result.email;

      console.log(`[SocketAuth] Authenticated user: ${result.email} (${result.userId})`);
      next();

    } catch (error) {
      console.error('[SocketAuth] Authentication error:', error);
      next(new Error('Authentication failed'));
    }
  };
}

/**
 * Rate limiting per user
 */
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 10000) {
    this.limits = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(userId) {
    const now = Date.now();
    const userLimit = this.limits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.limits.set(userId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (userLimit.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: userLimit.resetTime - now
      };
    }

    userLimit.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - userLimit.count
    };
  }

  reset(userId) {
    this.limits.delete(userId);
  }
}

/**
 * Rate limiting middleware for socket events
 */
function rateLimitMiddleware(rateLimiter) {
  return (socket, next) => {
    const result = rateLimiter.check(socket.userId);

    if (!result.allowed) {
      console.log(`[RateLimit] User ${socket.userId} exceeded rate limit`);
      return next(new Error('Rate limit exceeded'));
    }

    next();
  };
}

module.exports = {
  socketAuthMiddleware,
  RateLimiter,
  rateLimitMiddleware,
  verifyToken
};
