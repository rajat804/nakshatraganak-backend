const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  resetOTP: { type: String },
  resetOTPExpire: { type: Date },
  isActive: { type: Boolean, default: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  savedCharts: [{
    birthDetails: {
      date: Number, month: Number, year: Number,
      hour: Number, minute: Number, latitude: Number, longitude: Number, timezone: Number
    },
    kundliData: Object,
    panchangData: Object,
    createdAt: { type: Date, default: Date.now }
  }],
  bookings: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    serviceName: String,
    servicePrice: Number,
    bookingDate: Date,
    bookingTime: String,
     name: { type: String, default: '' },   
  email: { type: String, default: '' },     
  phone: { type: String, default: '' },     
    notes: String,
    paymentId: String,
    orderId: String,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending'
    },
    bookedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// ✅ FIXED: Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ FIXED: Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!enteredPassword || !this.password) {
    console.log('Missing password data');
    return false;
  }
  const isMatch = await bcrypt.compare(enteredPassword, this.password);
  console.log(`Password comparison result: ${isMatch}`);
  return isMatch;
};

module.exports = mongoose.model('User', userSchema);