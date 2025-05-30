import { debounce } from './utils.js';

let elements;
let actions;
let panning; // Add panning module reference

let mouseDownX = 0; // To store mouse down X coordinate for drag detection
let mouseDownY = 0; // To store mouse down Y coordinate for drag detection
const DRAG_THRESHOLD = 5; // Pixels threshold to consider it a drag

let lastClickTime = 0; // To track time of the last click
let clickTimer = null; // To hold the timer for single click

const DOUBLE_CLICK_THRESHOLD = 200; // Milliseconds threshold for double click

const debouncedUpdatePaths = debounce(function() {
    if (elements.jpgFolderPathInput && elements.rawFolderPathInput) {
        actions.updatePathsActionFromInput(elements.jpgFolderPathInput.value.trim(), elements.rawFolderPathInput.value.trim());
    }
}, 1000);

/**
 * Initializes all necessary event listeners on DOM elements.
 * Must be called after initElements(), initActions(), and initPanning().
 * @param {object} elementsRef The object holding DOM element references.
 * @param {object} actionsRef The actions module object.
 * @param {object} panningRef The panning module object. // Add panningRef parameter
 */
export function initEventHandlers(elementsRef, actionsRef, panningRef) { // Accept panningRef
    elements = elementsRef;
    actions = actionsRef;
    panning = panningRef; // Store panning reference

    if (!elements || !actions || !panning) { // Check for panning reference
        console.error('模块 js/events.js: 无法初始化，缺少 elements, actions 或 panning 模块引用。');
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

        // Add custom click/double-click and drag handling for the image container
        if (elements.imageContainer) {
            // Record mouse down position for drag detection
            elements.imageContainer.addEventListener('mousedown', (event) => {
                if (event.button === 0) { // Only for left mouse button
                    mouseDownX = event.clientX;
                    mouseDownY = event.clientY;
                }
            });

            // Handle potential click or double-click on mouse up
            elements.imageContainer.addEventListener('mouseup', (event) => {
                if (event.button !== 0) return; // Only for left mouse button

                // Check if it was a drag
                const mouseUpX = event.clientX;
                const mouseUpY = event.clientY;
                const distance = Math.sqrt(Math.pow(mouseUpX - mouseDownX, 2) + Math.pow(mouseUpY - mouseDownY, 2));

                if (distance > DRAG_THRESHOLD) {
                    // It was a drag, do not trigger click/double-click logic
                    return;
                }

                // It was a click (or part of a double-click)
                const currentTime = new Date().getTime();
                const timeSinceLastClick = currentTime - lastClickTime;

                if (timeSinceLastClick <= DOUBLE_CLICK_THRESHOLD) {
                    // This is the second click of a double-click
                    clearTimeout(clickTimer); // Clear the pending single click timer
                    clickTimer = null;
                    lastClickTime = 0; // Reset for next click sequence
                    panning.resetPanning(); // Execute double-click action
                } else {
                    // This is the first click of a potential double-click, or a single click
                    lastClickTime = currentTime;
                    const clickX = event.clientX - elements.imageContainer.getBoundingClientRect().left;
                    const clickY = event.clientY - elements.imageContainer.getBoundingClientRect().top;

                    clickTimer = setTimeout(() => {
                        // If the timer fires, it's a single click
                        if (lastClickTime !== 0) { // Check if it hasn't been reset by a second click
                            panning.zoomInAt(clickX, clickY); // Execute single-click action
                            lastClickTime = 0; // Reset for next click sequence
                        }
                    }, DOUBLE_CLICK_THRESHOLD);
                }
            });

            // Prevent default dblclick behavior
            elements.imageContainer.addEventListener('dblclick', (event) => {
                event.preventDefault();
            });
        }


    } catch (error) {
        console.error('模块 js/events.js: 初始化事件监听器时发生错误:', error);
    }
}
