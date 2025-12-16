// Player entity for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/player.js',
  exports: ['Player'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'AABB']
});

window.Player = class Player {
  constructor(x, y) {
    // Position and movement
    this.position = new window.Vector2D(x, y);
    this.velocity = new window.Vector2D(0, 0);
    this.speed = window.GAME_CONSTANTS.PLAYER_SPEED;
    this.stealthSpeed = window.GAME_CONSTANTS.PLAYER_STEALTH_SPEED;
    
    // Collision
    this.width = window.GAME_CONSTANTS.PLAYER_SIZE;
    this.height = window.GAME_CONSTANTS.PLAYER_SIZE;
    this.collider = new window.AABB(
      x - this.width / 2,
      y - this.height / 2,
      this.width,
      this.height
    );
    
    // Physics
    this.physics = {
      velocity: this.velocity,
      friction: 0.15
    };
    
    // State
    this.state = window.GAME_CONSTANTS.PLAYER_STATES.NORMAL;
    this.isCaught = false;
    this.isHidden = false;
    this.suspicionLevel = 0;
    
    // Stealth mechanics
    this.stealthMeter = 100;
    this.maxStealth = 100;
    this.lastDetectionTime = 0;
    this.detectionCooldown = 2000; // 2 seconds
    
    // Animation
    this.animationTime = 0;
    this.facing = 'right';
    this.isMoving = false;
    
    // MakkoEngine sprite integration
    this.sprite = null;
    this.currentAnimation = 'idle';
    this.animationRef = null;
    this.spriteLoaded = false;
    
    // Initialize sprite when MakkoEngine is available
    this.initializeSprite();
    
    // Inventory
    this.files = [];
    this.powerups = [];
    
    // Abilities
    this.canSprint = true;
    this.sprintDuration = 2000; // 2 seconds
    this.sprintCooldown = 5000; // 5 seconds
    this.lastSprintTime = 0;
    this.isSprinting = false;
  }
  
  initializeSprite() {
    // Wait for MakkoEngine to be available
    if (window.MakkoEngine && window.MakkoEngine.isLoaded()) {
      this.loadSprite();
    } else {
      // Try again after a short delay
      setTimeout(() => this.initializeSprite(), 100);
    }
  }
  
  loadSprite() {
    try {
      // Try to get player sprite - check for common character names
      const possibleNames = ['player', 'player_core', 'hero', 'character'];
      let spriteLoaded = false;
      
      for (const name of possibleNames) {
        if (window.MakkoEngine.has(name)) {
          this.sprite = window.MakkoEngine.sprite(name);
          if (this.sprite && this.sprite.isLoaded()) {
            this.spriteLoaded = true;
            spriteLoaded = true;
            console.log(`Loaded player sprite: ${name}`);
            break;
          }
        }
      }
      
      if (!spriteLoaded) {
        console.warn('No player sprite found in manifest. Using fallback rendering.');
        this.spriteLoaded = false;
      }
    } catch (error) {
      console.warn('Failed to load player sprite:', error.message);
      this.spriteLoaded = false;
    }
  }
  
  update(dt) {
    // Handle input
    this.handleInput(dt);
    
    // Update position using delta time
    this.updatePosition(dt);
    
    // Update collision box
    this.updateCollider();
    
    // Update stealth state
    this.updateStealth(dt);
    
    // Update animation
    this.updateAnimation(dt);
    
    // Update power-ups
    this.updatePowerups(dt);
    
    // Check if caught
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      const now = Date.now();
      if (now - this.lastDetectionTime > 3000) { // 3 seconds to escape
        this.isCaught = true;
      }
    }
  }
  
  updatePosition(dt) {
    // Apply velocity with delta time
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    
    // Apply friction
    this.velocity.x *= Math.pow(0.9, dt * 60); // Frame-independent friction
    this.velocity.y *= Math.pow(0.9, dt * 60);
    
    // Stop very small movement
    if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
  }
  
  updateCollider() {
    // Update AABB position to match entity position
    this.collider.x = this.position.x - this.width / 2;
    this.collider.y = this.position.y - this.height / 2;
  }
  
  handleInput(dt) {
    if (this.isCaught) return;
    
    // Get movement from Input system
    let moveX = 0, moveY = 0;
    
    if (window.Input.isActionDown('moveUp')) moveY = -1;
    if (window.Input.isActionDown('moveDown')) moveY = 1;
    if (window.Input.isActionDown('moveLeft')) moveX = -1;
    if (window.Input.isActionDown('moveRight')) moveX = 1;
    
    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      const length = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= length;
      moveY /= length;
    }
    
    const isSneaking = window.Input.isActionDown('sneak');
    
    // Determine speed
    let currentSpeed = this.speed;
    if (isSneaking) {
      currentSpeed = this.stealthSpeed;
      this.enterHidden();
    } else {
      this.exitHidden();
    }
    
    // Check for sprint
    const now = Date.now();
    if (window.Input.isActionDown('moveUp') || window.Input.isActionDown('moveDown') || 
        window.Input.isActionDown('moveLeft') || window.Input.isActionDown('moveRight')) {
      if (window.Input.isDown(window.Input.KEY_CODES.SHIFT) && this.canSprint && !isSneaking) {
        if (now - this.lastSprintTime > this.sprintCooldown) {
          this.isSprinting = true;
          this.lastSprintTime = now;
        }
      }
    }
    
    if (this.isSprinting) {
      currentSpeed *= 1.8; // Sprint multiplier
      if (now - this.lastSprintTime > this.sprintDuration) {
        this.isSprinting = false;
      }
    }
    
    // Apply movement
    if (moveX !== 0 || moveY !== 0) {
      this.velocity.x = moveX * currentSpeed;
      this.velocity.y = moveY * currentSpeed;
      this.isMoving = true;
      
      // Update facing direction
      if (Math.abs(moveX) > Math.abs(moveY)) {
        this.facing = moveX > 0 ? 'right' : 'left';
      }
    } else {
      this.isMoving = false;
    }
    
    // Handle interaction
    if (window.Input.isActionPressed('interact')) {
      this.interact();
    }
    
    // Handle room transitions
    this.handleRoomTransitions();
  }
  
  updateStealth(dt) {
    // Update suspicion level
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS) {
      this.suspicionLevel += dt * 20; // Increase suspicion
      
      if (this.suspicionLevel >= 100) {
        this.state = window.GAME_CONSTANTS.PLAYER_STATES.DETECTED;
        this.lastDetectionTime = Date.now();
      }
    } else if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.NORMAL) {
      this.suspicionLevel = Math.max(0, this.suspicionLevel - dt * 30); // Decrease suspicion
    }
    
    // Calculate stealth meter drain with power-up modifiers
    let drainRate = 5; // Base drain rate
    let regenRate = 10; // Base regeneration rate
    
    // Apply power-up effects
    if (this.hasPowerup('stealth_boost')) {
      drainRate *= 0.5; // 50% less drain
      regenRate *= 1.5; // 50% more regen
    }
    
    if (this.hasPowerup('invisibility')) {
      drainRate = 0; // No drain while invisible
      regenRate *= 2; // Double regen
    }
    
    // Update stealth meter
    if (this.isHidden) {
      this.stealthMeter = Math.min(this.maxStealth, this.stealthMeter + dt * regenRate);
    } else if (this.isSprinting) {
      this.stealthMeter = Math.max(0, this.stealthMeter - dt * (drainRate * 3)); // Triple drain while sprinting
    } else {
      this.stealthMeter = Math.max(0, this.stealthMeter - dt * drainRate);
    }
  }
  
  updateAnimation(dt) {
    this.animationTime += dt;
    
    // Update sprite animation if available
    if (this.spriteLoaded && this.sprite) {
      this.sprite.update(dt * 1000); // MakkoEngine expects milliseconds
      this.updateSpriteAnimation();
    }
  }
  
  updateSpriteAnimation() {
    if (!this.spriteLoaded || !this.sprite) return;
    
    // Determine appropriate animation based on state
    let targetAnimation = 'idle';
    
    if (this.isCaught) {
      targetAnimation = 'hurt'; // or 'dead' if available
    } else if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      targetAnimation = 'run'; // Panic animation
    } else if (this.isSprinting) {
      targetAnimation = 'run';
    } else if (this.isMoving) {
      targetAnimation = this.isHidden ? 'walk' : 'walk';
    } else if (this.isHidden) {
      targetAnimation = 'idle';
    } else {
      targetAnimation = 'idle';
    }
    
    // Add power-up modifiers
    if (this.hasPowerup('invisibility')) {
      targetAnimation = 'invisible'; // if available
    }
    
    // Check if animation exists and play it if different
    if (this.sprite.hasAnimation && this.sprite.hasAnimation(targetAnimation)) {
      if (this.currentAnimation !== targetAnimation) {
        this.animationRef = this.sprite.play(targetAnimation, true);
        this.currentAnimation = targetAnimation;
      }
    }
  }
  
  updatePowerups(dt) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i];
      
      // Update duration (handle both legacy and new format)
      if (powerup.duration) {
        powerup.duration -= dt * 1000;
        
        if (powerup.duration <= 0) {
          // Call removeEffect if available (new powerup system)
          if (powerup.type && window[powerup.type] && window[powerup.type].prototype.removeEffect) {
            const powerupClass = window[powerup.type];
            const tempPowerup = new powerupClass(0, 0);
            tempPowerup.removeEffect(this, powerup);
          }
          
          this.removePowerup(powerup);
          
          // Show expiration notification
          if (window.hud) {
            window.hud.showNotification('POWER-UP EXPIRED', 'info');
          } else if (window.game && window.game.ui && window.game.ui.showNotification) {
            window.game.ui.showNotification('POWER-UP EXPIRED', '#666');
          }
        }
      }
    }
  }
  
  hasPowerup(type) {
    return this.powerups.some(powerup => powerup.type === type);
  }
  
  enterHidden() {
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.NORMAL || 
        this.state === window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS) {
      this.state = window.GAME_CONSTANTS.PLAYER_STATES.HIDDEN;
      this.isHidden = true;
    }
  }
  
  exitHidden() {
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.HIDDEN) {
      this.state = window.GAME_CONSTANTS.PLAYER_STATES.NORMAL;
      this.isHidden = false;
    }
  }
  
  becomeSuspicious() {
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.NORMAL) {
      this.state = window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS;
    }
  }
  
  becomeDetected() {
    this.state = window.GAME_CONSTANTS.PLAYER_STATES.DETECTED;
    this.lastDetectionTime = Date.now();
    this.exitHidden();
  }
  
  escapeDetection() {
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      this.state = window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS;
      this.suspicionLevel = 50;
    }
  }
  
  interact() {
    // Check for nearby interactables
    const interactionRadius = 50;
    
    // Check for files
    if (window.game && window.game.level) {
      const files = window.game.level.getFilesInRadius(this.position, interactionRadius);
      for (const file of files) {
        if (file.collect) {
          file.collect(this);
        }
      }
    }
    
    // Check for power-ups
    if (window.game && window.game.level) {
      const powerups = window.game.level.getPowerupsInRadius(this.position, interactionRadius);
      for (const powerup of powerups) {
        if (powerup.collect) {
          powerup.collect(this);
        }
      }
    }
    
    // Check for hide spots
    const hideSpots = this.getNearbyHideSpots(interactionRadius);
    for (const hideSpot of hideSpots) {
      if (hideSpot.canHide(this)) {
        this.enterHidden();
        break;
      }
    }
  }
  
  getNearbyHideSpots(radius) {
    const hideSpots = [];
    
    // This would check level geometry for hide spots
    // Implementation depends on level system
    
    return hideSpots;
  }
  
  collectFile(file) {
    this.files.push(file);
    
    // Mark file as collected for tracking
    if (file && typeof file === 'object') {
      file.collected = true;
    }
    
    // Try to collect through world system first
    if (window.game && window.game.world) {
      const collected = window.game.world.collectFile(file.id || file);
      if (collected) {
        window.game.filesCollected = (window.game.filesCollected || 0) + 1;
        console.log(`Collected file: ${file.id || file}. Total: ${window.game.filesCollected}`);
        
        // Show collection notification
        if (window.hud) {
          window.hud.showNotification('FILE COLLECTED', 'success');
        } else if (window.game && window.game.ui && window.game.ui.showNotification) {
          window.game.ui.showNotification('FILE COLLECTED', '#FFC107');
        }
        
        // Update permadeath manager
        if (window.permadeathManager) {
          window.permadeathManager.collectFile();
        }
        
        return true;
      }
    } else {
      // Fallback to legacy system
      window.game.filesCollected = (window.game.filesCollected || 0) + 1;
      console.log(`Collected file: ${file.id || file}. Total: ${window.game.filesCollected}`);
      
      // Show collection notification
      if (window.game && window.game.ui && window.game.ui.showNotification) {
        window.game.ui.showNotification('FILE COLLECTED', '#FFC107');
      }
      
      return true;
    }
    
    return false;
  }
  
  addPowerup(powerup) {
    // Handle both legacy powerup objects and new powerup data
    const powerupData = powerup.effectData ? powerup : {
      type: powerup.type || powerup.powerupType,
      duration: powerup.duration || 10000,
      effectData: powerup.effectData || {},
      startTime: Date.now()
    };
    
    this.powerups.push(powerupData);
    
    // Apply immediate effects
    switch (powerupData.type) {
      case 'speed_boost':
        this.speed = (this.speed || window.GAME_CONSTANTS.PLAYER_SPEED) * 1.5;
        break;
      case 'stealth_boost':
        this.maxStealth += 50;
        this.stealthMeter = Math.min(this.stealthMeter + 50, this.maxStealth);
        break;
      case 'invisibility':
        this.enterHidden();
        break;
      case 'neuralink':
        // Neuralink effects are handled by the powerup class
        break;
    }
  }
  
  removePowerup(powerup) {
    const index = this.powerups.indexOf(powerup);
    if (index > -1) {
      this.powerups.splice(index, 1);
      
      // Remove powerup effects
      switch (powerup.type) {
        case 'speed_boost':
          this.speed = window.GAME_CONSTANTS.PLAYER_SPEED;
          break;
        case 'stealth_boost':
          this.maxStealth = 100;
          this.stealthMeter = Math.min(this.stealthMeter, this.maxStealth);
          break;
        case 'invisibility':
          if (!window.Input.isActionDown('sneak')) {
            this.exitHidden();
          }
          break;
        case 'neuralink':
          // Neuralink effects are handled by the powerup class
          break;
      }
    }
  }
  
  render(renderer) {
    const ctx = renderer.ctx;
    
    // Draw shadow first
    renderer.drawCircle(
      this.position.x, 
      this.position.y + this.height / 2, 
      this.width / 3, 
      'rgba(0, 0, 0, 0.3)', 
      true
    );
    
    // Try to render sprite if available
    if (this.spriteLoaded && this.sprite) {
      this.renderSprite(renderer);
    } else {
      // Fallback to shape-based rendering
      this.renderFallback(renderer);
    }
    
    // Draw effects on top of sprite
    this.renderEffects(renderer);
    
    // Draw power-up indicators
    this.renderPowerupIndicators(renderer);
  }
  
  renderSprite(renderer) {
    if (!this.sprite || !this.spriteLoaded) return;
    
    const ctx = renderer.ctx;
    
    // Calculate sprite scale based on player size
    const spriteSize = this.getCurrentSpriteSize();
    const scale = this.width / Math.max(spriteSize.width, spriteSize.height);
    
    // Apply power-up visual effects
    let alpha = 1.0;
    let tint = null;
    
    if (this.hasPowerup('invisibility')) {
      alpha = 0.5; // Semi-transparent when invisible
    }
    
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      tint = 'rgba(244, 67, 54, 0.3)'; // Red tint when detected
    } else if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS) {
      tint = 'rgba(255, 152, 0, 0.3)'; // Orange tint when suspicious
    } else if (this.isHidden) {
      tint = 'rgba(33, 150, 243, 0.3)'; // Blue tint when hidden
    }
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Apply tint if needed
    if (tint) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tint;
    }
    
    // Draw sprite
    this.sprite.draw(ctx, this.position.x, this.position.y, {
      scale: scale,
      flipH: this.facing === 'left',
      debug: false // Set to true to see hitboxes
    });
    
    ctx.restore();
  }
  
  renderFallback(renderer) {
    // Original shape-based rendering
    let playerColor = window.GAME_CONSTANTS.COLORS.PLAYER;
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.HIDDEN) {
      playerColor = '#2196F3';
    } else if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS) {
      playerColor = '#FF9800';
    } else if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      playerColor = '#F44336';
    }
    
    if (this.isSprinting) {
      playerColor = '#00BCD4'; // Cyan when sprinting
    }
    
    // Draw player body
    renderer.drawRect(
      this.position.x - this.width / 2,
      this.position.y - this.height / 2,
      this.width,
      this.height,
      playerColor,
      true
    );
    
    // Draw player outline
    renderer.drawRect(
      this.position.x - this.width / 2,
      this.position.y - this.height / 2,
      this.width,
      this.height,
      '#000',
      false
    );
    
    // Draw direction indicator
    const indicatorLength = this.width / 2;
    const indicatorX = this.facing === 'right' ? 
      this.position.x + this.width / 2 + indicatorLength / 2 :
      this.position.x - this.width / 2 - indicatorLength / 2;
    
    renderer.drawLine(
      this.position.x,
      this.position.y,
      indicatorX,
      this.position.y,
      '#fff',
      2
    );
  }
  
  renderEffects(renderer) {
    // Draw stealth effect when hidden
    if (this.isHidden) {
      renderer.drawCircle(
        this.position.x,
        this.position.y,
        this.width,
        'rgba(33, 150, 243, 0.2)',
        true
      );
    }
    
    // Draw detection warning
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.3;
      renderer.drawCircle(
        this.position.x,
        this.position.y,
        this.width * pulseScale,
        'rgba(244, 67, 54, 0.3)',
        true
      );
    }
  }
  
  renderPowerupIndicators(renderer) {
    let yOffset = -this.height / 2 - 10;
    for (const powerup of this.powerups) {
      let color = '#00BCD4';
      switch (powerup.type) {
        case 'speed_boost': color = '#4CAF50'; break;
        case 'stealth_boost': color = '#2196F3'; break;
        case 'invisibility': color = '#9C27B0'; break;
      }
      
      const remainingPercent = powerup.duration / window.GAME_CONSTANTS.POWERUP_DURATION;
      
      renderer.drawRect(
        this.position.x - 15,
        this.position.y + yOffset,
        30 * remainingPercent,
        4,
        color,
        true
      );
      
      yOffset -= 8;
    }
  }
  
  getCurrentSpriteSize() {
    if (!this.sprite || !this.spriteLoaded) {
      return { width: this.width, height: this.height };
    }
    
    try {
      return this.sprite.getCurrentFrameSize();
    } catch (error) {
      return { width: this.width, height: this.height };
    }
  }
  
  getDetectionRadius() {
    let radius = window.GAME_CONSTANTS.DETECTION_RADIUS;
    
    // Apply stealth state modifiers
    if (this.isHidden) {
      radius *= 0.3; // 70% reduction when hidden
    }
    
    // Apply movement modifiers
    if (this.isSprinting) {
      radius *= 2.0; // Double detection radius when sprinting
    } else if (this.isMoving) {
      radius *= 1.2; // Slightly more visible when moving
    }
    
    // Apply power-up modifiers
    if (this.hasPowerup('invisibility')) {
      radius *= 0.1; // 90% reduction when invisible
    }
    
    if (this.hasPowerup('stealth_boost')) {
      radius *= 0.5; // 50% reduction with stealth boost
    }
    
    // Apply stealth meter modifiers
    const stealthPercent = this.stealthMeter / this.maxStealth;
    if (stealthPercent < 0.3) {
      radius *= 1.5; // More visible when stealth meter is low
    } else if (stealthPercent > 0.8) {
      radius *= 0.8; // Slightly less visible when stealth meter is high
    }
    
    return radius;
  }
  
  getVisibilityMultiplier() {
    let multiplier = 1.0;
    
    // Base visibility from stealth meter
    const stealthPercent = this.stealthMeter / this.maxStealth;
    multiplier *= (0.5 + stealthPercent * 0.5); // 50% to 100% visibility based on meter
    
    // State modifiers
    if (this.isHidden) {
      multiplier *= 0.3;
    }
    
    if (this.isSprinting) {
      multiplier *= 2.0;
    } else if (this.isMoving) {
      multiplier *= 1.3;
    }
    
    // Power-up modifiers
    if (this.hasPowerup('invisibility')) {
      multiplier *= 0.1;
    }
    
    if (this.hasPowerup('stealth_boost')) {
      multiplier *= 0.5;
    }
    
    return Math.max(0.05, Math.min(2.0, multiplier)); // Clamp between 5% and 200%
  }
  
  hasWallHack() {
    return this.hasPowerup('neuralink');
  }
  
  // Collision detection methods
  checkCollision(other) {
    return this.collider.intersects(other.collider);
  }
  
  resolveCollision(other) {
    // Simple collision resolution - push player away
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Prevent division by zero
    
    const pushDistance = (this.width + other.width) / 2 - distance;
    if (pushDistance > 0) {
      const pushX = (dx / distance) * pushDistance;
      const pushY = (dy / distance) * pushDistance;
      
      this.position.x += pushX;
      this.position.y += pushY;
      
      this.updateCollider();
    }
  }
  
  handleRoomTransitions() {
    if (!window.game || !window.game.world) return;
    
    const world = window.game.world;
    const currentRoom = world.getCurrentRoom();
    if (!currentRoom) return;
    
    const roomWidth = window.GAME_CONSTANTS.CANVAS_WIDTH;
    const roomHeight = window.GAME_CONSTANTS.CANVAS_HEIGHT;
    const transitionThreshold = 50; // Distance from edge to trigger transition
    
    let transitionDirection = null;
    
    // Check if player is near room edges
    if (this.position.x < transitionThreshold) {
      transitionDirection = 'west';
    } else if (this.position.x > roomWidth - transitionThreshold) {
      transitionDirection = 'east';
    } else if (this.position.y < transitionThreshold) {
      transitionDirection = 'north';
    } else if (this.position.y > roomHeight - transitionThreshold) {
      transitionDirection = 'south';
    }
    
    // Attempt transition
    if (transitionDirection) {
      if (world.transitionRoom(transitionDirection)) {
        // Transition successful - reposition player to opposite side
        this.repositionPlayerForTransition(transitionDirection);
        console.log(`Transitioned ${transitionDirection} to room ${world.currentRoomX},${world.currentRoomY}`);
      }
    }
  }
  
  repositionPlayerForTransition(direction) {
    const roomWidth = window.GAME_CONSTANTS.CANVAS_WIDTH;
    const roomHeight = window.GAME_CONSTANTS.CANVAS_HEIGHT;
    const margin = 100; // Distance from edge after transition
    
    switch (direction) {
      case 'north':
        this.position.y = roomHeight - margin;
        break;
      case 'south':
        this.position.y = margin;
        break;
      case 'east':
        this.position.x = margin;
        break;
      case 'west':
        this.position.x = roomWidth - margin;
        break;
    }
    
    this.updateCollider();
  }
  
  // Reset player state
  reset(x, y) {
    this.position.set(x, y);
    this.velocity.set(0, 0);
    this.updateCollider();
    
    this.state = window.GAME_CONSTANTS.PLAYER_STATES.NORMAL;
    this.isCaught = false;
    this.isHidden = false;
    this.suspicionLevel = 0;
    this.stealthMeter = 100;
    this.isSprinting = false;
    this.isMoving = false;
    this.facing = 'right';
    
    // Clear powerups
    this.powerups = [];
    
    // Reset speed to base value
    this.speed = window.GAME_CONSTANTS.PLAYER_SPEED;
    
    // Reset position to center of current room
    if (window.game && window.game.world) {
      const world = window.game.world;
      this.position.x = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
      this.position.y = window.GAME_CONSTANTS.CANVAS_HEIGHT / 2;
      this.updateCollider();
    }
  }
};