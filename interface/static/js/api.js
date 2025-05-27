import { FRONTEND_CONFIG } from './config.js';
import { appState } from './state.js';

const API_BASE_URL = FRONTEND_CONFIG.API_BASE_URL;

/**
 * Generic fetch wrapper with error handling and JSON parsing.
 * @param {string} endpoint The API endpoint path (e.g., '/load_folders').
 * @param {object} options Fetch options (method, headers, body, etc.).
 * @returns {Promise<object>} Promise resolving with JSON response data.
 * @throws {Error} Throws an error if fetch fails or if response status is not OK.
 */
async function fetchJson(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            let errorBody = {};
            try {
                errorBody = await response.json();
            } catch (jsonError) {
                errorBody = { message: response.statusText || `HTTP Error ${response.status}` };
            }
            const error = new Error(`API 请求失败: ${errorBody.message || `HTTP 状态码 ${response.status}`}`);
            error.status = response.status;
            error.body = errorBody;
            throw error;
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data && data.hasOwnProperty('success') && data.success === false) {
            }
            return data;
        } else {
            return response;
        }

    } catch (error) {
        throw error;
    }
}

export const api = {
    /** Calls the backend to trigger a folder selection dialog. */
    async selectFolder(type, initialDir = null) {
        let params = new URLSearchParams();
        params.append('type', type);
        if (initialDir) {
            params.append('initial_dir', initialDir);
        }
        return fetchJson(`/select_folder?${params.toString()}`);
    },

    /** Calls the backend to load image pairs from specified folders. */
    async loadFolders(jpgPath, rawPath) {
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jpg_folder: jpgPath, raw_folder: rawPath })
        };
        return fetchJson('/load_folders', options);
    },

    /** Calls the backend to get the current application status. */
    async getStatus() {
        return fetchJson('/status');
    },

    /** Calls the backend to set the selected image index. */
    async selectImage(index) {
        const options = { method: 'POST' };
        return fetchJson(`/select_image/${index}`, options);
    },

    /** Calls the backend to navigate to the next image. */
    async nextImage() {
        const options = { method: 'POST' };
        return fetchJson('/next_image', options);
    },

    /** Calls the backend to navigate to the previous image. */
    async prevImage() {
        const options = { method: 'POST' };
        return fetchJson('/previous_image', options);
    },

    /** Returns the URL for a specific thumbnail image by index. No fetch call here. */
    getThumbnailUrl(index) {
        return `${API_BASE_URL}/image/thumbnail/${index}`;
    },

    /** Calls the backend to open the current RAW file with an external application. */
    async openRaw() {
        const options = { method: 'POST' };
        return fetchJson('/open_raw', options);
    },

    /** Calls the backend to update the default folder paths in the .env file. */
    async updatePaths(jpgPath, rawPath) {
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jpg_folder: jpgPath, raw_folder: rawPath })
        };
        return fetchJson('/update_paths', options);
    },

    /** Returns the URL for the current preview image. No fetch call here. */
    getPreviewUrl(index) {
        return `${API_BASE_URL}/image/preview/${index}`;
    },
};
