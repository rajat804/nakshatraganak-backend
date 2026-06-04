const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const API_BASE = 'https://json.astrologyapi.com/v1';   // Correct JSON Base

const ASTRO_USER_ID = process.env.ASTRO_USER_ID;
const ASTRO_API_KEY = process.env.ASTRO_API_KEY;

console.log('=================================');
console.log('AstrologyAPI Configuration');
console.log('User ID  :', ASTRO_USER_ID ? '✅ Set' : '❌ Missing');
console.log('API Key  :', ASTRO_API_KEY ? '✅ Set' : '❌ Missing');
console.log('Base URL :', API_BASE);
console.log('=================================');

const getAuthHeader = () => {
  if (!ASTRO_USER_ID || !ASTRO_API_KEY) return null;
  const credentials = Buffer.from(`${ASTRO_USER_ID}:${ASTRO_API_KEY}`).toString('base64');
  return `Basic ${credentials}`;
};

// ================== GENERATE KUNDLI & PANCHANG ==================
router.post('/generate', protect, async (req, res) => {
  try {
    const { date, month, year, hour, minute, latitude, longitude, timezone = 5.5 } = req.body;

    if (!date || !month || !year || !hour || !minute || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const requestBody = {
      day: parseInt(date),
      month: parseInt(month),
      year: parseInt(year),
      hour: parseInt(hour),
      min: parseInt(minute),
      lat: parseFloat(latitude),
      lon: parseFloat(longitude),
      tzone: parseFloat(timezone)
    };

    const authHeader = getAuthHeader();

    if (!authHeader) {
      return res.status(500).json({
        success: false,
        message: 'Astrology API credentials missing in .env'
      });
    }

    // Correct Endpoints
    const [kundliResponse, panchangResponse] = await Promise.all([
      axios.post(`${API_BASE}/astro_details`, requestBody, {   // Changed from /kundli
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        timeout: 25000
      }),
      axios.post(`${API_BASE}/basic_panchang`, requestBody, {  // Changed from /panchang
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        timeout: 25000
      })
    ]);

    return res.json({
      success: true,
      kundli: kundliResponse.data,
      panchang: panchangResponse.data
    });

  } catch (apiError) {
    console.error("=== ASTROLOGY API ERROR ===");
    console.error("Status:", apiError.response?.status);
    console.error("Response:", apiError.response?.data);
    console.error("Message:", apiError.message);

    return res.status(502).json({
      success: false,
      message: apiError.response?.data?.error_msg || 'Failed to connect to Astrology API',
      details: apiError.response?.data
    });
  }
});

// Save, Saved, Delete routes (keep as they are)
router.post('/save', protect, async (req, res) => {
  try {
    const { birthDetails, kundliData, panchangData } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.savedCharts = user.savedCharts || [];
    user.savedCharts.push({ birthDetails, kundliData, panchangData, createdAt: new Date() });
    await user.save();

    res.json({ success: true, message: 'Chart saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/saved', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, charts: user.savedCharts || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/saved/:chartId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.savedCharts = user.savedCharts.filter(c => c._id.toString() !== req.params.chartId);
    await user.save();
    res.json({ success: true, message: 'Chart deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;