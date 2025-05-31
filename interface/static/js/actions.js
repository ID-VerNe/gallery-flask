import { FRONTEND_CONFIG } from './config.js';

let api;
let ui;
let appState; // Remove the initialization here
let config;

/**
 * Initializes the Actions module with necessary dependencies.
 * @param {object} apiRef The api module object.
 * @param {object} uiRef The ui module object.
 * @param {object} appStateRef The frontend application state object.
 * @param {object} configRef The frontend config object.
 */
export function initActions(apiRef, uiRef, appStateRef, configRef) {
    api = apiRef;
    ui = uiRef;
    appState = appStateRef;
    config = configRef;
}

/**
 * Handles the action of selecting a folder via native dialog.
 * @param {string} type 'jpg' or 'raw'.
 * @returns {Promise<string|null>} Promise resolving with selected path or null if cancelled/failed.
 */
export async function selectFolderAction(type) {
    ui.clearErrorMessage();

    try {
        ui.showLoading();
        const response = await api.selectFolder(type, appState[type + 'Folder']);
        ui.hideLoading();

        if (response && response.success) {
            const elements = ui.getElements();
            if (type === 'jpg' && elements.jpgFolderPathInput) {
                elements.jpgFolderPathInput.value = response.path;
                appState.jpgFolder = response.path;
            } else if (type === 'raw' && elements.rawFolderPathInput) {
                elements.rawFolderPathInput.value = response.path;
                appState.rawFolder = response.path;
            }
            ui.updateNavigationButtons();
            return response.path;
        } else {
            ui.showErrorMessage(response ? response.message : '选择文件夹操作失败.', true);
            return null;
        }
    } catch (error) {
        console.error(`Actions: 选择文件夹 (${type}) API 调用失败:`, error);
        ui.hideLoading();
        ui.showErrorMessage(`选择文件夹失败: ${error.message}`, false);
        throw error;
    }
}

/**
 * Handles the action of loading image folders.
 * Gets paths from input fields, calls API, updates state and UI.
 */
export async function loadFoldersAction() {
    ui.clearErrorMessage();

    // Reset sort direction on new folder load (This should be handled by appState.isSortedAscending default in state.js or initial load from history)
    // appState.isSortedAscending = true; // Remove this line, it will be set by history or default in state.js

    const elements = ui.getElements();
    if (!elements.jpgFolderPathInput || !elements.rawFolderPathInput) {
        ui.showErrorMessage('应用程序错误: 无法获取文件夹输入框引用。');
        return;
    }

    const jpgPath = elements.jpgFolderPathInput.value.trim();
    const rawPath = elements.rawFolderPathInput.value.trim();

    // 如果 JPG 路径为空，则报错。如果 RAW 路径为空，则允许进入看图模式。
    if (!jpgPath) {
        ui.showErrorMessage('请指定 JPG 文件夹路径才能加载。', true);
        return;
    }

    ui.showLoading();
    ui.updateNavigationButtons();

    let initialIndex = null;
    let sortOrder = null;

    console.log('Actions: Attempting to load history...'); // Add this log
    // 尝试加载历史记录
    try {
        const historyResponse = await api.loadHistory(jpgPath);
        console.log('Actions: loadHistory response:', historyResponse); // Add this log
        if (historyResponse && historyResponse.success && historyResponse.history) {
            initialIndex = historyResponse.history.last_index;
            sortOrder = historyResponse.history.sort_order;
            console.log(`Actions: 找到历史记录，初始索引: ${initialIndex}, 排序方式: ${sortOrder}`);
        } else {
            console.log('Actions: 未找到历史记录或加载失败，使用默认设置。');
        }
    } catch (error) {
        console.error('Actions: 加载历史记录 API 调用失败:', error);
        // 继续加载，但不使用历史记录
    }

    console.log('Actions: Proceeding to load folders...'); // Add this log

    try {
        // 调用后端 load_folders，传递历史记录中的索引和排序方式
        const response = await api.loadFolders(jpgPath, rawPath, initialIndex, sortOrder);

        if (response && response.success) {
            appState.imagePairsInfo = response.image_pairs_info || [];
            appState.currentIndex = response.current_index;
            appState.totalImages = response.total_images;
            appState.jpgFolder = response.jpg_folder;
            appState.rawFolder = response.raw_folder;
            appState.isLoaded = true;
            appState.current_image_metadata = response.current_image_metadata || {};
            appState.isViewerMode = response.is_viewer_mode;
            appState.sortOrder = response.sort_order; // Store the sort order from backend

            // Apply initial sort direction
            if (sortOrder !== null && sortOrder !== undefined) {
                appState.isSortedAscending = (sortOrder === 'asc'); // Set based on loaded history
            } else {
                appState.isSortedAscending = true; // Default to ascending if no history
            }

            // Sort the image pairs based on the current sort direction
            sortImagePairs(); // This will sort appState.imagePairsInfo directly

            // Store the original image pairs info (This is no longer needed if imagePairsInfo is always sorted)
            // appState.originalImagePairsInfo = [...appState.imagePairsInfo]; // Remove this line

            ui.renderThumbnails();
            ui.updateUI();
            ui.setOpenRawButtonState(!appState.isViewerMode);

            // Save loaded history (current index and sort order)
            if (appState.isLoaded) {
                saveHistoryAction();
            }


            api.updatePaths(jpgPath, rawPath).catch(configError => {
                console.error('Actions: 后台保存加载的路径到 .env 失败:', configError);
                ui.showErrorMessage(`加载成功，但保存默认路径失败: ${configError.message}`, true);
            });
        } else {
            const message = response && response.message ? `后端错误: ${response.message}` : '加载图片对时发生未知错误。';
            appState.imagePairsInfo = [];
            appState.currentIndex = -1;
            appState.totalImages = 0;
            appState.isLoaded = false;
            appState.sortOrder = "time_filename"; // Reset sort order on failure

            ui.renderThumbnails([]);
            ui.updateUI();
            ui.showErrorMessage(message, false);
        }

    } catch (error) {
        console.error('Actions: loadFolders API 调用失败:', error);
        appState.imagePairsInfo = [];
        appState.currentIndex = -1;
        appState.totalImages = 0;
        appState.isLoaded = false;
        appState.sortOrder = "time_filename"; // Reset sort order on failure

        ui.renderThumbnails([]);
        ui.updateUI();
        ui.showErrorMessage(`加载图片对失败: ${error.message}`, false);
    } finally {
        ui.hideLoading();
        ui.updateNavigationButtons();
    }
}

/**
 * Handles the action of selecting a specific image by its display index.
 * @param {number} displayIndex The 0-based display index from the currently sorted list.
 */
export async function selectImageAction(displayIndex) {
    ui.clearErrorMessage();

    if (displayIndex < 0 || displayIndex >= appState.totalImages) {
        ui.showErrorMessage(`无效的图片索引: ${displayIndex + 1}.`, true);
        return;
    }

    // Get the original index from the imagePairsInfo array using the displayIndex
    const originalIndex = appState.imagePairsInfo[displayIndex].index;
    console.log(`Actions: 尝试选择显示索引 ${displayIndex} (原始索引 ${originalIndex})`);

    ui.updateNavigationButtons();

    try {
        // Pass the original index to the backend API
        const response = await api.selectImage(originalIndex);

        if (response && response.success) {
            // Backend returns the original index, but we need to find its new display index
            // This is crucial for maintaining the correct highlight and preview after selection
            const newDisplayIndex = appState.imagePairsInfo.findIndex(pair => pair.index === response.current_index);
            if (newDisplayIndex !== -1) {
                appState.currentIndex = newDisplayIndex; // Update appState.currentIndex with the display index
            } else {
                console.warn(`Actions: selectImageAction 无法在排序后的列表中找到原始索引 ${response.current_index} 对应的显示索引。`);
                appState.currentIndex = 0; // Fallback
            }

            appState.current_image_metadata = response.current_image_metadata || {};
            ui.updateUI();
            saveHistoryAction(); // Save history with the original index
        } else {
            const message = response && response.message ? `后端错误: ${response.message}` : '选择图片时发生未知错误。';
            ui.showErrorMessage(message, false);
        }

    } catch (error) {
        console.error(`Actions: selectImage API 调用失败 for display index ${displayIndex} (original index ${originalIndex}):`, error);
        ui.showErrorMessage(`选择图片失败: ${error.message}`, false);
    } finally {
        ui.updateNavigationButtons();
    }
}

/**
 * Handles the action of navigating to the next image.
 */
export async function nextImageAction() {
    ui.clearErrorMessage();

    if (appState.currentIndex >= appState.totalImages - 1 || appState.currentIndex === -1) {
        if (!appState.isLoaded || appState.currentIndex === -1) { ui.showErrorMessage('请先加载图片或选择一张图片。', true); }
        else { ui.showErrorMessage('已是最后一张图片。', true); }
        return;
    }

    ui.updateNavigationButtons();

    try {
        const response = await api.nextImage();

        if (response && response.success) {
            appState.currentIndex = response.current_index;
            appState.current_image_metadata = response.current_image_metadata || {}; // 添加此行
            ui.updateUI();
            saveHistoryAction(); // 保存历史记录
        } else {
            const message = response && response.message ? `后端错误: ${response.message}` : '切换到下一张图片时发生未知错误。';
            ui.showErrorMessage(message, false);
        }

    } catch (error) {
        console.error('Actions: nextImage API 调用失败:', error);
        ui.showErrorMessage(`切换到下一张图片失败: ${error.message}`, false);
    } finally {
        ui.updateNavigationButtons();
    }
}

/**
 * Handles the action of navigating to the previous image.
 */
export async function prevImageAction() {
    ui.clearErrorMessage();

    if (appState.currentIndex <= 0 || appState.currentIndex === -1) {
        if (!appState.isLoaded || appState.currentIndex === -1) { ui.showErrorMessage('请先加载图片或选择一张图片。', true); }
        else { ui.showErrorMessage('已是第一张图片。', true); }
        return;
    }

    ui.updateNavigationButtons();

    try {
        const response = await api.prevImage();

        if (response && response.success) {
            appState.currentIndex = response.current_index;
            appState.current_image_metadata = response.current_image_metadata || {}; // 添加此行
            ui.updateUI();
            saveHistoryAction(); // 保存历史记录
        } else {
            const message = response && response.message ? `后端错误: ${response.message}` : '切换到上一张图片时发生未知错误。';
            ui.showErrorMessage(message, false);
        }

    } catch (error) {
        console.error('Actions: prevImage API 调用失败:', error);
        ui.showErrorMessage(`切换到上一张图片失败: ${error.message}`, false);
    } finally {
        ui.updateNavigationButtons();
    }
}

/**
 * Handles the action of opening the current RAW file.
 */
export async function openRawAction() {
    ui.clearErrorMessage();

    if (appState.currentIndex === -1 || !appState.isLoaded) {
        ui.showErrorMessage('请先选择一张图片。', true);
        return;
    }

    try {
        const response = await api.openRaw();

        if (!(response && response.success)) {
            const message = response && response.message ? `后端错误: ${response.message}` : '打开 RAW 文件时发生未知错误。';
            ui.showErrorMessage(message, false);
        }

    } catch (error) {
        console.error('Actions: openRaw API 调用失败:', error);
        ui.showErrorMessage(`打开 RAW 文件失败: ${error.message}`, false);
    }
}

/**
 * Handles the action of updating default paths from input fields.
 * Triggered when input fields change. Uses debouncing.
 */
export async function updatePathsActionFromInput(jpgPath, rawPath) {
    ui.clearErrorMessage();

    try {
        const response = await api.updatePaths(jpgPath, rawPath);

        if (!(response && response.success)) {
            const message = response && response.message ? `后端错误: ${response.message}` : '保存默认路径时发生未知错误。';
            ui.showErrorMessage(message, true);
        }

    } catch (error) {
        console.error('Actions: updatePaths API 调用失败:', error);
        ui.showErrorMessage(`保存默认路径失败: ${error.message}`, true);
    }
}

/**
 * Action to load initial data/state when the app starts.
 * Calls getStatus to get initial state, then load folders if default paths are available.
 */
export async function initialLoadAction() {
    ui.clearErrorMessage();
    ui.showLoading();

    try {
        const statusResponse = await api.getStatus();

        if (statusResponse && statusResponse.success) {
            appState.currentIndex = statusResponse.current_index;
            appState.totalImages = statusResponse.total_images;
            appState.jpgFileName = statusResponse.jpg_file_name;
            appState.rawFileName = statusResponse.raw_file_name;
            appState.jpgFolder = statusResponse.jpg_folder;
            appState.rawFolder = statusResponse.raw_folder;
            appState.isLoaded = statusResponse.is_loaded;
            appState.current_image_metadata = statusResponse.current_image_metadata || {};
            appState.sortOrder = statusResponse.sort_order; // Initialize sort order from status

            // Removed lines that were overwriting input field values

            ui.updateInfoLabel();
            ui.updateNavigationButtons();

            // Check input field values directly for initial load
            const elements = ui.getElements();
            // Check input field values directly for initial load
            // Removed automatic loadFoldersAction call

            ui.hideLoading(); // Hide loading spinner after getting status
            ui.updateNavigationButtons(); // Update button states based on initial state

        } else {
            const message = statusResponse && statusResponse.message ? `后端错误: ${statusResponse.message}` : '获取初始状态时发生未知错误。';
            ui.showErrorMessage(message, false);
            ui.hideLoading();
            ui.updateNavigationButtons();
        }

    } catch (error) {
        console.error('Actions: getStatus API 调用失败:', error);
        ui.showErrorMessage(`获取初始状态失败: ${error.message}`, false);
        ui.hideLoading();
        ui.updateNavigationButtons();
    }
}

/**
 * Saves the current folder, index, and sort order to history.
 */
async function saveHistoryAction() {
    if (!appState.isLoaded || appState.currentIndex === -1 || !appState.jpgFolder) {
        // Only save history if folders are loaded, an image is selected, and jpgFolder is set
        return;
    }

    try {
        const response = await api.saveHistory(appState.jpgFolder, appState.currentIndex, appState.isSortedAscending ? 'asc' : 'desc');
        if (!response || !response.success) {
            console.warn('Actions: 保存历史记录失败:', response ? response.message : '未知错误');
        } else {
            console.log('Actions: 历史记录已保存。');
        }
    } catch (error) {
        console.error('Actions: 保存历史记录 API 调用失败:', error);
    }
}

/**
 * Toggles the sort direction of the image pairs.
 */
export function toggleSortDirectionAction() {
    if (!appState.isLoaded || appState.imagePairsInfo.length === 0) {
        console.warn('Actions: 无法切换排序，未加载图片或图片列表为空。');
        return;
    }

    if (!appState.isLoaded || appState.imagePairsInfo.length === 0) {
        console.warn('Actions: 无法切换排序，未加载图片或图片列表为空。');
        return;
    }

    const currentOriginalIndex = appState.imagePairsInfo[appState.currentIndex].index; // Get the original index of the currently selected image
    console.log(`Actions: 切换排序前，当前选中图片的原始索引: ${currentOriginalIndex}, 当前显示索引: ${appState.currentIndex}`);
    console.log('Actions: 切换排序前 imagePairsInfo (部分):', appState.imagePairsInfo.slice(0, 5), '...', appState.imagePairsInfo.slice(-5));


    appState.isSortedAscending = !appState.isSortedAscending; // Toggle sort state
    sortImagePairs(); // Sort the array (modifies appState.imagePairsInfo in place)

    // Find the new index of the previously selected image
    const newCurrentIndex = appState.imagePairsInfo.findIndex(pair => pair.index === currentOriginalIndex);
    console.log(`Actions: 切换排序后，当前选中图片的原始索引: ${currentOriginalIndex}, 在新列表中的新索引: ${newCurrentIndex}`);
    console.log('Actions: 切换排序后 imagePairsInfo (部分):', appState.imagePairsInfo.slice(0, 5), '...', appState.imagePairsInfo.slice(-5));


    if (newCurrentIndex !== -1) {
        appState.currentIndex = newCurrentIndex; // Update current index to maintain selection
    } else {
        // Fallback if for some reason the image is not found (shouldn't happen)
        appState.currentIndex = 0; // Reset to first image if original not found
        console.warn('Actions: 切换排序后未能找到原选中图片，重置到第一张。');
    }

    console.log(`Actions: 在调用 ui.updateUI() 前，appState.currentIndex: ${appState.currentIndex}`);
    ui.renderThumbnails(); // Re-render thumbnails after sorting
    ui.updateUI(); // Update UI to reflect new current index and highlight
    console.log(`Actions: 在调用 ui.updateUI() 后，appState.currentIndex: ${appState.currentIndex}`);
    saveHistoryAction(); // Save the new sort order to history
    console.log(`Actions: Toggled sort direction to ${appState.isSortedAscending ? 'ascending' : 'descending'}`);
}

/**
 * Sorts the image pairs based on the current sort direction.
 */
function sortImagePairs() {
    // The backend already sorts by time then filename.
    // Here, we sort by the original index to achieve ascending/descending display.
    if (appState.isSortedAscending) {
        appState.imagePairsInfo.sort((a, b) => a.index - b.index); // Sort by original index ascending
    } else {
        appState.imagePairsInfo.sort((a, b) => b.index - a.index); // Sort by original index descending
    }
    console.log(`Actions: Image pairs sorted in ${appState.isSortedAscending ? 'ascending' : 'descending'} order.`);
}
