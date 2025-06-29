import { FRONTEND_CONFIG } from './config.js';

let elements;
let appState;
let api;

/**
 * Initializes the UI module with necessary dependencies.
 * @param {object} elementsRef The object holding DOM element references.
 * @param {object} appStateRef The frontend application state object.
 * @param {object} apiRef The api module object.
 */
export function initUI(elementsRef, appStateRef, apiRef) {
    elements = elementsRef;
    appState = appStateRef;
    api = apiRef;

    // Removed appState.isSortedAscending and appState.originalImagePairsInfo initialization from here.
    // appState.isSortedAscending should be initialized in state.js or set by history in actions.js.
    // appState.originalImagePairsInfo is no longer needed as imagePairsInfo is always sorted.

    // Removed elements.toggleSortButton reference acquisition from here, it's handled in elements.js.

    updateUI();
}

/**
 * Updates the entire UI based on the current application state.
 * This is the main function to call after any state change.
 */
export function updateUI() {
    updateInfoLabel();
    updateNavigationButtons();
    updatePreviewImage();
    highlightSelectedThumbnail();
}

/**
 * Updates the informational label text.
 */
export function updateInfoLabel() {
    const { currentIndex, totalImages, jpgFolder, rawFolder, isLoaded, isLoading, current_image_metadata } = appState;

    let text = '请选择文件夹并加载...';
    if (isLoading) {
        text = '加载中...';
    } else if (isLoaded && totalImages > 0) {
        const displayIndex = currentIndex + 1;
        text = ` ${displayIndex}/${totalImages}`;

        if (current_image_metadata) {
            const { date_taken, camera_make, camera_model, lens_model } = current_image_metadata;

            if (date_taken) {
                // 格式化日期，例如 "YYYY:MM:DD HH:MM:SS" -> "YYYY-MM-DD HH:MM"
                const formattedDate = date_taken.replace(/(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').substring(0, 16);
                text += ` | 日期: ${formattedDate}`;
            }
            if (camera_make && camera_model) {
                text += ` | 相机: ${camera_make} ${camera_model}`;
            } else if (camera_make) {
                text += ` | 相机: ${camera_make}`;
            } else if (camera_model) {
                text += ` | 相机: ${camera_model}`;
            }
            if (lens_model) {
                text += ` | 镜头: ${lens_model}`;
            }
        }
    } else if (isLoaded && totalImages === 0) {
        text = '在选择的文件夹中没有找到匹配的图片对。';
    } else if (jpgFolder || rawFolder) {
        text = `已选择文件夹，等待加载... `;
    }

    if (elements.infoLabel) {
        elements.infoLabel.textContent = text;
    } else {
        console.warn('UI: 无法更新信息标签，elements.infoLabel 为 null.');
    }
}

/**
 * Renders the thumbnail list based on the loaded image pairs info.
 * This should ideally be called once after a successful load, or after sorting.
 */
export function renderThumbnails() {
    if (!elements.thumbnailList) {
        console.error('UI: 无法渲染缩略图，elements.thumbnailList 为 null.');
        return;
    }

    // Save current scroll position
    const scrollTop = elements.thumbnailList.scrollTop;

    elements.thumbnailList.innerHTML = '';

    // Use the sorted image pairs info from appState directly
    const imagePairsInfo = appState.imagePairsInfo;

    if (!imagePairsInfo || imagePairsInfo.length === 0) {
        return;
    }

    console.log('renderThumbnails: isSortedAscending', appState.isSortedAscending); // Log sort state
    console.log('renderThumbnails: imagePairsInfo', imagePairsInfo); // Log sorted array

    const fragment = document.createDocumentFragment();
    imagePairsInfo.forEach((pair, i) => { // Add 'i' as the index parameter
        const index = pair.index; // Use the original index for data-index and URL
        const thumbnailItem = document.createElement('div');
        thumbnailItem.classList.add('thumbnail-item');
        thumbnailItem.dataset.index = index; // Store original index
        thumbnailItem.dataset.displayIndex = i; // Store its index in the currently displayed (sorted) list

        const img = new Image();
        img.classList.add('thumbnail-image');
        img.alt = `Thumbnail ${index + 1}`;
        img.loading = 'lazy';

        const filenameLabel = document.createElement('span');
        filenameLabel.classList.add('thumbnail-filename');
        // Extract filename without extension
        const baseName = pair.base_name; // Assuming pair.base_name already exists and is the filename without extension
        filenameLabel.textContent = baseName;

        // Add 'modified-raw' class if the raw file has been modified
        if (pair.is_modified) {
            filenameLabel.classList.add('modified-raw');
        }

        thumbnailItem.appendChild(img);
        thumbnailItem.appendChild(filenameLabel);

        img.src = api.getThumbnailUrl(index); // Use original index for URL

        img.onerror = () => {
            console.error(`UI: 加载缩略图失败 for index ${index}. URL: ${img.src}`);
            thumbnailItem.classList.add('error');
            img.alt = '加载失败';
            filenameLabel.textContent = '!Err!'; // Update error text for filename label
            img.src = '';
        };
        img.onload = () => {
        };

        fragment.appendChild(thumbnailItem);
    });

    elements.thumbnailList.appendChild(fragment);

    // Restore scroll position
    elements.thumbnailList.scrollTop = scrollTop;

    highlightSelectedThumbnail(); // Highlight the currently selected image based on its original index
}

/**
 * Updates the main preview image in the viewer.
 */
export function updatePreviewImage() {
    if (!elements.previewImage || !elements.imageContainer) {
        console.error('UI: 无法更新预览图片，elements.previewImage 或 elements.imageContainer 为 null.');
        return;
    }

    const { currentIndex, imagePairsInfo } = appState;

    if (currentIndex !== -1 && imagePairsInfo.length > 0) {
        // Get the original index of the currently selected image from the sorted array
        const originalIndexForPreview = imagePairsInfo[currentIndex].index;
        const previewUrl = api.getPreviewUrl(originalIndexForPreview);

        showLoading();

        elements.previewImage.style.display = 'block';
        elements.previewImage.style.transform = 'translate(-50%, -50%) scale(1)';
        elements.previewImage.style.left = '50%';
        elements.previewImage.style.top = '50%';
        elements.previewImage.style.maxWidth = '100%';
        elements.previewImage.style.maxHeight = '100%';
        elements.previewImage.style.width = 'auto';
        elements.previewImage.style.height = 'auto';

        const handlePreviewLoad = () => {
            hideLoading();
        };

        const handlePreviewError = () => {
            console.error(`UI: 加载预览图片失败 (索引 ${currentIndex}). URL: ${previewUrl}`);
            hideLoading();
            let errorPlaceholder = elements.imageContainer.querySelector('.image-error-placeholder');
            if (!errorPlaceholder) {
                errorPlaceholder = document.createElement('div');
                errorPlaceholder.classList.add('image-error-placeholder');
                errorPlaceholder.style.cssText = 'text-align:center; color: grey; font-size: 1.2em; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 80%;';
                elements.imageContainer.appendChild(errorPlaceholder);
            }
            errorPlaceholder.textContent = `索引 ${currentIndex + 1} 图片加载失败或文件损坏。`;

            if (elements.previewImage) {
                elements.previewImage.style.display = 'none';
            }
        };

        elements.previewImage.removeEventListener('load', handlePreviewLoad);
        elements.previewImage.removeEventListener('error', handlePreviewError);

        elements.previewImage.addEventListener('load', handlePreviewLoad);
        elements.previewImage.addEventListener('error', handlePreviewError);

        const existingErrorPlaceholder = elements.imageContainer.querySelector('.image-error-placeholder');
        if (existingErrorPlaceholder) {
            elements.imageContainer.removeChild(existingErrorPlaceholder);
        }

        elements.previewImage.src = previewUrl;

    } else {
        if (elements.previewImage) {
            elements.previewImage.style.display = 'none';
            elements.previewImage.src = '';

            const existingErrorPlaceholder = elements.imageContainer.querySelector('.image-error-placeholder');
            if (existingErrorPlaceholder) {
                elements.imageContainer.removeChild(existingErrorPlaceholder);
            }
        }
        hideLoading();
    }
}

/**
 * Enables or disables navigation and action buttons based on state.
 */
export function updateNavigationButtons() {
    const { currentIndex, totalImages, isLoaded, isLoading } = appState;
    if (!elements.prevImageButton || !elements.nextImageButton || !elements.openRawButton || !elements.loadImagesButton || !elements.prevImageOverlayButton || !elements.nextImageOverlayButton) {
        console.error('UI: 无法更新导航按钮，elements 引用不完整.');
        return;
    }

    const canNavigate = isLoaded && totalImages > 0 && !isLoading;
    const canGoPrev = canNavigate && currentIndex > 0;
    const canGoNext = canNavigate && currentIndex < totalImages - 1;
    const canOpenRaw = canNavigate && currentIndex !== -1;

    elements.prevImageButton.disabled = !canGoPrev;
    elements.nextImageButton.disabled = !canGoNext;
    elements.prevImageOverlayButton.disabled = !canGoPrev; // Update overlay button
    elements.nextImageOverlayButton.disabled = !canGoNext; // Update overlay button
    // elements.openRawButton.disabled = !canOpenRaw; // 此行将由 setOpenRawButtonState 控制

    const jpgPathSet = elements.jpgFolderPathInput && elements.jpgFolderPathInput.value.length > 0;
    const rawPathSet = elements.rawFolderPathInput && elements.rawFolderPathInput.value.length > 0;
    elements.loadImagesButton.disabled = !(jpgPathSet || rawPathSet) || isLoading; // 允许只加载JPG
}

/**
 * Highlights the currently selected thumbnail in the list.
 */
export function highlightSelectedThumbnail() {
    if (!elements.thumbnailList) {
        console.error('UI: 无法高亮缩略图，elements.thumbnailList 为 null.');
        return;
    }

    elements.thumbnailList.querySelectorAll('.thumbnail-item.selected').forEach(item => {
        item.classList.remove('selected');
    });

    const { currentIndex, imagePairsInfo } = appState;

    if (currentIndex !== -1 && 0 <= currentIndex && currentIndex < imagePairsInfo.length) {
        // Get the original index of the currently selected image from the sorted array
        const originalIndexToHighlight = imagePairsInfo[currentIndex].index;

        // Find the thumbnail item using its data-index (which stores the original index)
        const selectedItem = elements.thumbnailList.querySelector(`.thumbnail-item[data-index="${originalIndexToHighlight}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            console.warn(`UI: 无法找到原始索引为 ${originalIndexToHighlight} 的缩略图进行高亮。`);
        }
    }
}

/**
 * Sets the disabled state of the 'Open RAW' button.
 * @param {boolean} enable If true, the button is enabled; otherwise, it's disabled.
 */
export function setOpenRawButtonState(enable) {
    if (elements.openRawButton) {
        elements.openRawButton.disabled = !enable;
    } else {
        console.warn('UI: 无法设置打开 RAW 按钮状态，elements.openRawButton 为 null.');
    }
}

/**
 * Shows the loading spinner.
 * Call before starting an asymmetrical operation.
 */
export function showLoading() {
    if (elements.loadingSpinner) {
        elements.loadingSpinner.style.display = 'block';
        elements.loadingSpinner.setAttribute('aria-hidden', 'false');
        appState.isLoading = true;
        updateNavigationButtons();
    } else {
        console.warn('UI: 无法显示加载指示器，elements.loadingSpinner 为 null.');
    }
}

/**
 * Hides the loading spinner.
 * Call after an asynchrous operation completes (success or fail).
 */
export function hideLoading() {
    if (elements.loadingSpinner) {
        elements.loadingSpinner.style.display = 'none';
        elements.loadingSpinner.setAttribute('aria-hidden', 'true');
        appState.isLoading = false;
        updateNavigationButtons();
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
        const originalInfo = elements.infoLabel.textContent;
        elements.infoLabel.textContent = `错误: ${message}`;
        elements.infoLabel.style.color = 'red';

        if (isTemporary) {
        }
    } else {
        console.warn('UI: 无法显示错误消息，elements.infoLabel 为 null.');
    }
    hideLoading();
    updateNavigationButtons();
}

/**
 * Clears any displayed error message (if shown in the info label).
 */
export function clearErrorMessage() {
    if (elements.infoLabel) {
        elements.infoLabel.style.color = '';
        updateInfoLabel();
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
