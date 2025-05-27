// --- ADD: Application Actions Module ---
// This module orchestrates API calls and UI updates in response to high-level actions.
// Needs access to state, api, and ui modules.
import { FRONTEND_CONFIG } from './config.js'; // Not directly used by actions, but dependencies might use it

let api;
let ui;
let appState;
let config; // Reference to FRONTEND_CONFIG

/**
 * Initializes the Actions module with necessary dependencies.
 * @param {object} apiRef The api module object.
 * @param {object} uiRef The ui module object.
 * @param {object} appStateRef The frontend application state object.
 * @param {object} configRef The frontend config object.
 */
export function initActions(apiRef, uiRef, appStateRef, configRef) {
    console.debug('模块 js/actions.js: 初始化...');
    api = apiRef;
    ui = uiRef;
    appState = appStateRef;
    config = configRef;
     console.debug('模块 js/actions.js: 初始化完成。');
}

/**
 * Handles the action of selecting a folder via native dialog.
 * @param {string} type 'jpg' or 'raw'.
 * @returns {Promise<string|null>} Promise resolving with selected path or null if cancelled/failed.
 */
export async function selectFolderAction(type) {
     console.info(`Actions: 触发选择文件夹动作 (${type})...`);
     ui.clearErrorMessage(); // Clear previous errors

     // Note: selectFolder API call itself handles potential backend errors (like Tkinter failing)
     // and saving the path to .env. We just need to get the result and handle frontend state/input.
     try {
         ui.showLoading(); // Maybe show a subtle indicator? Or just wait for dialog? Dialog blocking is fine for this API.
         const response = await api.selectFolder(type, appState[type + 'Folder']); // Pass current path as initial dir hint
         ui.hideLoading(); // Hide indicator after dialog closes

         // The API endpoint returns { success: bool, message?: string, path?: string }
         if (response && response.success) {
             console.info(`Actions: 选择文件夹 (${type}) 成功. Path: ${response.path}`);
             // Update the corresponding input field in the UI directly via elements or ui module
             const elements = ui.getElements(); // Need elements access, maybe pass to initActions?
             if (type === 'jpg' && elements.jpgFolderPathInput) {
                 elements.jpgFolderPathInput.value = response.path;
                  appState.jpgFolder = response.path; // Update state
             } else if (type === 'raw' && elements.rawFolderPathInput) {
                 elements.rawFolderPathInput.value = response.path;
                 appState.rawFolder = response.path; // Update state
             }
             // Update button states (e.g., enable Load button if both paths are now set)
             ui.updateNavigationButtons(); // Re-evaluate button disabled states

             // The API already saved to .env, no need to call updatePaths again here
             return response.path; // Return the selected path
         } else {
             console.warn(`Actions: 选择文件夹 (${type}) 操作失败或取消: ${response ? response.message : '未知错误'}`);
              ui.showErrorMessage(response ? response.message : '选择文件夹操作失败.', true); // Show temporary error message
             return null; // Return null/undefined on cancel/failure
         }
     } catch (error) {
         console.error(`Actions: 选择文件夹 (${type}) API 调用失败:`, error);
         ui.hideLoading();
         ui.showErrorMessage(`选择文件夹失败: ${error.message}`, false); // Show persistent error message
         throw error; // Re-throw for main error handling if needed
     }
}

/**
 * Handles the action of loading image folders.
 * Gets paths from input fields, calls API, updates state and UI.
 */
export async function loadFoldersAction() {
    console.info('Actions: 触发加载图片对动作...');
    ui.clearErrorMessage(); // Clear previous errors

    const elements = ui.getElements(); // Need elements access
    if (!elements.jpgFolderPathInput || !elements.rawFolderPathInput) {
         console.error('Actions: 无法加载文件夹，elements.jpgFolderPathInput 或 elements.rawFolderPathInput 为 null.');
         ui.showErrorMessage('应用程序错误: 无法获取文件夹输入框引用。');
         return; // Exit if elements are missing
    }

    const jpgPath = elements.jpgFolderPathInput.value.trim();
    const rawPath = elements.rawFolderPathInput.value.trim();

    if (!jpgPath || !rawPath) {
        console.warn('Actions: JPG 或 RAW 文件夹路径为空，无法加载。');
        ui.showErrorMessage('请指定 JPG 和 RAW 文件夹路径才能加载。', true); // Show temporary error
        return; // Do nothing if paths are empty
    }

    ui.showLoading(); // Show spinner
    ui.updateNavigationButtons(); // Update button states (disable load button)

    try {
        // Call the API to load folders
        // The API is expected to return the initial status and imagePairsInfo list
        const response = await api.loadFolders(jpgPath, rawPath);

        // API should return { success: true, current_index: ..., total_images: ..., image_pairs_info: [...] }
        if (response && response.success) {
            console.info('Actions: loadFolders API 调用成功。');
            // Update frontend state based on the response
            appState.imagePairsInfo = response.image_pairs_info || [];
            appState.currentIndex = response.current_index;
            appState.totalImages = response.total_images;
            appState.jpgFolder = response.jpg_folder; // Update actual loaded folders
            appState.rawFolder = response.raw_folder;
            appState.isLoaded = true; // Mark as loaded

            // Render thumbnails and update other UI parts
            ui.renderThumbnails(appState.imagePairsInfo);
            ui.updateUI(); // Update info, nav buttons, preview, highlighting

            // After a successful load, save these paths as defaults if they differ?
            // The selectFolderAction already saves, and we probably want to save
            // paths that *successfully loaded* as defaults, not just what was entered.
            // Let's update .env after successful load, in addition to after dialog select.
            // Call this without awaiting, as saving config isn't critical path for UI.
            api.updatePaths(jpgPath, rawPath).catch(configError => {
                console.error('Actions: 后台保存加载的路径到 .env 失败:', configError);
                ui.showErrorMessage(`加载成功，但保存默认路径失败: ${configError.message}`, true); // Show temporary warning
            });

             console.info(`Actions: 加载图片对成功。数量: ${appState.totalImages}`);
        } else {
             // API returned success: false or unexpected format
             console.error('Actions: loadFolders API 返回失败或无效响应:', response);
             const message = response && response.message ? `后端错误: ${response.message}` : '加载图片对时发生未知错误。';
             // Clear possibly incomplete state on load failure
             appState.imagePairsInfo = [];
             appState.currentIndex = -1;
             appState.totalImages = 0;
             appState.isLoaded = false;

             ui.renderThumbnails([]); // Clear thumbnails
             ui.updateUI(); // Update UI to reflect failure state
             ui.showErrorMessage(message, false); // Show persistent error message
        }

    } catch (error) {
        console.error('Actions: loadFolders API 调用失败:', error);
         // Clear possibly incomplete state on fetch/network failure
        appState.imagePairsInfo = [];
        appState.currentIndex = -1;
        appState.totalImages = 0;
        appState.isLoaded = false;

        ui.renderThumbnails([]); // Clear thumbnails
        ui.updateUI(); // Update UI to reflect failure state
        ui.showErrorMessage(`加载图片对失败: ${error.message}`, false); // Show persistent error message
    } finally {
        ui.hideLoading(); // Always hide spinner when action completes
        ui.updateNavigationButtons(); // Ensure buttons are correctly state after loading ends
    }
}

/**
 * Handles the action of selecting a specific image by index.
 * @param {number} index The 0-based index to select.
 */
export async function selectImageAction(index) {
     console.info(`Actions: 触发选择图片动作 (索引 ${index})...`);
     ui.clearErrorMessage(); // Clear previous errors

     // Basic check if the index is even theoretically possible
     if (index < 0 || index >= appState.totalImages) {
         console.warn(`Actions: 尝试选择无效索引 (${index}). 当前总数 ${appState.totalImages}.`);
         ui.showErrorMessage(`无效的图片索引: ${index + 1}.`, true); // Show 1-based index to user, temporary
         return;
     }

     // Check if already selected
     // --- FIX: Also trigger UI update even if index is the same ---
     // If a user clicks on the already selected thumbnail, maybe we want to force a refresh/reset panning.
     // Let's keep the old behavior: only act if index changes. If we want refresh, add a separate action.
     // Removed the check for now to simplify, but consider adding back if performance is an issue for no-change clicks.
     // if (appState.currentIndex === index) {
     //     console.debug(`Actions: 索引 ${index} 已被选中，无操作。`); // Use debug for non-action
     //     return;
     // }
     // --- END FIX ---

     // --- REMOVE: showLoading/hideLoading from here ---
     // UI module's updatePreviewImage will handle loading state based on img load event.
     // ui.showLoading(); // Show spinner while switching images - REMOVED
     ui.updateNavigationButtons(); // Update button states (disable nav buttons during load - still useful)
     // --- END REMOVE ---

     try {
        // Call the API to select the image. API returns updated status.
        // The API call itself should be fast, just updating state on backend.
        const response = await api.selectImage(index);

         // API should return { success: true, current_index: ..., total_images: ... }
         // We still update state based on API response as it's the source of truth.
        if (response && response.success) {
             console.info(`Actions: selectImage API 调用成功。新索引: ${response.current_index}`);
            // Update state with the new index (other status info might be included, update if needed)
            appState.currentIndex = response.current_index;
            // appState.jpgFileName = response.jpg_file_name; // Update other status if API returns them
            // appState.rawFileName = response.raw_file_name;

            // --- FIX: Call updateUI *after* updating state and API call resolves ---
             // updateUI will now trigger request for preview image using the *new* currentIndex
            ui.updateUI();
            // --- END FIX ---

             console.info(`Actions: 选择图片动作成功，当前索引: ${appState.currentIndex}`);
        } else {
             console.error('Actions: selectImage API 返回失败或无效响应:', response);
             const message = response && response.message ? `后端错误: ${response.message}` : '选择图片时发生未知错误。';
             ui.showErrorMessage(message, false); // Show persistent error
             // Keep the old index in state if selection failed? Depends on desired behavior.
             // For now, assume backend is source of truth, if it says success=false state is invalid.
        }

     } catch (error) {
         console.error(`Actions: selectImage API 调用失败 for index ${index}:`, error);
         ui.showErrorMessage(`选择图片失败: ${error.message}`, false); // Show persistent error message
         // Keep the old index if API call itself failed
     } finally {
         // --- REMOVE: hideLoading from here ---
         // ui.hideLoading(); // Always hide spinner when API call completes - REMOVED
         // --- END REMOVE ---

         // Still update navigation buttons here as the action is considered "finished"
         ui.updateNavigationButtons(); // Ensure buttons are correctly state after action ends
     }
}

/**
 * Handles the action of navigating to the next image.
 */
export async function nextImageAction() {
     console.info('Actions: 触发下一张图片动作...');
     ui.clearErrorMessage(); // Clear previous errors

     // Basic check if navigation is possible client-side
     if (appState.currentIndex >= appState.totalImages - 1 || appState.currentIndex === -1){
         console.warn('Actions: 已在最后一张图片或未加载，下一张动作无效。');
         if (!appState.isLoaded || appState.currentIndex === -1) { ui.showErrorMessage('请先加载图片或选择一张图片。', true); }
         else { ui.showErrorMessage('已是最后一张图片。', true); }
         return;
     }
      // Remove redundant check for isLoaded/totalImages === 0 as the above covers it

     // --- REMOVE: showLoading/hideLoading ---
     // ui.showLoading(); // Show spinner - REMOVED
     ui.updateNavigationButtons(); // Disable during load
     // --- END REMOVE ---

     try {
         // Call the API
         const response = await api.nextImage();

        if (response && response.success) {
             console.info(`Actions: nextImage API 调用成功。新索引: ${response.current_index}`);
             // Update state
            appState.currentIndex = response.current_index;
             // appState.jpgFileName = response.jpg_file_name;
             // appState.rawFileName = response.raw_file_name;

            // --- FIX: Call updateUI ---
            ui.updateUI(); // Update UI
            // --- END FIX ---

            console.info(`Actions: 下一张图片动作成功，当前索引: ${appState.currentIndex}`);

        } else {
            console.error('Actions: nextImage API 返回失败或无效响应:', response);
            const message = response && response.message ? `后端错误: ${response.message}` : '切换到下一张图片时发生未知错误。';
            ui.showErrorMessage(message, false);
        }

     } catch (error) {
         console.error('Actions: nextImage API 调用失败:', error);
         ui.showErrorMessage(`切换到下一张图片失败: ${error.message}`, false);
     } finally {
         // --- REMOVE: hideLoading ---
         // ui.hideLoading(); // REMOVED
         // --- END REMOVE ---
         ui.updateNavigationButtons();
     }
}

/**
 * Handles the action of navigating to the previous image.
 */
export async function prevImageAction() {
     console.info('Actions: 触发上一张图片动作...');
     ui.clearErrorMessage(); // Clear previous errors

     // Basic check if navigation is possible client-side
      if (appState.currentIndex <= 0 || appState.currentIndex === -1) {
         console.warn('Actions: 已在第一张图片或未加载，上一张动作无效。');
         if (!appState.isLoaded || appState.currentIndex === -1) { ui.showErrorMessage('请先加载图片或选择一张图片。', true); }
         else { ui.showErrorMessage('已是第一张图片。', true); }
         return;
     }
     // Remove redundant check for isLoaded/totalImages === 0

     // --- REMOVE: showLoading/hideLoading ---
     // ui.showLoading(); // Show spinner - REMOVED
     ui.updateNavigationButtons(); // Disable during load
     // --- END REMOVE ---

     try {
         // Call the API
         const response = await api.prevImage();

        if (response && response.success) {
             console.info(`Actions: prevImage API 调用成功。新索引: ${response.current_index}`);
             // Update state
            appState.currentIndex = response.current_index;
             // appState.jpgFileName = response.jpg_file_name;
             // appState.rawFileName = response.raw_file_name;

            // --- FIX: Call updateUI ---
            ui.updateUI(); // Update UI
            // --- END FIX ---

            console.info(`Actions: 上一张图片动作成功，当前索引: ${appState.currentIndex}`);

        } else {
             console.error('Actions: prevImage API 返回失败或无效响应:', response);
             const message = response && response.message ? `后端错误: ${response.message}` : '切换到上一张图片时发生未知错误。';
             ui.showErrorMessage(message, false);
        }

     } catch (error) {
         console.error('Actions: prevImage API 调用失败:', error);
         ui.showErrorMessage(`切换到上一张图片失败: ${error.message}`, false);
     } finally {
         // --- REMOVE: hideLoading ---
         // ui.hideLoading(); // REMOVED
         // --- END REMOVE ---
         ui.updateNavigationButtons();
     }
}


/**
 * Handles the action of opening the current RAW file.
 */
export async function openRawAction() {
    console.info('Actions: 触发打开 RAW 文件动作...');
    ui.clearErrorMessage(); // Clear previous errors

    if (appState.currentIndex === -1 || !appState.isLoaded) {
         console.warn('Actions: 没有选中图片或未加载，打开 RAW 无效。');
         ui.showErrorMessage('请先选择一张图片。', true); // Temporary message
         return;
    }

    // No loading spinner usually needed as this is non-blocking on backend, though opening app might take time.
    // ui.showLoading(); // Optional Spinner
    // ui.updateNavigationButtons(); // Optional disable buttons

    try {
        // Call the API to trigger opening the RAW file
        const response = await api.openRaw();

        if (response && response.success) {
             console.info('Actions: openRaw API 调用成功。');
             // Optional UI feedback like "正在尝试打开 RAW 文件..."
             // ui.showInfoMessage(response.message || '尝试打开 RAW 文件...', true); // If showInfoMessage exists
             // console.log(response.message || '尝试打开 RAW 文件...'); // Log status message from backend
        } else {
            console.error('Actions: openRaw API 返回失败或无效响应:', response);
            const message = response && response.message ? `后端错误: ${response.message}` : '打开 RAW 文件时发生未知错误。';
            ui.showErrorMessage(message, false); // Persistent error message
        }

    } catch (error) {
        console.error('Actions: openRaw API 调用失败:', error);
        ui.showErrorMessage(`打开 RAW 文件失败: ${error.message}`, false); // Persistent error message
    } finally {
         // ui.hideLoading(); // Optional Spinner
         // ui.updateNavigationButtons(); // Optional enable buttons
    }
}

/**
 * Handles the action of updating default paths from input fields.
 * Triggered when input fields change. Uses debouncing.
 */
export async function updatePathsActionFromInput(jpgPath, rawPath) {
     console.debug('Actions: 触发从输入框更新路径动作...');
     // This might be called frequently as user types, so use debounce externally before calling this.
     ui.clearErrorMessage(); // Clear errors related to previous path saves maybe? Or just other errors.

     // Note: The selectFolderAction already calls updatePaths after a successful dialog selection.
     // This function is specifically for manual input changes.

     // Validate paths format/existence client side? Or rely on backend validation?
     // For simplicity, just pass to backend to save. API call handles saving and errors.

     try {
         // Call the API to update paths in .env
         const response = await api.updatePaths(jpgPath, rawPath);

         if (response && response.success) {
             console.info('Actions: updatePaths API 调用成功。');
             // No UI update needed other than maybe a temporary success message?
             // ui.showInfoMessage(response.message || '默认路径已保存.', true); // Optional temporary confirmation
         } else {
             console.error('Actions: updatePaths API 返回失败或无效响应:', response);
              const message = response && response.message ? `后端错误: ${response.message}` : '保存默认路径时发生未知错误。';
              ui.showErrorMessage(message, true); // Show temporary error message
         }

     } catch (error) {
         console.error('Actions: updatePaths API 调用失败:', error);
         ui.showErrorMessage(`保存默认路径失败: ${error.message}`, true); // Show temporary error message
     }
}

/**
 * Action to load initial data/state when the app starts.
 * Calls getStatus to get initial state, then load folders if default paths are available.
 */
export async function initialLoadAction() {
     console.info('Actions: 触发初始加载动作...');
     ui.clearErrorMessage(); // Clear any initial errors
     ui.showLoading(); // Show spinner immediately

     try {
         // First, get the initial status from the backend. This includes default paths from .env.
         const statusResponse = await api.getStatus();

         if (statusResponse && statusResponse.success) {
            console.info('Actions: getStatus API 调用成功。');
            // Update frontend state with initial status
            appState.currentIndex = statusResponse.current_index;
            appState.totalImages = statusResponse.total_images;
            appState.jpgFileName = statusResponse.jpg_file_name;
            appState.rawFileName = statusResponse.raw_file_name;
            appState.jpgFolder = statusResponse.jpg_folder; // Get default paths
            appState.rawFolder = statusResponse.raw_folder;
            appState.isLoaded = statusResponse.is_loaded; // Should be false initially unless backend persists

            // Update input fields with default paths from state
            const elements = ui.getElements();
            if (elements.jpgFolderPathInput) elements.jpgFolderPathInput.value = appState.jpgFolder;
            if (elements.rawFolderPathInput) elements.rawFolderPathInput.value = appState.rawFolder;

            ui.updateInfoLabel(); // Update info label with initial folder paths
             ui.updateNavigationButtons(); // Update button states based on initial state

            // If default paths are set and valid (basic check), automatically trigger loadFolders
            // Rely on loadFolders API validation for actual folder existence
            if (appState.jpgFolder && appState.rawFolder) {
                 console.info('Actions: 检测到默认文件夹路径，自动触发加载...');
                 // Call loadFoldersAction directly. It handles its own loading state/error handling internally.
                 // We can await it or let it run in background. Awaiting ensures UI is updated after load.
                 await loadFoldersAction(); // loadFoldersAction also hides loading
            } else {
                console.info('Actions: 没有检测到默认文件夹路径，等待用户输入。');
                 // No default paths, hide loading spinner and wait for user interaction
                 ui.hideLoading();
                 ui.updateNavigationButtons(); // Ensure load button state is correct based on empty inputs
            }

         } else {
             console.error('Actions: getStatus API 返回失败或无效响应:', statusResponse);
             const message = statusResponse && statusResponse.message ? `后端错误: ${statusResponse.message}` : '获取初始状态时发生未知错误。';
             ui.showErrorMessage(message, false);
             ui.hideLoading(); // Hide spinner on failure
             ui.updateNavigationButtons(); // Ensure buttons are off
         }

     } catch (error) {
         console.error('Actions: getStatus API 调用失败:', error);
         ui.showErrorMessage(`获取初始状态失败: ${error.message}`, false);
         ui.hideLoading(); // Hide spinner on failure
         ui.updateNavigationButtons(); // Ensure buttons are off
     }
}

console.debug('模块 js/actions.js 已加载.');
// --- END ADD ---