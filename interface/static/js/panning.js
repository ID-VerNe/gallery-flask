// --- ADD: Image Panning and Zoom Module ---
import { FRONTEND_CONFIG } from './config.js';
// No explicit config used here yet, but can be added later for zoom limits etc.

let imageElement;
let containerElement;
let panState = {
    isPanning: false,
    startX: 0,
    startY: 0,
    imageX: 0, // Current image translation X
    imageY: 0, // Current image translation Y
    currentScale: 1, // Current zoom scale
    // Bounding box for panning
    // maxX: 0, maxY: 0, minX: 0, minY: 0,
    // Zoom limits
    // maxScale: 5, minScale: 0.1,
};

/**
 * Initializes panning and zoom functionality for a given image element within a container.
 * Needs to be called after the image element is added to the DOM and potentially after its source is loaded
 * to get its natural dimensions.
 * @param {HTMLElement} imgElement The image element to make pannable and zoomable.
 * @param {HTMLElement} contElement The container element that clips the image and captures events.
 */
export function initPanning(imgElement, contElement) {
    console.debug('模块 js/panning.js: 初始化...');
    imageElement = imgElement;
    containerElement = contElement;

    if (!imageElement || !containerElement) {
        console.error('模块 js/panning.js: 无法初始化，缺少图片或容器元素。');
        return;
    }
     console.debug('模块 js/panning.js: 获取到图片和容器元素。');

    // Attach event listeners to the container for panning
    containerElement.addEventListener('mousedown', handlePanStart);
    // Use window listeners for mousemove/mouseup so panning continues even if cursor leaves container
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
    // Attach wheel listener for zooming
    containerElement.addEventListener('wheel', handleZoom);

    // Prevent default drag behavior for the image itself
    imageElement.addEventListener('dragstart', (e) => e.preventDefault());

    // Initial reset of state and styles
    resetPanning();

    console.debug('模块 js/panning.js: 初始化完成，事件监听已添加。');
}

/**
 * Resets the panning and zoom state to the initial fit (scale 1, centered).
 * Should be called when a new image is loaded.
 */
export function resetPanning() {
     console.log('Panning: 重置缩放和平移...');
     panState.imageX = 0;
     panState.imageY = 0;
     panState.currentScale = 1;
     panState.isPanning = false; // Ensure panning state is off

     // Apply the reset transform
     applyTransform();
     console.log('Panning: 缩放和平移已重置。');

     // Note: Bounding box calculation and scale limits could be added here
     // based on imageElement.naturalWidth/Height and containerElement.clientWidth/Height
     // This is more complex and left for future enhancement.
}

/**
 * Applies the current scale, translation transform to the image element.
 */
function applyTransform() {
     // console.debug(`Panning: 应用形变。 Scale: ${panState.currentScale}, Translate: (${panState.imageX}px, ${panState.imageY}px)`); // Can be chatty
     if (imageElement) {
         // Combine translate and scale transforms
         // Note: The translate(-50%, -50%) in CSS initially centers the image.
         // The panState.imageX/Y should be applied *relative* to that center point.
         // So the full transform is `translate(-50%, -50%) translate(imageX, imageY) scale(currentScale)`
         // Or, more efficiently: `translate(calc(-50% + imageXpx), calc(-50% + imageYpx)) scale(currentScale)`
         // Let's use the combined translate:
         imageElement.style.transform = `translate(calc(-50% + ${panState.imageX}px), calc(-50% + ${panState.imageY}px)) scale(${panState.currentScale})`;
     } else {
         console.warn('Panning: 无法应用形变，imageElement 为 null.');
     }
}

/**
 * Handles mouse wheel event for zooming.
 * @param {WheelEvent} event
 */
function handleZoom(event) {
    // Prevent default scroll behavior
    event.preventDefault();
    // console.debug('Panning: 接收到滚轮事件。');

    if (!imageElement || !containerElement) {
         console.warn('Panning: 忽略缩放事件，缺少图片或容器元素。');
         return;
    }

    const scaleAmount = -event.deltaY * 0.001; // Adjust sensitivity as needed
    let newScale = panState.currentScale * (1 + scaleAmount);

    // --- Optional: Apply zoom limits ---
    // const maxScale = 5; // Example limit
    // const minScale = 0.1; // Example limit
    // newScale = Math.max(minScale, Math.min(maxScale, newScale));
    // console.debug(`Panning: 新的计算缩放比例: ${newScale}`);

    // --- Zoom centering on mouse cursor ---
    // If we're zooming in/out, adjust the pan position so the point under the cursor stays under the cursor.
    // This is a more complex calculation involving mouse position relative to image center and current scale.
    // Let's keep it simple for now: just scale from the center. Centering on cursor is future enhancement.
    // Need to calculate mouse position relative to the image's current top-left corner (after panning/scaling).
    // For simplicity, let's only implement scaling from the center initially.
    // If scaling from center, no need to adjust imageX/Y here, only update currentScale.

    // If a new scale is actually different:
    if (newScale !== panState.currentScale) {
         panState.currentScale = newScale;
         applyTransform(); // Apply the new scale
         console.debug(`Panning: 缩放比例更新为: ${panState.currentScale}`);
    } else {
         console.debug('Panning: 缩放比例未改变。');
    }
}

/**
 * Handles mouse down event to start panning.
 * @param {MouseEvent} event
 */
function handlePanStart(event) {
    // Only start panning with the left mouse button
    if (event.button !== 0) return;
    event.preventDefault(); // Prevent default drag behavior
    console.debug('Panning: 开始平移...');

     if (!imageElement) {
         console.warn('Panning: 忽略平移开始事件，缺少图片元素。');
         return;
     }

    panState.isPanning = true;
    panState.startX = event.clientX; // Record where the mouse started
    panState.startY = event.clientY;
    // Record the current image position *before* the drag starts
    // Need to read the current translated values from the element's transform?
    // Or use the panState.imageX/Y directly, assuming applyTransform keeps them in sync.
    // Yes, use panState.imageX/Y as the source of truth.
    panState.initialImageX = panState.imageX; // Store initial positions at start of drag
    panState.initialImageY = panState.imageY;

    // Add a class to change cursor while dragging
    if (containerElement) {
         containerElement.classList.add('panning-active');
    }

    console.debug(`Panning: 平移开始，起始位置 (${panState.startX}, ${panState.startY}), 初始偏移 (${panState.initialImageX}, ${panState.initialImageY})`);
}

/**
 * Handles mouse move event while panning is active.
 * This listener is on the window to handle dragging outside the container.
 * @param {MouseEvent} event
 */
function handlePanMove(event) {
    if (!panState.isPanning) return; // Only pan if isPanning flag is set
    event.preventDefault(); // Prevent selection behavior while dragging
     // console.debug('Panning: 正在平移...'); // Can be very chatty

     if (!imageElement) {
        console.warn('Panning: 忽略平移移动事件，缺少图片元素。');
        // End panning if no image element
        handlePanEnd();
        return;
     }

    const deltaX = event.clientX - panState.startX; // Calculate mouse movement relative to start
    const deltaY = event.clientY - panState.startY;

    // Calculate the new image position by adding the mouse movement (scaled by inverse of zoom?)
    // No, mouse movement in screen pixels directly translates image pixels when scale=1.
    // When scaled, 1 pixel mouse move corresponds to (1/currentScale) pixels on the *original* image.
    // But the transform is applied *after* translation relative to center.
    // Let's apply mouse movement directly to imageX/Y for simplicity first.
    // panState.imageX = panState.initialImageX + deltaX / ? ; // Need to account for current scale?
    // Let's rethink the transform: `translate(imageX, imageY) scale(currentScale)`
    // Mouse movement should add to the *current* translation values.
    // The original CSS translate(-50%, -50%) just sets the origin.
    // So `transform: translate(${panState.imageX}px, ${panState.imageY}px) scale(${panState.currentScale})` where 0,0 is top-left of container.
    // This requires changing the CSS origin and initial centering transform.
    // Let's stick to the `translate(calc(-50% + imageXpx), calc(-50% + imageYpx))` approach.
    // Mouse move adds directly to imageX and imageY.

    panState.imageX = panState.initialImageX + deltaX;
    panState.imageY = panState.initialImageY + deltaY;

    // --- Optional: Apply panning bounds ---
    // Need to calculate how far the image edges are from the container edges at the current scale.
    // If image is smaller than container, no panning needed.
    // If image is larger, calculate bounds based on (imageSize * scale - containerSize) / 2.
    // Bounding box calculation is complex and depends on current scale and image/container dimensions.
    // Left for future enhancement.

    applyTransform(); // Apply the new position
    // console.debug(`Panning: 位置更新为 (${panState.imageX}, ${panState.imageY}).`);
}

/**
 * Handles mouse up event to stop panning.
 * This listener is on the window.
 */
function handlePanEnd() {
    if (!panState.isPanning) return; // Only process if panning was active
    console.debug('Panning: 停止平移。');

    panState.isPanning = false;

    // Remove the dragging class
    if (containerElement) {
        containerElement.classList.remove('panning-active');
    }

    // Cleanup: Optionally save the final panState.imageX/Y if you wanted to persist position between image switches (unlikely needed here).
}

// Note: The `resetPanning()` function should be called by the `ui.js` or `app.js`
// when a new preview image is set to ensure it starts centered and at scale 1.

console.debug('模块 js/panning.js 已加载.');
// --- END ADD ---