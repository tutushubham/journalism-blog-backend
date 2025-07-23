import express from 'express';
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  getUserPosts,
  getTrendingPosts,
  togglePublish,
  getPostStats
} from '../controllers/postController.js';
import { verifyToken, optionalAuth, checkOwnership } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getPosts);
router.get('/trending', getTrendingPosts);
router.get('/:identifier', optionalAuth, getPost);

// Protected routes
router.use(verifyToken); // Apply auth middleware to all routes below

router.post('/', createPost);
router.get('/user/my-posts', getUserPosts);

// Routes requiring ownership verification
router.put('/:id', checkOwnership('post'), updatePost);
router.delete('/:id', checkOwnership('post'), deletePost);
router.patch('/:id/publish', checkOwnership('post'), togglePublish);
router.get('/:id/stats', checkOwnership('post'), getPostStats);

export default router; 