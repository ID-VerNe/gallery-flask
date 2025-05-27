let imageElement;
let containerElement;
let panState = {
    isPanning: false,
    startX: 0,
    startY: 0,
    imageX: 0,
    imageY: 0,
    currentScale: 1,
};

/**
 * Initializes panning and zoom functionality for a given image element within a container.
 * Needs to be called after the image element is added to the DOM and potentially after its source is loaded
 * to get its natural dimensions.
 * @param {HTMLElement} imgElement The image element to make pannable and zoomable.
 * @param {HTMLElement} contElement The container element that clips the image and captures events.
 */
export function initPanning(imgElement, contElement) {
    imageElement = imgElement;
    containerElement = contElement;

    if (!imageElement || !containerElement) {
        console.error('模块 js/panning.js: 无法初始化，缺少图片或容器元素。');
        return;
    }

    containerElement.addEventListener('mousedown', handlePanStart);
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
    containerElement.addEventListener('wheel', handleZoom);

    imageElement.addEventListener('dragstart', (e) => e.preventDefault());

    resetPanning();
}

/**
 * Resets the panning and zoom state to the initial fit (scale 1, centered).
 * Should be called when a new image is loaded.
 */
export function resetPanning() {
    panState.imageX = 0;
    panState.imageY = 0;
    panState.currentScale = 1;
    panState.isPanning = false;

    applyTransform();
}

/**
 * Applies the current scale, translation transform to the image element.
 */
function applyTransform() {
    if (imageElement) {
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
    event.preventDefault();

    if (!imageElement || !containerElement) {
        return;
    }

    const scaleAmount = -event.deltaY * 0.001;
    let newScale = panState.currentScale * (1 + scaleAmount);

    if (newScale !== panState.currentScale) {
        panState.currentScale = newScale;
        applyTransform();
    }
}

/**
 * Handles mouse down event to start panning.
 * @param {MouseEvent} event
 */
function handlePanStart(event) {
    if (event.button !== 0) return;
    event.preventDefault();

    if (!imageElement) {
        return;
    }

    panState.isPanning = true;
    panState.startX = event.clientX;
    panState.startY = event.clientY;
    panState.initialImageX = panState.imageX;
    panState.initialImageY = panState.imageY;

    if (containerElement) {
        containerElement.classList.add('panning-active');
    }
}

/**
 * Handles mouse move event while panning is active.
 * This listener is on the window to handle dragging outside the container.
 * @param {MouseEvent} event
 */
function handlePanMove(event) {
    if (!panState.isPanning) return;
    event.preventDefault();

    if (!imageElement) {
        handlePanEnd();
        return;
    }

    const deltaX = event.clientX - panState.startX;
    const deltaY = event.clientY - panState.startY;

    panState.imageX = panState.initialImageX + deltaX;
    panState.imageY = panState.initialImageY + deltaY;

    applyTransform();
}

/**
 * Handles mouse up event to stop panning.
 * This listener is on the window.
 */
function handlePanEnd() {
    if (!panState.isPanning) return;

    panState.isPanning = false;

    if (containerElement) {
        containerElement.classList.remove('panning-active');
    }
}
