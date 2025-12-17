// Visual Effects Module for 2.5D Renderer
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/engine/renderer-effects.js',
  exports: ['RendererEffects'],
  dependencies: ['GAME_CONSTANTS', 'MathUtils']
});

/**
 * Visual effects system for 2.5D rendering
 * Handles stealth, detection, screen shake, and wall-hack effects
 */
window.RendererEffects = class RendererEffects {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    
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
  }
  
  /**
   * Set stealth effect intensity
   * @param {number} intensity - Effect intensity (0 to 1)
   */
  setStealthEffect(intensity) {
    this.effects.stealth.targetIntensity = window.MathUtils.clamp(intensity, 0, 1);
    this.effects.stealth.active = intensity > 0;
  }
  
  /**
   * Set wall-hack effect intensity
   * @param {number} intensity - Effect intensity (0 to 1)
   */
  setWallHackEffect(intensity) {
    this.effects.wallHack.targetIntensity = window.MathUtils.clamp(intensity, 0, 1);
    this.effects.wallHack.active = intensity > 0;
  }
  
  /**
   * Trigger detection warning effect
   */
  triggerDetectionEffect() {
    this.effects.detection.active = true;
    this.effects.detection.pulseTime = 0;
  }
  
  /**
   * Trigger screen shake effect
   * @param {number} intensity - Shake intensity
   * @param {number} duration - Shake duration in seconds
   */
  triggerScreenShake(intensity, duration) {
    this.effects.screenShake.active = true;
    this.effects.screenShake.intensity = intensity;
    this.effects.screenShake.duration = duration;
  }
  
  /**
   * Update all effects
   * @param {number} dt - Delta time
   */
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
  
  /**
   * Render all active effects
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderEffects(ctx) {
    // Render stealth overlay
    if (this.effects.stealth.active) {
      this.renderStealthOverlay(ctx);
    }
    
    // Render detection effect
    if (this.effects.detection.active) {
      this.renderDetectionEffect(ctx);
    }
    
    // Render wall-hack overlay
    if (this.effects.wallHack.active) {
      this.renderWallHackOverlay(ctx);
      this.renderWallHackEffect(ctx);
    }
  }
  
  /**
   * Render stealth overlay effect
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderStealthOverlay(ctx) {
    const intensity = this.effects.stealth.intensity;
    
    // Dark overlay
    ctx.fillStyle = `rgba(0, 0, 20, ${intensity * 0.3})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Vignette effect
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
    );
    gradient.addColorStop(0, `rgba(0, 50, 100, 0)`);
    gradient.addColorStop(1, `rgba(0, 50, 100, ${intensity * 0.4})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Render detection warning effect
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderDetectionEffect(ctx) {
    const pulse = Math.sin(this.effects.detection.pulseTime * Math.PI * 4);
    const intensity = Math.abs(pulse);
    
    // Red flash overlay
    ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.2})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Danger border
    ctx.strokeStyle = `rgba(255, 0, 0, ${intensity})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(2.5, 2.5, this.canvas.width - 5, this.canvas.height - 5);
  }
  
  /**
   * Render wall-hack overlay effect
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderWallHackOverlay(ctx) {
    const intensity = this.effects.wallHack.intensity;
    const pulse = Math.sin(this.effects.wallHack.pulseTime * 2) * 0.3 + 0.7;
    
    // Cyber-style overlay
    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, `rgba(0, 255, 255, ${intensity * 0.1})`);
    gradient.addColorStop(0.5, `rgba(255, 0, 255, ${intensity * 0.05})`);
    gradient.addColorStop(1, `rgba(0, 255, 255, ${intensity * 0.1})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Scan line effect
    ctx.strokeStyle = `rgba(0, 255, 255, ${intensity * 0.3 * pulse})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 10]);
    
    const scanY = (this.effects.wallHack.pulseTime * 100) % this.canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(this.canvas.width, scanY);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }
  
  /**
   * Render wall-hack effect (show entities through walls)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderWallHackEffect(ctx) {
    const intensity = this.effects.wallHack.intensity;
    
    // Show enemy vision cones through walls
    if (window.game && window.game.level && window.game.level.entities) {
      for (const entity of window.game.level.entities) {
        if (entity instanceof window.Camera) {
          this.renderCameraThroughWalls(ctx, entity, intensity);
        }
      }
    }
    
    // Show collectibles through walls
    if (window.game && window.game.level) {
      const collectibles = window.game.level.getCollectibles();
      for (const collectible of collectibles) {
        this.renderCollectibleThroughWalls(ctx, collectible, intensity);
      }
    }
  }
  
  /**
   * Render camera vision cone through walls
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} camera - Camera entity
   * @param {number} intensity - Effect intensity
   */
  renderCameraThroughWalls(ctx, camera, intensity) {
    // Calculate cone points
    const startAngle = camera.currentDirection - camera.visionAngle / 2;
    const endAngle = camera.currentDirection + camera.visionAngle / 2;
    
    const coneTip = this.camera.worldToScreen(camera.position.x, camera.position.y);
    const leftPoint = this.camera.worldToScreen(
      camera.position.x + Math.cos(startAngle) * camera.visionRange,
      camera.position.y + Math.sin(startAngle) * camera.visionRange
    );
    const rightPoint = this.camera.worldToScreen(
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
  
  /**
   * Render collectible through walls
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} collectible - Collectible object
   * @param {number} intensity - Effect intensity
   */
  renderCollectibleThroughWalls(ctx, collectible, intensity) {
    const screenPos = this.camera.worldToScreen(collectible.position.x, collectible.position.y);
    
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
  
  /**
   * Get screen shake offsets
   * @returns {Object} Offset values {offsetX, offsetY}
   */
  getScreenShakeOffsets() {
    return {
      offsetX: this.effects.screenShake.offsetX || 0,
      offsetY: this.effects.screenShake.offsetY || 0
    };
  }
};