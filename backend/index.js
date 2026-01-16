require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const emailRoutes = require('./routes/email');
const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/templates');
const userRoutes = require('./routes/users');
const smtpRoutes = require('./routes/smtp');

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes (must come before static files)
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/smtp', smtpRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Email API is running' });
});

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  index: 'index.html'
}));

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Serve admin.html for /admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

