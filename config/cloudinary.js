const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');  // ✅ ADD THIS LINE

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Verify connection
try {
  console.log('✅ Cloudinary configured successfully');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
} catch (error) {
  console.error('❌ Cloudinary configuration error:', error);
}

// Create storage instance for general uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'astroplanets',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  }
});

// Service storage for service images
const serviceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'astroplanets/services',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

const upload = multer({ storage: storage });
const uploadService = multer({ storage: serviceStorage });

module.exports = { cloudinary, upload, uploadService, storage, serviceStorage };