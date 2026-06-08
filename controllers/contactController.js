// backend/controllers/contactController.js
const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER || 'nakshatramongodb@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS;

// Create transporter
let transporter = null;

if (EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
  console.log('✅ Email configured for:', EMAIL_USER);
} else {
  console.log('⚠️ Email password not set. Please add EMAIL_PASS in .env file');
}

const sendContactEmail = async (req, res) => {
  try {
    const { name, email, mobile, service, message } = req.body;

    // Validation
    if (!name || !email || !mobile || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

    // If no email transporter configured
    if (!transporter) {
      console.log('📧 MOCK MODE - Message received from:', name, email);
      console.log('Message:', message);
      
      return res.status(200).json({
        success: true,
        message: 'Message sent successfully! We will contact you soon.',
        mockMode: true
      });
    }

    // Email to Admin (nakshatramongodb@gmail.com)
    const adminMailOptions = {
      from: `"Nakshatra Ganak Website" <${EMAIL_USER}>`,
      to: 'nakshatramongodb@gmail.com',  // ✅ Your email address
      replyTo: email,  // So you can reply directly to the user
      subject: `📞 New Contact Form Submission from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316, #ef4444); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fef3c7; padding: 20px; border-radius: 0 0 10px 10px; }
            .field { margin-bottom: 15px; padding: 10px; background: white; border-radius: 8px; }
            .label { font-weight: bold; color: #ea580c; font-size: 12px; text-transform: uppercase; }
            .value { font-size: 16px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .badge { display: inline-block; background: #f97316; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✨ New Contact Form Submission ✨</h2>
              <p>Nakshatra Ganak Website</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">👤 Name</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">📧 Email</div>
                <div class="value">${email}</div>
              </div>
              <div class="field">
                <div class="label">📱 Mobile</div>
                <div class="value">${mobile}</div>
              </div>
              <div class="field">
                <div class="label">🔮 Service Interested In</div>
                <div class="value">${service || 'Not specified'}</div>
              </div>
              <div class="field">
                <div class="label">💬 Message</div>
                <div class="value">${message.replace(/\n/g, '<br>')}</div>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <span class="badge">New Lead</span>
              </div>
            </div>
            <div class="footer">
              <p>Reply directly to: ${email}</p>
              <p>© ${new Date().getFullYear()} Nakshatra Ganak</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Auto-reply to User
    const userMailOptions = {
      from: `"Praveen Nangia - Nakshatra Ganak" <${EMAIL_USER}>`,
      to: email,
      subject: '✨ Thank you for contacting Nakshatra Ganak',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316, #ef4444); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fef3c7; padding: 20px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Namaste ${name}! 🙏</h2>
            </div>
            <div class="content">
              <p>Thank you for reaching out to <strong>Nakshatra Ganak</strong>.</p>
              <p>I have received your message and will get back to you within <strong>24 hours</strong>.</p>
              
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4 style="margin: 0 0 10px; color: #ea580c;">📝 Your Message Summary:</h4>
                <p style="margin: 0;"><strong>Service:</strong> ${service || 'General Query'}</p>
                <p><strong>Message:</strong> ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}</p>
              </div>
              
              <p>Meanwhile, you can:</p>
              <ul>
                <li>📚 Watch my <a href="https://youtube.com/@nakshatraganak">YouTube videos</a></li>
                <li>💬 Chat with me on <a href="https://wa.me/919953043676">WhatsApp</a></li>
                <li>🔮 Explore <a href="https://nakshatraganak.com/services">my services</a></li>
              </ul>
              
              <p>With warm regards,<br>
              <strong>Praveen Nangia</strong><br>
              <em>Nakshatra Ganak</em></p>
              
              <hr style="border-color: #fde68a;">
              <p style="font-size: 12px; color: #666; text-align: center;">📍 Ghaziabad, Uttar Pradesh, India</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send both emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    console.log('✅ Email sent to:', 'nakshatramongodb@gmail.com');
    console.log('✅ Auto-reply sent to:', email);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! We will contact you soon.'
    });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
};

module.exports = { sendContactEmail };