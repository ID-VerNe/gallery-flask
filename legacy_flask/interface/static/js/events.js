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
 * Initializes event handlers for the clear buttons.
 */
function initClearButtonHandlers() {
    if (elements.jpgFolderPathInput && elements.clearJpgPath) {
        // Initial check for visibility on load
        elements.clearJpgPath.style.display = elements.jpgFolderPathInput.value ? 'block' : 'none';

        elements.jpgFolderPathInput.addEventListener('input', () => {
            elements.clearJpgPath.style.display = elements.jpgFolderPathInput.value ? 'block' : 'none';
        });

        elements.clearJpgPath.addEventListener('click', () => {
            elements.jpgFolderPathInput.value = '';
            // Trigger input event to hide the clear button and potentially trigger debouncedUpdatePaths
            elements.jpgFolderPathInput.dispatchEvent(new Event('input'));
        });
    }

    if (elements.rawFolderPathInput && elements.clearRawPath) {
         // Initial check for visibility on load
        elements.clearRawPath.style.display = elements.rawFolderPathInput.value ? 'block' : 'none';

        elements.rawFolderPathInput.addEventListener('input', () => {
            elements.clearRawPath.style.display = elements.rawFolderPathInput.value ? 'block' : 'none';
        });

        elements.clearRawPath.addEventListener('click', () => {
            elements.rawFolderPathInput.value = '';
             // Trigger input event to hide the clear button and potentially trigger debouncedUpdatePaths
            elements.rawFolderPathInput.dispatchEvent(new Event('input'));
        });
    }
}


/**
 * Initializes all necessary event listeners on DOM elements.
 * Must be called after initElements(), initActions(), and initPanning().
 * @param {object} elementsRef The object holding DOM element references.
 * @param {object} actionsRef The actions module object.
 * @param {object} panningRef The panning module object.
 */
export function initEventHandlers(elementsRef, actionsRef, panningRef) {
    elements = elementsRef;
    actions = actionsRef;
    panning = panningRef;

    if (!elements || !actions || !panning) {
        console.error('模块 js/events.js: 无法初始化，缺少 elements, actions 或 panning 模块引用。');
        return;
    }

    initClearButtonHandlers(); // Initialize clear button handlers

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
                    const displayIndex = parseInt(thumbnailItem.dataset.displayIndex, 10); // Get display index
                    if (!isNaN(displayIndex)) {
                        actions.selectImageAction(displayIndex); // Pass display index to action
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

        if (elements.prevImageOverlayButton) {
            elements.prevImageOverlayButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent click from bubbling to image container
                actions.prevImageAction();
            });
        }
        if (elements.nextImageOverlayButton) {
            elements.nextImageOverlayButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent click from bubbling to image container
                actions.nextImageAction();
            });
        }

        if (elements.openRawButton) {
            elements.openRawButton.addEventListener('click', () => actions.openRawAction());
        }

        if (elements.toggleSortButton) { // Add event listener for the new sort button
            elements.toggleSortButton.addEventListener('click', () => actions.toggleSortDirectionAction());
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

                // If the click target is one of the overlay buttons, do not trigger image click logic
                if (event.target === elements.prevImageOverlayButton || event.target === elements.nextImageOverlayButton) {
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
