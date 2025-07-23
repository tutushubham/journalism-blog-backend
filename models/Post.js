import { query } from '../utils/db.js';
import { AppError } from '../middleware/errorHandler.js';

export class Post {
  // Create a new post
  static async create({ userId, title, excerpt, body, imageUrl, tags, published = false }) {
    // Generate slug from title
    const slug = this.generateSlug(title);

    const result = await query(
      `INSERT INTO posts (user_id, title, excerpt, body, image_url, slug, tags, published) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [userId, title, excerpt, body, imageUrl, slug, tags, published]
    );

    return result.rows[0];
  }

  // Generate URL-friendly slug from title
  static generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim('-'); // Remove leading/trailing hyphens
  }

  // Make slug unique by appending number if needed
  static async generateUniqueSlug(title, excludeId = null) {
    let baseSlug = this.generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingPost = excludeId 
        ? await query('SELECT id FROM posts WHERE slug = $1 AND id != $2', [slug, excludeId])
        : await query('SELECT id FROM posts WHERE slug = $1', [slug]);

      if (existingPost.rows.length === 0) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  // Get all published posts with pagination
  static async findAll({ page = 1, limit = 10, tags = null, userId = null }) {
    const offset = (page - 1) * limit;
    let queryText = `
      SELECT 
        p.*,
        u.name as author_name,
        u.avatar_url as author_avatar,
        COUNT(DISTINCT l.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.published = true
    `;
    
    const params = [];
    let paramCount = 1;

    if (tags && tags.length > 0) {
      queryText += ` AND p.tags && $${paramCount}`;
      params.push(tags);
      paramCount++;
    }

    if (userId) {
      queryText += ` AND p.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    queryText += `
      GROUP BY p.id, u.name, u.avatar_url
      ORDER BY p.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM posts p WHERE p.published = true';
    const countParams = [];
    let countParamCount = 1;

    if (tags && tags.length > 0) {
      countQuery += ` AND p.tags && $${countParamCount}`;
      countParams.push(tags);
      countParamCount++;
    }

    if (userId) {
      countQuery += ` AND p.user_id = $${countParamCount}`;
      countParams.push(userId);
    }

    const countResult = await query(countQuery, countParams);
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

  // Find post by ID with author and interaction counts
  static async findById(id, userId = null) {
    const result = await query(
      `SELECT 
         p.*,
         u.name as author_name,
         u.avatar_url as author_avatar,
         u.bio as author_bio,
         COUNT(DISTINCT l.id) as likes_count,
         COUNT(DISTINCT c.id) as comments_count,
         ${userId ? 'COUNT(DISTINCT ul.id) > 0 as user_liked' : 'false as user_liked'}
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       ${userId ? 'LEFT JOIN likes ul ON p.id = ul.post_id AND ul.user_id = $2' : ''}
       WHERE p.id = $1
       GROUP BY p.id, u.name, u.avatar_url, u.bio`,
      userId ? [id, userId] : [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  // Find post by slug
  static async findBySlug(slug, userId = null) {
    const result = await query(
      `SELECT 
         p.*,
         u.name as author_name,
         u.avatar_url as author_avatar,
         u.bio as author_bio,
         COUNT(DISTINCT l.id) as likes_count,
         COUNT(DISTINCT c.id) as comments_count,
         ${userId ? 'COUNT(DISTINCT ul.id) > 0 as user_liked' : 'false as user_liked'}
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       ${userId ? 'LEFT JOIN likes ul ON p.id = ul.post_id AND ul.user_id = $2' : ''}
       WHERE p.slug = $1 AND p.published = true
       GROUP BY p.id, u.name, u.avatar_url, u.bio`,
      userId ? [slug, userId] : [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  // Update post
  static async update(id, { title, excerpt, body, imageUrl, tags, published }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
      
      // Update slug if title changed
      const slug = await this.generateUniqueSlug(title, id);
      updates.push(`slug = $${paramCount}`);
      values.push(slug);
      paramCount++;
    }

    if (excerpt !== undefined) {
      updates.push(`excerpt = $${paramCount}`);
      values.push(excerpt);
      paramCount++;
    }

    if (body !== undefined) {
      updates.push(`body = $${paramCount}`);
      values.push(body);
      paramCount++;
    }

    if (imageUrl !== undefined) {
      updates.push(`image_url = $${paramCount}`);
      values.push(imageUrl);
      paramCount++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramCount}`);
      values.push(tags);
      paramCount++;
    }

    if (published !== undefined) {
      updates.push(`published = $${paramCount}`);
      values.push(published);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(id);

    const result = await query(
      `UPDATE posts SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Post not found', 404);
    }

    return result.rows[0];
  }

  // Delete post
  static async delete(id) {
    const result = await query(
      'DELETE FROM posts WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Post not found', 404);
    }

    return true;
  }

  // Increment view count
  static async incrementViews(id) {
    await query(
      'UPDATE posts SET views = views + 1 WHERE id = $1',
      [id]
    );
  }

  // Get user's posts (including drafts)
  static async findByUserId(userId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
         p.*,
         COUNT(DISTINCT l.id) as likes_count,
         COUNT(DISTINCT c.id) as comments_count
       FROM posts p
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM posts WHERE user_id = $1',
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

  // Search posts
  static async search(searchTerm, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

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
       WHERE p.published = true 
         AND (p.title ILIKE $1 OR p.excerpt ILIKE $1 OR p.body ILIKE $1)
       GROUP BY p.id, u.name, u.avatar_url
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${searchTerm}%`, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM posts p
       WHERE p.published = true 
         AND (p.title ILIKE $1 OR p.excerpt ILIKE $1 OR p.body ILIKE $1)`,
      [`%${searchTerm}%`]
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
}

export default Post; 