// 2.5D Rendering Engine for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/engine/renderer.js',
  exports: ['Renderer'],
  dependencies: ['GAME_CONSTANTS', 'MathUtils', 'RendererCamera', 'RendererEffects', 'RendererLayers']
});

window.Renderer = class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Initialize sub-modules
    this.camera = new window.RendererCamera(canvas);
    this.effects = new window.RendererEffects(canvas, this.camera);
    this.layers = new window.RendererLayers(canvas, this.camera);
    
    // Initialize
    this.resize();
    this.setupContext();
  }
  
  resize() {
    // Set canvas size to match constants
    this.canvas.width = window.GAME_CONSTANTS.CANVAS_WIDTH;
    this.canvas.height = window.GAME_CONSTANTS.CANVAS_HEIGHT;
    
    // Update sub-modules
    this.camera.canvas = this.canvas;
    this.effects.canvas = this.canvas;
    this.layers.canvas = this.canvas;
  }
  
  setupContext() {
    // Enable image smoothing for better sprite rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Set default font for UI
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
  }
  
  // ==================== CAMERA MANAGEMENT ====================
  
  setCameraPosition(x, y, immediate = false) {
    this.camera.setCameraPosition(x, y, immediate);
  }
  
  updateCamera(dt) {
    this.camera.updateCamera(dt);
    this.layers.updateCullingBounds();
  }
  
  setCameraZoom(zoom, immediate = false) {
    this.camera.setCameraZoom(zoom, immediate);
  }
  
  screenToWorld(screenX, screenY) {
    return this.camera.screenToWorld(screenX, screenY);
  }
  
  worldToScreen(worldX, worldY) {
    return this.camera.worldToScreen(worldX, worldY);
  }
  
  // ==================== CULLING MANAGEMENT ====================
  
  isEntityVisible(entity) {
    return this.layers.isEntityVisible(entity);
  }
  
  // ==================== 2.5D PROJECTION ====================
  
  project25D(worldX, worldY, depth = 0) {
    return this.layers.project25D(worldX, worldY, depth);
  }
  
  getDepthScale(depth) {
    return this.layers.getDepthScale(depth);
  }
  
  // ==================== LAYER MANAGEMENT ====================
  
  clearLayers() {
    this.layers.clearLayers();
  }
  
  addToLayer(layerName, entity) {
    this.layers.addToLayer(layerName, entity);
  }
  
  sortEntityLayer() {
    this.layers.sortEntityLayer();
  }
  
  // ==================== VISUAL EFFECTS ====================
  
  setStealthEffect(intensity) {
    this.effects.setStealthEffect(intensity);
  }
  
  setWallHackEffect(intensity) {
    this.effects.setWallHackEffect(intensity);
  }
  
  triggerDetectionEffect() {
    this.effects.triggerDetectionEffect();
  }
  
  triggerScreenShake(intensity, duration) {
    this.effects.triggerScreenShake(intensity, duration);
  }
  
  updateEffects(dt) {
    this.effects.updateEffects(dt);
  }
  
  // ==================== MAIN RENDER LOOP ====================
  
  render(dt) {
    // Update systems
    this.updateCamera(dt);
    this.updateEffects(dt);
    this.sortEntityLayer();
    
    // Save context state
    this.ctx.save();
    
    // Clear canvas
    this.ctx.fillStyle = window.GAME_CONSTANTS.COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Only render game world if not in menu
    if (!window.gameState || !window.gameState.isState('menu')) {
      // Debug: Draw camera position
      this.ctx.fillStyle = '#ff0000';
      this.ctx.fillRect(this.canvas.width / 2 - 5, this.canvas.height / 2 - 5, 10, 10);
      
      // Apply camera transform - center on camera position
      this.ctx.translate(this.canvas.width / 2 - this.camera.camera.x, this.canvas.height / 2 - this.camera.camera.y);
      
      // Apply screen shake
      const shakeOffsets = this.effects.getScreenShakeOffsets();
      this.ctx.translate(shakeOffsets.offsetX, shakeOffsets.offsetY);
      
      // Debug: Draw test rectangle at (0,0) in world space
      this.ctx.fillStyle = '#00ff00';
      this.ctx.fillRect(0, 0, 100, 100);
      
      // Render layers
      this.layers.renderAllLayers(this.ctx);
      
      // Render visual effects (these go on top of everything)
      this.effects.renderEffects(this.ctx);
    }
    
    // Restore context state
    this.ctx.restore();
  }

  
  // ==================== PRIMITIVE DRAWING HELPERS ====================
  
  drawRect(x, y, width, height, color, filled = true) {
    const screenPos = this.worldToScreen(x, y);
    
    this.ctx.fillStyle = color;
    if (filled) {
      this.ctx.fillRect(
        screenPos.x,
        screenPos.y,
        width * this.camera.camera.zoom,
        height * this.camera.camera.zoom
      );
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(
        screenPos.x,
        screenPos.y,
        width * this.camera.camera.zoom,
        height * this.camera.camera.zoom
      );
    }
  }
  
  drawCircle(x, y, radius, color, filled = true) {
    const screenPos = this.worldToScreen(x, y);
    
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, radius * this.camera.camera.zoom, 0, Math.PI * 2);
    
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    }
  }
  
  drawLine(x1, y1, x2, y2, color, width = 1) {
    const start = this.worldToScreen(x1, y1);
    const end = this.worldToScreen(x2, y2);
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width * this.camera.camera.zoom;
    this.ctx.lineCap = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
  }
  
  drawSprite(sprite, x, y, options = {}) {
    if (!sprite || !sprite.isLoaded()) return;
    
    const screenPos = this.worldToScreen(x, y);
    const scale = (options.scale || 1) * this.camera.camera.zoom;
    const flipH = options.flipH || false;
    const flipV = options.flipV || false;
    
    this.ctx.save();
    
    // Apply transforms
    this.ctx.translate(screenPos.x, screenPos.y);
    if (flipH) this.ctx.scale(-scale, scale);
    else if (flipV) this.ctx.scale(scale, -scale);
    else this.ctx.scale(scale, scale);
    
    // Draw sprite
    sprite.draw(this.ctx, 0, 0, {
      flipH: flipH,
      flipV: flipV,
      debug: options.debug || false
    });
    
    this.ctx.restore();
  }
  
  // ==================== UTILITY METHODS ====================
  
  drawUIText(text, x, y, color = '#fff', font = '14px monospace') {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }
  
  getPixelPerfection() {
    return this.camera.getPixelPerfection();
  }
  
  // ==================== DEBUG METHODS ====================
  
  renderDebugGrid(gridSize = 64) {
    const startX = Math.floor(this.camera.camera.x / gridSize) * gridSize;
    const startY = Math.floor(this.camera.camera.y / gridSize) * gridSize;
    const endX = startX + window.GAME_CONSTANTS.CANVAS_WIDTH / this.camera.camera.zoom + gridSize;
    const endY = startY + window.GAME_CONSTANTS.CANVAS_HEIGHT / this.camera.camera.zoom + gridSize;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = (x - this.camera.camera.x) * this.camera.camera.zoom;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = startY; y <= endY; y += gridSize) {
      const screenY = (y - this.camera.camera.y) * this.camera.camera.zoom;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.canvas.width, screenY);
      this.ctx.stroke();
    }
  }
  
  renderDebugBounds(bounds, color = 'rgba(255, 0, 0, 0.5)') {
    const screenPos = this.worldToScreen(bounds.x, bounds.y);
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      screenPos.x,
      screenPos.y,
      bounds.width * this.camera.camera.zoom,
      bounds.height * this.camera.camera.zoom
    );
  }
};