const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email transporter ready to send emails');
  }
});

// Send OTP email
const sendOTPEmail = async (toEmail, otp, userName = 'User') => {
  try {
    console.log(`📧 Attempting to send OTP to: ${toEmail}`);
    
    const info = await transporter.sendMail({
      from: `"Nakshatra Ganak Support" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '🔐 Password Reset OTP - Nakshatra Ganak',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 20px; }
            .otp-code { font-size: 36px; font-weight: bold; color: #dc2626; text-align: center; padding: 20px; letter-spacing: 5px; background: #f3f4f6; border-radius: 8px; margin: 20px 0; }
            .warning { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>You requested to reset your password. Use the OTP below:</p>
              <div class="otp-code">${otp}</div>
              <p>This OTP is valid for <strong>10 minutes</strong>.</p>
              <p>If you didn't request this, please ignore this email.</p>
              <div class="warning">
                ⚠️ Never share this OTP with anyone.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    
    console.log(`✅ Email sent successfully to ${toEmail}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail };