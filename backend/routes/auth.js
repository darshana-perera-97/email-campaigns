const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Simple authentication - in production, use proper password hashing and database
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Helper function to read users
function readUsers() {
  try {
    const usersFile = path.join(__dirname, '..', 'data', 'users.json');
    if (fs.existsSync(usersFile)) {
      let data = fs.readFileSync(usersFile, 'utf8');
      // Remove BOM if present and trim whitespace
      data = data.replace(/^\uFEFF/, '').trim();
      // If file is empty or only whitespace, return empty array
      if (!data || data === '') {
        return [];
      }
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading users:', error);
    // If JSON is invalid, return empty array and optionally fix the file
    try {
      const usersFile = path.join(__dirname, '..', 'data', 'users.json');
      fs.writeFileSync(usersFile, '[]', 'utf8');
    } catch (writeError) {
      console.error('Error fixing users.json:', writeError);
    }
    return [];
  }
}

// POST /api/auth/login - Login endpoint
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    // Check admin credentials first
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      res.json({
        success: true,
        message: 'Login successful',
        token: 'authenticated',
        isAdmin: true,
      });
      return;
    }

    // Check user credentials
    const users = readUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      res.json({
        success: true,
        message: 'Login successful',
        token: 'authenticated',
        isAdmin: false,
        userId: user.id,
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error.message,
    });
  }
});

// POST /api/auth/logout - Logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

// GET /api/auth/verify - Verify token
router.get('/verify', (req, res) => {
  const token = req.headers.authorization;
  
  if (token === 'Bearer authenticated') {
    res.json({
      success: true,
      authenticated: true,
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
    });
  }
});

module.exports = router;

