// --- ADD: Centralized DOM Elements Access ---
// Object to hold references to key DOM elements
const elements = {};

/**
 * Finds and stores references to key DOM elements after the page loads.
 * Call this function once when the DOM is ready.
 */
export function initElements() {
    console.debug('模块 js/elements.js: 初始化 DOM 元素引用...');
    try {
        elements.jpgFolderPathInput = document.getElementById('jpg-folder-path');
        elements.rawFolderPathInput = document.getElementById('raw-folder-path');
        elements.browseJpgButton = document.getElementById('browse-jpg-button');
        elements.browseRawButton = document.getElementById('browse-raw-button');
        elements.browseJpgHidden = document.getElementById('browse-jpg-hidden'); // Assuming this element exists for potential future use with <input type="file" directory>
        elements.browseRawHidden = document.getElementById('browse-raw-hidden'); // Assuming this element exists
        elements.loadImagesButton = document.getElementById('load-images-button');
        elements.imagePreview = document.querySelector('.image-preview'); // Container for preview handling
        elements.imageContainer = document.getElementById('image-container'); // The panning container
        // elements.previewImage = null; // The img element will be created dynamically, initialize here
        elements.loadingSpinner = document.getElementById('loading-spinner');
        elements.thumbnailList = document.querySelector('.thumbnail-list');
        elements.infoLabel = document.getElementById('info-label');
        elements.prevImageButton = document.getElementById('prev-image-button');
        elements.nextImageButton = document.getElementById('next-image-button');
        elements.openRawButton = document.getElementById('open-raw-button');

        // Create the preview image element once
        // We create it here so panning.js and ui.js can reliably access it.
        elements.previewImage = new Image();
        elements.previewImage.id = 'preview-image'; // Add an ID for potential CSS/debugging
        elements.previewImage.alt = 'Preview Image';
        elements.previewImage.style.display = 'none'; // Initially hidden
        // Append it to the container where it belongs
        elements.imageContainer.appendChild(elements.previewImage);

        // Basic check to ensure critical elements are found
        if (!elements.jpgFolderPathInput || !elements.loadImagesButton || !elements.imageContainer || !elements.thumbnailList || !elements.infoLabel || !elements.prevImageButton || !elements.nextImageButton || !elements.openRawButton || !elements.previewImage) {
            console.error('模块 js/elements.js: 未找到一个或多个关键 DOM 元素！请检查 index.html.');
            // Depending on criticality, you might want to stop the app or disable functionality
        } else {
             console.debug('模块 js/elements.js: 所有关键 DOM 元素引用获取成功。');
        }

    } catch (error) {
        console.error('模块 js/elements.js: 初始化 DOM 元素引用时发生错误:', error);
        // Handle error as appropriate for the application
    }
}

/**
 * Provides access to the cached DOM elements.
 * Must call initElements() first.
 * @returns {object} Object containing references to DOM elements.
 */
export function getElements() {
    // Basic check if elements were initialized
    if (Object.keys(elements).length === 0 || !elements.jpgFolderPathInput) {
         console.warn('模块 js/elements.js: 在调用 getElements() 之前 initElements() 未被调用或初始化失败。返回空对象或部分对象。');
    }
    return elements; // Return the cached object
}

console.debug('模块 js/elements.js 已加载.');
// --- END ADD ---