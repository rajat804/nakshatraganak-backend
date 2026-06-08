// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../controllers/contactController');

// POST - Send contact form email
router.post('/send', sendContactEmail);

module.exports = router;