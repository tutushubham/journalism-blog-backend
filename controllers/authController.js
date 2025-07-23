import { User } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { log } from '../utils/logger.js';

// Input validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateName = (name) => {
  return name && name.trim().length >= 2;
};

// Register new user
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Validate input
  if (!validateName(name)) {
    return next(new AppError('Name must be at least 2 characters long', 400));
  }

  if (!validateEmail(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  if (!validatePassword(password)) {
    return next(new AppError('Password must be at least 6 characters long', 400));
  }

  // Check if user already exists
  const existingUser = await User.findByEmail(email.toLowerCase());
  if (existingUser) {
    return next(new AppError('User already exists with this email', 409));
  }

  // Create user
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password
  });

  // Generate token
  const token = generateToken(user.id);

  log(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      },
      token
    }
  });
});

// Login user
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  if (!validateEmail(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  // Find user by email
  const user = await User.findByEmail(email.toLowerCase());
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Verify password
  const isValidPassword = await User.verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Generate token
  const token = generateToken(user.id);

  log(`User logged in: ${user.email}`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio,
        created_at: user.created_at
      },
      token
    }
  });
});

// Get current user profile
export const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get user statistics
  const stats = await User.getStats(user.id);

  res.json({
    success: true,
    data: {
      user: {
        ...user,
        stats
      }
    }
  });
});

// Update user profile
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, bio, avatarUrl } = req.body;

  // Validate name if provided
  if (name !== undefined && !validateName(name)) {
    return next(new AppError('Name must be at least 2 characters long', 400));
  }

  // Validate bio length if provided
  if (bio !== undefined && bio.length > 500) {
    return next(new AppError('Bio must be less than 500 characters', 400));
  }

  const updatedUser = await User.updateProfile(req.user.id, {
    name: name?.trim(),
    bio: bio?.trim(),
    avatarUrl
  });

  log(`User profile updated: ${updatedUser.email}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser
    }
  });
});

// Change password
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new password', 400));
  }

  if (!validatePassword(newPassword)) {
    return next(new AppError('New password must be at least 6 characters long', 400));
  }

  if (currentPassword === newPassword) {
    return next(new AppError('New password must be different from current password', 400));
  }

  await User.changePassword(req.user.id, currentPassword, newPassword);

  log(`Password changed for user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// Get user by ID (public profile)
export const getUserById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get user statistics
  const stats = await User.getStats(user.id);

  res.json({
    success: true,
    data: {
      user: {
        ...user,
        stats
      }
    }
  });
});

// Delete user account
export const deleteAccount = asyncHandler(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new AppError('Please provide your password to confirm account deletion', 400));
  }

  // Verify password before deletion
  const user = await User.findByEmail(req.user.email);
  const isValidPassword = await User.verifyPassword(password, user.password_hash);
  
  if (!isValidPassword) {
    return next(new AppError('Invalid password', 401));
  }

  await User.delete(req.user.id);

  log(`User account deleted: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
});

export default {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getUserById,
  deleteAccount
}; 