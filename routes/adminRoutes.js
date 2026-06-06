const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  createAdmin,
  getAllUsers,
  updateUserStatus,
  getDashboardStats,
  getCurrentAdmin,
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/adminAuth');

// Public admin login
router.post('/login', loginAdmin);

// ✅ TEMPORARY ROUTE - Sirf ek baar use karna hai (password reset ke liye)
router.post('/reset-password', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const Admin = require('../models/Admin');
    
    const email = 'admin@astroplanet.com';
    const newPassword = 'ashtro#admin@123';
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const admin = await Admin.findOneAndUpdate(
      { email: email },
      { password: hashedPassword },
      { new: true }
    );
    
    if (admin) {
      console.log('✅ Password reset successfully');
      res.json({ 
        success: true, 
        message: 'Password reset successfully',
        email: admin.email 
      });
    } else {
      res.status(404).json({ success: false, message: 'Admin not found' });
    }
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// Protected admin routes
router.get('/me', protectAdmin, getCurrentAdmin);
router.post('/create', protectAdmin, createAdmin);
router.get('/users', protectAdmin, getAllUsers);
router.put('/users/:id', protectAdmin, updateUserStatus);
router.get('/stats', protectAdmin, getDashboardStats);


module.exports = router;