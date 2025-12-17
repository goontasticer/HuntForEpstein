// Layer Management Module for 2.5D Renderer
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/engine/renderer-layers.js',
  exports: ['RendererLayers'],
  dependencies: ['GAME_CONSTANTS', 'MathUtils']
});

/**
 * Layer system for 2.5D rendering
 * Manages rendering layers, culling, and depth sorting
 */
window.RendererLayers = class RendererLayers {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    
    // Rendering layers
    this.layers = {
      background: [],
      floor: [],
      entities: [],
      walls: [],
      effects: [],
      ui: []
    };
    
    // 2.5D perspective settings
    this.perspective = {
      horizon: window.GAME_CONSTANTS.CANVAS_HEIGHT / 2,
      depthScale: 0.8,
      parallaxLayers: []
    };
    
    // Performance optimization
    this.cullingBounds = {
      left: -100,
      right: window.GAME_CONSTANTS.CANVAS_WIDTH + 100,
      top: -100,
      bottom: window.GAME_CONSTANTS.CANVAS_HEIGHT + 100
    };
  }
  
  /**
   * Clear all layers
   */
  clearLayers() {
    for (const layerName in this.layers) {
      this.layers[layerName] = [];
    }
  }
  
  /**
   * Add entity to specific layer
   * @param {string} layerName - Layer name
   * @param {Object} entity - Entity to add
   */
  addToLayer(layerName, entity) {
    if (this.layers[layerName]) {
      this.layers[layerName].push(entity);
    }
  }
  
  /**
   * Sort entity layer by depth for proper rendering order
   */
  sortEntityLayer() {
    // Sort entities by depth for proper rendering order
    this.layers.entities.sort((a, b) => {
      const aDepth = a.position ? a.position.y : 0;
      const bDepth = b.position ? b.position.y : 0;
      return aDepth - bDepth;
    });
  }
  
  /**
   * Update culling bounds based on camera position
   */
  updateCullingBounds() {
    const bounds = this.camera.getCameraBounds();
    this.cullingBounds = bounds;
  }
  
  /**
   * Check if entity is visible within culling bounds
   * @param {Object} entity - Entity to check
   * @returns {boolean} True if entity is visible
   */
  isEntityVisible(entity) {
    if (!entity.position) return false;
    
    const bounds = entity.getBounds ? 
      entity.getBounds() : 
      {
        left: entity.position.x - 20,
        right: entity.position.x + 20,
        top: entity.position.y - 20,
        bottom: entity.position.y + 20
      };
    
    return !(bounds.right < this.cullingBounds.left ||
             bounds.left > this.cullingBounds.right ||
             bounds.bottom < this.cullingBounds.top ||
             bounds.top > this.cullingBounds.bottom);
  }
  
  /**
   * Project 2.5D coordinates with depth
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @param {number} depth - Depth value (0 to 1)
   * @returns {Object} Projected coordinates {x, y, scale}
   */
  project25D(worldX, worldY, depth = 0) {
    const screen = window.MathUtils.project25D(worldX, worldY, depth, this.perspective.horizon);
    
    // Apply camera transformation
    screen.x = (screen.x - this.camera.camera.x) * this.camera.camera.zoom;
    screen.y = (screen.y - this.camera.camera.y) * this.camera.camera.zoom;
    screen.scale *= this.camera.camera.zoom;
    
    return screen;
  }
  
  /**
   * Get depth scale for an object
   * @param {number} depth - Depth value (0 to 1)
   * @returns {number} Scale factor
   */
  getDepthScale(depth) {
    return window.MathUtils.getDepthScale(depth, 1.2, 0.6);
  }
  
  /**
   * Render all layers in order
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderAllLayers(ctx) {
    // Render layers in order
    this.renderBackground(ctx);
    this.renderFloor(ctx);
    this.renderEntities(ctx);
    this.renderWalls(ctx);
    this.renderEffects(ctx);
    this.renderUI(ctx);
  }
  
  /**
   * Render background layer
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderBackground(ctx) {
    // Render background elements with parallax
    for (const element of this.layers.background) {
      this.renderBackgroundElement(ctx, element);
    }
  }
  
  /**
   * Render single background element
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} element - Background element
   */
  renderBackgroundElement(ctx, element) {
    const depth = element.depth || 0.5;
    const parallaxOffset = window.MathUtils.getParallaxOffset(
      element.x || 0,
      depth,
      this.camera.camera.x
    );
    
    const screenPos = this.camera.worldToScreen(parallaxOffset, element.y || 0);
    
    // Apply depth scaling
    const scale = this.getDepthScale(depth);
    
    ctx.save();
    ctx.globalAlpha = element.opacity || 0.3;
    ctx.translate(screenPos.x, screenPos.y);
    ctx.scale(scale, scale);
    
    if (element.color) {
      ctx.fillStyle = element.color;
      ctx.fillRect(0, 0, element.width, element.height);
    }
    
    ctx.restore();
  }
  
  /**
   * Render floor layer
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderFloor(ctx) {
    for (const element of this.layers.floor) {
      if (!this.isEntityVisible(element)) continue;
      this.renderFloorElement(ctx, element);
    }
  }
  
  /**
   * Render single floor element
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} element - Floor element
   */
  renderFloorElement(ctx, element) {
    const screenPos = this.camera.worldToScreen(element.x, element.y);
    
    ctx.fillStyle = element.color || window.GAME_CONSTANTS.COLORS.FLOOR;
    ctx.fillRect(
      screenPos.x,
      screenPos.y,
      element.width * this.camera.camera.zoom,
      element.height * this.camera.camera.zoom
    );
    
    // Add depth effect for floor tiles
    if (element.isTile) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.strokeRect(
        screenPos.x,
        screenPos.y,
        element.width * this.camera.camera.zoom,
        element.height * this.camera.camera.zoom
      );
    }
  }
  
  /**
   * Render entities layer
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderEntities(ctx) {
    for (const entity of this.layers.entities) {
      if (!this.isEntityVisible(entity)) continue;
      
      if (entity.render && typeof entity.render === 'function') {
        entity.render(this);
      } else {
        this.renderDefaultEntity(ctx, entity);
      }
    }
  }
  
  /**
   * Render default entity (fallback)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} entity - Entity to render
   */
  renderDefaultEntity(ctx, entity) {
    const screenPos = this.camera.worldToScreen(entity.position.x, entity.position.y);
    const width = (entity.width || 32) * this.camera.camera.zoom;
    const height = (entity.height || 32) * this.camera.camera.zoom;
    
    ctx.fillStyle = entity.color || '#fff';
    ctx.fillRect(
      screenPos.x - width / 2,
      screenPos.y - height / 2,
      width,
      height
    );
  }
  
  /**
   * Render walls layer
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderWalls(ctx) {
    // Sort walls by depth for proper 2.5D rendering
    this.layers.walls.sort((a, b) => (a.depth || 0) - (b.depth || 0));
    
    for (const wall of this.layers.walls) {
      if (!this.isEntityVisible(wall)) continue;
      this.renderWall(ctx, wall);
    }
  }
  
  /**
   * Render single wall
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} wall - Wall object
   */
  renderWall(ctx, wall) {
    const depth = wall.depth || 0.5;
    const projected = this.project25D(wall.x, wall.y, depth);
    
    ctx.save();
    
    // Apply depth-based scaling
    const scale = projected.scale;
    
    // Wall shading based on depth
    const brightness = 0.6 + (1 - depth) * 0.4;
    ctx.fillStyle = this.adjustColorBrightness(wall.color || window.GAME_CONSTANTS.COLORS.WALL, brightness);
    
    // Draw wall with depth
    ctx.fillRect(
      projected.x - (wall.width * scale) / 2,
      projected.y - (wall.height * scale) / 2,
      wall.width * scale,
      wall.height * scale
    );
    
    // Add depth shadow
    if (wall.castShadow && depth > 0.3) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      const shadowOffset = 5 * scale;
      ctx.fillRect(
        projected.x - (wall.width * scale) / 2 + shadowOffset,
        projected.y - (wall.height * scale) / 2 + shadowOffset,
        wall.width * scale,
        wall.height * scale
      );
    }
    
    ctx.restore();
  }
  
  /**
   * Render effects layer
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderEffects(ctx) {
    for (const effect of this.layers.effects) {
      this.renderEffect(ctx, effect);
    }
  }
  
  /**
   * Render single effect
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} effect - Effect object
   */
  renderEffect(ctx, effect) {
    const screenPos = this.camera.worldToScreen(effect.x, effect.y);
    
    ctx.save();
    
    if (effect.type === 'explosion') {
      this.renderExplosionEffect(ctx, screenPos, effect);
    } else if (effect.type === 'sparkle') {
      this.renderSparkleEffect(ctx, screenPos, effect);
    } else if (effect.type === 'trail') {
      this.renderTrailEffect(ctx, screenPos, effect);
    }
    
    ctx.restore();
  }
  
  /**
   * Render explosion effect
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} screenPos - Screen position
   * @param {Object} effect - Effect object
   */
  renderExplosionEffect(ctx, screenPos, effect) {
    const progress = effect.progress || 0;
    const radius = effect.radius * progress * this.camera.camera.zoom;
    
    const gradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, radius
    );
    gradient.addColorStop(0, `rgba(255, 255, 0, ${1 - progress})`);
    gradient.addColorStop(0.5, `rgba(255, 100, 0, ${(1 - progress) * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  /**
   * Render sparkle effect
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} screenPos - Screen position
   * @param {Object} effect - Effect object
   */
  renderSparkleEffect(ctx, screenPos, effect) {
    const sparkleCount = 8;
    const time = effect.time || 0;
    
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / sparkleCount) * Math.PI * 2 + time;
      const distance = 10 + Math.sin(time * 2) * 5;
      const x = screenPos.x + Math.cos(angle) * distance;
      const y = screenPos.y + Math.sin(angle) * distance;
      const size = 2 + Math.sin(time * 4) * 1;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - time * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, size * this.camera.camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Render trail effect
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} screenPos - Screen position
   * @param {Object} effect - Effect object
   */
  renderTrailEffect(ctx, screenPos, effect) {
    const points = effect.points || [];
    if (points.length < 2) return;
    
    ctx.strokeStyle = effect.color || 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = effect.width || 2;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    const firstPoint = this.camera.worldToScreen(points[0].x, points[0].y);
    ctx.moveTo(firstPoint.x, firstPoint.y);
    
    for (let i = 1; i < points.length; i++) {
      const point = this.camera.worldToScreen(points[i].x, points[i].y);
      ctx.lineTo(point.x, point.y);
    }
    
    ctx.stroke();
  }
  
  /**
   * Render UI layer
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderUI(ctx) {
    for (const uiElement of this.layers.ui) {
      this.renderUIElement(ctx, uiElement);
    }
  }
  
  /**
   * Render single UI element
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} element - UI element
   */
  renderUIElement(ctx, element) {
    ctx.save();
    
    if (element.type === 'text') {
      ctx.font = element.font || '16px monospace';
      ctx.fillStyle = element.color || '#fff';
      ctx.fillText(element.text, element.x, element.y);
    } else if (element.type === 'rect') {
      ctx.fillStyle = element.fillColor || 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(element.x, element.y, element.width, element.height);
      
      if (element.borderColor) {
        ctx.strokeStyle = element.borderColor;
        ctx.lineWidth = element.borderWidth || 1;
        ctx.strokeRect(element.x, element.y, element.width, element.height);
      }
    } else if (element.type === 'healthbar') {
      this.renderHealthBar(ctx, element);
    } else if (element.type === 'progress') {
      this.renderProgressBar(ctx, element);
    }
    
    ctx.restore();
  }
  
  /**
   * Render health bar
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} element - Health bar element
   */
  renderHealthBar(ctx, element) {
    const x = element.x;
    const y = element.y;
    const width = element.width;
    const height = element.height;
    const health = Math.max(0, Math.min(1, element.health / element.maxHealth));
    
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, width, height);
    
    // Health fill
    const healthColor = health > 0.5 ? '#4CAF50' : 
                        health > 0.25 ? '#FF9800' : '#F44336';
    ctx.fillStyle = healthColor;
    ctx.fillRect(x, y, width * health, height);
    
    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }
  
  /**
   * Render progress bar
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} element - Progress bar element
   */
  renderProgressBar(ctx, element) {
    const x = element.x;
    const y = element.y;
    const width = element.width;
    const height = element.height;
    const progress = Math.max(0, Math.min(1, element.progress));
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, width, height);
    
    // Progress fill
    ctx.fillStyle = element.color || '#00BCD4';
    ctx.fillRect(x, y, width * progress, height);
    
    // Border
    ctx.strokeStyle = element.borderColor || '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }
  
  /**
   * Adjust color brightness
   * @param {string} color - Color in hex format
   * @param {number} brightness - Brightness factor
   * @returns {string} Adjusted color in RGB format
   */
  adjustColorBrightness(color, brightness) {
    // Simple brightness adjustment (0.0 = black, 1.0 = original, >1.0 = brighter)
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.min(255, Math.max(0, Math.floor(r * brightness)));
    const newG = Math.min(255, Math.max(0, Math.floor(g * brightness)));
    const newB = Math.min(255, Math.max(0, Math.floor(b * brightness)));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  }
};