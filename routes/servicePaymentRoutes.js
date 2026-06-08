const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const Service = require('../models/Service');
const User = require('../models/User');
const { sendUserBookingEmail, sendAdminNotificationEmail } = require('../config/email');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @route   POST /api/service-payment/create-order
router.post('/create-order', protect, async (req, res) => {
  try {
    const { serviceId, amount = 0, currency = 'INR' } = req.body;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    const timestamp = Date.now().toString().slice(-8);
    const receipt = `serv_${serviceId.slice(-6)}_${timestamp}`;
    
    const options = {
      amount: (amount || service.price) * 100,
      currency: currency,
      receipt: receipt,
      payment_capture: 1,
      notes: {
        serviceId: serviceId,
        serviceName: service.name,
        userId: req.user._id.toString()
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      service: {
        id: service._id,
        name: service.name,
        price: service.price
      }
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.error?.description || 'Failed to create order'
    });
  }
});

// @route   POST /api/service-payment/verify-payment
// @desc    Verify payment, create booking with all user details
// @access  Private
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      serviceId,
      bookingDate,
      bookingTime,
      notes,
      name,
      email,
      phone
    } = req.body;
    
    console.log('📝 Booking Details Received:', {
      name, email, phone, bookingDate, bookingTime, notes, serviceId
    });
    
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (isAuthentic) {
      // Get service details
      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }
      
      // Get user
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // ✅ Create booking with ALL user details
      const booking = {
        serviceId: service._id,
        serviceName: service.name,
        servicePrice: service.price,
        bookingDate: bookingDate || new Date(),
        bookingTime: bookingTime || 'Flexible',
        name: name || user.fullName,      // ✅ Save name
        email: email || user.email,       // ✅ Save email
        phone: phone || '',               // ✅ Save phone
        notes: notes || '',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'confirmed',
        bookedAt: new Date()
      };
      
      // Add booking to user's bookings array
      if (!user.bookings) {
        user.bookings = [];
      }
      user.bookings.push(booking);
      
      // ✅ Also update user's profile if new information is provided
      if (name && !user.fullName) {
        user.fullName = name;
      }
      if (email && !user.email) {
        user.email = email;
      }
      if (phone && !user.phone) {
        user.phone = phone;
      }
      
      await user.save();
      
      console.log('✅ Booking saved with details:', {
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        service: booking.serviceName,
        date: booking.bookingDate
      });
      
      // Prepare email details
      const bookingDetails = {
        serviceName: service.name,
        servicePrice: service.price,
        bookingDate: bookingDate,
        bookingTime: bookingTime,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        notes: notes || '',
        phone: phone || '',
        name: name || user.fullName,
        email: email || user.email
      };
      
      const userDetails = {
        name: name || user.fullName,
        email: email || user.email,
        phone: phone || ''
      };
      
      // Send emails
      await sendUserBookingEmail(userDetails.email, userDetails.name, bookingDetails);
      await sendAdminNotificationEmail(bookingDetails, userDetails);
      
      res.json({
        success: true,
        message: 'Payment verified and booking confirmed',
        booking: booking
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// @route   GET /api/service-payment/my-bookings
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      bookings: user.bookings || []
    });
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;