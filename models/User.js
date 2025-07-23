import bcrypt from 'bcryptjs';
import { query } from '../utils/db.js';
import { AppError } from '../middleware/errorHandler.js';

export class User {
  // Create a new user
  static async create({ name, email, password }) {
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const result = await query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, email, created_at`,
      [name, email, passwordHash]
    );

    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  // Find user by ID
  static async findById(id) {
    const result = await query(
      'SELECT id, name, email, avatar_url, bio, created_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  // Update user profile
  static async updateProfile(id, { name, bio, avatarUrl }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`);
      values.push(bio);
      paramCount++;
    }

    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramCount}`);
      values.push(avatarUrl);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, name, email, avatar_url, bio, created_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    return result.rows[0];
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Change password
  static async changePassword(id, currentPassword, newPassword) {
    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await this.verifyPassword(currentPassword, result.rows[0].password_hash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, id]
    );

    return true;
  }

  // Get user statistics
  static async getStats(id) {
    const result = await query(
      `SELECT 
         COUNT(DISTINCT p.id) as total_posts,
         COUNT(DISTINCT c.id) as total_comments,
         COUNT(DISTINCT l.id) as total_likes,
         COALESCE(SUM(p.views), 0) as total_views
       FROM users u
       LEFT JOIN posts p ON u.id = p.user_id
       LEFT JOIN comments c ON u.id = c.user_id  
       LEFT JOIN likes l ON p.id = l.post_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    );

    return result.rows[0] || {
      total_posts: 0,
      total_comments: 0,
      total_likes: 0,
      total_views: 0
    };
  }

  // Delete user account
  static async delete(id) {
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    return true;
  }
}

export default User; 