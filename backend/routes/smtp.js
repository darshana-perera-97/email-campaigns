const express = require('express');
const router = express.Router();
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

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const smtpFile = path.join(dataDir, 'smtp.json');

// Helper function to read SMTP settings
function readSmtpSettings() {
  try {
    if (fs.existsSync(smtpFile)) {
      let data = fs.readFileSync(smtpFile, 'utf8');
      data = data.replace(/^\uFEFF/, '').trim();
      if (!data || data === '') {
        return [];
      }
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading SMTP settings:', error);
    return [];
  }
}

// Helper function to write SMTP settings
function writeSmtpSettings(settings) {
  try {
    fs.writeFileSync(smtpFile, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing SMTP settings:', error);
    return false;
  }
}

// GET /api/smtp - Get SMTP settings for current user
router.get('/', (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const settings = readSmtpSettings();
    const userSettings = settings.find(s => s.userId === userId);
    
    if (!userSettings) {
      return res.json({
        success: true,
        settings: null,
        message: 'No SMTP settings found for this user',
      });
    }

    // Don't send password in response
    const { password, ...settingsWithoutPassword } = userSettings;
    res.json({
      success: true,
      settings: settingsWithoutPassword,
    });
  } catch (error) {
    console.error('Error getting SMTP settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SMTP settings',
      details: error.message,
    });
  }
});

// POST /api/smtp - Create or update SMTP settings
router.post('/', (req, res) => {
  try {
    const { userId, host, port, user, password, secure } = req.body;

    if (!userId || !host || !port || !user || !password) {
      return res.status(400).json({
        success: false,
        error: 'userId, host, port, user, and password are required',
      });
    }

    const settings = readSmtpSettings();
    const existingIndex = settings.findIndex(s => s.userId === userId);

    const smtpSettings = {
      userId: userId,
      host: host,
      port: parseInt(port),
      user: user,
      password: password,
      secure: secure !== undefined ? secure : true,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex === -1) {
      // Create new
      smtpSettings.createdAt = new Date().toISOString();
      settings.push(smtpSettings);
    } else {
      // Update existing
      smtpSettings.createdAt = settings[existingIndex].createdAt;
      settings[existingIndex] = smtpSettings;
    }

    if (writeSmtpSettings(settings)) {
      const { password: _, ...settingsWithoutPassword } = smtpSettings;
      res.json({
        success: true,
        message: existingIndex === -1 ? 'SMTP settings saved successfully' : 'SMTP settings updated successfully',
        settings: settingsWithoutPassword,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save SMTP settings',
      });
    }
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save SMTP settings',
      details: error.message,
    });
  }
});

// DELETE /api/smtp/:userId - Delete SMTP settings for a user
router.delete('/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const settings = readSmtpSettings();
    const existingIndex = settings.findIndex(s => s.userId === userId);

    if (existingIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'SMTP settings not found',
      });
    }

    settings.splice(existingIndex, 1);

    if (writeSmtpSettings(settings)) {
      res.json({
        success: true,
        message: 'SMTP settings deleted successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete SMTP settings',
      });
    }
  } catch (error) {
    console.error('Error deleting SMTP settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete SMTP settings',
      details: error.message,
    });
  }
});

module.exports = router;

