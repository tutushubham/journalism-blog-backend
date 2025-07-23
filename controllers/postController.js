import { Post } from '../models/Post.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { log } from '../utils/logger.js';

// Input validation helpers
const validateTitle = (title) => {
  return title && title.trim().length >= 3 && title.trim().length <= 255;
};

const validateBody = (body) => {
  return body && body.trim().length >= 10;
};

const validateTags = (tags) => {
  if (!tags) return true;
  return Array.isArray(tags) && tags.length <= 10 && tags.every(tag => 
    typeof tag === 'string' && tag.trim().length > 0 && tag.trim().length <= 50
  );
};

// Create new post
export const createPost = asyncHandler(async (req, res, next) => {
  const { title, excerpt, body, imageUrl, tags, published = false } = req.body;

  // Validate input
  if (!validateTitle(title)) {
    return next(new AppError('Title must be between 3 and 255 characters', 400));
  }

  if (!validateBody(body)) {
    return next(new AppError('Body must be at least 10 characters long', 400));
  }

  if (!validateTags(tags)) {
    return next(new AppError('Invalid tags format. Maximum 10 tags, each up to 50 characters', 400));
  }

  if (excerpt && excerpt.length > 500) {
    return next(new AppError('Excerpt must be less than 500 characters', 400));
  }

  // Generate unique slug
  const slug = await Post.generateUniqueSlug(title.trim());

  // Create post
  const post = await Post.create({
    userId: req.user.id,
    title: title.trim(),
    excerpt: excerpt?.trim(),
    body: body.trim(),
    imageUrl,
    tags: tags || [],
    published: Boolean(published)
  });

  log(`New post created: ${post.title} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: {
      post
    }
  });
});

// Get all published posts
export const getPosts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    tags,
    author,
    search
  } = req.query;

  // Validate pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  let result;

  if (search) {
    // Search posts
    result = await Post.search(search, { page: pageNum, limit: limitNum });
  } else {
    // Get posts with filters
    const filters = {};
    
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
      filters.tags = tagsArray.map(tag => tag.trim()).filter(Boolean);
    }

    if (author) {
      filters.userId = parseInt(author);
    }

    result = await Post.findAll({ 
      page: pageNum, 
      limit: limitNum,
      ...filters
    });
  }

  res.json({
    success: true,
    data: result
  });
});

// Get post by ID or slug
export const getPost = asyncHandler(async (req, res, next) => {
  const { identifier } = req.params;
  const userId = req.user?.id;

  let post;

  // Check if identifier is numeric (ID) or string (slug)
  if (/^\d+$/.test(identifier)) {
    post = await Post.findById(parseInt(identifier), userId);
  } else {
    post = await Post.findBySlug(identifier, userId);
  }

  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  // Increment view count
  await Post.incrementViews(post.id);

  res.json({
    success: true,
    data: {
      post
    }
  });
});

// Update post
export const updatePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, excerpt, body, imageUrl, tags, published } = req.body;

  // Validate input if provided
  if (title !== undefined && !validateTitle(title)) {
    return next(new AppError('Title must be between 3 and 255 characters', 400));
  }

  if (body !== undefined && !validateBody(body)) {
    return next(new AppError('Body must be at least 10 characters long', 400));
  }

  if (tags !== undefined && !validateTags(tags)) {
    return next(new AppError('Invalid tags format. Maximum 10 tags, each up to 50 characters', 400));
  }

  if (excerpt !== undefined && excerpt.length > 500) {
    return next(new AppError('Excerpt must be less than 500 characters', 400));
  }

  // Update post
  const updateData = {};
  if (title !== undefined) updateData.title = title.trim();
  if (excerpt !== undefined) updateData.excerpt = excerpt?.trim();
  if (body !== undefined) updateData.body = body.trim();
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (tags !== undefined) updateData.tags = tags;
  if (published !== undefined) updateData.published = Boolean(published);

  const post = await Post.update(parseInt(id), updateData);

  log(`Post updated: ${post.title} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Post updated successfully',
    data: {
      post
    }
  });
});

// Delete post
export const deletePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  await Post.delete(parseInt(id));

  log(`Post deleted: ID ${id} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
});

// Get user's posts (including drafts)
export const getUserPosts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const userId = req.user.id;

  // Validate pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const result = await Post.findByUserId(userId, {
    page: pageNum,
    limit: limitNum
  });

  res.json({
    success: true,
    data: result
  });
});

// Get trending/popular posts
export const getTrendingPosts = asyncHandler(async (req, res, next) => {
  const { timeframe = 'week', limit = 10 } = req.query;
  
  const validTimeframes = ['day', 'week', 'month', 'all'];
  const selectedTimeframe = validTimeframes.includes(timeframe) ? timeframe : 'week';
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  // This would typically use a more sophisticated algorithm
  // For now, we'll get most liked posts
  const { Like } = await import('../models/Like.js');
  const posts = await Like.getMostLikedPosts({
    limit: limitNum,
    timeframe: selectedTimeframe === 'all' ? null : selectedTimeframe
  });

  res.json({
    success: true,
    data: {
      posts,
      timeframe: selectedTimeframe
    }
  });
});

// Publish/unpublish post
export const togglePublish = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Get current post status
  const currentPost = await Post.findById(parseInt(id));
  if (!currentPost) {
    return next(new AppError('Post not found', 404));
  }

  // Check ownership (should be handled by middleware, but double-check)
  if (currentPost.user_id !== req.user.id) {
    return next(new AppError('Access denied', 403));
  }

  // Toggle published status
  const post = await Post.update(parseInt(id), {
    published: !currentPost.published
  });

  log(`Post ${post.published ? 'published' : 'unpublished'}: ${post.title} by ${req.user.email}`);

  res.json({
    success: true,
    message: `Post ${post.published ? 'published' : 'unpublished'} successfully`,
    data: {
      post
    }
  });
});

// Get post statistics
export const getPostStats = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const post = await Post.findById(parseInt(id));
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  // Check if user owns the post
  if (post.user_id !== req.user.id) {
    return next(new AppError('Access denied', 403));
  }

  res.json({
    success: true,
    data: {
      stats: {
        views: post.views,
        likes: parseInt(post.likes_count),
        comments: parseInt(post.comments_count),
        published: post.published,
        created_at: post.created_at,
        updated_at: post.updated_at
      }
    }
  });
});

export default {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  getUserPosts,
  getTrendingPosts,
  togglePublish,
  getPostStats
}; 