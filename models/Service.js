const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required']
  },
  originalPrice: {
    type: Number,
    default: null
  },
  discount: {
    type: Number,
    default: 0
  },
  duration: {
    type: String,
    enum: ['30 mins', '45 mins', '60 mins', '90 mins', '2 hours', '3 hours', '1 week', '2 weeks', '1 month'],
    default: '60 mins'
  },
  category: {
    type: String,
    enum: ['vedic-astrology', 'numerology', 'face-reading', 'vastu', 'paranormal', 'spiritual-healing'],
    required: true
  },
  icon: {
    type: String,
    default: '🔮'
  },
  image: {
    type: String,
    default: ''
  },
  features: [{
    type: String
  }],
  isPopular: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Update slug before save
serviceSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  }
  next();
});

module.exports = mongoose.model('Service', serviceSchema);