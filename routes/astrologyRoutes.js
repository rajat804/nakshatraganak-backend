const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const pdf = require('html-pdf');

// ✅ Correct API Base URL
const API_BASE = 'https://json.astrologyapi.com/v1';
const ACCESS_TOKEN = process.env.ASTRO_ACCESS_TOKEN;

console.log('=================================');
console.log('🔥 AstrologyAPI Configuration');
console.log('Access Token:', ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
console.log('Base URL :', API_BASE);
console.log('=================================');

const getHeaders = () => {
  if (!ACCESS_TOKEN) return null;
  return {
    'x-astrologyapi-key': ACCESS_TOKEN,
    'Content-Type': 'application/json'
  };
};

// Helper function to get zodiac from degree
const getZodiacFromDegree = (degree) => {
  if (!degree && degree !== 0) return 'N/A';
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return signs[Math.floor(degree / 30) % 12];
};

// Helper function to get lord from sign
const getLordFromSign = (sign) => {
  const lordMap = {
    'Aries': 'Mars', 'Taurus': 'Venus', 'Gemini': 'Mercury',
    'Cancer': 'Moon', 'Leo': 'Sun', 'Virgo': 'Mercury',
    'Libra': 'Venus', 'Scorpio': 'Mars', 'Sagittarius': 'Jupiter',
    'Capricorn': 'Saturn', 'Aquarius': 'Saturn', 'Pisces': 'Jupiter'
  };
  return lordMap[sign] || 'N/A';
};

// Calculate houses from ascendant
const getHousesFromAscendant = (ascendant) => {
  const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  let startIndex = zodiacSigns.findIndex(s => s.toLowerCase() === ascendant.toLowerCase());
  if (startIndex === -1) startIndex = 0;
  
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const signIndex = (startIndex + i) % 12;
    houses.push({
      number: i + 1,
      sign: zodiacSigns[signIndex],
      degree: `${i * 30}° - ${(i + 1) * 30}°`,
      lord: getLordFromSign(zodiacSigns[signIndex])
    });
  }
  return houses;
};

// Calculate planets positions based on date (approximate for demo)
const getPlanetsFromDate = (year, month, date) => {
  const planets = {};
  const planetList = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  const planetNames = { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' };
  const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  // Calculate approximate day of year
  const dayOfYear = Math.floor((new Date(year, month - 1, date) - new Date(year, 0, 0)) / 86400000);
  
  // Approximate planet longitudes
  const longitudes = {
    sun: (dayOfYear * 0.9856) % 360,
    moon: (dayOfYear * 13.176) % 360,
    mars: ((dayOfYear * 0.524) % 360) + 120,
    mercury: ((dayOfYear * 1.234) % 360) + 80,
    jupiter: ((dayOfYear * 0.083) % 360) + 240,
    venus: ((dayOfYear * 1.602) % 360) + 45,
    saturn: ((dayOfYear * 0.033) % 360) + 180,
    rahu: ((dayOfYear * 0.052) % 360) + 300,
    ketu: ((dayOfYear * 0.052) % 360) + 120
  };
  
  for (const planet of planetList) {
    const longitude = longitudes[planet];
    const signIndex = Math.floor(longitude / 30) % 12;
    planets[planet] = {
      name: planetNames[planet],
      sign: zodiacSigns[signIndex],
      degree: Math.floor(longitude),
      house: signIndex + 1,
      retrograde: planet === 'saturn' || planet === 'rahu' || planet === 'ketu'
    };
  }
  
  return planets;
};

// Calculate Dasha based on Moon's nakshatra
const getDashaFromNakshatra = (nakshatra) => {
  const nakshatraDashaMap = {
    'Ashwini': 'Ketu', 'Bharani': 'Venus', 'Krittika': 'Sun',
    'Rohini': 'Moon', 'Mrigashira': 'Mars', 'Ardra': 'Rahu',
    'Punarvasu': 'Jupiter', 'Pushya': 'Saturn', 'Ashlesha': 'Mercury',
    'Magha': 'Ketu', 'Purva Phalguni': 'Venus', 'Uttara Phalguni': 'Sun',
    'Hasta': 'Moon', 'Chitra': 'Mars', 'Swati': 'Rahu',
    'Vishakha': 'Jupiter', 'Anuradha': 'Saturn', 'Jyeshtha': 'Mercury',
    'Mula': 'Ketu', 'Purva Ashadha': 'Venus', 'Uttara Ashadha': 'Sun',
    'Shravana': 'Moon', 'Dhanishtha': 'Mars', 'Shatabhisha': 'Rahu',
    'Purva Bhadrapada': 'Jupiter', 'Uttara Bhadrapada': 'Saturn', 'Revati': 'Mercury'
  };
  
  const dashaOrder = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const dashaYears = [7, 20, 6, 10, 7, 18, 16, 19, 17];
  
  const mahaDasha = nakshatraDashaMap[nakshatra] || 'Venus';
  const currentIndex = dashaOrder.indexOf(mahaDasha);
  const antarDasha = dashaOrder[(currentIndex + 1) % 9] || 'Sun';
  
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + dashaYears[currentIndex]);
  
  return {
    maha_dasha: mahaDasha,
    antar_dasha: antarDasha,
    end_date: endDate.toISOString().split('T')[0]
  };
};

// ================== GENERATE KUNDLI & PANCHANG ==================
router.post('/generate', protect, async (req, res) => {
  try {
    const { date, month, year, hour, minute, latitude, longitude, timezone = 5.5 } = req.body;

    console.log('📥 Received:', { date, month, year, hour, minute, latitude, longitude });

    // Validation
    if (!date || !month || !year || hour === undefined || minute === undefined || !latitude || !longitude) {
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
      tzone: parseFloat(timezone),
      ayanamsha: 'lahiri'
    };

    console.log('📤 Request to AstrologyAPI:', JSON.stringify(requestBody, null, 2));

    const headers = getHeaders();

    if (!headers) {
      return res.status(401).json({
        success: false,
        message: 'Astrology API Access Token missing in .env file'
      });
    }

    // ✅ Call both APIs
    const [kundliResponse, panchangResponse] = await Promise.all([
      axios.post(`${API_BASE}/astro_details`, requestBody, {
        headers: headers,
        timeout: 30000
      }),
      axios.post(`${API_BASE}/basic_panchang`, requestBody, {
        headers: headers,
        timeout: 30000
      })
    ]);

    console.log('✅ Both APIs responded successfully');
    
    const kundliRaw = kundliResponse.data;
    const panchangRaw = panchangResponse.data;
    
    console.log('📊 Kundli Response:', JSON.stringify(kundliRaw, null, 2));

    // ✅ Extract data from response
    const ascendant = kundliRaw.ascendant || 'N/A';
    const ascendantLord = kundliRaw.ascendant_lord || getLordFromSign(ascendant);
    const sign = kundliRaw.sign || 'N/A';
    const nakshatra = kundliRaw.Naksahtra || kundliRaw.nakshatra || 'N/A';
    const nakshatraLord = kundliRaw.NaksahtraLord || 'N/A';
    const nakshatraPada = kundliRaw.Charan || 'N/A';
    
    // ✅ Generate houses from ascendant
    const houses = getHousesFromAscendant(ascendant);
    
    // ✅ Generate planets from date
    const planets = getPlanetsFromDate(year, month, date);
    
    // ✅ Calculate Dasha from nakshatra
    const dasha = getDashaFromNakshatra(nakshatra);
    
    // ✅ Vedic details from response
    const yoga = kundliRaw.Yog || 'N/A';
    const tithi = kundliRaw.Tithi || 'N/A';
    const karana = kundliRaw.Karan || 'N/A';
    const gan = kundliRaw.Gan || 'N/A';
    const nadi = kundliRaw.Nadi || 'N/A';
    const varna = kundliRaw.Varna || 'N/A';
    const vashya = kundliRaw.Vashya || 'N/A';
    const yoni = kundliRaw.Yoni || 'N/A';
    const signLord = kundliRaw.SignLord || getLordFromSign(sign);
    const tatva = kundliRaw.tatva || 'N/A';
    const paya = kundliRaw.paya || 'N/A';
    const nameAlphabet = kundliRaw.name_alphabet || 'N/A';
    const manglik = 'No'; // Calculate based on Mars position if needed
    
    // ✅ Panchang data
    const sunrise = panchangRaw.sunrise || 'N/A';
    const sunset = panchangRaw.sunset || 'N/A';
    const moonrise = panchangRaw.moonrise || 'N/A';
    const panchangTithi = panchangRaw.tithi || 'N/A';
    const panchangNakshatra = panchangRaw.nakshatra || 'N/A';
    const panchangYoga = panchangRaw.yog || 'N/A';
    const panchangKarana = panchangRaw.karan || 'N/A';
    
    // ✅ Merge final response
    const mergedKundli = {
      ascendant_sign: ascendant,
      ascendant_lord: ascendantLord,
      sign: sign,
      rashi: sign,
      sign_lord: signLord,
      nakshatra: nakshatra,
      nakshatra_lord: nakshatraLord,
      nakshatra_pada: nakshatraPada,
      manglik: manglik,
      yoga: yoga,
      tithi: tithi,
      karana: karana,
      gan: gan,
      nadi: nadi,
      varna: varna,
      vashya: vashya,
      yoni: yoni,
      tatva: tatva,
      paya: paya,
      name_alphabet: nameAlphabet,
      planets: planets,
      houses: houses,
      dasha: dasha
    };
    
    const mergedPanchang = {
      sunrise: sunrise,
      sunset: sunset,
      moonrise: moonrise,
      tithi: panchangTithi,
      nakshatra: panchangNakshatra,
      yog: panchangYoga,
      karan: panchangKarana,
      paksha: panchangTithi?.split('-')[0] || 'N/A',
      ritu: 'N/A',
      ayana: 'N/A'
    };

    console.log('✅ Final Kundli - Houses:', mergedKundli.houses.length);
    console.log('✅ Final Kundli - Dasha:', mergedKundli.dasha);
    console.log('✅ Final Kundli - Planets:', Object.keys(mergedKundli.planets).length);

    return res.json({
      success: true,
      kundli: mergedKundli,
      panchang: mergedPanchang
    });

  } catch (apiError) {
    console.error("=== ASTROLOGY API ERROR ===");
    console.error("Status:", apiError.response?.status);
    console.error("Response:", JSON.stringify(apiError.response?.data, null, 2));
    console.error("Message:", apiError.message);
    
    if (apiError.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Access Token. Please check your Access Token.'
      });
    }

    return res.status(502).json({
      success: false,
      message: apiError.response?.data?.message || 'Failed to connect to Astrology API',
      details: apiError.response?.data
    });
  }
});

// ✅ Ek baar chalao, phir hata dena - Sirf old charts ko fix karne ke liye
router.post('/fix-old-charts', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let fixed = 0;
    
    for (let i = 0; i < user.savedCharts.length; i++) {
      if (!user.savedCharts[i].isPaid) {
        user.savedCharts[i].isPaid = true;
        fixed++;
      }
    }
    
    await user.save();
    res.json({ success: true, message: `Fixed ${fixed} charts`, total: user.savedCharts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================== DOWNLOAD PDF WITH PDFKIT ==================
router.post('/download-pdf', async (req, res) => {
  try {
    const { kundliData, panchangData, userDetails } = req.body;
    
    console.log('📥 Generating PDF for:', userDetails?.name || 'User');
    
    
    const getValue = (obj, keys, defaultValue = 'N/A') => {
      if (!obj) return defaultValue;
      const keyArray = Array.isArray(keys) ? keys : [keys];
      for (const key of keyArray) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          return obj[key];
        }
      }
      return defaultValue;
    };
    
    // Get all values
    const ascendant = getValue(kundliData, ['ascendant_sign', 'lagna', 'ascendant', 'sign'], 'N/A');
    const ascendantLord = getValue(kundliData, ['ascendant_lord', 'lagna_lord'], 'N/A');
    const rashi = getValue(kundliData, ['sign', 'rashi', 'moon_sign'], 'N/A');
    const nakshatra = getValue(kundliData, ['nakshatra', 'Naksahtra', 'nakshstra', 'star'], 'N/A');
    const nakshatraLord = getValue(kundliData, ['nakshatra_lord', 'lord'], 'N/A');
    const nakshatraPada = getValue(kundliData, ['pada', 'Charan', 'charan'], 'N/A');
    const manglik = getValue(kundliData, ['manglik', 'Manglik', 'is_manglik'], 'Non-Manglik');
    const isManglik = (manglik === 'Yes' || manglik === 'Manglik');
    
    // Vedic Details
    const yoga = getValue(kundliData, ['yoga', 'yog', 'Yog'], 'N/A');
    const tithi = getValue(kundliData, ['tithi', 'Tithi'], 'N/A');
    const karana = getValue(kundliData, ['karana', 'Karan'], 'N/A');
    const gan = getValue(kundliData, ['gan', 'Gan'], 'N/A');
    const nadi = getValue(kundliData, ['nadi', 'Nadi'], 'N/A');
    const varna = getValue(kundliData, ['varna', 'Varna'], 'N/A');
    const vashya = getValue(kundliData, ['vashya', 'Vashya'], 'N/A');
    const yoni = getValue(kundliData, ['yoni', 'Yoni'], 'N/A');
    const signLord = getValue(kundliData, ['sign_lord', 'SignLord'], 'N/A');
    const tatva = getValue(kundliData, ['tatva', 'element'], 'N/A');
    const paya = getValue(kundliData, ['paya'], 'N/A');
    const nameAlphabet = getValue(kundliData, ['name_alphabet'], 'N/A');
    
    // Dasha
    const mahaDasha = getValue(kundliData, ['dasha.maha_dasha', 'current_dasha.maha_dasha'], 'N/A');
    const antarDasha = getValue(kundliData, ['dasha.antar_dasha', 'current_dasha.antar_dasha'], 'N/A');
    const dashaEndDate = getValue(kundliData, ['dasha.end_date', 'current_dasha.end_date'], 'N/A');
    
    // Panchang
    const sunrise = getValue(panchangData, ['sunrise', 'Sunrise'], 'N/A');
    const sunset = getValue(panchangData, ['sunset', 'Sunset'], 'N/A');
    const moonrise = getValue(panchangData, ['moonrise', 'Moonrise'], 'N/A');
    const moonset = getValue(panchangData, ['moonset', 'Moonset'], 'N/A');
    const panchangTithi = getValue(panchangData, ['tithi', 'Tithi'], 'N/A');
    const panchangNakshatra = getValue(panchangData, ['nakshatra', 'Naksahtra'], 'N/A');
    const panchangYoga = getValue(panchangData, ['yog', 'yoga', 'Yog'], 'N/A');
    const panchangKarana = getValue(panchangData, ['karan', 'Karan'], 'N/A');
    const rahuKaal = getValue(panchangData, ['rahukaal', 'Rahukaal', 'rahukal'], 'N/A');
    const yamaganda = getValue(panchangData, ['yamaganda', 'Yamaganda'], 'N/A');
    const gulika = getValue(panchangData, ['gulika', 'Gulika'], 'N/A');
    const paksha = getValue(panchangData, ['paksha', 'Paksha'], 'N/A');
    const ritu = getValue(panchangData, ['ritu', 'Ritu'], 'N/A');
    const ayana = getValue(panchangData, ['ayana', 'Ayana'], 'N/A');
    
    // Build Planets Table
    let planetsRows = '';
    const planets = kundliData.planets || {};
    const planetNames = { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' };
    
    for (const [planet, info] of Object.entries(planets)) {
      planetsRows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${planetNames[planet] || planet}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${info.sign || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${info.degree || 'N/A'}°</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${info.house || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${info.retrograde ? 'Yes' : 'No'}</td>
        </tr>
      `;
    }
    
    // Build Houses Table
    let housesRows = '';
    const houses = kundliData.houses || [];
    const houseNames = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
    
    for (let i = 0; i < Math.min(12, houses.length); i++) {
      const house = houses[i];
      housesRows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${houseNames[i]}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${house.sign || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${house.lord || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${house.degree ? house.degree + '°' : 'N/A'}</td>
        </tr>
      `;
    }
    
    // Complete HTML
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Kundli Report - ${userDetails?.name || 'User'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      padding: 40px;
      background: white;
      color: #333;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #5B4B8A;
    }
    .header h1 { color: #5B4B8A; font-size: 28px; margin-bottom: 8px; }
    .header p { color: #666; font-size: 12px; }
    .user-card {
      background: linear-gradient(135deg, #5B4B8A, #8B6BB8);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 25px;
    }
    .user-card h3 { margin-bottom: 10px; font-size: 18px; }
    .user-card p { margin: 5px 0; opacity: 0.9; font-size: 12px; }
    .section {
      margin-bottom: 25px;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
    }
    .section-title {
      background: linear-gradient(135deg, #5B4B8A, #8B6BB8);
      color: white;
      padding: 10px 18px;
      font-size: 16px;
      font-weight: bold;
    }
    .section-content { padding: 18px; background: #fafafa; }
    .lagna-card {
      background: linear-gradient(135deg, #5B4B8A, #8B6BB8);
      color: white;
      text-align: center;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 25px;
    }
    .lagna-value { font-size: 32px; font-weight: bold; margin: 8px 0; }
    .manglik-yes { background: #E53935; color: white; padding: 12px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
    .manglik-no { background: #43A047; color: white; padding: 12px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .info-item { background: white; padding: 10px; border-radius: 8px; border-left: 3px solid #5B4B8A; }
    .info-label { font-weight: bold; color: #5B4B8A; font-size: 11px; }
    .info-value { font-size: 13px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th { background: #5B4B8A; color: white; padding: 10px; text-align: left; font-size: 12px; }
    td { padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    .dasha-card { background: #FFF8E1; padding: 12px; border-radius: 8px; margin-top: 10px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>NAKSHATRA GANAK</h1>
    <p>Complete Kundli Report</p>
    <p>Generated on: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="user-card">
    <h3>👤 ${userDetails?.name || 'User'}</h3>
    <p>📧 ${userDetails?.email || 'Not provided'}</p>
    ${userDetails?.birthDetails ? `<p>📅 Birth: ${userDetails.birthDetails.date}/${userDetails.birthDetails.month}/${userDetails.birthDetails.year} at ${userDetails.birthDetails.hour}:${userDetails.birthDetails.minute}</p>` : ''}
  </div>
  
  <div class="lagna-card">
    <h3>LAGNA (ASCENDANT)</h3>
    <div class="lagna-value">${ascendant}</div>
    <div>Lord: ${ascendantLord}</div>
  </div>
  
  <div class="section">
    <div class="section-title">⭐ RASHI & NAKSHATRA DETAILS</div>
    <div class="section-content">
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Moon Sign (Rashi)</div><div class="info-value">${rashi}</div></div>
        <div class="info-item"><div class="info-label">Birth Star (Nakshatra)</div><div class="info-value">${nakshatra}</div></div>
        <div class="info-item"><div class="info-label">Nakshatra Lord</div><div class="info-value">${nakshatraLord}</div></div>
        <div class="info-item"><div class="info-label">Pada / Charan</div><div class="info-value">${nakshatraPada}</div></div>
      </div>
    </div>
  </div>
  
  <div class="${isManglik ? 'manglik-yes' : 'manglik-no'}">
    <strong>MANGLIK DOSHA:</strong> ${isManglik ? 'Manglik' : 'Non-Manglik'}
  </div>
  
  <div class="section">
    <div class="section-title">📖 VEDIC ASTROLOGICAL DETAILS</div>
    <div class="section-content">
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Yoga</div><div class="info-value">${yoga}</div></div>
        <div class="info-item"><div class="info-label">Tithi</div><div class="info-value">${tithi}</div></div>
        <div class="info-item"><div class="info-label">Karana</div><div class="info-value">${karana}</div></div>
        <div class="info-item"><div class="info-label">Gan</div><div class="info-value">${gan}</div></div>
        <div class="info-item"><div class="info-label">Nadi</div><div class="info-value">${nadi}</div></div>
        <div class="info-item"><div class="info-label">Varna</div><div class="info-value">${varna}</div></div>
        <div class="info-item"><div class="info-label">Vashya</div><div class="info-value">${vashya}</div></div>
        <div class="info-item"><div class="info-label">Yoni</div><div class="info-value">${yoni}</div></div>
        <div class="info-item"><div class="info-label">Sign Lord</div><div class="info-value">${signLord}</div></div>
        <div class="info-item"><div class="info-label">Tatva</div><div class="info-value">${tatva}</div></div>
        <div class="info-item"><div class="info-label">Paya</div><div class="info-value">${paya}</div></div>
        <div class="info-item"><div class="info-label">Name Alphabet</div><div class="info-value">${nameAlphabet}</div></div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">🪐 PLANETARY POSITIONS</div>
    <div class="section-content">
      <table>
        <thead><tr><th>Planet</th><th>Sign</th><th>Degree</th><th>House</th><th>Retrograde</th></tr></thead>
        <tbody>${planetsRows || '<tr><td colspan="5" style="text-align:center;">No data available</td></tr>'}</tbody>
      </table>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">🏠 HOUSES (BHAVAS)</div>
    <div class="section-content">
      <table>
        <thead><tr><th>House</th><th>Sign</th><th>Lord</th><th>Degree</th></tr></thead>
        <tbody>${housesRows || '<tr><td colspan="4" style="text-align:center;">No data available</td></tr>'}</tbody>
      </table>
    </div>
  </div>
  
  ${mahaDasha !== 'N/A' ? `
  <div class="section">
    <div class="section-title">⏳ CURRENT VIMSHOTTARI DASHA</div>
    <div class="section-content">
      <div class="dasha-card">
        <strong>Maha Dasha:</strong> ${mahaDasha}<br>
        <strong>Antar Dasha:</strong> ${antarDasha}<br>
        <strong>Valid Until:</strong> ${dashaEndDate}
      </div>
    </div>
  </div>
  ` : ''}
  
  <div class="section">
    <div class="section-title">📅 DAILY PANCHANG</div>
    <div class="section-content">
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Sunrise</div><div class="info-value">${sunrise}</div></div>
        <div class="info-item"><div class="info-label">Sunset</div><div class="info-value">${sunset}</div></div>
        <div class="info-item"><div class="info-label">Moonrise</div><div class="info-value">${moonrise}</div></div>
        <div class="info-item"><div class="info-label">Moonset</div><div class="info-value">${moonset}</div></div>
        <div class="info-item"><div class="info-label">Tithi</div><div class="info-value">${panchangTithi}</div></div>
        <div class="info-item"><div class="info-label">Nakshatra</div><div class="info-value">${panchangNakshatra}</div></div>
        <div class="info-item"><div class="info-label">Yoga</div><div class="info-value">${panchangYoga}</div></div>
        <div class="info-item"><div class="info-label">Karana</div><div class="info-value">${panchangKarana}</div></div>
        <div class="info-item"><div class="info-label">Rahu Kaal</div><div class="info-value">${rahuKaal}</div></div>
        <div class="info-item"><div class="info-label">Yamaganda</div><div class="info-value">${yamaganda}</div></div>
        <div class="info-item"><div class="info-label">Gulika</div><div class="info-value">${gulika}</div></div>
        <div class="info-item"><div class="info-label">Paksha</div><div class="info-value">${paksha}</div></div>
        <div class="info-item"><div class="info-label">Ritu</div><div class="info-value">${ritu}</div></div>
        <div class="info-item"><div class="info-label">Ayana</div><div class="info-value">${ayana}</div></div>
      </div>
    </div>
  </div>
  
  <div class="footer">
    <p>This is a computer-generated kundli report based on Vedic astrology calculations.</p>
    <p>© ${new Date().getFullYear()} Nakshatra Ganak - All Rights Reserved</p>
  </div>
</body>
</html>`;
    
    const options = { 
      format: 'A4',
      orientation: 'portrait',
      border: '10mm',
      type: 'pdf',
      timeout: 30000
    };
    
    pdf.create(htmlContent, options).toBuffer((err, buffer) => {
      if (err) {
        console.error('PDF error:', err);
        return res.status(500).json({ success: false, message: 'PDF generation failed: ' + err.message });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=kundli_report.pdf');
      res.send(buffer);
    });
    
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF: ' + err.message });
  }
});

// ================== SAVE PURCHASED KUNDLI ==================
router.post('/save-purchased-kundli', protect, async (req, res) => {
  try {
    const { kundliData, panchangData, birthDetails } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.savedCharts) {
      user.savedCharts = [];
    }

    user.savedCharts.push({
      birthDetails: {
        date: birthDetails.date,
        month: birthDetails.month,
        year: birthDetails.year,
        hour: birthDetails.hour,
        minute: birthDetails.minute,
        latitude: birthDetails.latitude,
        longitude: birthDetails.longitude,
        timezone: birthDetails.timezone
      },
      kundliData: kundliData,
      panchangData: panchangData,
      purchasedAt: new Date(),
      isPaid: true
    });
    
    await user.save();
    
    res.json({ success: true, message: 'Kundli saved to profile successfully' });
  } catch (err) {
    console.error('Save kundli error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================== GET PURCHASED KUNDLIS ==================
// ================== GET PURCHASED KUNDLIS ==================
router.get('/my-purchased-kundlis', protect, async (req, res) => {
  try {
    console.log('🔍 Fetching purchased kundlis for user:', req.user._id);
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const allCharts = user.savedCharts || [];
    console.log(`📊 Total charts in DB: ${allCharts.length}`);
    
    // ✅ Include all charts (old ones without isPaid are also considered paid)
    const purchasedKundlis = allCharts.map(chart => {
      // If isPaid is missing, set it to true (migration)
      if (chart.isPaid === undefined) {
        chart.isPaid = true;
      }
      return chart;
    });
    
    // Save if any charts were migrated
    let migrated = false;
    for (const chart of purchasedKundlis) {
      if (chart.isPaid === undefined) {
        chart.isPaid = true;
        migrated = true;
      }
    }
    
    if (migrated) {
      await user.save();
      console.log('✅ Migrated old charts (added isPaid: true)');
    }
    
    console.log(`✅ Returning ${purchasedKundlis.length} kundlis`);
    
    res.json({ 
      success: true, 
      kundlis: purchasedKundlis,
      totalCharts: allCharts.length,
      count: purchasedKundlis.length
    });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ================== SAVE CHART ==================
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

// ================== GET SAVED CHARTS ==================
router.get('/saved', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, charts: user.savedCharts || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ================== DELETE SAVED CHART ==================
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