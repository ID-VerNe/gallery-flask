import { FRONTEND_CONFIG } from './config.js';

let api;
let ui;
let appState;
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

    const elements = ui.getElements();
    if (!elements.jpgFolderPathInput || !elements.rawFolderPathInput) {
        ui.showErrorMessage('应用程序错误: 无法获取文件夹输入框引用。');
        return;
    }

    const jpgPath = elements.jpgFolderPathInput.value.trim();
    const rawPath = elements.rawFolderPathInput.value.trim();

    if (!jpgPath || !rawPath) {
        ui.showErrorMessage('请指定 JPG 和 RAW 文件夹路径才能加载。', true);
        return;
    }

    ui.showLoading();
    ui.updateNavigationButtons();

    try {
        const response = await api.loadFolders(jpgPath, rawPath);

        if (response && response.success) {
            appState.imagePairsInfo = response.image_pairs_info || [];
            appState.currentIndex = response.current_index;
            appState.totalImages = response.total_images;
            appState.jpgFolder = response.jpg_folder;
            appState.rawFolder = response.raw_folder;
            appState.isLoaded = true;

            ui.renderThumbnails(appState.imagePairsInfo);
            ui.updateUI();

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

        ui.renderThumbnails([]);
        ui.updateUI();
        ui.showErrorMessage(`加载图片对失败: ${error.message}`, false);
    } finally {
        ui.hideLoading();
        ui.updateNavigationButtons();
    }
}

/**
 * Handles the action of selecting a specific image by index.
 * @param {number} index The 0-based index to select.
 */
export async function selectImageAction(index) {
    ui.clearErrorMessage();

    if (index < 0 || index >= appState.totalImages) {
        ui.showErrorMessage(`无效的图片索引: ${index + 1}.`, true);
        return;
    }

    ui.updateNavigationButtons();

    try {
        const response = await api.selectImage(index);

        if (response && response.success) {
            appState.currentIndex = response.current_index;
            ui.updateUI();
        } else {
            const message = response && response.message ? `后端错误: ${response.message}` : '选择图片时发生未知错误。';
            ui.showErrorMessage(message, false);
        }

    } catch (error) {
        console.error(`Actions: selectImage API 调用失败 for index ${index}:`, error);
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
            ui.updateUI();
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
            ui.updateUI();
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

            const elements = ui.getElements();
            if (elements.jpgFolderPathInput) elements.jpgFolderPathInput.value = appState.jpgFolder;
            if (elements.rawFolderPathInput) elements.rawFolderPathInput.value = appState.rawFolder;

            ui.updateInfoLabel();
            ui.updateNavigationButtons();

            if (appState.jpgFolder && appState.rawFolder) {
                await loadFoldersAction();
            } else {
                ui.hideLoading();
                ui.updateNavigationButtons();
            }

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
