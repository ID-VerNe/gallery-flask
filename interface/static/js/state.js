// --- ADD: Frontend Application State Management ---
// Simple object to mirror/hold necessary state on the frontend.
// For more complex apps, a state management pattern (Redux, Vuex, React context/hooks) would be used.
export const appState = {
    // State properties, initialized to default values
    // These will be updated based on responses from the backend /api/status and /api/load_folders
    imagePairsInfo: [], // Partial info about image pairs (index, base_name), list of objects
    currentIndex: -1, // Currently selected index, -1 means none selected
    totalImages: 0,   // Total number of image pairs
    jpgFileName: null,
    rawFileName: null,
    jpgFolder: '',
    rawFolder: '',
    isLoaded: false,  // True if folder contents have been successfully loaded
    isLoading: false, // True if currently performing a blocking action (e.g., loading folders, changing image)
    // Add UI specific state if needed, e.g., zoom level, pan position
    // pan: { x: 0, y: 0 },
    // zoom: 1.0,
};

// No functions exported here initially, direct property access for simplicity.
// Can add methods later if state logic becomes complex (e.g., setState, addListeners).

console.debug('模块 js/state.js 已加载.');
// --- END ADD ---