const nodemailer = require('nodemailer');

// Create transporter with better configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Nakshatra Ganak" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });
    console.log('✅ Email sent to:', to);
    console.log('✅ Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email error to:', to);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    return false;
  }
};

// Admin email
const ADMIN_EMAIL = 'nakshatramongodb@gmail.com';

// Send booking confirmation to user
const sendUserBookingEmail = async (userEmail, userName, bookingDetails) => {
  const subject = '✨ Booking Confirmed - Nakshatra Ganak';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Booking Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .booking-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
        .price { font-size: 24px; font-weight: bold; color: #28a745; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔮 Booking Confirmed!</h1>
          <p>Thank you for choosing Nakshatra Ganak</p>
        </div>
        <div class="content">
          <p>Dear <strong>${userName}</strong>,</p>
          <p>Your booking has been successfully confirmed. We are excited to guide you on your spiritual journey.</p>
          
          <div class="booking-details">
            <h3>📋 Booking Details:</h3>
            <p><strong>Service:</strong> ${bookingDetails.serviceName}</p>
            <p><strong>Date:</strong> ${bookingDetails.bookingDate}</p>
            <p><strong>Time:</strong> ${bookingDetails.bookingTime}</p>
            <p><strong>Amount Paid:</strong> <span class="price">₹${bookingDetails.servicePrice}</span></p>
            <p><strong>Payment ID:</strong> ${bookingDetails.paymentId}</p>
            <p><strong>Order ID:</strong> ${bookingDetails.orderId}</p>
            ${bookingDetails.phone ? `<p><strong>Contact Number:</strong> ${bookingDetails.phone}</p>` : ''}
          </div>
          
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>Our expert will contact you shortly</li>
            <li>You can view your booking in your profile</li>
            <li>For any queries, contact us at nakshatramongodb@gmail.com</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2024 Nakshatra Ganak. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

// Send admin notification email
const sendAdminNotificationEmail = async (bookingDetails, userDetails) => {
  const subject = '📅 New Service Booking Received - Nakshatra Ganak';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>New Booking Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .booking-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #28a745; }
        .price { font-size: 24px; font-weight: bold; color: #28a745; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 New Booking Received!</h1>
          <p>A new service booking has been confirmed</p>
        </div>
        <div class="content">
          <div class="booking-details">
            <h3>👤 Customer Details:</h3>
            <p><strong>Name:</strong> ${userDetails.name}</p>
            <p><strong>Email:</strong> ${userDetails.email}</p>
            <p><strong>📞 Phone:</strong> ${userDetails.phone || 'Not provided'}</p>
            
            <h3>📋 Service Details:</h3>
            <p><strong>Service:</strong> ${bookingDetails.serviceName}</p>
            <p><strong>Date:</strong> ${bookingDetails.bookingDate}</p>
            <p><strong>Time:</strong> ${bookingDetails.bookingTime}</p>
            <p><strong>Amount:</strong> <span class="price">₹${bookingDetails.servicePrice}</span></p>
            <p><strong>Payment ID:</strong> ${bookingDetails.paymentId}</p>
            <p><strong>Order ID:</strong> ${bookingDetails.orderId}</p>
            ${bookingDetails.notes ? `<p><strong>Additional Notes:</strong> ${bookingDetails.notes}</p>` : ''}
          </div>
        </div>
        <div class="footer">
          <p>© 2024 Nakshatra Ganak Admin</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  console.log('📧 Sending admin email to:', ADMIN_EMAIL);
  return await sendEmail(ADMIN_EMAIL, subject, html);
};

module.exports = { sendUserBookingEmail, sendAdminNotificationEmail };