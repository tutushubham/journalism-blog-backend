import { processUpload, deleteUpload, getFileInfoFromUrl } from '../utils/upload.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { log } from '../utils/logger.js';

// Upload single image
export const uploadImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No image file provided', 400));
  }

  const result = await processUpload(req.file, req);

  log(`Image uploaded by user ${req.user.email}: ${result.url}`);

  res.json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      url: result.url,
      provider: result.provider
    }
  });
});

// Upload multiple images
export const uploadImages = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('No image files provided', 400));
  }

  const uploadPromises = req.files.map(file => processUpload(file, req));
  const results = await Promise.all(uploadPromises);

  log(`${results.length} images uploaded by user ${req.user.email}`);

  res.json({
    success: true,
    message: `${results.length} images uploaded successfully`,
    data: {
      images: results.map(result => ({
        url: result.url,
        provider: result.provider
      }))
    }
  });
});

// Delete image
export const deleteImage = asyncHandler(async (req, res, next) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return next(new AppError('Image URL is required', 400));
  }

  const fileInfo = getFileInfoFromUrl(imageUrl);
  if (!fileInfo) {
    return next(new AppError('Invalid image URL', 400));
  }

  await deleteUpload(fileInfo);

  log(`Image deleted by user ${req.user.email}: ${imageUrl}`);

  res.json({
    success: true,
    message: 'Image deleted successfully'
  });
});

// Get upload configuration
export const getUploadConfig = asyncHandler(async (req, res, next) => {
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
  const allowedTypes = process.env.ALLOWED_IMAGE_TYPES?.split(',') || 
    ['image/jpeg', 'image/png', 'image/webp'];

  res.json({
    success: true,
    data: {
      maxFileSize,
      maxFileSizeMB: Math.round(maxFileSize / (1024 * 1024)),
      allowedTypes,
      provider: process.env.CLOUDINARY_CLOUD_NAME ? 'cloudinary' : 'local'
    }
  });
});

export default {
  uploadImage,
  uploadImages,
  deleteImage,
  getUploadConfig
}; 