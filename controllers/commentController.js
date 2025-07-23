import { Comment } from '../models/Comment.js';
import { Post } from '../models/Post.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { log } from '../utils/logger.js';

// Input validation helpers
const validateComment = (text) => {
  return text && text.trim().length >= 1 && text.trim().length <= 1000;
};

// Create new comment
export const createComment = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const { content, text } = req.body;
  const commentText = content || text; // Accept both content and text for compatibility

  // Validate input
  if (!validateComment(commentText)) {
    return next(new AppError('Comment must be between 1 and 1000 characters', 400));
  }

  // Check if post exists and is published
  const post = await Post.findById(parseInt(postId));
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  if (!post.published) {
    return next(new AppError('Cannot comment on unpublished post', 403));
  }

  // Create comment
  const comment = await Comment.create({
    postId: parseInt(postId),
    userId: req.user.id,
    text: commentText.trim()
  });

  // Get comment with user details
  const newComment = await Comment.findById(comment.id);

  log(`New comment created on post ${postId} by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Comment created successfully',
    data: {
      comment: newComment
    }
  });
});

// Get comments for a post
export const getComments = asyncHandler(async (req, res, next) => {
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

  const result = await Comment.findByPostId(parseInt(postId), {
    page: pageNum,
    limit: limitNum
  });

  res.json({
    success: true,
    data: result
  });
});

// Get comment by ID
export const getComment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const comment = await Comment.findById(parseInt(id));
  if (!comment) {
    return next(new AppError('Comment not found', 404));
  }

  res.json({
    success: true,
    data: {
      comment
    }
  });
});

// Update comment
export const updateComment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { content, text } = req.body;
  const commentText = content || text; // Accept both content and text for compatibility

  // Validate input
  if (!validateComment(commentText)) {
    return next(new AppError('Comment must be between 1 and 1000 characters', 400));
  }

  // Update comment
  const comment = await Comment.update(parseInt(id), {
    text: commentText.trim()
  });

  log(`Comment updated: ID ${id} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Comment updated successfully',
    data: {
      comment
    }
  });
});

// Delete comment
export const deleteComment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  await Comment.delete(parseInt(id));

  log(`Comment deleted: ID ${id} by ${req.user.email}`);

  res.json({
    success: true,
    message: 'Comment deleted successfully'
  });
});

// Get user's comments
export const getUserComments = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const userId = req.user.id;

  // Validate pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const result = await Comment.findByUserId(userId, {
    page: pageNum,
    limit: limitNum
  });

  res.json({
    success: true,
    data: result
  });
});

// Get recent comments (public endpoint)
export const getRecentComments = asyncHandler(async (req, res, next) => {
  const { limit = 5, page = 1 } = req.query;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const pageNum = Math.max(1, parseInt(page));

  const result = await Comment.findRecent({ 
    limit: limitNum, 
    page: pageNum 
  });

  res.json({
    success: true,
    data: {
      comments: result.comments || result,
      pagination: result.pagination || {
        page: pageNum,
        limit: limitNum,
        total: (result.comments || result).length,
        pages: 1
      }
    }
  });
});

export default {
  createComment,
  getComments,
  getComment,
  updateComment,
  deleteComment,
  getUserComments,
  getRecentComments
}; 