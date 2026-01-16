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

const usersFile = path.join(dataDir, 'users.json');

// Helper function to read users
function readUsers() {
  try {
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
      fs.writeFileSync(usersFile, '[]', 'utf8');
    } catch (writeError) {
      console.error('Error fixing users.json:', writeError);
    }
    return [];
  }
}

// Helper function to write users
function writeUsers(users) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing users:', error);
    return false;
  }
}

// GET /api/users - Get all users
router.get('/', (req, res) => {
  try {
    const users = readUsers();
    // Don't send passwords
    const usersWithoutPasswords = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
    res.json({
      success: true,
      users: usersWithoutPasswords,
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      details: error.message,
    });
  }
});

// GET /api/users/:id - Get a specific user
router.get('/:id', (req, res) => {
  try {
    const users = readUsers();
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // Don't send password
    const { password, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      details: error.message,
    });
  }
});

// POST /api/users - Create a new user
router.post('/', (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    const users = readUsers();
    
    // Check if username already exists
    if (users.some(u => u.username === username)) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists',
      });
    }

    const newUser = {
      id: Date.now().toString(),
      username: username,
      password: password, // In production, hash this password
      email: email || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    
    if (writeUsers(users)) {
      const { password: _, ...userWithoutPassword } = newUser;
      res.json({
        success: true,
        message: 'User created successfully',
        user: userWithoutPassword,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      details: error.message,
    });
  }
});

// PUT /api/users/:id - Update a user
router.put('/:id', (req, res) => {
  try {
    const { username, password, email } = req.body;
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if username is being changed and if it already exists
    if (username && username !== users[userIndex].username) {
      if (users.some(u => u.username === username && u.id !== req.params.id)) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists',
        });
      }
    }

    if (username) users[userIndex].username = username;
    if (password) users[userIndex].password = password; // In production, hash this
    if (email !== undefined) users[userIndex].email = email;
    users[userIndex].updatedAt = new Date().toISOString();

    if (writeUsers(users)) {
      const { password: _, ...userWithoutPassword } = users[userIndex];
      res.json({
        success: true,
        message: 'User updated successfully',
        user: userWithoutPassword,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
      });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      details: error.message,
    });
  }
});

// DELETE /api/users/:id - Delete a user
router.delete('/:id', (req, res) => {
  try {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    users.splice(userIndex, 1);

    if (writeUsers(users)) {
      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
      });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error.message,
    });
  }
});

module.exports = router;

