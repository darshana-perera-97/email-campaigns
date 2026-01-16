// Backend API Configuration
// Automatically detect the current origin to support both localhost and public IP access
const getApiBaseUrl = () => {
    // Get the current origin (protocol + hostname + port)
    const origin = window.location.origin;
    
    // If accessing via localhost or 127.0.0.1, use localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return `${origin}/api`;
    }
    
    // Otherwise, use the current origin (for public IP access)
    return `${origin}/api`;
};

const CONFIG = {
    API_BASE_URL: getApiBaseUrl()
};

// Export API endpoints
const API_URL = `${CONFIG.API_BASE_URL}/email`;
const AUTH_URL = `${CONFIG.API_BASE_URL}/auth`;
const TEMPLATES_URL = `${CONFIG.API_BASE_URL}/templates`;
const SMTP_URL = `${CONFIG.API_BASE_URL}/smtp`;
const USERS_URL = `${CONFIG.API_BASE_URL}/users`;

