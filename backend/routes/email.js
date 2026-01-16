const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token || token !== 'Bearer authenticated') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Please login first.',
    });
  }
  
  next();
};

// Apply authentication to all routes
router.use(authenticate);

// Helper function to get user SMTP settings
function getUserSmtpSettings(userId) {
  try {
    const smtpFile = path.join(__dirname, '..', 'data', 'smtp.json');
    if (fs.existsSync(smtpFile)) {
      let data = fs.readFileSync(smtpFile, 'utf8');
      data = data.replace(/^\uFEFF/, '').trim();
      if (!data || data === '') {
        return null;
      }
      const settings = JSON.parse(data);
      return settings.find(s => s.userId === userId);
    }
    return null;
  } catch (error) {
    console.error('Error reading SMTP settings:', error);
    return null;
  }
}

// Helper function to create transporter
function createTransporter(userId) {
  const userSettings = getUserSmtpSettings(userId);
  
  if (userSettings) {
    // Use user-specific SMTP settings
    return nodemailer.createTransport({
      host: userSettings.host,
      port: parseInt(userSettings.port),
      secure: userSettings.secure !== undefined ? userSettings.secure : true,
      auth: {
        user: userSettings.user,
        pass: userSettings.password,
      },
    });
  } else {
    // Use default SMTP settings from environment
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
}

// POST /api/email/send - Send email
router.post('/send', async (req, res) => {
  try {
    const { to, subject, text, html, cc, bcc, userId } = req.body;

    // Validation
    if (!to) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient email (to) is required' 
      });
    }

    if (!subject) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subject is required' 
      });
    }

    if (!text && !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email content (text or html) is required' 
      });
    }

    // Get user SMTP settings or use default
    const userSettings = getUserSmtpSettings(userId);
    const fromEmail = userSettings ? userSettings.user : process.env.SMTP_USER;
    const transporter = createTransporter(userId);

    // Email options
    const mailOptions = {
      from: fromEmail,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      text: text,
      html: html,
    };

    // Add optional fields
    if (cc) {
      mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    }

    if (bcc) {
      mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message,
    });
  }
});

// POST /api/email/send-bulk - Send bulk emails
router.post('/send-bulk', async (req, res) => {
  try {
    const { recipients, subject, text, html, userId } = req.body;

    // Validation
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required and must not be empty',
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        error: 'Subject is required',
      });
    }

    if (!text && !html) {
      return res.status(400).json({
        success: false,
        error: 'Email content (text or html) is required',
      });
    }

    // Get user SMTP settings or use default
    const userSettings = getUserSmtpSettings(userId);
    const fromEmail = userSettings ? userSettings.user : process.env.SMTP_USER;
    const transporter = createTransporter(userId);

    const results = [];
    const errors = [];

    // Send emails to each recipient
    for (const recipient of recipients) {
      try {
        const mailOptions = {
          from: fromEmail,
          to: recipient,
          subject: subject,
          text: text,
          html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        results.push({
          recipient,
          success: true,
          messageId: info.messageId,
        });
      } catch (error) {
        errors.push({
          recipient,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Sent ${results.length} emails successfully, ${errors.length} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk emails',
      details: error.message,
    });
  }
});

module.exports = router;

