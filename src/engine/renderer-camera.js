// Camera Management Module for 2.5D Renderer
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/engine/renderer-camera.js',
  exports: ['RendererCamera'],
  dependencies: ['GAME_CONSTANTS', 'MathUtils']
});

/**
 * Camera system for 2.5D rendering
 * Handles position, zoom, and coordinate transformations
 */
window.RendererCamera = class RendererCamera {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Simple camera system - camera follows player
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      targetZoom: 1
    };
    
    console.log('Camera system initialized');
  }
  
  /**
   * Set camera position
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @param {boolean} immediate - If true, set immediately
   */
  setCameraPosition(x, y, immediate = false) {
    this.camera.x = x;
    this.camera.y = y;
    console.log(`Camera set to (${x}, ${y})`);
  }
  
  /**
   * Update camera (for smooth transitions, animations, etc.)
   * @param {number} dt - Delta time
   */
  updateCamera(dt) {
    // Smooth zoom transitions
    if (this.camera.targetZoom !== this.camera.zoom) {
      this.camera.zoom = window.MathUtils.smoothValue(
        this.camera.zoom,
        this.camera.targetZoom,
        0.1,
        dt
      );
    }
  }
  
  /**
   * Set camera zoom level
   * @param {number} zoom - Zoom level (0.5 to 2.0)
   * @param {boolean} immediate - If true, set immediately
   */
  setCameraZoom(zoom, immediate = false) {
    this.camera.targetZoom = window.MathUtils.clamp(zoom, 0.5, 2.0);
    
    if (immediate) {
      this.camera.zoom = this.camera.targetZoom;
    }
  }
  
  /**
   * Convert screen coordinates to world coordinates
   * @param {number} screenX - Screen X position
   * @param {number} screenY - Screen Y position
   * @returns {Object} World coordinates {x, y}
   */
  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.camera.x - this.canvas.width / 2,
      y: screenY + this.camera.y - this.canvas.height / 2
    };
  }
  
  /**
   * Convert world coordinates to screen coordinates
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @returns {Object} Screen coordinates {x, y}
   */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.camera.x + this.canvas.width / 2,
      y: worldY - this.camera.y + this.canvas.height / 2
    };
  }
  
  /**
   * Get pixel-perfect camera position for rendering
   * @returns {Object} Camera state with rounded positions
   */
  getPixelPerfection() {
    return {
      x: Math.round(this.camera.x),
      y: Math.round(this.camera.y),
      zoom: this.camera.zoom
    };
  }
  
  /**
   * Get current camera bounds for culling calculations
   * @returns {Object} Bounds {left, right, top, bottom}
   */
  getCameraBounds() {
    const zoom = this.camera.zoom;
    return {
      left: this.camera.x - 100 / zoom,
      right: this.camera.x + (window.GAME_CONSTANTS.CANVAS_WIDTH + 100) / zoom,
      top: this.camera.y - 100 / zoom,
      bottom: this.camera.y + (window.GAME_CONSTANTS.CANVAS_HEIGHT + 100) / zoom
    };
  }
};