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
    const port = parseInt(userSettings.port);
    
    // Determine secure setting based on port if not explicitly set
    let secure = userSettings.secure;
    if (secure === undefined) {
      // Port 465 typically uses direct SSL/TLS, port 587 uses STARTTLS
      secure = port === 465;
    }
    
    // Build transporter config
    const transporterConfig = {
      host: userSettings.host,
      port: port,
      secure: secure,
      auth: {
        user: userSettings.user,
        pass: userSettings.password,
      },
      // Connection timeout
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
      // TLS options
      tls: {
        rejectUnauthorized: false, // Accept self-signed certificates
        minVersion: 'TLSv1.2',
      },
      // Debug mode (set to true for more verbose logging)
      debug: false,
      logger: false,
    };
    
    // For port 587, use STARTTLS (secure: false, but require TLS)
    if (port === 587 && !secure) {
      transporterConfig.requireTLS = true;
    }
    
    // For port 465, ensure secure is true
    if (port === 465) {
      transporterConfig.secure = true;
    }
    
    // For port 25, typically unencrypted
    if (port === 25) {
      transporterConfig.secure = false;
    }
    
    return nodemailer.createTransport(transporterConfig);
  } else {
    // Use default SMTP settings from environment
    const port = parseInt(process.env.SMTP_PORT || '465');
    const secure = port === 465;
    
    const transporterConfig = {
      host: process.env.SMTP_HOST,
      port: port,
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      debug: false,
      logger: false,
    };
    
    if (port === 587 && !secure) {
      transporterConfig.requireTLS = true;
    }
    
    if (port === 465) {
      transporterConfig.secure = true;
    }
    
    return nodemailer.createTransport(transporterConfig);
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
    let transporter = createTransporter(userId);

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

    // Verify connection before sending
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('SMTP connection verification failed:', verifyError);
      
      // If it's a "wrong version number" error, try with opposite secure setting
      if (verifyError.code === 'ESOCKET' && verifyError.message.includes('wrong version number')) {
        const userSettings = getUserSmtpSettings(userId);
        if (userSettings) {
          console.log('Attempting connection with alternative SSL setting...');
          const port = parseInt(userSettings.port);
          
          // Try the opposite secure setting
          const alternativeConfig = {
            host: userSettings.host,
            port: port,
            secure: !userSettings.secure, // Try opposite
            auth: {
              user: userSettings.user,
              pass: userSettings.password,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
            tls: {
              rejectUnauthorized: false,
              minVersion: 'TLSv1.2',
            },
          };
          
          if (port === 587 && !alternativeConfig.secure) {
            alternativeConfig.requireTLS = true;
          }
          
          try {
            const altTransporter = nodemailer.createTransport(alternativeConfig);
            await altTransporter.verify();
            console.log('Alternative connection method works! Using it...');
            transporter = altTransporter;
          } catch (altError) {
            console.error('Alternative connection also failed:', altError);
            return res.status(500).json({
              success: false,
              error: 'SMTP connection failed. The server may not support the selected port/SSL combination.',
              details: `Original error: ${verifyError.message}. Tried alternative: ${altError.message}`,
              suggestion: port === 465 
                ? 'Try port 587 with SSL/TLS unchecked, or verify your SMTP server supports SSL on port 465.'
                : 'Try port 465 with SSL/TLS checked, or verify your SMTP server supports STARTTLS on port 587.',
            });
          }
        } else {
          return res.status(500).json({
            success: false,
            error: 'SMTP connection failed. Please check your SMTP settings.',
            details: verifyError.message,
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          error: 'SMTP connection failed. Please check your SMTP settings.',
          details: verifyError.message,
        });
      }
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
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to send email';
    if (error.code === 'ESOCKET' || error.message.includes('wrong version number')) {
      errorMessage = 'SMTP connection error. Please check your port and secure settings. Port 465 requires SSL (secure: true), port 587 requires STARTTLS (secure: false).';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your username and password.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to SMTP server. Please check your host and port.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
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
    let transporter = createTransporter(userId);

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

