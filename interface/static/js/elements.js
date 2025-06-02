const elements = {};

/**
 * Finds and stores references to key DOM elements after the page loads.
 * Call this function once when the DOM is ready.
 */
export function initElements() {
    try {
        elements.jpgFolderPathInput = document.getElementById('jpg-folder-path');
        elements.rawFolderPathInput = document.getElementById('raw-folder-path');
        elements.browseJpgButton = document.getElementById('browse-jpg-button');
        elements.browseRawButton = document.getElementById('browse-raw-button');
        elements.clearJpgPath = document.getElementById('clear-jpg-path');
        elements.clearRawPath = document.getElementById('clear-raw-path');
        elements.browseJpgHidden = document.getElementById('browse-jpg-hidden');
        elements.browseRawHidden = document.getElementById('browse-raw-hidden');
        elements.loadImagesButton = document.getElementById('load-images-button');
        elements.imagePreview = document.querySelector('.image-preview');
        elements.imageContainer = document.getElementById('image-container');
        elements.loadingSpinner = document.getElementById('loading-spinner');
        elements.thumbnailList = document.querySelector('.thumbnail-list');
        elements.infoLabel = document.getElementById('info-label');
        elements.prevImageButton = document.getElementById('prev-image-button');
        elements.nextImageButton = document.getElementById('next-image-button');
        elements.openRawButton = document.getElementById('open-raw-button');
        elements.toggleSortButton = document.getElementById('toggle-sort-button');
        elements.prevImageOverlayButton = document.getElementById('prev-image-overlay-button'); // Add this line
        elements.nextImageOverlayButton = document.getElementById('next-image-overlay-button'); // Add this line

        elements.previewImage = new Image();
        elements.previewImage.id = 'preview-image';
        elements.previewImage.alt = 'Preview Image';
        elements.previewImage.style.display = 'none';
        elements.imageContainer.appendChild(elements.previewImage);

        if (!elements.jpgFolderPathInput || !elements.loadImagesButton || !elements.imageContainer || !elements.thumbnailList || !elements.infoLabel || !elements.prevImageButton || !elements.nextImageButton || !elements.openRawButton || !elements.previewImage || !elements.toggleSortButton || !elements.prevImageOverlayButton || !elements.nextImageOverlayButton) { // Add overlay buttons to the check
            console.error('模块 js/elements.js: 未找到一个或多个关键 DOM 元素！请检查 index.html.');
        }
    } catch (error) {
        console.error('模块 js/elements.js: 初始化 DOM 元素引用时发生错误:', error);
    }
}

/**
 * Provides access to the cached DOM elements.
 * Must call initElements() first.
 * @returns {object} Object containing references to DOM elements.
 */
export function getElements() {
    if (Object.keys(elements).length === 0 || !elements.jpgFolderPathInput) {
        console.warn('模块 js/elements.js: 在调用 getElements() 之前 initElements() 未被调用或初始化失败。返回空对象或部分对象。');
    }
    return elements;
}
