// --- ADD: Frontend Configuration ---
// Frontend specific constants
export const FRONTEND_CONFIG = {
    // Thumbnail width in pixels. Used for calculating grid columns in CSS and requested size.
    // Should ideally match or be related to the backend thumbnail size config (though not strictly necessary for display).
    THUMBNAIL_WIDTH_PIXELS: 150, // This value might be used by CSS grid or JS calculations
    // Add other frontend specific configs here, e.g., default zoom levels, animation durations etc.
    API_BASE_URL: '/api', // Base URL for backend API endpoints
    // Placeholder for dynamic config from backend, if needed later
    // dynamic_config: {},
};

console.debug('模块 js/config.js 已加载.'); // Frontend debug log
// --- END ADD ---