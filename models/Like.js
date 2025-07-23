import { query } from '../utils/db.js';
import { AppError } from '../middleware/errorHandler.js';

export class Like {
  // Toggle like on a post (like if not liked, unlike if already liked)
  static async toggle(postId, userId) {
    // Check if user already liked the post
    const existingLike = await query(
      'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingLike.rows.length > 0) {
      // Unlike the post
      await query(
        'DELETE FROM likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      return { liked: false, action: 'unliked' };
    } else {
      // Like the post
      await query(
        'INSERT INTO likes (post_id, user_id) VALUES ($1, $2)',
        [postId, userId]
      );
      return { liked: true, action: 'liked' };
    }
  }

  // Get likes count for a post
  static async getCountByPostId(postId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1',
      [postId]
    );

    return parseInt(result.rows[0].count);
  }

  // Check if user liked a post
  static async isLikedByUser(postId, userId) {
    if (!userId) return false;

    const result = await query(
      'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    return result.rows.length > 0;
  }

  // Get users who liked a post
  static async getLikesByPostId(postId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
         l.created_at,
         u.id as user_id,
         u.name as user_name,
         u.avatar_url as user_avatar
       FROM likes l
       JOIN users u ON l.user_id = u.id
       WHERE l.post_id = $1
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM likes WHERE post_id = $1',
      [postId]
    );

    const total = parseInt(countResult.rows[0].count);

    return {
      likes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get posts liked by a user
  static async getLikedPostsByUserId(userId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
         p.*,
         u.name as author_name,
         u.avatar_url as author_avatar,
         l.created_at as liked_at,
         COUNT(DISTINCT pl.id) as likes_count,
         COUNT(DISTINCT c.id) as comments_count
       FROM likes l
       JOIN posts p ON l.post_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes pl ON p.id = pl.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE l.user_id = $1 AND p.published = true
       GROUP BY p.id, u.name, u.avatar_url, l.created_at
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM likes l
       JOIN posts p ON l.post_id = p.id
       WHERE l.user_id = $1 AND p.published = true`,
      [userId]
    );

    const total = parseInt(countResult.rows[0].count);

    return {
      posts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get most liked posts
  static async getMostLikedPosts({ limit = 10, timeframe = null }) {
    let whereClause = 'WHERE p.published = true';
    const params = [limit];

    if (timeframe) {
      switch (timeframe) {
        case 'day':
          whereClause += ' AND l.created_at >= NOW() - INTERVAL \'1 day\'';
          break;
        case 'week':
          whereClause += ' AND l.created_at >= NOW() - INTERVAL \'1 week\'';
          break;
        case 'month':
          whereClause += ' AND l.created_at >= NOW() - INTERVAL \'1 month\'';
          break;
      }
    }

    const result = await query(
      `SELECT 
         p.*,
         u.name as author_name,
         u.avatar_url as author_avatar,
         COUNT(DISTINCT l.id) as likes_count,
         COUNT(DISTINCT c.id) as comments_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       ${whereClause}
       GROUP BY p.id, u.name, u.avatar_url
       HAVING COUNT(DISTINCT l.id) > 0
       ORDER BY likes_count DESC, p.created_at DESC
       LIMIT $1`,
      params
    );

    return result.rows;
  }

  // Remove all likes from a post (used when deleting post)
  static async deleteByPostId(postId) {
    await query(
      'DELETE FROM likes WHERE post_id = $1',
      [postId]
    );
  }

  // Get user's like statistics
  static async getUserStats(userId) {
    const result = await query(
      `SELECT 
         COUNT(DISTINCT l.id) as total_likes_given,
         COUNT(DISTINCT pl.id) as total_likes_received
       FROM users u
       LEFT JOIN likes l ON u.id = l.user_id
       LEFT JOIN posts p ON u.id = p.user_id
       LEFT JOIN likes pl ON p.id = pl.post_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    return result.rows[0] || {
      total_likes_given: 0,
      total_likes_received: 0
    };
  }
}

export default Like; 