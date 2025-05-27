// --- ADD: Event Handling Module ---

import { debounce } from './utils.js';
// Needs access to elements and actions
let elements;
let actions;

// Create a debounced version of the updatePaths action
const debouncedUpdatePaths = debounce(function() {
     if (elements.jpgFolderPathInput && elements.rawFolderPathInput) {
        actions.updatePathsActionFromInput(elements.jpgFolderPathInput.value.trim(), elements.rawFolderPathInput.value.trim());
     } else {
         console.warn('Events: 无法从输入框获取路径进行防抖保存。');
     }
}, 1000); // Save path 1 second after last input change

/**
 * Initializes all necessary event listeners on DOM elements.
 * Must be called after initElements() and initActions().
 * @param {object} elementsRef The object holding DOM element references.
 * @param {object} actionsRef The actions module object.
 */
export function initEventHandlers(elementsRef, actionsRef) {
    console.debug('模块 js/events.js: 初始化事件监听器...');
    elements = elementsRef;
    actions = actionsRef;

    if (!elements || !actions) {
         console.error('模块 js/events.js: 无法初始化，缺少 elements 或 actions 模块引用。');
         return;
    }

    try {
        // --- Folder Selection Buttons ---
        if (elements.browseJpgButton) {
            elements.browseJpgButton.addEventListener('click', () => actions.selectFolderAction('jpg'));
            console.debug('Events: 添加 browseJpgButton 点击监听.');
        }
        if (elements.browseRawButton) {
             elements.browseRawButton.addEventListener('click', () => actions.selectFolderAction('raw'));
             console.debug('Events: 添加 browseRawButton 点击监听.');
        }
        // Note: The hidden file inputs are placeholders based on your HTML.
        // We're currently using the backend API which triggers Tkinter dialog.
        // If you switch to pure frontend file input, you'd listen to 'change' on browseJpgHidden/browseRawHidden.

        // --- Manual Path Input Change ---
        if (elements.jpgFolderPathInput) {
             // Use 'input' event for immediate feedback while typing, 'change' happens on blur
             // Debounce the save action to avoid saving on every keystroke
            elements.jpgFolderPathInput.addEventListener('input', debouncedUpdatePaths);
             console.debug('Events: 添加 jpgFolderPathInput 输入监听 (防抖保存).');
        }
        if (elements.rawFolderPathInput) {
            elements.rawFolderPathInput.addEventListener('input', debouncedUpdatePaths);
            console.debug('Events: 添加 rawFolderPathInput 输入监听 (防抖保存).');
        }

        // --- Load Button ---
        if (elements.loadImagesButton) {
            elements.loadImagesButton.addEventListener('click', () => actions.loadFoldersAction());
            console.debug('Events: 添加 loadImagesButton 点击监听.');
             // Initial state handled by ui.updateNavigationButtons() during app.js initialization
        }

        // --- Thumbnail List Click (Event Delegation) ---
        // Listen for clicks on the thumbnail list container and check if a thumbnail item was clicked.
        if (elements.thumbnailList) {
            elements.thumbnailList.addEventListener('click', (event) => {
                const thumbnailItem = event.target.closest('.thumbnail-item');
                if (thumbnailItem && !thumbnailItem.classList.contains('error')) { // Ignore clicks on error items if you want
                    const index = parseInt(thumbnailItem.dataset.index, 10);
                    if (!isNaN(index)) {
                         console.debug(`Events: 检测到缩略图项目点击，索引 ${index}.`);
                        actions.selectImageAction(index); // Trigger select image action
                    } else {
                         console.warn('Events: 点击的缩略图项目没有有效的 data-index.');
                    }
                }
            });
            console.debug('Events: 添加 thumbnailList 点击监听 (事件委托).');
        }

        // --- Navigation Buttons ---
        if (elements.prevImageButton) {
            elements.prevImageButton.addEventListener('click', () => actions.prevImageAction());
            console.debug('Events: 添加 prevImageButton 点击监听.');
            // Initial state handled by ui.updateNavigationButtons() during app.js initialization
        }
        if (elements.nextImageButton) {
             elements.nextImageButton.addEventListener('click', () => actions.nextImageAction());
             console.debug('Events: 添加 nextImageButton 点击监听.');
             // Initial state handled by ui.updateNavigationButtons() during app.js initialization
        }

        // --- Open RAW Button ---
        if (elements.openRawButton) {
            elements.openRawButton.addEventListener('click', () => actions.openRawAction());
            console.debug('Events: 添加 openRawButton 点击监听.');
             // Initial state handled by ui.updateNavigationButtons() during app.js initialization
        }

        // --- Image Preview Interaction ( delegated to panning module ) ---
        // No need to add panning/zoom event listeners here, they are handled by panning.js

        console.debug('模块 js/events.js: 事件监听器初始化完成。');

    } catch (error) {
        console.error('模块 js/events.js: 初始化事件监听器时发生错误:', error);
        // Report error through UI if possible after ui module is initialized
        // if (actions && actions.showErrorMessage) { // Check if actions object has access to errorMessage function
        //      actions.showErrorMessage('初始化事件处理时发生错误.');
        // }
    }
}

console.debug('模块 js/events.js 已加载.');
// --- END ADD ---