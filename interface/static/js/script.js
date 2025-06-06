import * as elementsModule from './elements.js';
import { appState } from './state.js';
import { FRONTEND_CONFIG } from './config.js';
import { api } from './api.js';
import * as uiModule from './ui.js';
import * as actionsModule from './actions.js';
import * as eventsModule from './events.js';
import * as panningModule from './panning.js';
import * as keyboardModule from './keyboard.js';
import { debounce } from './utils.js';

/**
 * The main initialization function for the frontend application.
 * Called when the DOM is fully loaded.
 */
function mainInit() {
    try {
        elementsModule.initElements();
        const elements = elementsModule.getElements();

        if (!elements || !elements.previewImage || !elements.imageContainer) {
            console.error('Main Init: DOM elements初始化失败，无法继续。');
            document.body.innerHTML = '<div style="color: red; text-align: center; margin-top: 20%;">应用程序启动失败：缺少关键界面元素。请检查控制台获取详情。</div>';
            return;
        }
        uiModule.initUI(elements, appState, api);

        actionsModule.initActions(api, uiModule, appState, FRONTEND_CONFIG);

        // Removed the event listener for the toggle sort button from here.
        // It is now handled in events.js, calling actionsModule.toggleSortDirectionAction().

        eventsModule.initEventHandlers(elements, actionsModule, panningModule); // Removed debounce from here, it's handled internally by events.js

        panningModule.initPanning(elements.previewImage, elements.imageContainer);

        keyboardModule.initKeyboardShortcuts(actionsModule, appState);

        actionsModule.initialLoadAction();

    } catch (error) {
        console.critical('Frontend Application encountered a fatal error during initialization:', error);
        if (uiModule && uiModule.showErrorMessage) {
            uiModule.showErrorMessage('应用程序初始化失败: ' + error.message, false);
            uiModule.hideLoading();
        } else {
            document.body.innerHTML = '<div style="color: red; text-align: center; margin-top: 20%;">应用程序启动失败：' + error.message + '<br>请检查控制台获取更详细信息。</div>';
        }

    }
}

document.addEventListener('DOMContentLoaded', mainInit);
