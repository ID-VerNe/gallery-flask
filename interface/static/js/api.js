// --- ADD: API Interaction Module ---
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
    console.log(`API: 发送请求: ${options.method || 'GET'} ${url}`, options.body ? JSON.parse(options.body) : ''); // Log request details

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            // Try to parse JSON error body if available
            let errorBody = {};
            try {
                errorBody = await response.json();
                console.error(`API: 请求失败，状态码: ${response.status}. 错误信息 (JSON):`, errorBody); // Log specific error data
            } catch (jsonError) {
                // If JSON parsing fails, just log the status text
                console.error(`API: 请求失败，状态码: ${response.status}. 无法解析错误体为 JSON。状态文本: ${response.statusText}`); // Log status text
                errorBody = { message: response.statusText || `HTTP Error ${response.status}` };
            }
             // Propagate the error with status and message
            const error = new Error(`API 请求失败: ${errorBody.message || `HTTP 状态码 ${response.status}`}`);
            error.status = response.status;
            error.body = errorBody; // Attach the parsed body (or status text)
            throw error;
        }

        // Check if the response has a JSON content type before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
             const data = await response.json();
             console.log(`API: 请求成功: ${options.method || 'GET'} ${url}`, '响应数据:', data); // Log successful response data
             // Check backend 'success' flag convention if used
             if (data && data.hasOwnProperty('success') && data.success === false) {
                 console.warn(`API: 后端指示业务逻辑失败 for ${url}:`, data.message); // Log backend business logic failure
                 // Consider throwing an error specific to backend business logic failure
                 // For now, let the caller check `data.success`
             }
             return data;
        } else {
             console.log(`API: 请求成功: ${options.method || 'GET'} ${url}`, '响应不是 JSON, 返回原始 Response 对象.');// Log non-JSON success
             // For non-JSON responses (like images), return the response object itself
             return response;
        }

    } catch (error) {
        console.error(`API: Fetch 请求过程中发生错误 for ${url}:`, error); // Log network errors or errors before parsing
        // Re-throw the error for the caller to handle
        throw error;
    }
}

// --- Public API Functions (exported) ---

export const api = {
    /** Calls the backend to trigger a folder selection dialog. */
    async selectFolder(type, initialDir = null) {
        console.info(`API: 调用 selectFolder (${type})...`);
        let params = new URLSearchParams();
        params.append('type', type);
        if (initialDir) {
            params.append('initial_dir', initialDir); // Although backend Tkinter handles iniitialdir, this is for the API itself
        }
        return fetchJson(`/select_folder?${params.toString()}`);
    },

    /** Calls the backend to load image pairs from specified folders. */
    async loadFolders(jpgPath, rawPath) {
        console.info(`API: 调用 loadFolders...`);
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jpg_folder: jpgPath, raw_folder: rawPath })
        };
        return fetchJson('/load_folders', options);
    },

    /** Calls the backend to get the current application status. */
    async getStatus() {
         // console.debug('API: 调用 getStatus...'); // Can be very chatty
         return fetchJson('/status');
    },

    /** Calls the backend to set the selected image index. */
    async selectImage(index) {
        console.info(`API: 调用 selectImage (${index})...`);
        const options = { method: 'POST' }; // POST with index in URL
        return fetchJson(`/select_image/${index}`, options);
    },

    /** Calls the backend to navigate to the next image. */
    async nextImage() {
        console.info('API: 调用 nextImage...');
        const options = { method: 'POST' };
        return fetchJson('/next_image', options);
    },

     /** Calls the backend to navigate to the previous image. */
    async prevImage() {
        console.info('API: 调用 prevImage...');
        const options = { method: 'POST' };
        return fetchJson('/previous_image', options);
    },

    /** Returns the URL for a specific thumbnail image by index. No fetch call here. */
    getThumbnailUrl(index) {
         // console.debug(`API: 获取缩略图 URL for index ${index}.`); // Can be chatty
         return `${API_BASE_URL}/image/thumbnail/${index}`;
    },

    /** Returns the URL for the current preview image. No fetch call here. */
    getPreviewUrl() {
         // console.debug('API: 获取预览图 URL.'); // Can be chatty
         return `${API_BASE_URL}/image/preview`;
    },

    /** Calls the backend to open the current RAW file with an external application. */
    async openRaw() {
        console.info('API: 调用 openRaw...');
        const options = { method: 'POST' };
        return fetchJson('/open_raw', options);
    },

    /** Calls the backend to update the default folder paths in the .env file. */
    async updatePaths(jpgPath, rawPath) {
        console.info(`API: 调用 updatePaths...`);
         const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jpg_folder: jpgPath, raw_folder: rawPath })
        };
        return fetchJson('/update_paths', options);
    },

     /** Returns the URL for the current preview image. No fetch call here. */
     // --- FIX: getPreviewUrl now accepts index ---
    getPreviewUrl(index) {
         console.debug(`API: 获取预览图 URL for index ${index}. 当前选中索引: ${appState.currentIndex}`); // Use debug
         // Construct the URL including the index parameter
         return `${API_BASE_URL}/image/preview/${index}`;
    },
    // --- END FIX ---

     // Add more API calls as needed
};

console.debug('模块 js/api.js 已加载.');
// --- END ADD ---