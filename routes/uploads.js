import express from 'express';
import {
  uploadImage,
  uploadImages,
  deleteImage,
  getUploadConfig
} from '../controllers/uploadController.js';
import { uploadSingle, uploadMultiple } from '../utils/upload.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public route for upload configuration
router.get('/config', getUploadConfig);

// Protected routes
router.use(verifyToken); // Apply auth middleware to all routes below

router.post('/image', uploadSingle('image'), uploadImage);
router.post('/images', uploadMultiple('images', 5), uploadImages);
router.delete('/image', deleteImage);

export default router; 