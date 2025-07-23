import { query } from '../utils/db.js';
import { AppError } from '../middleware/errorHandler.js';

export class Comment {
  // Create a new comment
  static async create({ postId, userId, text }) {
    const result = await query(
      `INSERT INTO comments (post_id, user_id, text) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [postId, userId, text]
    );

    return result.rows[0];
  }

  // Get comments for a post
  static async findByPostId(postId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
         c.*,
         u.name as user_name,
         u.avatar_url as user_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM comments WHERE post_id = $1',
      [postId]
    );

    const total = parseInt(countResult.rows[0].count);

    return {
      comments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Find comment by ID
  static async findById(id) {
    const result = await query(
      `SELECT 
         c.*,
         u.name as user_name,
         u.avatar_url as user_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  // Update comment
  static async update(id, { text }) {
    const result = await query(
      'UPDATE comments SET text = $1 WHERE id = $2 RETURNING *',
      [text, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Comment not found', 404);
    }

    return result.rows[0];
  }

  // Delete comment
  static async delete(id) {
    const result = await query(
      'DELETE FROM comments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Comment not found', 404);
    }

    return true;
  }

  // Get user's comments
  static async findByUserId(userId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
         c.*,
         p.title as post_title,
         p.slug as post_slug
       FROM comments c
       JOIN posts p ON c.post_id = p.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM comments WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].count);

    return {
      comments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get recent comments across all posts
  static async findRecent({ limit = 5, page = 1 }) {
    const offset = (page - 1) * limit;
    
    const result = await query(
      `SELECT 
         c.*,
         u.name as user_name,
         u.avatar_url as user_avatar,
         p.title as post_title,
         p.slug as post_slug
       FROM comments c
       JOIN users u ON c.user_id = u.id
       JOIN posts p ON c.post_id = p.id
       WHERE p.published = true
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as count
       FROM comments c
       JOIN posts p ON c.post_id = p.id
       WHERE p.published = true`
    );

    const total = parseInt(countResult.rows[0].count);

    return {
      comments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

export default Comment; 