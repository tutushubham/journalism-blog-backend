import jwt from 'jsonwebtoken';
import { AppError, asyncHandler } from './errorHandler.js';
import { query } from '../utils/db.js';
import { log } from '../utils/logger.js';

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Verify JWT token and get user
export const verifyToken = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Access denied. No token provided.', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await query(
      'SELECT id, name, email, avatar_url, bio, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Token is valid but user no longer exists', 401));
    }

    // Attach user to request object
    req.user = result.rows[0];
    log(`User authenticated: ${req.user.email}`);
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    return next(error);
  }
});

// Optional authentication - doesn't fail if no token
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, name, email, avatar_url, bio, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
  } catch (error) {
    // Silently ignore token errors for optional auth
    log('Optional auth failed:', error.message);
  }

  next();
});

// Check if user owns the resource
export const checkOwnership = (resourceType) => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params.id;
    const userId = req.user.id;

    let result;
    
    switch (resourceType) {
      case 'post':
        result = await query('SELECT user_id FROM posts WHERE id = $1', [resourceId]);
        break;
      case 'comment':
        result = await query('SELECT user_id FROM comments WHERE id = $1', [resourceId]);
        break;
      default:
        return next(new AppError('Invalid resource type', 400));
    }

    if (result.rows.length === 0) {
      return next(new AppError(`${resourceType} not found`, 404));
    }

    if (result.rows[0].user_id !== userId) {
      return next(new AppError(`Access denied. You don't own this ${resourceType}.`, 403));
    }

    next();
  });
};

export default { generateToken, verifyToken, optionalAuth, checkOwnership }; 