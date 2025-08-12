// Configuration file for API endpoints
// This acts like a .env file for client-side applications

const CONFIG = {
    // API Base URL - Change this to switch environments
    API_BASE_URL: '192.168.29.223',
    
    // API Endpoints
    ENDPOINTS: {
        DATA: '/api/data',
        QUESTIONS: '/api/questions',
        RESPONSES: '/api/responses',
        SURVEY_RESPONSES: '/api/survey-responses'
    },
    
    // Helper function to build full API URLs
    getApiUrl: function(endpoint) {
        return this.API_BASE_URL + endpoint;
    },
    
    // Pre-built URLs for convenience
    URLS: {
        get DATA() { return CONFIG.getApiUrl(CONFIG.ENDPOINTS.DATA); },
        get QUESTIONS() { return CONFIG.getApiUrl(CONFIG.ENDPOINTS.QUESTIONS); },
        get RESPONSES() { return CONFIG.getApiUrl(CONFIG.ENDPOINTS.RESPONSES); },
        get SURVEY_RESPONSES() { return CONFIG.getApiUrl(CONFIG.ENDPOINTS.SURVEY_RESPONSES); },
        
        // Dynamic URLs that need parameters
        QUESTION_BY_ID: (id) => `${CONFIG.getApiUrl(CONFIG.ENDPOINTS.QUESTIONS)}/${id}`,
        SURVEY_RESPONSE_BY_ID: (id) => `${CONFIG.getApiUrl(CONFIG.ENDPOINTS.SURVEY_RESPONSES)}/${id}`,
    }
};

// Make CONFIG available globally
window.CONFIG = CONFIG;

// For environments that support modules (if you decide to use them later)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}