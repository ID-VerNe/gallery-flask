let appState;
let actions;

/**
 * Initializes keyboard shortcuts event listeners.
 * @param {object} actionsRef The actions module object.
 * @param {object} appStateRef The frontend application state object.
 */
export function initKeyboardShortcuts(actionsRef, appStateRef) {
    actions = actionsRef;
    appState = appStateRef;

    window.addEventListener('keydown', handleKeyDown);
}

/**
 * Handles keydown events for application shortcuts.
 * @param {KeyboardEvent} event
 */
function handleKeyDown(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    try {
        const { currentIndex, totalImages, isLoaded, isLoading } = appState;

        if (!isLoaded || totalImages === 0 || isLoading) {
            return;
        }

        switch (event.key) {
            case 'ArrowRight':
                if (currentIndex < totalImages - 1) {
                    event.preventDefault();
                    actions.nextImageAction();
                }
                break;
            case 'ArrowLeft':
                if (currentIndex > 0) {
                    event.preventDefault();
                    actions.prevImageAction();
                }
                break;
            case 'o':
            case 'O':
                if (currentIndex !== -1) {
                    event.preventDefault();
                    actions.openRawAction();
                }
                break;
        }

        const numKey = parseInt(event.key);
        if (!isNaN(numKey) && event.key.length === 1) {
            const targetIndex = numKey - 1;
            if (targetIndex >= 0 && targetIndex < totalImages) {
                event.preventDefault();
                actions.selectImageAction(targetIndex);
            }
        }

    } catch (error) {
        console.error('Keyboard: 处理按键事件时发生错误:', error);
        if (actions && actions.showErrorMessage) {
            actions.showErrorMessage('处理按键事件时发生错误: ' + error.message);
        } else {
            console.error('Keyboard: 无法显示错误消息， actions 模块或其依赖项不可用。');
        }
    }
}
