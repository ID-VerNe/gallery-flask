// --- ADD: UI Rendering and Update Module ---
import { FRONTEND_CONFIG } from './config.js';
// Need access to state and elements, which are passed during init
let elements;
let appState;
let api; // Need api to get image URLs

/**
 * Initializes the UI module with necessary dependencies.
 * @param {object} elementsRef The object holding DOM element references.
 * @param {object} appStateRef The frontend application state object.
 * @param {object} apiRef The api module object.
 */
export function initUI(elementsRef, appStateRef, apiRef) {
    console.debug('模块 js/ui.js: 初始化...');
    elements = elementsRef;
    appState = appStateRef; // Now ui module has access to shared state
    api = apiRef;           // Now ui module can get image URLs
    // Initial UI setup or updates can happen here if needed
    updateUI(); // Call initial update to set default states
    console.debug('模块 js/ui.js: 初始化完成.');
}

/**
 * Updates the entire UI based on the current application state.
 * This is the main function to call after any state change.
 */
export function updateUI() {
    console.info('UI: 开始更新界面...');
    updateInfoLabel(); // Update info text (index, filenames)
    updateNavigationButtons(); // Enable/disable nav buttons
    updatePreviewImage(); // Update main preview image
    highlightSelectedThumbnail(); // Highlight correct thumbnail
    // Note: Thumbnails are rendered once after load. No need to re-render whole list here.
    console.info('UI: 界面更新完成.');
}

/**
 * Updates the informational label text.
 */
export function updateInfoLabel() {
    // console.debug('UI: 更新信息标签...'); // Can be chatty
    const { currentIndex, totalImages, jpgFileName, rawFileName, jpgFolder, rawFolder, isLoaded, isLoading } = appState;

    let text = '请选择文件夹并加载...'; // Default message
    if (isLoading) {
        text = '加载中...';
    } else if (isLoaded && totalImages > 0) {
        const displayIndex = currentIndex + 1; // 1-based index for display
        text = ` ${displayIndex}/${totalImages}`;
    } else if (isLoaded && totalImages === 0) {
        text = '在选择的文件夹中没有找到匹配的图片对。';
    } else if (jpgFolder || rawFolder) {
        // If folders are selected but not loaded yet
         text = `已选择文件夹，等待加载... `;
    }

    if (elements.infoLabel) {
        elements.infoLabel.textContent = text;
         console.debug('UI: 信息标签更新为:', text);
    } else {
        console.warn('UI: 无法更新信息标签，elements.infoLabel 为 null.');
    }
}

/**
 * Renders the thumbnail list based on the loaded image pairs info.
 * This should ideally be called once after a successful load.
 * @param {Array<object>} imagePairsInfo The list of image pair info from state.imagePairsInfo.
 */
export function renderThumbnails(imagePairsInfo) {
    console.info(`UI: 开始渲染 ${imagePairsInfo.length} 个缩略图...`);
     if (!elements.thumbnailList) {
         console.error('UI: 无法渲染缩略图，elements.thumbnailList 为 null.');
         return;
     }

    // Clear current thumbnails
    elements.thumbnailList.innerHTML = '';
    // Disable panning on the old preview image before re-rendering (if it existed).
    // The new preview img will be attached by updatePreviewImage, panning re-initialized by app.js after load.
    // For now, panning init assumes the previewImage element is already in the DOM.

    const thumbnailWidth = FRONTEND_CONFIG.THUMBNAIL_WIDTH_PIXELS;
    // Calculate column count - rough estimation for grid layout
    // Let's manage grid template columns in CSS via a class or style property on thumbnail-list
    // Using `grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));` in CSS handles this dynamically based on parent width.
    // No need to calculate columns in JS unless specific fixed layouts are required.
    // Set a class for the thumbnail list container if needed for styling based on state.
    // elements.thumbnailList.style.gridTemplateColumns = `repeat(auto-fit, minmax(${thumbnailWidth}px, 1fr))`;

    if (!imagePairsInfo || imagePairsInfo.length === 0) {
         console.warn('UI: 没有图片对信息可用于渲染缩略图。');
        return;
    }

    const fragment = document.createDocumentFragment(); // Use fragment for performance
    imagePairsInfo.forEach(pair => {
        const index = pair.index;
        const thumbnailItem = document.createElement('div');
        thumbnailItem.classList.add('thumbnail-item');
        thumbnailItem.dataset.index = index; // Store index in data attribute

        const img = new Image(); // Use new Image() for loading
        img.classList.add('thumbnail-image');
        // Set a temporary low-res placeholder or loading state if available
        // img.src = 'placeholder.jpg'; // Optional placeholder
        img.alt = `Thumbnail ${index + 1}`;
        img.loading = 'lazy'; // Enable lazy loading for thumbnails

        const indexLabel = document.createElement('span');
        indexLabel.classList.add('thumbnail-index');
        indexLabel.textContent = `${index + 1}`; // 1-based index

        thumbnailItem.appendChild(img);
        thumbnailItem.appendChild(indexLabel);

         // --- Set thumbnail src using API URL ---
         // Setting src will trigger the browser to fetch the image from the backend API
         img.src = api.getThumbnailUrl(index);

         // Optional: Add error handling for individual thumbnail images
         img.onerror = () => {
              console.error(`UI: 加载缩略图失败 for index ${index}. URL: ${img.src}`);
              thumbnailItem.classList.add('error');
              img.alt = '加载失败'; // Update alt text
              indexLabel.textContent = '!Err!'; // Indicate error next to index
              // Remove the error source to prevent retries and display error info
              img.src = '';
         };
         img.onload = () => {
              // Optional: Remove loading class or do fade-in animation
         };

        fragment.appendChild(thumbnailItem);
    });

    elements.thumbnailList.appendChild(fragment);
    console.info(`UI: ${imagePairsInfo.length} 个缩略图渲染完成。`);

    // After rendering, ensure the initially selected thumbnail (index 0 if available) is highlighted
    highlightSelectedThumbnail();
}

/**
 * Updates the main preview image in the viewer.
 */
/**
 * Updates the main preview image in the viewer.
 */
export function updatePreviewImage() {
     console.debug('UI: 更新预览图片...');
     if (!elements.previewImage || !elements.imageContainer) {
          console.error('UI: 无法更新预览图片，elements.previewImage 或 elements.imageContainer 为 null.');
          return;
     }

    const { currentIndex } = appState;

    if (currentIndex !== -1 && appState.imagePairsInfo.length > 0) {
        // There is a selected image
         // --- FIX: Get URL using the currentIndex ---
        const previewUrl = api.getPreviewUrl(currentIndex); // Pass the current index
         // --- END FIX ---

        console.info(`UI: 设置预览图片 src 到: ${previewUrl}`);

        // --- FIX: Show spinner BEFORE setting src ---
        showLoading();
        // --- END FIX ---

        // Ensure previously applied transforms/styles are reset before loading new image
        // Panning state should be reset here too, as a new image is loaded.
        // This assumes the panning module has a reset function callable here.
        // Let's assume panningModule.resetPanning() exists after initPanning is called.
        // If panningModule is not directly imported, need to pass it via initUI
        // For now, let's add a placeholder comment indicating the need to reset panning here.
        // TODO: Call a function from panning.js to reset pan/zoom state here!
        // Maybe the panning module should listen to some state change events, or be explicitly called.
        // For simplicity, let's call resetPanning directly if it's exported and available (ensure it's inited).
        // To avoid tight coupling, maybe the `initPanning` in `script.js` should return an object with `reset` method.
        // Let's push the panning reset logic to `script.js`'s image load listener for now, where initPanning is called.
        // Temporarily leaving this as a TODO.

        // Ensure the image element is visible *before* setting src if it was hidden
        elements.previewImage.style.display = 'block'; // Make visible

        // Ensure previously applied transforms/styles are reset for the *new* image load
        // These styles were already reset before load, but let's ensure objects are clean.
         elements.previewImage.style.transform = 'translate(-50%, -50%) scale(1)'; // Reset pan/zoom transform
         elements.previewImage.style.left = '50%'; // Reset positioning
         elements.previewImage.style.top = '50%';
         elements.previewImage.style.maxWidth = '100%'; // Reset size constraints
         elements.previewImage.style.maxHeight = '100%';
         elements.previewImage.style.width = 'auto'; // Reset manual dimensions
         elements.previewImage.style.height = 'auto';

        // Event listeners for the preview image loading state
         // --- FIX: Move hideLoading into load/error handlers ---
        const handlePreviewLoad = () => {
            console.info(`UI: 预览图片加载成功 (索引 ${currentIndex}).`);
             // Now the image element has its naturalWidth and naturalHeight
             // This is the moment to potentially reset panning/zoom state based on image dimensions vs container.
             // Let's call initPanning again or a reset function after image loads.
             // Temporarily leaving a TODO here - this interaction needs refinement.
             // TODO: After preview image loads, call a function to reset/initialize panning state based on loaded image dimensions.

             hideLoading(); // Hide spinner AFTER image is visually loaded
        };

        const handlePreviewError = () => {
            console.error(`UI: 加载预览图片失败 (索引 ${currentIndex}). URL: ${previewUrl}`);
            hideLoading(); // Hide spinner on error
            // Display an error message or placeholder in the preview area
             let errorPlaceholder = elements.imageContainer.querySelector('.image-error-placeholder');
             if (!errorPlaceholder) {
                 errorPlaceholder = document.createElement('div');
                 errorPlaceholder.classList.add('image-error-placeholder');
                 errorPlaceholder.style.cssText = 'text-align:center; color: grey; font-size: 1.2em; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 80%;'; // Basic styling
                 elements.imageContainer.appendChild(errorPlaceholder);
                 console.debug('UI: 创建并添加图片错误占位符。');
             }
             errorPlaceholder.textContent = `索引 ${currentIndex + 1} 图片加载失败或文件损坏。`; // Show user-friendly message
             console.debug('UI: 更新图片错误占位符文本。');

            // Hide the actual image element if it's there
             if (elements.previewImage) {
                  elements.previewImage.style.display = 'none';
              }
        };
         // --- END FIX ---

        // Remove old listeners before adding new ones to prevent duplicates
        // Use a capture flag or named function referenced by initPanning/resetPanning if event handlers are complex
        elements.previewImage.removeEventListener('load', handlePreviewLoad);
        elements.previewImage.removeEventListener('error', handlePreviewError);

        // Add new listeners
        elements.previewImage.addEventListener('load', handlePreviewLoad);
        elements.previewImage.addEventListener('error', handlePreviewError);

        // Clear previous error placeholder if any
        const existingErrorPlaceholder = elements.imageContainer.querySelector('.image-error-placeholder');
        if (existingErrorPlaceholder) {
            elements.imageContainer.removeChild(existingErrorPlaceholder);
            console.debug('UI: 移除旧的图片错误占位符。');
        }

        // Set the src to trigger loading
         // Setting src *after* adding listeners ensures listeners are active for the load/error event
        elements.previewImage.src = previewUrl;

    } else {
        // No image selected or list is empty, clear preview area
        console.info('UI: 没有选中的图片对，清除预览图片区域。');
        if (elements.previewImage) {
             elements.previewImage.style.display = 'none'; // Hide the img element
             elements.previewImage.src = ''; // Clear source

             // Also clear any error message placeholder if it exists
            const existingErrorPlaceholder = elements.imageContainer.querySelector('.image-error-placeholder');
            if (existingErrorPlaceholder) {
                 elements.imageContainer.removeChild(existingErrorPlaceholder);
                 console.debug('UI: 移除旧的图片错误占位符。');
            }

             // Reset panning state if no image is loaded
             // TODO: Call panning reset here too
        }
         hideLoading(); // Ensure spinner is hidden if no image is loaded
    }
}

/**
 * Enables or disables navigation and action buttons based on state.
 */
export function updateNavigationButtons() {
    // console.debug('UI: 更新导航按钮状态...'); // Can be chatty
    const { currentIndex, totalImages, isLoaded, isLoading } = appState;
     if (!elements.prevImageButton || !elements.nextImageButton || !elements.openRawButton || !elements.loadImagesButton) {
         console.error('UI: 无法更新导航按钮，elements 引用不完整.');
         return;
     }

    // Navigation buttons state
    const canNavigate = isLoaded && totalImages > 0 && !isLoading;
    const canGoPrev = canNavigate && currentIndex > 0;
    const canGoNext = canNavigate && currentIndex < totalImages - 1;
    const canOpenRaw = canNavigate && currentIndex !== -1; // Only if an image is selected

    elements.prevImageButton.disabled = !canGoPrev;
    elements.nextImageButton.disabled = !canGoNext;
    elements.openRawButton.disabled = !canOpenRaw;

    // Load button state (usually only enabled if paths are set and not loading)
    // Let's handle load button state based on input fields presence and loading status
    const jpgPathSet = elements.jpgFolderPathInput && elements.jpgFolderPathInput.value.length > 0;
    const rawPathSet = elements.rawFolderPathInput && elements.rawFolderPathInput.value.length > 0;
    elements.loadImagesButton.disabled = !(jpgPathSet && rawPathSet) || isLoading;

    console.debug(`UI: 导航按钮状态更新。当前索引: ${currentIndex}/${totalImages}. PrevDisabled: ${elements.prevImageButton.disabled}, NextDisabled: ${elements.nextImageButton.disabled}, OpenRawDisabled: ${elements.openRawButton.disabled}, LoadDisabled: ${elements.loadImagesButton.disabled}`);
}

/**
 * Highlights the currently selected thumbnail in the list.
 */
export function highlightSelectedThumbnail() {
    // console.debug('UI: 高亮当前选中的缩略图...'); // Can be chatty
    if (!elements.thumbnailList) {
         console.error('UI: 无法高亮缩略图，elements.thumbnailList 为 null.');
         return;
    }

    // Remove highlight from all items first
    elements.thumbnailList.querySelectorAll('.thumbnail-item.selected').forEach(item => {
        item.classList.remove('selected');
    });

    const { currentIndex } = appState;

    if (currentIndex !== -1 && 0 <= currentIndex < appState.imagePairsInfo.length) {
        // Find the thumbnail item corresponding to the current index
        const selectedItem = elements.thumbnailList.querySelector(`.thumbnail-item[data-index="${currentIndex}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            console.debug(`UI: 成功高亮缩略图索引: ${currentIndex}`);

            // Optional: Scroll thumbnail list to make the selected item visible
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
             console.debug(`UI: 滚动试图使索引 ${currentIndex} 可见。`);
        } else {
             console.warn(`UI: 无法找到索引为 ${currentIndex} 的缩略图元素进行高亮。`);
        }
    } else {
         console.debug('UI: 没有选中的图片对或索引无效, 不高亮任何缩略图。');
    }
}

/**
 * Shows the loading spinner.
 * Call before starting an asymmetrical operation.
 */
export function showLoading() {
     console.debug('UI: 显示加载指示器...');
     if (elements.loadingSpinner) {
         elements.loadingSpinner.style.display = 'block';
         elements.loadingSpinner.setAttribute('aria-hidden', 'false');
         appState.isLoading = true; // Update state
         updateNavigationButtons(); // Update button states based on loading
     } else {
         console.warn('UI: 无法显示加载指示器，elements.loadingSpinner 为 null.');
     }
}

/**
 * Hides the loading spinner.
 * Call after an asynchrous operation completes (success or fail).
 */
export function hideLoading() {
    console.debug('UI: 隐藏加载指示器...');
    if (elements.loadingSpinner) {
        elements.loadingSpinner.style.display = 'none';
        elements.loadingSpinner.setAttribute('aria-hidden', 'true');
        appState.isLoading = false; // Update state
        updateNavigationButtons(); // Update button states based on loading
    } else {
         console.warn('UI: 无法隐藏加载指示器，elements.loadingSpinner 为 null.');
    }
}

/**
 * Displays an error message to the user (e.g., in the info label or a dedicated area).
 * @param {string} message The error message to display.
 * @param {boolean} isTemporary If true, hides the message after a few seconds (WIP).
 */
export function showErrorMessage(message, isTemporary = false) {
    console.error('UI: 显示错误消息:', message);
     if (elements.infoLabel) {
         // Simple implementation: Append or set info label
         const originalInfo = elements.infoLabel.textContent; // Save current info
         elements.infoLabel.textContent = `错误: ${message}`;
         elements.infoLabel.style.color = 'red'; // Optional: highlight error color

         if (isTemporary) {
             // TODO: Implement temporary message display (e.g., using setTimeout)
             console.warn('UI: Temporary error message not fully implemented.');
             // setTimeout(() => {
             //     elements.infoLabel.textContent = originalInfo; // Restore original text
             //     elements.infoLabel.style.color = ''; // Reset color
             // }, 5000); // Display for 5 seconds
         }
     } else {
          console.warn('UI: 无法显示错误消息，elements.infoLabel 为 null.');
     }
     hideLoading(); // Assume an error means loading is finished/failed
     updateNavigationButtons(); // Ensure buttons are updated after loading state change
}

/**
 * Clears any displayed error message (if shown in the info label).
 */
export function clearErrorMessage() {
     console.debug('UI: 清除错误消息...');
     if (elements.infoLabel) {
          // Simple implementation: Restore original functionality or clear error color
         elements.infoLabel.style.color = ''; // Reset color
         updateInfoLabel(); // Redraw the label based on current state, which clears explicit error text set by showErrorMessage
     }
}

/**
 * Provides access to the cached DOM elements.
 * Must call initElements() first.
 * @returns {object} Object containing references to DOM elements.
 */
// --- FIX: Export the getElements function ---
export function getElements() {
    // Basic check if elements were initialized
    if (Object.keys(elements).length === 0 || !elements.jpgFolderPathInput) {
         console.warn('模块 js/elements.js: 在调用 getElements() 之前 initElements() 未被调用或初始化失败。返回空对象或部分对象。');
    }
    return elements; // Return the cached object
}
// --- END FIX ---

console.debug('模块 js/ui.js 已加载.');
// --- END ADD ---