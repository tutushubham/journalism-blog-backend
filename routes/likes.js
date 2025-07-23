import express from 'express';
import {
  toggleLike,
  getPostLikes,
  getLikeCount,
  checkUserLike,
  getUserLikedPosts,
  getMostLikedPosts,
  getUserLikeStats
} from '../controllers/likeController.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/post/:postId/count', getLikeCount);
router.get('/post/:postId/users', getPostLikes);
router.get('/trending', getMostLikedPosts);

// Routes with optional authentication
router.get('/post/:postId/check', optionalAuth, checkUserLike);

// Protected routes
router.use(verifyToken); // Apply auth middleware to all routes below

router.post('/post/:postId/toggle', toggleLike);
router.get('/user/liked-posts', getUserLikedPosts);
router.get('/user/stats', getUserLikeStats);

export default router; 