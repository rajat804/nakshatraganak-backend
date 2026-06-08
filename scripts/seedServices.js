const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

// Services data
const services = [
  {
    name: 'Kundli Analysis',
    description: 'Get a detailed analysis of your birth chart. Understand your life path, career prospects, marriage timing, and financial success through Vedic astrology. Our expert astrologers provide in-depth insights into planetary positions, dasha periods, and remedies for doshas.',
    shortDescription: 'Complete birth chart analysis for life guidance',
    price: 5100,
    originalPrice: 7100,
    discount: 28,
    duration: '60 mins',
    category: 'vedic-astrology',
    icon: '🔮',
    image: 'https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4f5?w=500',
    features: [
      'Detailed birth chart analysis',
      'Planetary positions and their effects',
      'Dasha predictions (Vimshottari)',
      'Career and financial guidance',
      'Marriage and relationship insights',
      'Remedies for doshas (Manglik, Kaal Sarp, etc.)',
      'Gemstone recommendations',
      'Personalized PDF report'
    ],
    isPopular: true,
    order: 1,
    isActive: true
  },
  {
    name: 'Numerology',
    description: 'Discover the power of numbers in your life. Get insights into your life path number, destiny number, and soul urge number. Learn how numbers influence your personality, career, relationships, and life events.',
    shortDescription: 'Unlock your destiny through numbers',
    price: 5100,
    originalPrice: 7100,
    discount: 28,
    duration: '45 mins',
    category: 'numerology',
    icon: '🔢',
    image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500',
    features: [
      'Life path number analysis',
      'Destiny number calculation',
      'Soul urge number insights',
      'Name correction suggestions',
      'Auspicious dates for events',
      'Compatibility analysis',
      'Personal year forecast',
      'Remedies for challenging numbers'
    ],
    isPopular: true,
    order: 2,
    isActive: true
  },
  {
    name: 'Face Reading',
    description: 'Ancient art of Samudrika Shastra. Your facial features reveal your personality, destiny, and inner nature. Our experts analyze your facial features to provide deep insights into your life path, career, relationships, and health.',
    shortDescription: 'Discover what your face reveals about you',
    price: 5100,
    originalPrice: 7100,
    discount: 28,
    duration: '45 mins',
    category: 'face-reading',
    icon: '👤',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500',
    features: [
      'Facial feature analysis',
      'Personality traits identification',
      'Career suitability assessment',
      'Relationship compatibility insights',
      'Health indicators',
      'Remedies for improvement',
      'Face mapping based on Samudrika Shastra',
      'Personalized guidance'
    ],
    isPopular: false,
    order: 3,
    isActive: true
  },
  {
    name: 'Vastu Shastra',
    description: 'Harmonize your living and working spaces with ancient Vastu principles. Attract prosperity, health, and happiness by aligning your environment with cosmic energies. Expert consultation for homes, offices, factories, and commercial spaces.',
    shortDescription: 'Balance your environment for success',
    price: 70000,
    originalPrice: 85000,
    discount: 18,
    duration: '2 hours',
    category: 'vastu',
    icon: '🏠',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500',
    features: [
      'Complete home Vastu analysis',
      'Office/workspace consultation',
      'Factory/commercial space guidance',
      'Remedies for Vastu doshas',
      'Room-by-room guidance',
      'Directional alignments',
      'Element balancing (Panchabhoota)',
      'Follow-up consultation (1 month)',
      'Written Vastu report with remedies'
    ],
    isPopular: false,
    order: 4,
    isActive: true
  },
  {
    name: 'Paranormal Healing',
    description: 'Restore harmony when unseen forces disturb your peace. Expert paranormal investigation and healing sessions using ancient Vedic rituals, mantra healing, and energy cleansing techniques to neutralize negative energies.',
    shortDescription: 'Clear negative energies from your space',
    price: 31000,
    originalPrice: 41000,
    discount: 24,
    duration: '90 mins',
    category: 'paranormal',
    icon: '👻',
    image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500',
    features: [
      'Paranormal investigation',
      'Energy cleansing rituals',
      'Protection mantras',
      'Space purification',
      'Negative entity removal',
      'Aura cleansing',
      'Personal protection guidance',
      'Follow-up support (15 days)',
      'Home blessing ceremony'
    ],
    isPopular: false,
    order: 5,
    isActive: true
  },
  {
    name: 'Spiritual Healing',
    description: 'Heal your aura and free yourself from negative influences. Comprehensive spiritual healing program combining meditation, mantra therapy, chakra balancing, and energy healing to restore inner peace and strengthen your divine connection.',
    shortDescription: 'Complete spiritual wellness program',
    price: 100000,
    originalPrice: 125000,
    discount: 20,
    duration: '1 month',
    category: 'spiritual-healing',
    icon: '🕉️',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500',
    features: [
      'Complete aura cleansing (7 sessions)',
      'Chakra balancing sessions (3 sessions)',
      'Personalized meditation guidance',
      'Mantra therapy',
      'Energy healing sessions (4 sessions)',
      'Past life regression (optional)',
      'Crystal healing',
      '3 months follow-up support',
      'Personalized spiritual toolkit',
      'Weekly progress tracking'
    ],
    isPopular: true,
    order: 6,
    isActive: true
  }
];

// Seed function
const seedServices = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing services
    const deletedCount = await Service.deleteMany({});
    console.log(`🗑️ Deleted ${deletedCount.deletedCount} existing services`);
    
    // Insert new services
    const insertedServices = await Service.insertMany(services);
    console.log(`✅ Inserted ${insertedServices.length} services`);
    
    // Display inserted services
    console.log('\n📋 Seeded Services:');
    console.log('='.repeat(50));
    insertedServices.forEach(service => {
      console.log(`🔮 ${service.name}`);
      console.log(`   Price: ₹${service.price} ${service.originalPrice ? `(Was ₹${service.originalPrice} - ${service.discount}% OFF)` : ''}`);
      console.log(`   Category: ${service.category}`);
      console.log(`   Duration: ${service.duration}`);
      console.log(`   Slug: ${service.slug}`);
      console.log('-'.repeat(40));
    });
    
    console.log('\n✨ Service seeding completed successfully!');
    console.log(`📊 Total services: ${insertedServices.length}`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error seeding services:', error);
    process.exit(1);
  }
};

// Run the seed function
seedServices();