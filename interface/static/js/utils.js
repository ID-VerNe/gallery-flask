/**
 * Basic debounce function.
 * @param {function} func The function to debounce.
 * @param {number} wait The number of milliseconds to wait after the last triggered function call.
 * @returns {function} Returns the debounced function.
 */
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
