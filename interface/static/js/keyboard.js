// --- ADD: Keyboard Shortcuts Module ---
// Needs access to application state and actions
let appState;
let actions;

/**
 * Initializes keyboard shortcuts event listeners.
 * @param {object} actionsRef The actions module object.
 * @param {object} appStateRef The frontend application state object.
 */
export function initKeyboardShortcuts(actionsRef, appStateRef) {
    console.debug('模块 js/keyboard.js: 初始化键盘快捷键...');
    actions = actionsRef;
    appState = appStateRef;

    // Add keydown listener to the whole window/document
    window.addEventListener('keydown', handleKeyDown);

    console.debug('模块 js/keyboard.js: 初始化完成，keydow 监听已添加。');
}

/**
 * Handles keydown events for application shortcuts.
 * @param {KeyboardEvent} event
 */
function handleKeyDown(event) {
    // Don't trigger shortcuts if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        // console.debug('Keyboard: 用户在输入框中，忽略快捷键.');
        return;
    }

    // console.debug(`Keyboard: 接收到按下按键: ${event.key}, code: ${event.code}`); // Can be chatty

    try {
        const { currentIndex, totalImages, isLoaded, isLoading } = appState;

        // Only allow navigation and actions if folders are loaded and not currently loading
        if (!isLoaded || totalImages === 0 || isLoading) {
             console.debug('Keyboard: 应用未加载或正在加载，忽略导航/操作快捷键.');
            return;
        }

        switch (event.key) {
            case 'ArrowRight':
                // Go to next image
                if (currentIndex < totalImages - 1) {
                    event.preventDefault(); // Prevent default page scroll
                    console.info('Keyboard: 检测到右箭头，触发下一张图片动作.');
                    actions.nextImageAction(); // Call the action defined in actions.js
                } else {
                     console.debug('Keyboard: 已在最后一张，右箭头无效.');
                }
                break;
            case 'ArrowLeft':
                 // Go to previous image
                 if (currentIndex > 0) {
                     event.preventDefault(); // Prevent default page scroll
                     console.info('Keyboard: 检测到左箭头，触发上一张图片动作.');
                     actions.prevImageAction(); // Call the action defined in actions.js
                 } else {
                     console.debug('Keyboard: 已在第一章，左箭头无效.');
                 }
                break;
            case 'o':
            case 'O':
                // Open RAW file
                if (currentIndex !== -1) { // Only if an image is selected
                    event.preventDefault(); // Prevent default browser behavior if any
                     console.info('Keyboard: 检测到 "O" 键，触发打开 RAW 动作.');
                    actions.openRawAction(); // Call the action defined in actions.js
                } else {
                    console.debug('Keyboard: 没有选中图片，"O" 键无效.');
                }
                break;
            // Add other shortcuts here as needed
            // case 'Escape': // Example: Escape might close dialogs (if implemented)
            //     // ...
            //     break;
        }

         // Handle number keys for selecting index directly (Optional)
         // E.g., Pressing '5' selects the 5th image (index 4)
         const numKey = parseInt(event.key);
         if (!isNaN(numKey) && event.key.length === 1) { // Check if it's a single digit number key
             const targetIndex = numKey - 1; // Convert to 0-based index
             if (targetIndex >= 0 && targetIndex < totalImages) {
                 event.preventDefault(); // Prevent default scroll
                 console.info(`Keyboard: 检测到数字键 "${event.key}", 尝试选中索引 ${targetIndex}.`);
                 actions.selectImageAction(targetIndex);
             } else {
                 console.debug(`Keyboard: 数字键 "${event.key}" 对应的索引 ${targetIndex} 无效.`);
             }
         }

    } catch (error) {
        console.error('Keyboard: 处理按键事件时发生错误:', error);
        // Show error message on UI if necessary, delegating to UI module.
        // ui.showErrorMessage('处理按键事件时发生错误.'); // Requires passing ui or actions that include ui interaction
        // It's better to let actions module handle UI feedback after calling API
         if (actions && actions.showErrorMessage) { // Check if actions object has showErrorMessage (via ui)
              actions.showErrorMessage('处理按键事件时发生错误: ' + error.message);
         } else {
              console.error('Keyboard: 无法显示错误消息， actions 模块或其依赖项不可用。');
         }
    }
}

console.debug('模块 js/keyboard.js 已加载.');
// --- END ADD ---