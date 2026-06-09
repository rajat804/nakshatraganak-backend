const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { search, type, gemstone, inStock, minPrice, maxPrice } = req.query;
    
    let query = { isActive: true };
    
    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Filter by gemstone
    if (gemstone) {
      query.gemstone = gemstone;
    }
    
    // Filter by stock
    if (inStock === 'true') {
      query.inStock = true;
      query.stock = { $gt: 0 };
    }
    
    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin only)
const createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      oldPrice,
      image,
      images,
      type,
      gemstone,
      stock,
      discount,
      subtitle,
      description,
      designerNote,
      color,
      material,
      weight,
      dimensions,
      origin,
      category,
    } = req.body;
    
    const product = await Product.create({
      name,
      price,
      oldPrice: oldPrice || null,
      image,
      images: images || [image],
      type,
      gemstone: gemstone || 'Rudraksha',
      inStock: stock > 0,
      stock: stock || 10,
      sold: 0,
      discount: discount || null,
      subtitle: subtitle || '',
      description: description || '',
      designerNote: designerNote || '',
      color: color || '',
      material: material || 'Authentic Rudraksha',
      weight: weight || '',
      dimensions: dimensions || '',
      origin: origin || 'Nepal / India',
      category: category || type,
    });
    
    res.status(201).json({
      msg: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    const {
      name,
      price,
      oldPrice,
      image,
      images,
      type,
      gemstone,
      stock,
      sold,
      rating,
      discount,
      subtitle,
      description,
      designerNote,
      color,
      material,
      weight,
      dimensions,
      origin,
      category,
      isActive,
    } = req.body;
    
    // Update fields
    product.name = name ?? product.name;
product.price = price ?? product.price;
product.oldPrice = oldPrice !== undefined ? oldPrice : product.oldPrice;
product.image = image ?? product.image;
product.images = images ?? product.images;
product.type = type ?? product.type;
product.gemstone = gemstone ?? product.gemstone;

product.stock = stock ?? product.stock;
product.sold = sold ?? product.sold;
product.rating = rating ?? product.rating;

product.inStock = (stock ?? product.stock) > 0;

product.discount = discount ?? product.discount;
product.subtitle = subtitle ?? product.subtitle;
product.description = description ?? product.description;
product.designerNote = designerNote ?? product.designerNote;
product.color = color ?? product.color;
product.material = material ?? product.material;
product.weight = weight ?? product.weight;
product.dimensions = dimensions ?? product.dimensions;
product.origin = origin ?? product.origin;
product.category = category ?? product.category;

product.isActive = isActive ?? product.isActive;
    await product.save();
    
    res.json({
      msg: 'Product updated successfully',
      product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    await product.deleteOne();
    
    res.json({ msg: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// @desc    Get product stats for admin
// @route   GET /api/products/stats
// @access  Private (Admin only)
const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const lowStock = await Product.countDocuments({ stock: { $lt: 10 }, isActive: true });
    const outOfStock = await Product.countDocuments({ stock: 0, isActive: true });
    
    const topProducts = await Product.find({ isActive: true })
      .sort({ sold: -1 })
      .limit(5)
      .select('name price sold rating');
    
    res.json({
      totalProducts,
      activeProducts,
      lowStock,
      outOfStock,
      topProducts,
    });
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
};