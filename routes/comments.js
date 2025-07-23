import express from 'express';
import {
  createComment,
  getComments,
  getComment,
  updateComment,
  deleteComment,
  getUserComments,
  getRecentComments
} from '../controllers/commentController.js';
import { verifyToken, checkOwnership } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/recent', getRecentComments);
router.get('/post/:postId', getComments);
router.get('/:id', getComment);

// Protected routes
router.use(verifyToken); // Apply auth middleware to all routes below

router.post('/post/:postId', createComment);
router.get('/user/my-comments', getUserComments);

// Routes requiring ownership verification
router.put('/:id', checkOwnership('comment'), updateComment);
router.delete('/:id', checkOwnership('comment'), deleteComment);

export default router; 