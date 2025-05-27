// --- FIX: Correct import paths for ES Modules ---
// This file imports and initializes all other modules.

// Correct the import paths to be relative to the 'js' directory, not relative to script.js AND then into a 'js' subdirectory
import * as elementsModule from './elements.js'; // Correct path
import { appState } from './state.js'; // Correct path
import { FRONTEND_CONFIG } from './config.js'; // Correct path
import { api } from './api.js';         // Correct path
import * as uiModule from './ui.js'; // Correct path
import * as actionsModule from './actions.js'; // Correct path
import * as eventsModule from './events.js'; // Correct path
import * as panningModule from './panning.js'; // Correct path
import * as keyboardModule from './keyboard.js'; // Correct path
import { debounce } from './utils.js'; // Import specific utility if needed, or import * as utils
// --- END FIX ---

/**
 * The main initialization function for the frontend application.
 * Called when the DOM is fully loaded.
 */
function mainInit() {
    console.info('Frontend Application starting...'); // Main entry point info log

    try {
        // 1. Initialize Elements Module: Get references to all DOM elements
        elementsModule.initElements();
        const elements = elementsModule.getElements(); // Get the cached elements object

        // 2. Initialize UI Module: Provide elements and state, then get UI update functions
        // Make sure the previewImage element has been created by initElements before passing to UI/Panning
        if (!elements || !elements.previewImage || !elements.imageContainer) {
             console.error('Main Init: DOM elements初始化失败，无法继续。');
             // Display a fatal error message directly to the body if infoLabel is not available
             document.body.innerHTML = '<div style="color: red; text-align: center; margin-top: 20%;">应用程序启动失败：缺少关键界面元素。请检查控制台获取详情。</div>';
             return; // Stop initialization
        }
        uiModule.initUI(elements, appState, api); // Pass elements, state, and api

        // 3. Initialize Actions Module: Provide api, ui, state, and config
        actionsModule.initActions(api, uiModule, appState, FRONTEND_CONFIG); // Pass dependencies

        // 4. Initialize Events Module: Attach listeners, providing elements and actions
        // Include the debounced function if needed for event handling here
        eventsModule.initEventHandlers(elements, actionsModule, { debouncedUpdatePaths: debounce }); // Pass debounce if events module uses it directly, or move debounce into utils and import there

        // 5. Initialize Panning Module: Attach listeners for the preview image
        panningModule.initPanning(elements.previewImage, elements.imageContainer);

        // 6. Initialize Keyboard Shortcuts Module: Attach listeners
        keyboardModule.initKeyboardShortcuts(actionsModule, appState); // Pass actions and state

        // 7. Perform Initial Load Action (fetch default paths and load if available)
        // This action will show/hide loading spinner and update UI based on its result
        actionsModule.initialLoadAction();

        console.info('Frontend Application initialization complete.');

    } catch (error) {
        console.critical('Frontend Application encountered a fatal error during initialization:', error); // Critical log for startup failure
        // Display an error message if UI module is not fully initialized
        if (uiModule && uiModule.showErrorMessage) {
             uiModule.showErrorMessage('应用程序初始化失败: ' + error.message, false);
             uiModule.hideLoading(); // Ensure spinner is hidden
        } else {
             // Fallback if UI module failed to initialize
             document.body.innerHTML = '<div style="color: red; text-align: center; margin-top: 20%;">应用程序启动失败：' + error.message + '<br>请检查控制台获取更详细信息。</div>';
        }

    }
}

// Wait for the DOM to be fully loaded before running the main initialization function
document.addEventListener('DOMContentLoaded', mainInit);

console.debug('模块 script.js (主入口) 已加载.');