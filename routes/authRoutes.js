const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/emailService');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Store OTPs (Use Redis in production)
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ✅ REGISTER - Fixed
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    console.log('📝 Register attempt:', { fullName, email });
    
    // Check if user exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({ 
      fullName, 
      email: email.toLowerCase(), 
      password 
    });
    
    const token = generateToken(user._id);
    
    console.log('✅ User registered:', user.email);
    
    res.status(201).json({ 
      success: true, 
      _id: user._id, 
      fullName: user.fullName, 
      email: user.email, 
      token 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ LOGIN - Fixed for all users
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', email);
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    console.log('✅ User found:', user.email);
    
    // Compare password
    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }
    
    const token = generateToken(user._id);
    
    console.log('✅ Login successful for:', email);
    
    res.json({ 
      success: true, 
      _id: user._id, 
      fullName: user.fullName, 
      email: user.email, 
      token 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, msg: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, msg: 'Please enter a valid email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, msg: 'No account found with this email address' });
    }

    const otp = generateOTP();
    
    otpStore.set(normalizedEmail, {
      otp: otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });

    console.log(`📧 OTP for ${normalizedEmail}: ${otp}`);

    const emailSent = await sendOTPEmail(normalizedEmail, otp, user.fullName || 'User');
    
    if (!emailSent.success) {
      otpStore.delete(normalizedEmail);
      return res.status(500).json({ success: false, msg: 'Failed to send OTP. Please try again.' });
    }

    res.json({ success: true, msg: `OTP sent to ${email}. Please check your inbox.` });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, msg: 'Server error. Please try again.' });
  }
});

// ✅ Reset Password - Fixed for all users
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ success: false, msg: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, msg: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const storedOTP = otpStore.get(normalizedEmail);
    
    if (!storedOTP) {
      return res.status(400).json({ success: false, msg: 'No OTP found. Please request a new one.' });
    }

    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, msg: 'OTP has expired. Please request a new OTP.' });
    }

    if (storedOTP.otp !== otp) {
      storedOTP.attempts += 1;
      return res.status(400).json({ success: false, msg: `Invalid OTP. ${5 - storedOTP.attempts} attempts left.` });
    }

    // ✅ FIXED: Find and update user password
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    // Directly set password (pre-save hook will hash it)
    user.password = password;
    await user.save();
    
    console.log(`✅ Password updated for ${normalizedEmail}`);

    // Verify password was updated correctly
    const verifyUser = await User.findOne({ email: normalizedEmail });
    const testMatch = await verifyUser.comparePassword(password);
    console.log(`Verification - New password works: ${testMatch}`);

    otpStore.delete(normalizedEmail);

    res.json({ success: true, msg: 'Password reset successful! Please login with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, msg: 'Server error: ' + error.message });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, msg: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, msg: 'No account found' });
    }

    const otp = generateOTP();
    
    otpStore.set(normalizedEmail, {
      otp: otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });

    console.log(`📧 Resend OTP for ${normalizedEmail}: ${otp}`);

    const emailSent = await sendOTPEmail(normalizedEmail, otp, user.fullName || 'User');
    
    if (!emailSent.success) {
      return res.status(500).json({ success: false, msg: 'Failed to send OTP' });
    }

    res.json({ success: true, msg: 'New OTP sent successfully' });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ✅ Debug route to fix user password manually (Remove in production)
router.post('/fix-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, msg: 'Email and new password required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }
    
    // Set new password
    user.password = newPassword;
    await user.save();
    
    // Verify
    const verifyUser = await User.findOne({ email: email.toLowerCase() });
    const isMatch = await verifyUser.comparePassword(newPassword);
    
    res.json({ 
      success: true, 
      msg: 'Password fixed successfully',
      verified: isMatch 
    });
    
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

module.exports = router;