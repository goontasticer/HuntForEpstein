// 2.5D Rendering Engine for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/engine/renderer.js',
  exports: ['Renderer'],
  dependencies: ['GAME_CONSTANTS', 'MathUtils', 'Vector2D']
});

window.Renderer = class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Rendering properties
    this.camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      smoothness: 0.1,
      zoom: 1,
      targetZoom: 1
    };
    
    // Initialize camera position to center
    this.setCameraPosition(0, 0, true);


    
    // 2.5D perspective settings
    this.perspective = {
      horizon: window.GAME_CONSTANTS.CANVAS_HEIGHT / 2,
      depthScale: 0.8,
      parallaxLayers: []
    };
    
    // Rendering layers
    this.layers = {
      background: [],
      floor: [],
      entities: [],
      walls: [],
      effects: [],
      ui: []
    };
    
    // Visual effects
    this.effects = {
      stealth: {
        active: false,
        intensity: 0,
        targetIntensity: 0
      },
      detection: {
        active: false,
        pulseTime: 0
      },
      screenShake: {
        active: false,
        intensity: 0,
        duration: 0,
        offsetX: 0,
        offsetY: 0
      },
      wallHack: {
        active: false,
        intensity: 0,
        targetIntensity: 0,
        pulseTime: 0
      }
    };
    
    // Performance optimization
    this.cullingBounds = {
      left: -100,
      right: window.GAME_CONSTANTS.CANVAS_WIDTH + 100,
      top: -100,
      bottom: window.GAME_CONSTANTS.CANVAS_HEIGHT + 100
    };
    
    // Initialize
    this.resize();
    this.setupContext();
  }
  
  resize() {
    // Set canvas size to match constants
    this.canvas.width = window.GAME_CONSTANTS.CANVAS_WIDTH;
    this.canvas.height = window.GAME_CONSTANTS.CANVAS_HEIGHT;
    
    // Update culling bounds
    this.updateCullingBounds();
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
    this.camera.targetX = x;
    this.camera.targetY = y;
    
    if (immediate) {
      this.camera.x = this.camera.targetX;
      this.camera.y = this.camera.targetY;
    }
  }

  
  updateCamera(dt) {
    // Smooth camera movement
    const smoothness = this.camera.smoothness;
    this.camera.x = window.MathUtils.smoothValue(
      this.camera.x, 
      this.camera.targetX, 
      smoothness, 
      dt
    );
    this.camera.y = window.MathUtils.smoothValue(
      this.camera.y, 
      this.camera.targetY, 
      smoothness, 
      dt
    );
    
    // Smooth zoom
    this.camera.zoom = window.MathUtils.smoothValue(
      this.camera.zoom,
      this.camera.targetZoom,
      0.2,
      dt
    );
    
    // Update culling bounds
    this.updateCullingBounds();
  }
  
  setCameraZoom(zoom, immediate = false) {
    this.camera.targetZoom = window.MathUtils.clamp(zoom, 0.5, 2.0);
    
    if (immediate) {
      this.camera.zoom = this.camera.targetZoom;
    }
  }
  
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX / this.camera.zoom) + this.camera.x,
      y: (screenY / this.camera.zoom) + this.camera.y
    };
  }
  
  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.camera.zoom,
      y: worldY * this.camera.zoom
    };
  }

  
  // ==================== CULLING MANAGEMENT ====================
  
  updateCullingBounds() {
    const zoom = this.camera.zoom;
    this.cullingBounds.left = this.camera.x - 100 / zoom;
    this.cullingBounds.right = this.camera.x + (window.GAME_CONSTANTS.CANVAS_WIDTH + 100) / zoom;
    this.cullingBounds.top = this.camera.y - 100 / zoom;
    this.cullingBounds.bottom = this.camera.y + (window.GAME_CONSTANTS.CANVAS_HEIGHT + 100) / zoom;
  }
  
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
  
  // ==================== 2.5D PROJECTION ====================
  
  project25D(worldX, worldY, depth = 0) {
    const screen = window.MathUtils.project25D(worldX, worldY, depth, this.perspective.horizon);
    
    // Apply camera transformation
    screen.x = (screen.x - this.camera.x) * this.camera.zoom;
    screen.y = (screen.y - this.camera.y) * this.camera.zoom;
    screen.scale *= this.camera.zoom;
    
    return screen;
  }
  
  getDepthScale(depth) {
    return window.MathUtils.getDepthScale(depth, 1.2, 0.6);
  }
  
  // ==================== LAYER MANAGEMENT ====================
  
  clearLayers() {
    for (const layerName in this.layers) {
      this.layers[layerName] = [];
    }
  }
  
  addToLayer(layerName, entity) {
    if (this.layers[layerName]) {
      this.layers[layerName].push(entity);
    }
  }
  
  sortEntityLayer() {
    // Sort entities by depth for proper rendering order
    this.layers.entities.sort((a, b) => {
      const aDepth = a.position ? a.position.y : 0;
      const bDepth = b.position ? b.position.y : 0;
      return aDepth - bDepth;
    });
  }
  
  // ==================== VISUAL EFFECTS ====================
  
  setStealthEffect(intensity) {
    this.effects.stealth.targetIntensity = window.MathUtils.clamp(intensity, 0, 1);
    this.effects.stealth.active = intensity > 0;
  }
  
  setWallHackEffect(intensity) {
    this.effects.wallHack.targetIntensity = window.MathUtils.clamp(intensity, 0, 1);
    this.effects.wallHack.active = intensity > 0;
  }
  
  triggerDetectionEffect() {
    this.effects.detection.active = true;
    this.effects.detection.pulseTime = 0;
  }
  
  triggerScreenShake(intensity, duration) {
    this.effects.screenShake.active = true;
    this.effects.screenShake.intensity = intensity;
    this.effects.screenShake.duration = duration;
  }
  
  updateEffects(dt) {
    // Update stealth effect
    this.effects.stealth.intensity = window.MathUtils.smoothValue(
      this.effects.stealth.intensity,
      this.effects.stealth.targetIntensity,
      0.1,
      dt
    );
    
    // Update wall-hack effect
    this.effects.wallHack.intensity = window.MathUtils.smoothValue(
      this.effects.wallHack.intensity,
      this.effects.wallHack.targetIntensity,
      0.2,
      dt
    );
    
    if (this.effects.wallHack.active) {
      this.effects.wallHack.pulseTime += dt;
    }
    
    // Update detection effect
    if (this.effects.detection.active) {
      this.effects.detection.pulseTime += dt;
      if (this.effects.detection.pulseTime > 1.0) {
        this.effects.detection.active = false;
      }
    }
    
    // Update screen shake
    if (this.effects.screenShake.active) {
      this.effects.screenShake.duration -= dt;
      if (this.effects.screenShake.duration <= 0) {
        this.effects.screenShake.active = false;
        this.effects.screenShake.offsetX = 0;
        this.effects.screenShake.offsetY = 0;
      } else {
        const intensity = this.effects.screenShake.intensity * 
                         (this.effects.screenShake.duration / 1.0); // Fade out
        this.effects.screenShake.offsetX = (Math.random() - 0.5) * intensity * 10;
        this.effects.screenShake.offsetY = (Math.random() - 0.5) * intensity * 10;
      }
    }
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
    
    // Apply camera transform and screen shake
    this.ctx.translate(-this.camera.x * this.camera.zoom, -this.camera.y * this.camera.zoom);
    this.ctx.translate(this.effects.screenShake.offsetX, this.effects.screenShake.offsetY);

    
    // Render layers in order
    this.renderBackground();
    this.renderFloor();
    this.renderEntities();
    this.renderWalls();
    this.renderEffects();
    this.renderUI();
    
    // Restore context state
    this.ctx.restore();
  }
  
  // ==================== LAYER RENDERING ====================
  
  renderBackground() {
    // Render background elements with parallax
    for (const element of this.layers.background) {
      this.renderBackgroundElement(element);
    }
  }
  
  renderBackgroundElement(element) {
    const depth = element.depth || 0.5;
    const parallaxOffset = window.MathUtils.getParallaxOffset(
      element.x || 0,
      depth,
      this.camera.x
    );
    
    const screenPos = this.worldToScreen(parallaxOffset, element.y || 0);
    
    // Apply depth scaling
    const scale = this.getDepthScale(depth);
    
    this.ctx.save();
    this.ctx.globalAlpha = element.opacity || 0.3;
    this.ctx.translate(screenPos.x, screenPos.y);
    this.ctx.scale(scale, scale);
    
    if (element.color) {
      this.ctx.fillStyle = element.color;
      this.ctx.fillRect(0, 0, element.width, element.height);
    }
    
    this.ctx.restore();
  }
  
  renderFloor() {
    for (const element of this.layers.floor) {
      if (!this.isEntityVisible(element)) continue;
      this.renderFloorElement(element);
    }
  }
  
  renderFloorElement(element) {
    const screenPos = this.worldToScreen(element.x, element.y);
    
    this.ctx.fillStyle = element.color || window.GAME_CONSTANTS.COLORS.FLOOR;
    this.ctx.fillRect(
      screenPos.x,
      screenPos.y,
      element.width * this.camera.zoom,
      element.height * this.camera.zoom
    );
    
    // Add depth effect for floor tiles
    if (element.isTile) {
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      this.ctx.strokeRect(
        screenPos.x,
        screenPos.y,
        element.width * this.camera.zoom,
        element.height * this.camera.zoom
      );
    }
  }
  
  renderEntities() {
    for (const entity of this.layers.entities) {
      if (!this.isEntityVisible(entity)) continue;
      
      if (entity.render && typeof entity.render === 'function') {
        entity.render(this);
      } else {
        this.renderDefaultEntity(entity);
      }
    }
  }
  
  renderDefaultEntity(entity) {
    const screenPos = this.worldToScreen(entity.position.x, entity.position.y);
    const width = (entity.width || 32) * this.camera.zoom;
    const height = (entity.height || 32) * this.camera.zoom;
    
    this.ctx.fillStyle = entity.color || '#fff';
    this.ctx.fillRect(
      screenPos.x - width / 2,
      screenPos.y - height / 2,
      width,
      height
    );
  }
  
  renderWalls() {
    // Sort walls by depth for proper 2.5D rendering
    this.layers.walls.sort((a, b) => (a.depth || 0) - (b.depth || 0));
    
    for (const wall of this.layers.walls) {
      if (!this.isEntityVisible(wall)) continue;
      this.renderWall(wall);
    }
    
    // Render wall-hack overlay if active
    if (this.effects.wallHack.active) {
      this.renderWallHackOverlay();
    }
  }
  
  renderWall(wall) {
    const depth = wall.depth || 0.5;
    const projected = this.project25D(wall.x, wall.y, depth);
    
    this.ctx.save();
    
    // Apply depth-based scaling
    const scale = projected.scale;
    
    // Wall shading based on depth
    const brightness = 0.6 + (1 - depth) * 0.4;
    this.ctx.fillStyle = this.adjustColorBrightness(wall.color || window.GAME_CONSTANTS.COLORS.WALL, brightness);
    
    // Draw wall with depth
    this.ctx.fillRect(
      projected.x - (wall.width * scale) / 2,
      projected.y - (wall.height * scale) / 2,
      wall.width * scale,
      wall.height * scale
    );
    
    // Add depth shadow
    if (wall.castShadow && depth > 0.3) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      const shadowOffset = 5 * scale;
      this.ctx.fillRect(
        projected.x - (wall.width * scale) / 2 + shadowOffset,
        projected.y - (wall.height * scale) / 2 + shadowOffset,
        wall.width * scale,
        wall.height * scale
      );
    }
    
    this.ctx.restore();
  }
  
  renderEffects() {
    // Render stealth overlay
    if (this.effects.stealth.active) {
      this.renderStealthOverlay();
    }
    
    // Render wall-hack effect
    if (this.effects.wallHack.active) {
      this.renderWallHackEffect();
    }
    
    // Render detection effect
    if (this.effects.detection.active) {
      this.renderDetectionEffect();
    }
    
    // Render other effects
    for (const effect of this.layers.effects) {
      this.renderEffect(effect);
    }
  }
  
  renderStealthOverlay() {
    const intensity = this.effects.stealth.intensity;
    
    // Dark overlay
    this.ctx.fillStyle = `rgba(0, 0, 20, ${intensity * 0.3})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Vignette effect
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
    );
    gradient.addColorStop(0, `rgba(0, 50, 100, 0)`);
    gradient.addColorStop(1, `rgba(0, 50, 100, ${intensity * 0.4})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  renderDetectionEffect() {
    const pulse = Math.sin(this.effects.detection.pulseTime * Math.PI * 4);
    const intensity = Math.abs(pulse);
    
    // Red flash overlay
    this.ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.2})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Danger border
    this.ctx.strokeStyle = `rgba(255, 0, 0, ${intensity})`;
    this.ctx.lineWidth = 5;
    this.ctx.strokeRect(2.5, 2.5, this.canvas.width - 5, this.canvas.height - 5);
  }
  
  renderWallHackOverlay() {
    const intensity = this.effects.wallHack.intensity;
    const pulse = Math.sin(this.effects.wallHack.pulseTime * 2) * 0.3 + 0.7;
    
    // Cyber-style overlay
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, `rgba(0, 255, 255, ${intensity * 0.1})`);
    gradient.addColorStop(0.5, `rgba(255, 0, 255, ${intensity * 0.05})`);
    gradient.addColorStop(1, `rgba(0, 255, 255, ${intensity * 0.1})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Scan line effect
    this.ctx.strokeStyle = `rgba(0, 255, 255, ${intensity * 0.3 * pulse})`;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 10]);
    
    const scanY = (this.effects.wallHack.pulseTime * 100) % this.canvas.height;
    this.ctx.beginPath();
    this.ctx.moveTo(0, scanY);
    this.ctx.lineTo(this.canvas.width, scanY);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
  }
  
  renderWallHackEffect() {
    const intensity = this.effects.wallHack.intensity;
    
    // Show enemy vision cones through walls
    if (window.game && window.game.level && window.game.level.entities) {
      for (const entity of window.game.level.entities) {
        if (entity instanceof window.Camera) {
          this.renderCameraThroughWalls(entity, intensity);
        }
      }
    }
    
    // Show collectibles through walls
    if (window.game && window.game.level) {
      const collectibles = window.game.level.getCollectibles();
      for (const collectible of collectibles) {
        this.renderCollectibleThroughWalls(collectible, intensity);
      }
    }
  }
  
  renderCameraThroughWalls(camera, intensity) {
    const ctx = this.ctx;
    
    // Calculate cone points
    const startAngle = camera.currentDirection - camera.visionAngle / 2;
    const endAngle = camera.currentDirection + camera.visionAngle / 2;
    
    const coneTip = this.worldToScreen(camera.position.x, camera.position.y);
    const leftPoint = this.worldToScreen(
      camera.position.x + Math.cos(startAngle) * camera.visionRange,
      camera.position.y + Math.sin(startAngle) * camera.visionRange
    );
    const rightPoint = this.worldToScreen(
      camera.position.x + Math.cos(endAngle) * camera.visionRange,
      camera.position.y + Math.sin(endAngle) * camera.visionRange
    );
    
    // Draw enhanced vision cone
    ctx.save();
    ctx.globalAlpha = intensity * 0.6;
    
    // Cyber-style cone
    const gradient = ctx.createRadialGradient(
      coneTip.x, coneTip.y, 0,
      coneTip.x, coneTip.y,
      Math.max(leftPoint.distanceTo(coneTip), rightPoint.distanceTo(coneTip))
    );
    
    // Color based on detection state
    let baseColor;
    if (camera.state === window.GAME_CONSTANTS.ENEMY_STATES.CHASING) {
      baseColor = '255, 0, 100'; // Pink-red for danger
    } else if (camera.state === window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING) {
      baseColor = '255, 200, 0'; // Yellow for caution
    } else {
      baseColor = '0, 255, 255'; // Cyan for normal
    }
    
    gradient.addColorStop(0, `rgba(${baseColor}, 0.8)`);
    gradient.addColorStop(0.5, `rgba(${baseColor}, 0.4)`);
    gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(coneTip.x, coneTip.y);
    ctx.lineTo(leftPoint.x, leftPoint.y);
    ctx.arc(coneTip.x, coneTip.y, leftPoint.distanceTo(coneTip), startAngle, endAngle);
    ctx.lineTo(rightPoint.x, rightPoint.y);
    ctx.closePath();
    ctx.fill();
    
    // Wireframe outline
    ctx.strokeStyle = `rgba(${baseColor}, ${intensity})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(coneTip.x, coneTip.y);
    ctx.lineTo(leftPoint.x, leftPoint.y);
    ctx.moveTo(coneTip.x, coneTip.y);
    ctx.lineTo(rightPoint.x, rightPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Camera position indicator
    ctx.fillStyle = `rgba(${baseColor}, ${intensity})`;
    ctx.beginPath();
    ctx.arc(coneTip.x, coneTip.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  renderCollectibleThroughWalls(collectible, intensity) {
    const ctx = this.ctx;
    const screenPos = this.worldToScreen(collectible.position.x, collectible.position.y);
    
    ctx.save();
    ctx.globalAlpha = intensity * 0.8;
    
    // Glowing effect
    const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
    const radius = 15 * pulse;
    
    let color;
    if (collectible.type === 'file') {
      color = '255, 193, 7'; // Gold for files
    } else if (collectible.type === 'powerup') {
      switch (collectible.powerupType) {
        case 'invisibility': color = '156, 39, 176'; break;
        case 'neuralink': color = '233, 30, 99'; break;
        case 'speed_boost': color = '76, 175, 80'; break;
        case 'stealth_boost': color = '33, 150, 243'; break;
        default: color = '255, 255, 255'; break;
      }
    } else {
      color = '255, 255, 255';
    }
    
    // Outer glow
    const gradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, radius
    );
    gradient.addColorStop(0, `rgba(${color}, 0.8)`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner core
    ctx.fillStyle = `rgba(${color}, 1)`;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Crosshair targeting
    ctx.strokeStyle = `rgba(${color}, ${intensity})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenPos.x - 10, screenPos.y);
    ctx.lineTo(screenPos.x + 10, screenPos.y);
    ctx.moveTo(screenPos.x, screenPos.y - 10);
    ctx.lineTo(screenPos.x, screenPos.y + 10);
    ctx.stroke();
    
    ctx.restore();
  }
  
  renderEffect(effect) {
    const screenPos = this.worldToScreen(effect.x, effect.y);
    
    this.ctx.save();
    
    if (effect.type === 'explosion') {
      this.renderExplosionEffect(screenPos, effect);
    } else if (effect.type === 'sparkle') {
      this.renderSparkleEffect(screenPos, effect);
    } else if (effect.type === 'trail') {
      this.renderTrailEffect(screenPos, effect);
    }
    
    this.ctx.restore();
  }
  
  renderExplosionEffect(screenPos, effect) {
    const progress = effect.progress || 0;
    const radius = effect.radius * progress * this.camera.zoom;
    
    const gradient = this.ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, radius
    );
    gradient.addColorStop(0, `rgba(255, 255, 0, ${1 - progress})`);
    gradient.addColorStop(0.5, `rgba(255, 100, 0, ${(1 - progress) * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  renderSparkleEffect(screenPos, effect) {
    const sparkleCount = 8;
    const time = effect.time || 0;
    
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / sparkleCount) * Math.PI * 2 + time;
      const distance = 10 + Math.sin(time * 2) * 5;
      const x = screenPos.x + Math.cos(angle) * distance;
      const y = screenPos.y + Math.sin(angle) * distance;
      const size = 2 + Math.sin(time * 4) * 1;
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - time * 0.5})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size * this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  renderTrailEffect(screenPos, effect) {
    const points = effect.points || [];
    if (points.length < 2) return;
    
    this.ctx.strokeStyle = effect.color || 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = effect.width || 2;
    this.ctx.lineCap = 'round';
    
    this.ctx.beginPath();
    const firstPoint = this.worldToScreen(points[0].x, points[0].y);
    this.ctx.moveTo(firstPoint.x, firstPoint.y);
    
    for (let i = 1; i < points.length; i++) {
      const point = this.worldToScreen(points[i].x, points[i].y);
      this.ctx.lineTo(point.x, point.y);
    }
    
    this.ctx.stroke();
  }
  
  renderUI() {
    for (const uiElement of this.layers.ui) {
      this.renderUIElement(uiElement);
    }
  }
  
  renderUIElement(element) {
    this.ctx.save();
    
    if (element.type === 'text') {
      this.ctx.font = element.font || '16px monospace';
      this.ctx.fillStyle = element.color || '#fff';
      this.ctx.fillText(element.text, element.x, element.y);
    } else if (element.type === 'rect') {
      this.ctx.fillStyle = element.fillColor || 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(element.x, element.y, element.width, element.height);
      
      if (element.borderColor) {
        this.ctx.strokeStyle = element.borderColor;
        this.ctx.lineWidth = element.borderWidth || 1;
        this.ctx.strokeRect(element.x, element.y, element.width, element.height);
      }
    } else if (element.type === 'healthbar') {
      this.renderHealthBar(element);
    } else if (element.type === 'progress') {
      this.renderProgressBar(element);
    }
    
    this.ctx.restore();
  }
  
  renderHealthBar(element) {
    const x = element.x;
    const y = element.y;
    const width = element.width;
    const height = element.height;
    const health = Math.max(0, Math.min(1, element.health / element.maxHealth));
    
    // Background
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(x, y, width, height);
    
    // Health fill
    const healthColor = health > 0.5 ? '#4CAF50' : 
                        health > 0.25 ? '#FF9800' : '#F44336';
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(x, y, width * health, height);
    
    // Border
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);
  }
  
  renderProgressBar(element) {
    const x = element.x;
    const y = element.y;
    const width = element.width;
    const height = element.height;
    const progress = Math.max(0, Math.min(1, element.progress));
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x, y, width, height);
    
    // Progress fill
    this.ctx.fillStyle = element.color || '#00BCD4';
    this.ctx.fillRect(x, y, width * progress, height);
    
    // Border
    this.ctx.strokeStyle = element.borderColor || '#444';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);
  }
  
  // ==================== PRIMITIVE DRAWING HELPERS ====================
  
  drawRect(x, y, width, height, color, filled = true) {
    const screenPos = this.worldToScreen(x, y);
    
    this.ctx.fillStyle = color;
    if (filled) {
      this.ctx.fillRect(
        screenPos.x,
        screenPos.y,
        width * this.camera.zoom,
        height * this.camera.zoom
      );
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(
        screenPos.x,
        screenPos.y,
        width * this.camera.zoom,
        height * this.camera.zoom
      );
    }
  }
  
  drawCircle(x, y, radius, color, filled = true) {
    const screenPos = this.worldToScreen(x, y);
    
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, radius * this.camera.zoom, 0, Math.PI * 2);
    
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
    this.ctx.lineWidth = width * this.camera.zoom;
    this.ctx.lineCap = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
  }
  
  drawSprite(sprite, x, y, options = {}) {
    if (!sprite || !sprite.isLoaded()) return;
    
    const screenPos = this.worldToScreen(x, y);
    const scale = (options.scale || 1) * this.camera.zoom;
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
    // Return pixel-perfect position for rendering
    return {
      x: Math.round(this.camera.x),
      y: Math.round(this.camera.y),
      zoom: this.camera.zoom
    };
  }

  
  // ==================== DEBUG METHODS ====================
  
  renderDebugGrid(gridSize = 64) {
    const startX = Math.floor(this.camera.x / gridSize) * gridSize;
    const startY = Math.floor(this.camera.y / gridSize) * gridSize;
    const endX = startX + window.GAME_CONSTANTS.CANVAS_WIDTH / this.camera.zoom + gridSize;
    const endY = startY + window.GAME_CONSTANTS.CANVAS_HEIGHT / this.camera.zoom + gridSize;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = (x - this.camera.x) * this.camera.zoom;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = startY; y <= endY; y += gridSize) {
      const screenY = (y - this.camera.y) * this.camera.zoom;
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
      bounds.width * this.camera.zoom,
      bounds.height * this.camera.zoom
    );
  }
};