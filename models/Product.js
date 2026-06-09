const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    oldPrice: {
      type: Number,
      default: null,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    image: {
      type: String,
      required: [true, 'Main image is required'],
    },
    images: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      enum: [
        'Rudraksha',
        'Mala',
        'Bracelet',
        'Necklace',
        'Gemstone',
        'Spiritual Tools',
        'Rare Items',
        '108 Mala'
      ],
      required: true,
    },
    gemstone: {
      type: String,
      default: 'Rudraksha',
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      default: 10,
      min: [0, 'Stock cannot be negative'],
    },
    sold: {
      type: Number,
      default: 0,
    },
    discount: {
      type: String,
      default: null,
    },
    subtitle: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    designerNote: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '',
    },
    material: {
      type: String,
      default: 'Authentic Rudraksha',
    },
    weight: {
      type: String,
      default: '',
    },
    dimensions: {
      type: String,
      default: '',
    },
    origin: {
      type: String,
      default: 'Nepal / India',
    },
    category: {
      type: String,
      enum: ['Rudraksha', 'Mala', 'Bracelet', 'Necklace', 'Rare'],
      default: 'Rudraksha',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;