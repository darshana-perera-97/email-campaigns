// Backend API Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:3050/api'
    // API_BASE_URL: 'http://127.0.0.1:5500/api'
};

// Export API endpoints
const API_URL = `${CONFIG.API_BASE_URL}/email`;
const AUTH_URL = `${CONFIG.API_BASE_URL}/auth`;
const TEMPLATES_URL = `${CONFIG.API_BASE_URL}/templates`;
const SMTP_URL = `${CONFIG.API_BASE_URL}/smtp`;
const USERS_URL = `${CONFIG.API_BASE_URL}/users`;

