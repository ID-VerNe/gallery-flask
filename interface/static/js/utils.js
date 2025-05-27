// --- ADD: Utility functions ---
// Placeholder for utility functions like debounce, throttle, etc.

/**
 * Basic debounce function.
 * @param {function} func The function to debounce.
 * @param {number} wait The number of milliseconds to wait after the last triggered function call.
 * @returns {function} Returns the debounced function.
 */
export function debounce(func, wait) {
    console.debug(`UTILS: 创建 debounce 函数，等待时间: ${wait}ms`); // Frontend debug log
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

console.debug('模块 js/utils.js 已加载.');
// Add other utilities as needed
// --- END ADD ---