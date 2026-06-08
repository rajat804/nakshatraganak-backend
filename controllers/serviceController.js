const Service = require('../models/Service');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getAllServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    
    res.json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, service });
  } catch (error) {
    console.error('Get service by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get service by slug
// @route   GET /api/services/slug/:slug
// @access  Public
const getServiceBySlug = async (req, res) => {
  try {
    const service = await Service.findOne({ slug: req.params.slug, isActive: true });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, service });
  } catch (error) {
    console.error('Get service by slug error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get services by category
// @route   GET /api/services/category/:category
// @access  Public
const getServicesByCategory = async (req, res) => {
  try {
    const services = await Service.find({ 
      category: req.params.category, 
      isActive: true 
    }).sort({ price: 1 });
    
    res.json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    console.error('Get services by category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get service stats
// @route   GET /api/services/stats
// @access  Public
const getServiceStats = async (req, res) => {
  try {
    const totalServices = await Service.countDocuments();
    const activeServices = await Service.countDocuments({ isActive: true });
    const popularServices = await Service.countDocuments({ isPopular: true });
    const categories = await Service.distinct('category');
    
    const priceStats = await Service.aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: null,
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        avgPrice: { $avg: '$price' }
      }}
    ]);
    
    res.json({
      success: true,
      stats: {
        totalServices,
        activeServices,
        popularServices,
        categories: categories.length,
        minPrice: priceStats[0]?.minPrice || 0,
        maxPrice: priceStats[0]?.maxPrice || 0,
        avgPrice: Math.round(priceStats[0]?.avgPrice || 0)
      }
    });
  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create service
// @route   POST /api/services
// @access  Private/Admin
const createService = async (req, res) => {
  try {
    const {
      name,
      description,
      shortDescription,
      price,
      originalPrice,
      discount,
      duration,
      category,
      icon,
      image,
      features,
      isPopular,
      order
    } = req.body;
    
    // Check if service exists
    const serviceExists = await Service.findOne({ name });
    if (serviceExists) {
      return res.status(400).json({ success: false, message: 'Service already exists' });
    }
    
    // Create slug from name
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    
    const service = await Service.create({
      name,
      slug,
      description,
      shortDescription,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      discount: discount || 0,
      duration,
      category,
      icon: icon || '🔮',
      image: image || '',
      features: features || [],
      isPopular: isPopular || false,
      order: order || 0,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private/Admin
const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    const {
      name,
      description,
      shortDescription,
      price,
      originalPrice,
      discount,
      duration,
      category,
      icon,
      image,
      features,
      isPopular,
      isActive,
      order
    } = req.body;
    
    // Update fields
    if (name) {
      service.name = name;
      service.slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    if (description) service.description = description;
    if (shortDescription) service.shortDescription = shortDescription;
    if (price) service.price = parseFloat(price);
    if (originalPrice) service.originalPrice = parseFloat(originalPrice);
    if (discount !== undefined) service.discount = discount;
    if (duration) service.duration = duration;
    if (category) service.category = category;
    if (icon) service.icon = icon;
    if (image) service.image = image;
    if (features) service.features = features;
    if (isPopular !== undefined) service.isPopular = isPopular;
    if (isActive !== undefined) service.isActive = isActive;
    if (order !== undefined) service.order = order;
    
    service.updatedAt = Date.now();
    await service.save();
    
    res.json({
      success: true,
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private/Admin
const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    await service.deleteOne();
    
    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Toggle service active status
// @route   PATCH /api/services/:id/toggle
// @access  Private/Admin
const toggleServiceStatus = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    service.isActive = !service.isActive;
    service.updatedAt = Date.now();
    await service.save();
    
    res.json({
      success: true,
      message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: service.isActive
    });
  } catch (error) {
    console.error('Toggle service status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


module.exports = {
  getAllServices,
  getServiceById,
  getServiceBySlug,
  getServicesByCategory,
  createService,
  updateService,
  deleteService,
  getServiceStats,
  toggleServiceStatus
};