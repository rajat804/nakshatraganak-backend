const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ success: false, message: 'User already exists' });

    const user = await User.create({ fullName, email, password });
    res.status(201).json({ success: true, _id: user._id, fullName: user.fullName, email: user.email, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    res.json({ success: true, _id: user._id, fullName: user.fullName, email: user.email, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// Forgot password (simple version)
router.post('/forgot-password', async (req, res) => {
  res.json({ success: true, message: 'OTP sent to email' });
});

// Reset password
router.post('/reset-password', async (req, res) => {
  res.json({ success: true, message: 'Password reset successful' });
});

module.exports = router;