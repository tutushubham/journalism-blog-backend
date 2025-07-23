import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { log, error } from './logger.js';
import { AppError } from '../middleware/errorHandler.js';

// Configure Cloudinary if credentials are provided
const configureCloudinary = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    log('Cloudinary configured successfully');
    return true;
  }
  log('Cloudinary credentials not found, using local storage');
  return false;
};

const useCloudinary = configureCloudinary();

// Ensure uploads directory exists
const ensureUploadsDir = () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    log('Created uploads directory');
  }
};

ensureUploadsDir();

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_IMAGE_TYPES?.split(',') || 
    ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400), false);
  }
};

// Multer configuration for local storage
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// Multer configuration for memory storage (for Cloudinary)
const memoryStorage = multer.memoryStorage();

// Create multer upload instance
const upload = multer({
  storage: useCloudinary ? memoryStorage : localStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter,
});

// Upload to Cloudinary
const uploadToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'blog-images',
        transformation: [
          { width: 1200, height: 630, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(file.buffer);
  });
};

// Process uploaded file
export const processUpload = async (file, req) => {
  try {
    if (useCloudinary) {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(file);
      log(`Image uploaded to Cloudinary: ${result.public_id}`);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        provider: 'cloudinary'
      };
    } else {
      // Use local file
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const fileUrl = `${baseUrl}/uploads/${file.filename}`;
      log(`Image saved locally: ${file.filename}`);
      return {
        url: fileUrl,
        filename: file.filename,
        provider: 'local'
      };
    }
  } catch (err) {
    error('Upload processing failed:', err.message);
    throw new AppError('Failed to process upload', 500);
  }
};

// Delete uploaded file
export const deleteUpload = async (imageData) => {
  try {
    if (imageData.provider === 'cloudinary' && imageData.publicId) {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(imageData.publicId);
      log(`Image deleted from Cloudinary: ${imageData.publicId}`);
    } else if (imageData.provider === 'local' && imageData.filename) {
      // Delete local file
      const filePath = path.join(process.cwd(), 'uploads', imageData.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        log(`Local image deleted: ${imageData.filename}`);
      }
    }
  } catch (err) {
    error('Failed to delete upload:', err.message);
    // Don't throw error for deletion failures
  }
};

// Middleware for single image upload
export const uploadSingle = (fieldName = 'image') => {
  return upload.single(fieldName);
};

// Middleware for multiple image uploads
export const uploadMultiple = (fieldName = 'images', maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

// Get file info from URL
export const getFileInfoFromUrl = (url) => {
  if (!url) return null;

  if (url.includes('cloudinary.com')) {
    // Extract public ID from Cloudinary URL
    const matches = url.match(/\/blog-images\/([^/.]+)/);
    return {
      provider: 'cloudinary',
      publicId: matches ? `blog-images/${matches[1]}` : null
    };
  } else if (url.includes('/uploads/')) {
    // Extract filename from local URL
    const filename = url.split('/uploads/').pop();
    return {
      provider: 'local',
      filename
    };
  }

  return null;
};

export default {
  uploadSingle,
  uploadMultiple,
  processUpload,
  deleteUpload,
  getFileInfoFromUrl,
  useCloudinary
}; 