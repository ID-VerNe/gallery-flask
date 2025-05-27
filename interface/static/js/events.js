import { debounce } from './utils.js';

let elements;
let actions;

const debouncedUpdatePaths = debounce(function() {
    if (elements.jpgFolderPathInput && elements.rawFolderPathInput) {
        actions.updatePathsActionFromInput(elements.jpgFolderPathInput.value.trim(), elements.rawFolderPathInput.value.trim());
    }
}, 1000);

/**
 * Initializes all necessary event listeners on DOM elements.
 * Must be called after initElements() and initActions().
 * @param {object} elementsRef The object holding DOM element references.
 * @param {object} actionsRef The actions module object.
 */
export function initEventHandlers(elementsRef, actionsRef) {
    elements = elementsRef;
    actions = actionsRef;

    if (!elements || !actions) {
        console.error('模块 js/events.js: 无法初始化，缺少 elements 或 actions 模块引用。');
        return;
    }

    try {
        if (elements.browseJpgButton) {
            elements.browseJpgButton.addEventListener('click', () => actions.selectFolderAction('jpg'));
        }
        if (elements.browseRawButton) {
            elements.browseRawButton.addEventListener('click', () => actions.selectFolderAction('raw'));
        }

        if (elements.jpgFolderPathInput) {
            elements.jpgFolderPathInput.addEventListener('input', debouncedUpdatePaths);
        }
        if (elements.rawFolderPathInput) {
            elements.rawFolderPathInput.addEventListener('input', debouncedUpdatePaths);
        }

        if (elements.loadImagesButton) {
            elements.loadImagesButton.addEventListener('click', () => actions.loadFoldersAction());
        }

        if (elements.thumbnailList) {
            elements.thumbnailList.addEventListener('click', (event) => {
                const thumbnailItem = event.target.closest('.thumbnail-item');
                if (thumbnailItem && !thumbnailItem.classList.contains('error')) {
                    const index = parseInt(thumbnailItem.dataset.index, 10);
                    if (!isNaN(index)) {
                        actions.selectImageAction(index);
                    }
                }
            });
        }

        if (elements.prevImageButton) {
            elements.prevImageButton.addEventListener('click', () => actions.prevImageAction());
        }
        if (elements.nextImageButton) {
            elements.nextImageButton.addEventListener('click', () => actions.nextImageAction());
        }

        if (elements.openRawButton) {
            elements.openRawButton.addEventListener('click', () => actions.openRawAction());
        }

    } catch (error) {
        console.error('模块 js/events.js: 初始化事件监听器时发生错误:', error);
    }
}
