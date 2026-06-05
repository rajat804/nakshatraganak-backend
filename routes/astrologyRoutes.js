const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

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


// ================== DOWNLOAD PDF (With Panchang) ==================
router.post('/download-pdf', protect, async (req, res) => {
  try {
    const { kundliData, panchangData, userDetails } = req.body;
    
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
    
    // ==================== KUNDLI DETAILS ====================
    const ascendant = getValue(kundliData, ['ascendant_sign', 'lagna', 'ascendant', 'sign'], 'N/A');
    const ascendantLord = getValue(kundliData, ['ascendant_lord', 'lagna_lord'], 'N/A');
    const rashi = getValue(kundliData, ['sign', 'rashi', 'moon_sign'], 'N/A');
    const nakshatra = getValue(kundliData, ['nakshatra', 'Naksahtra'], 'N/A');
    const nakshatraLord = getValue(kundliData, ['nakshatra_lord', 'NaksahtraLord'], 'N/A');
    const nakshatraPada = getValue(kundliData, ['nakshatra_pada', 'pada', 'Charan'], 'N/A');
    const manglik = getValue(kundliData, ['manglik', 'Manglik'], 'Non-Manglik');
    
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
    
    // ==================== PANCHANG DETAILS ====================
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
    
    // ==================== PLANETS HTML ====================
    let planetsHtml = '';
    const planetEmojis = { sun: '☀️', moon: '🌙', mars: '♂️', mercury: '☿', jupiter: '♃', venus: '♀️', saturn: '♄', rahu: '☊', ketu: '☋' };
    const planetNames = { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' };
    
    if (kundliData.planets && Object.keys(kundliData.planets).length > 0) {
      for (const [planet, info] of Object.entries(kundliData.planets)) {
        planetsHtml += `
          <div class="planet-item">
            <strong>${planetEmojis[planet] || '🪐'} ${planetNames[planet]}</strong><br>
            Sign: ${info.sign || 'N/A'}<br>
            Degree: ${info.degree || 'N/A'}°<br>
            House: ${info.house || 'N/A'}
            ${info.retrograde ? '<br><span style="color:#ff4444;">⭕ Retrograde</span>' : ''}
          </div>
        `;
      }
    }
    
    // ==================== HOUSES HTML ====================
    let housesHtml = '';
    if (kundliData.houses && kundliData.houses.length > 0) {
      for (let i = 0; i < Math.min(12, kundliData.houses.length); i++) {
        const house = kundliData.houses[i];
        housesHtml += `
          <div class="house-item">
            <strong>House ${i+1}</strong><br>
            Sign: ${house.sign || 'N/A'}<br>
            ${house.degree ? `Degree: ${house.degree}` : ''}
            ${house.lord ? `<br>Lord: ${house.lord}` : ''}
          </div>
        `;
      }
    }
    
    // ==================== VEDIC DETAILS HTML ====================
    const vedicDetailsHtml = `
      <div class="grid-3">
        <div class="info-card"><strong>🧘 Yoga:</strong><br>${yoga}</div>
        <div class="info-card"><strong>📖 Tithi:</strong><br>${tithi}</div>
        <div class="info-card"><strong>🌊 Karana:</strong><br>${karana}</div>
        <div class="info-card"><strong>👨‍👩‍👧 Gan:</strong><br>${gan}</div>
        <div class="info-card"><strong>💫 Nadi:</strong><br>${nadi}</div>
        <div class="info-card"><strong>🎨 Varna:</strong><br>${varna}</div>
        <div class="info-card"><strong>🤝 Vashya:</strong><br>${vashya}</div>
        <div class="info-card"><strong>🐘 Yoni:</strong><br>${yoni}</div>
        <div class="info-card"><strong>👑 Sign Lord:</strong><br>${signLord}</div>
        <div class="info-card"><strong>🌍 Tatva:</strong><br>${tatva}</div>
        <div class="info-card"><strong>💰 Paya:</strong><br>${paya}</div>
        <div class="info-card"><strong>🔤 Name Alphabet:</strong><br>${nameAlphabet}</div>
      </div>
    `;
    
    // ==================== DASHA HTML ====================
    const dashaHtml = mahaDasha !== 'N/A' ? `
      <div class="section">
        <div class="section-title">⏳ Current Vimshottari Dasha</div>
        <div class="section-content">
          <div class="dasha-card">
            <div><strong>Maha Dasha:</strong> ${mahaDasha}</div>
            <div><strong>Antar Dasha:</strong> ${antarDasha}</div>
            <div><strong>Valid Until:</strong> ${dashaEndDate}</div>
          </div>
        </div>
      </div>
    ` : '';
    
    // ==================== PANCHANG HTML ====================
    const panchangHtml = `
      <div class="section">
        <div class="section-title">📅 Daily Panchang</div>
        <div class="section-content">
          <div class="sun-times">
            <div class="sun-card">🌅 Sunrise: ${sunrise}</div>
            <div class="sun-card">🌇 Sunset: ${sunset}</div>
            <div class="sun-card">🌙 Moonrise: ${moonrise}</div>
            <div class="sun-card">🌚 Moonset: ${moonset}</div>
          </div>
          <div class="panchang-grid">
            <div class="panchang-card"><strong>📖 Tithi:</strong><br>${panchangTithi}</div>
            <div class="panchang-card"><strong>⭐ Nakshatra:</strong><br>${panchangNakshatra}</div>
            <div class="panchang-card"><strong>🧘 Yoga:</strong><br>${panchangYoga}</div>
            <div class="panchang-card"><strong>🌊 Karana:</strong><br>${panchangKarana}</div>
          </div>
          <div class="muhurat-grid">
            <div class="muhurat-card">🔴 Rahu Kaal: ${rahuKaal}</div>
            <div class="muhurat-card">🟡 Yamaganda: ${yamaganda}</div>
            <div class="muhurat-card">🟢 Gulika: ${gulika}</div>
            <div class="muhurat-card">📅 Paksha: ${paksha}</div>
            <div class="muhurat-card">🌸 Ritu: ${ritu}</div>
            <div class="muhurat-card">☀️ Ayana: ${ayana}</div>
          </div>
        </div>
      </div>
    `;
    
    // ==================== COMPLETE HTML ====================
    const htmlContent = `
      <!DOCTYPE html>
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
            line-height: 1.5;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #667eea;
          }
          .header h1 { color: #667eea; font-size: 28px; margin-bottom: 10px; }
          .header p { color: #666; font-size: 14px; }
          .user-info {
            background: #f0f0ff;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 25px;
            text-align: center;
          }
          .user-info h3 { color: #667eea; margin-bottom: 8px; }
          .section {
            margin-bottom: 25px;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            overflow: hidden;
          }
          .section-title {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 12px 20px;
            font-size: 18px;
            font-weight: bold;
          }
          .section-content { padding: 20px; }
          .ascendant-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            text-align: center;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 25px;
          }
          .ascendant-value { font-size: 36px; font-weight: bold; margin: 10px 0; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
          .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
          .info-card {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
          }
          .planet-item, .house-item {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 10px;
            text-align: center;
          }
          .sun-times { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
          .sun-card { background: #ffd700; padding: 10px; border-radius: 8px; text-align: center; font-weight: bold; }
          .panchang-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
          .panchang-card { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 10px; text-align: center; }
          .muhurat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; }
          .muhurat-card { background: #f8f9fa; padding: 12px; border-radius: 10px; text-align: center; border: 1px solid #ddd; }
          .manglik-yes { background: #ff4444; color: white; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
          .manglik-no { background: #4caf50; color: white; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
          .dasha-card { background: #fff3cd; padding: 15px; border-radius: 10px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
          @media print { body { padding: 20px; } .section { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔮 Nakshatra Ganak - Kundli Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        
        <div class="user-info">
          <h3>📋 Report For: ${userDetails?.name || 'User'}</h3>
          <p>📧 ${userDetails?.email || 'Not provided'}</p>
          <p>📅 Birth Details: ${userDetails?.birthDetails?.date}/${userDetails?.birthDetails?.month}/${userDetails?.birthDetails?.year} at ${userDetails?.birthDetails?.hour}:${userDetails?.birthDetails?.minute}</p>
        </div>
        
        <!-- Lagna -->
        <div class="ascendant-card">
          <h3>🌅 Lagna (Ascendant)</h3>
          <div class="ascendant-value">${ascendant}</div>
          <div>Lord: ${ascendantLord}</div>
        </div>
        
        <!-- Rashi & Nakshatra -->
        <div class="section">
          <div class="section-title">⭐ Rashi & Nakshatra Details</div>
          <div class="section-content">
            <div class="grid-2">
              <div class="info-card"><strong>⭐ Rashi (Moon Sign):</strong><br>${rashi}</div>
              <div class="info-card"><strong>⭐ Nakshatra:</strong><br>${nakshatra}</div>
              <div class="info-card"><strong>👑 Nakshatra Lord:</strong><br>${nakshatraLord}</div>
              <div class="info-card"><strong>📌 Pada/Charan:</strong><br>${nakshatraPada}</div>
            </div>
          </div>
        </div>
        
        <!-- Manglik -->
        <div class="${manglik === 'Yes' || manglik === 'Manglik' ? 'manglik-yes' : 'manglik-no'}">
          <h3>🔴 Manglik Dosha</h3>
          <div style="font-size: 24px; font-weight: bold;">${manglik === 'Yes' || manglik === 'Manglik' ? 'Manglik' : 'Non-Manglik'}</div>
        </div>
        
        <!-- Vedic Details -->
        <div class="section">
          <div class="section-title">📖 Vedic Astrological Details</div>
          <div class="section-content">
            <div class="grid-3">
              ${vedicDetailsHtml}
            </div>
          </div>
        </div>
        
        <!-- Planets -->
        <div class="section">
          <div class="section-title">🪐 Planetary Positions (Grahas)</div>
          <div class="section-content">
            <div class="grid-3">
              ${planetsHtml}
            </div>
          </div>
        </div>
        
        <!-- Houses -->
        <div class="section">
          <div class="section-title">🏠 Houses (Bhavas)</div>
          <div class="section-content">
            <div class="grid-4">
              ${housesHtml}
            </div>
          </div>
        </div>
        
        ${dashaHtml}
        
        <!-- Panchang -->
        ${panchangHtml}
        
        <div class="footer">
          <p>This is a computer-generated kundli report based on Vedic astrology calculations.</p>
          <p>© ${new Date().getFullYear()} Nakshatra Ganak - All Rights Reserved</p>
          <p>For accurate predictions and remedies, consult an expert astrologer.</p>
        </div>
      </body>
      </html>
    `;
    
    const pdf = require('html-pdf');
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
        return res.status(500).json({ success: false, message: 'PDF generation failed' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=kundli_report.pdf');
      res.send(buffer);
    });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
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