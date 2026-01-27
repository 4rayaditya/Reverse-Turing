// lib/validation-schemas.js
/**
 * Zod validation schemas for all socket events
 */

const { z } = require('zod');

// User input schemas
const userIdSchema = z.string().uuid('Invalid user ID');
// Pool IDs may be UUIDs or server-generated strings like "pool-<timestamp>-<rand>".
// Accept any non-empty string for pool IDs to match server behavior.
const poolIdSchema = z.string().min(1, 'Invalid pool ID');
const socketIdSchema = z.string().min(1);

// Answer schema
const answerSchema = z.object({
  gameId: poolIdSchema,
  userId: userIdSchema,
  answer: z.string()
    .min(5, 'Answer must be at least 5 characters')
    .max(500, 'Answer must be less than 500 characters')
    .trim()
});

// Bet schema
const betSchema = z.object({
  gameId: poolIdSchema,
  userId: userIdSchema,
  amount: z.number()
    .int('Amount must be an integer')
    .positive('Amount must be positive')
    .max(10000, 'Amount too large'),
  guess: z.enum(['A', 'B'], { errorMap: () => ({ message: 'Guess must be A or B' }) })
});

// Join game schema
const joinGameSchema = z.object({
  gameId: poolIdSchema,
  userId: userIdSchema,
  userName: z.string()
    .min(1, 'Name required')
    .max(50, 'Name too long')
    .trim()
});

// Join request schema
const joinRequestSchema = z.object({
  gameId: poolIdSchema,
  userId: userIdSchema,
  userName: z.string()
    .min(1, 'Name required')
    .max(50, 'Name too long')
    .trim()
});

// Create pool schema
const createPoolSchema = z.object({
  userId: userIdSchema
});

// Admin approve/deny join
const approveJoinSchema = z.object({
  poolId: poolIdSchema,
  userId: userIdSchema
});

// Admin game actions
const adminGameSchema = z.object({
  gameId: poolIdSchema
});

// Admin add time
const addTimeSchema = z.object({
  gameId: poolIdSchema,
  userId: userIdSchema.optional(),
  seconds: z.number().int().positive().max(600)
});

/**
 * Validate and sanitize input
 */
function validateInput(schema, data) {
  try {
    return {
      success: true,
      data: schema.parse(data)
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors[0].message || 'Validation failed'
    };
  }
}

/**
 * Sanitize string to prevent XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

module.exports = {
  schemas: {
    answer: answerSchema,
    bet: betSchema,
    joinGame: joinGameSchema,
    joinRequest: joinRequestSchema,
    createPool: createPoolSchema,
    approveJoin: approveJoinSchema,
    adminGame: adminGameSchema,
    addTime: addTimeSchema
  },
  validateInput,
  sanitizeString
};
