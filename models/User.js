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
  }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);