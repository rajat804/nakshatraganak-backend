const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { protectAdmin } = require('../middleware/adminAuth');
const {
  getAllServices,
  getServiceById,
  getServiceBySlug,
  getServicesByCategory,
  createService,
  updateService,
  deleteService,
  getServiceStats,
  toggleServiceStatus,
} = require('../controllers/serviceController');

// ==================== PUBLIC ROUTES ====================
router.get('/', getAllServices);
router.get('/stats', getServiceStats);
router.get('/category/:category', getServicesByCategory);
router.get('/slug/:slug', getServiceBySlug);  // ✅ Make sure this is BEFORE /:id
router.get('/:id', getServiceById);  // This should be AFTER slug route

// ==================== ADMIN ROUTES ====================
router.post('/', protectAdmin, createService);
router.put('/:id', protectAdmin, updateService);
router.delete('/:id', protectAdmin, deleteService);
router.patch('/:id/toggle', protectAdmin, toggleServiceStatus);

module.exports = router;