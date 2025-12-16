// Camera enemy with oscillating vision cones for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/camera.js',
  exports: ['Camera'],
  dependencies: ['GAME_CONSTANTS', 'MathUtils', 'Vector2D', 'AABB']
});

window.Camera = class Camera {
  constructor(x, y, config = {}) {
    // Position and basic properties
    this.position = new window.Vector2D(x, y);
    this.width = 40;
    this.height = 30;
    
    // Vision configuration
    this.visionRange = config.visionRange || window.GAME_CONSTANTS.ENEMY_VISION_RANGE;
    this.visionAngle = config.visionAngle || window.MathUtils.degToRad(window.GAME_CONSTANTS.ENEMY_VISION_CONE);
    this.baseDirection = config.direction || 0; // Base facing direction in radians
    
    // Oscillation configuration
    this.oscillationEnabled = config.oscillation !== false;
    this.oscillationSpeed = config.oscillationSpeed || 1.0; // radians per second
    this.oscillationRange = config.oscillationRange || Math.PI / 3; // ±60 degrees
    this.oscillationOffset = config.oscillationOffset || Math.random() * Math.PI * 2;
    
    // Current state
    this.currentDirection = this.baseDirection;
    this.oscillationTime = this.oscillationOffset;
    
    // Detection state
    this.state = window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING;
    this.detectionLevel = 0; // 0-1, how much player is detected
    this.lastDetectionTime = 0;
    this.suspicionLevel = 0; // 0-100
    this.alertCooldown = 0;
    
    // Collision for interaction
    this.collider = new window.AABB(
      x - this.width / 2,
      y - this.height / 2,
      this.width,
      this.height
    );
    
    // Visual properties
    this.color = config.color || window.GAME_CONSTANTS.COLORS.ENEMY;
    this.glowIntensity = 0;
    this.targetGlowIntensity = 0;
    
    // Detection history for smoothing
    this.detectionHistory = [];
    this.maxHistoryLength = 10;
    
    // Ray casting for line of sight
    this.rayCount = config.rayCount || 8; // Number of rays to cast
    this.rayResults = [];
    
    // Animation properties
    this.pulseTime = Math.random() * Math.PI * 2;
    this.rotation = 0;
  }
  
  update(dt) {
    // Update oscillation
    this.updateOscillation(dt);
    
    // Update detection
    this.updateDetection(dt);
    
    // Update visual effects
    this.updateVisualEffects(dt);
    
    // Update ray casting
    this.updateRayCasting();
    
    // Update cooldowns
    this.updateCooldowns(dt);
  }
  
  updateOscillation(dt) {
    if (!this.oscillationEnabled) {
      this.currentDirection = this.baseDirection;
      return;
    }
    
    this.oscillationTime += dt * this.oscillationSpeed;
    
    // Sinusoidal oscillation
    const oscillation = Math.sin(this.oscillationTime) * this.oscillationRange / 2;
    this.currentDirection = this.baseDirection + oscillation;
    
    // Update rotation for visual representation
    this.rotation = this.currentDirection;
  }
  
  updateDetection(dt) {
    if (!window.game || !window.game.player) return;
    
    const player = window.game.player;
    const playerPosition = player.position;
    
    // Check if player is in vision cone
    const inCone = this.isPlayerInVisionCone(playerPosition);
    const hasLineOfSight = this.hasLineOfSightToPlayer(playerPosition);
    
    // Get player's visibility multiplier
    const visibilityMultiplier = player.getVisibilityMultiplier ? player.getVisibilityMultiplier() : 1.0;
    
    // Calculate detection chance based on visibility
    let detectionChance = 0;
    if (inCone && hasLineOfSight) {
      // Base detection modified by player's visibility
      detectionChance = Math.min(1.0, visibilityMultiplier);
      
      // Distance affects detection - closer is easier to detect
      const distance = playerPosition.distanceTo(this.position);
      const distanceFactor = 1.0 - (distance / this.visionRange) * 0.5; // Up to 50% reduction at max range
      detectionChance *= (0.5 + distanceFactor * 0.5);
    }
    
    // Update detection history for smoothing
    this.detectionHistory.push(detectionChance);
    if (this.detectionHistory.length > this.maxHistoryLength) {
      this.detectionHistory.shift();
    }
    
    // Calculate smoothed detection level
    const averageDetection = this.detectionHistory.reduce((a, b) => a + b, 0) / this.detectionHistory.length;
    this.detectionLevel = window.MathUtils.smoothValue(this.detectionLevel, averageDetection, 0.3, dt);
    
    // Update state based on detection
    this.updateState(dt, player);
  }
  
  updateState(dt, player) {
    const now = Date.now();
    
    if (this.detectionLevel > 0.8) {
      // High detection - player detected
      if (this.state !== window.GAME_CONSTANTS.ENEMY_STATES.CHASING) {
        this.state = window.GAME_CONSTANTS.ENEMY_STATES.CHASING;
        this.lastDetectionTime = now;
        player.becomeDetected();
        this.targetGlowIntensity = 1.0;
        
        // Trigger detection effect
        if (window.game && window.game.renderer) {
          window.game.renderer.triggerDetectionEffect();
        }
      }
    } else if (this.detectionLevel > 0.3) {
      // Medium detection - suspicious
      if (this.state === window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING) {
        this.state = window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING;
        this.targetGlowIntensity = 0.6;
        player.becomeSuspicious();
      }
    } else {
      // Low or no detection - return to patrol
      if (this.state !== window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING) {
        this.state = window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING;
        this.targetGlowIntensity = 0.1;
        
        // Help player escape detection
        if (player.state === window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS) {
          player.escapeDetection();
        }
      }
    }
    
    // Update suspicion level
    if (this.detectionLevel > 0) {
      this.suspicionLevel = Math.min(100, this.suspicionLevel + dt * 30 * this.detectionLevel);
    } else {
      this.suspicionLevel = Math.max(0, this.suspicionLevel - dt * 20);
    }
  }
  
  updateVisualEffects(dt) {
    // Smooth glow intensity
    this.glowIntensity = window.MathUtils.smoothValue(
      this.glowIntensity,
      this.targetGlowIntensity,
      0.2,
      dt
    );
    
    // Update pulse for visual interest
    this.pulseTime += dt * 2;
    
    // Update collider position (in case camera moves)
    this.collider.x = this.position.x - this.width / 2;
    this.collider.y = this.position.y - this.height / 2;
  }
  
  updateRayCasting() {
    this.rayResults = [];
    
    if (!window.game || !window.game.level) return;
    
    // Cast rays in vision cone
    const startAngle = this.currentDirection - this.visionAngle / 2;
    const angleStep = this.visionAngle / (this.rayCount - 1);
    
    for (let i = 0; i < this.rayCount; i++) {
      const angle = startAngle + angleStep * i;
      const direction = new window.Vector2D(Math.cos(angle), Math.sin(angle));
      
      const rayEnd = this.position.add(direction.multiply(this.visionRange));
      const result = this.castRay(this.position, rayEnd);
      
      this.rayResults.push({
        start: this.position,
        end: result.hitPoint || rayEnd,
        hit: result.hit,
        distance: result.distance
      });
    }
  }
  
  updateCooldowns(dt) {
    if (this.alertCooldown > 0) {
      this.alertCooldown -= dt * 1000; // Convert to milliseconds
    }
  }
  
  isPlayerInVisionCone(playerPosition) {
    const toPlayer = playerPosition.subtract(this.position);
    const distance = toPlayer.length();
    
    // Get effective vision range based on player stealth
    let effectiveRange = this.visionRange;
    if (window.game && window.game.player && window.game.player.getDetectionRadius) {
      // Camera can see further if player has higher detection radius
      const playerDetectionRadius = window.game.player.getDetectionRadius();
      effectiveRange = Math.max(this.visionRange, playerDetectionRadius * 1.5);
    }
    
    // Check distance
    if (distance > effectiveRange) return false;
    
    // Check angle
    const toPlayerNormalized = toPlayer.normalize();
    const forward = new window.Vector2D(Math.cos(this.currentDirection), Math.sin(this.currentDirection));
    const dotProduct = forward.dot(toPlayerNormalized);
    const angle = Math.acos(window.MathUtils.clamp(dotProduct, -1, 1));
    
    return angle <= this.visionAngle / 2;
  }
  
  hasLineOfSightToPlayer(playerPosition) {
    if (!window.game || !window.game.level) return true;
    
    const obstacles = window.game.level.getWallsInRadius(this.position, this.visionRange);
    return window.MathUtils.hasLineOfSight(this.position, playerPosition, obstacles);
  }
  
  castRay(start, end) {
    if (!window.game || !window.game.level) {
      return { hit: false, hitPoint: null, distance: start.distanceTo(end) };
    }
    
    const obstacles = window.game.level.getWallsInRadius(this.position, this.visionRange);
    let closestHit = null;
    let closestDistance = start.distanceTo(end);
    
    for (const obstacle of obstacles) {
      if (window.MathUtils.lineIntersectsAABB(start, end, obstacle)) {
        // Calculate intersection point (simplified)
        const distance = start.distanceTo(new window.Vector2D(
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2
        ));
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestHit = new window.Vector2D(
            obstacle.x + obstacle.width / 2,
            obstacle.y + obstacle.height / 2
          );
        }
      }
    }
    
    return {
      hit: closestHit !== null,
      hitPoint: closestHit,
      distance: closestDistance
    };
  }
  
  render(renderer) {
    // Render vision cone first (behind camera)
    this.renderVisionCone(renderer);
    
    // Render camera body
    this.renderCameraBody(renderer);
    
    // Render rays for debugging
    if (window.game && window.game.debug) {
      this.renderDebugRays(renderer);
    }
    
    // render status indicator
    this.renderStatusIndicator(renderer);
  }
  
  renderVisionCone(renderer) {
    const ctx = renderer.ctx;
    
    // Calculate cone points
    const startAngle = this.currentDirection - this.visionAngle / 2;
    const endAngle = this.currentDirection + this.visionAngle / 2;
    
    const coneTip = renderer.worldToScreen(this.position.x, this.position.y);
    const leftPoint = renderer.worldToScreen(
      this.position.x + Math.cos(startAngle) * this.visionRange,
      this.position.y + Math.sin(startAngle) * this.visionRange
    );
    const rightPoint = renderer.worldToScreen(
      this.position.x + Math.cos(endAngle) * this.visionRange,
      this.position.y + Math.sin(endAngle) * this.visionRange
    );
    
    // Draw vision cone with gradient
    ctx.save();
    
    // Create gradient for vision cone
    const gradient = ctx.createRadialGradient(
      coneTip.x, coneTip.y, 0,
      coneTip.x, coneTip.y,
      Math.max(leftPoint.distanceTo(coneTip), rightPoint.distanceTo(coneTip))
    );
    
    // Color based on detection state
    let baseColor, alpha;
    if (this.state === window.GAME_CONSTANTS.ENEMY_STATES.CHASING) {
      baseColor = '255, 0, 0'; // Red
      alpha = 0.3 + this.glowIntensity * 0.4;
    } else if (this.state === window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING) {
      baseColor = '255, 152, 0'; // Orange
      alpha = 0.2 + this.glowIntensity * 0.3;
    } else {
      baseColor = '255, 235, 59'; // Yellow
      alpha = 0.1 + this.glowIntensity * 0.1;
    }
    
    gradient.addColorStop(0, `rgba(${baseColor}, ${alpha})`);
    gradient.addColorStop(0.7, `rgba(${baseColor}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(coneTip.x, coneTip.y);
    ctx.lineTo(leftPoint.x, leftPoint.y);
    
    // Draw arc for cone base
    const arcRadius = leftPoint.distanceTo(coneTip);
    ctx.arc(coneTip.x, coneTip.y, arcRadius, startAngle, endAngle);
    
    ctx.lineTo(rightPoint.x, rightPoint.y);
    ctx.closePath();
    ctx.fill();
    
    // Draw cone outline
    ctx.strokeStyle = `rgba(${baseColor}, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(coneTip.x, coneTip.y);
    ctx.lineTo(leftPoint.x, leftPoint.y);
    ctx.moveTo(coneTip.x, coneTip.y);
    ctx.lineTo(rightPoint.x, rightPoint.y);
    ctx.stroke();
    
    ctx.restore();
  }
  
  renderCameraBody(renderer) {
    const ctx = renderer.ctx;
    const screenPos = renderer.worldToScreen(this.position.x, this.position.y);
    const scale = renderer.camera.zoom;
    
    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(this.rotation);
    
    // Draw camera base
    const baseWidth = this.width * scale;
    const baseHeight = this.height * scale;
    
    // Camera body
    ctx.fillStyle = this.color;
    ctx.fillRect(-baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
    
    // Camera lens
    const lensSize = baseHeight * 0.6;
    const pulseScale = 1 + Math.sin(this.pulseTime) * this.glowIntensity * 0.2;
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(baseWidth / 4, 0, lensSize * pulseScale / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Lens glow based on detection
    if (this.glowIntensity > 0) {
      const glowGradient = ctx.createRadialGradient(
        baseWidth / 4, 0, 0,
        baseWidth / 4, 0, lensSize * pulseScale
      );
      
      if (this.state === window.GAME_CONSTANTS.ENEMY_STATES.CHASING) {
        glowGradient.addColorStop(0, `rgba(255, 0, 0, ${this.glowIntensity})`);
        glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      } else if (this.state === window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING) {
        glowGradient.addColorStop(0, `rgba(255, 152, 0, ${this.glowIntensity})`);
        glowGradient.addColorStop(1, 'rgba(255, 152, 0, 0)');
      } else {
        glowGradient.addColorStop(0, `rgba(255, 235, 59, ${this.glowIntensity * 0.5})`);
        glowGradient.addColorStop(1, 'rgba(255, 235, 59, 0)');
      }
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(baseWidth / 4, 0, lensSize * pulseScale, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Camera mounting bracket
    ctx.fillStyle = '#444';
    ctx.fillRect(-baseWidth / 2 - 5 * scale, -3 * scale, 5 * scale, 6 * scale);
    
    ctx.restore();
  }
  
  renderDebugRays(renderer) {
    const ctx = renderer.ctx;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    for (const ray of this.rayResults) {
      const startScreen = renderer.worldToScreen(ray.start.x, ray.start.y);
      const endScreen = renderer.worldToScreen(ray.end.x, ray.end.y);
      
      ctx.beginPath();
      ctx.moveTo(startScreen.x, startScreen.y);
      ctx.lineTo(endScreen.x, endScreen.y);
      
      if (ray.hit) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      } else {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
      }
      
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  renderStatusIndicator(renderer) {
    // Small indicator above camera showing state
    if (this.state !== window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING) {
      const ctx = renderer.ctx;
      const screenPos = renderer.worldToScreen(this.position.x, this.position.y);
      const yOffset = -this.height * renderer.camera.zoom - 10;
      
      ctx.save();
      
      let indicatorColor;
      if (this.state === window.GAME_CONSTANTS.ENEMY_STATES.CHASING) {
        indicatorColor = '#F44336'; // Red
      } else if (this.state === window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING) {
        indicatorColor = '#FF9800'; // Orange
      } else {
        indicatorColor = '#FFC107'; // Yellow
      }
      
      // Pulsing indicator
      const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.3;
      
      ctx.fillStyle = indicatorColor;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y + yOffset, 4 * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }
  
  // Configuration methods
  setOscillationSpeed(speed) {
    this.oscillationSpeed = Math.max(0, speed);
  }
  
  setOscillationRange(range) {
    this.oscillationRange = Math.max(0, Math.min(Math.PI, range));
  }
  
  setVisionRange(range) {
    this.visionRange = Math.max(50, range);
  }
  
  setVisionAngle(angle) {
    this.visionAngle = Math.max(0.1, Math.min(Math.PI, angle));
  }
  
  disableOscillation() {
    this.oscillationEnabled = false;
  }
  
  enableOscillation() {
    this.oscillationEnabled = true;
  }
  
  // Utility methods
  isAlert() {
    return this.state === window.GAME_CONSTANTS.ENEMY_STATES.CHASING || 
           this.state === window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING;
  }
  
  getDetectionRadius() {
    return this.visionRange;
  }
  
  reset() {
    this.state = window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING;
    this.detectionLevel = 0;
    this.suspicionLevel = 0;
    this.alertCooldown = 0;
    this.detectionHistory = [];
    this.glowIntensity = 0;
    this.targetGlowIntensity = 0;
    this.oscillationTime = this.oscillationOffset;
  }
};