import { Like } from '../models/Like.js';
import { Post } from '../models/Post.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { log } from '../utils/logger.js';

// Toggle like on a post
export const toggleLike = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user.id;

  // Check if post exists and is published
  const post = await Post.findById(parseInt(postId));
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  if (!post.published) {
    return next(new AppError('Cannot like unpublished post', 403));
  }

  // Toggle like
  const result = await Like.toggle(parseInt(postId), userId);
  
  // Get updated like count
  const likeCount = await Like.getCountByPostId(parseInt(postId));

  log(`Post ${result.action}: Post ${postId} by user ${userId}`);

  res.json({
    success: true,
    message: `Post ${result.action} successfully`,
    data: {
      liked: result.liked,
      isLiked: result.liked, // Also include for frontend compatibility
      action: result.action,
      likeCount: likeCount
    }
  });
});

// Get likes for a post
export const getPostLikes = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  // Validate pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  // Check if post exists
  const post = await Post.findById(parseInt(postId));
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  const result = await Like.getLikesByPostId(parseInt(postId), {
    page: pageNum,
    limit: limitNum
  });

  res.json({
    success: true,
    data: result
  });
});

// Get like count for a post
export const getLikeCount = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;

  // Check if post exists
  const post = await Post.findById(parseInt(postId));
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  const count = await Like.getCountByPostId(parseInt(postId));

  res.json({
    success: true,
    data: {
      count,
      postId: parseInt(postId)
    }
  });
});

// Check if user liked a post
export const checkUserLike = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.json({
      success: true,
      data: {
        liked: false
      }
    });
  }

  // Check if post exists
  const post = await Post.findById(parseInt(postId));
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  const liked = await Like.isLikedByUser(parseInt(postId), userId);

  res.json({
    success: true,
    data: {
      liked,
      postId: parseInt(postId),
      userId
    }
  });
});

// Get user's liked posts
export const getUserLikedPosts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const userId = req.user.id;

  // Validate pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const result = await Like.getLikedPostsByUserId(userId, {
    page: pageNum,
    limit: limitNum
  });

  res.json({
    success: true,
    data: result
  });
});

// Get most liked posts (trending)
export const getMostLikedPosts = asyncHandler(async (req, res, next) => {
  const { timeframe = 'week', limit = 10 } = req.query;

  const validTimeframes = ['day', 'week', 'month', 'all'];
  const selectedTimeframe = validTimeframes.includes(timeframe) ? timeframe : 'week';
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

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

// Get user's like statistics
export const getUserLikeStats = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const stats = await Like.getUserStats(userId);

  res.json({
    success: true,
    data: {
      stats
    }
  });
});

export default {
  toggleLike,
  getPostLikes,
  getLikeCount,
  checkUserLike,
  getUserLikedPosts,
  getMostLikedPosts,
  getUserLikeStats
}; 