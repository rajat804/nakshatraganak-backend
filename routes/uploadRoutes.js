const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminAuth');
const { 
  uploadSingleImage, 
  uploadMultipleImages, 
  deleteImage,
  uploadServiceImage,
  upload,
  uploadService
} = require('../controllers/uploadController');

// General image uploads (for products, blogs, etc.)
router.post('/single', protectAdmin, upload.single('image'), uploadSingleImage);
router.post('/multiple', protectAdmin, upload.array('images', 10), uploadMultipleImages);
router.delete('/image', protectAdmin, deleteImage);

// Service image upload
router.post('/service-image', protectAdmin, uploadService.single('image'), uploadServiceImage);
router.delete('/service-image', protectAdmin, deleteImage);

module.exports = router;