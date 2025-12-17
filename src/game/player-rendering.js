// Player rendering system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/player-rendering.js',
  exports: ['PlayerRendering'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D']
});

window.PlayerRendering = class PlayerRendering {
  constructor() {
    // Animation
    this.animationTime = 0;
    this.facing = 'right';
    
    // MakkoEngine sprite integration
    this.sprite = null;
    this.currentAnimation = 'idle';
    this.animationRef = null;
    this.spriteLoaded = false;
    
    // Player dimensions (will be set from player instance)
    this.width = window.GAME_CONSTANTS.PLAYER_SIZE;
    this.height = window.GAME_CONSTANTS.PLAYER_SIZE;
  }
  
  /**
   * Initialize sprite when MakkoEngine is available
   */
  initializeSprite() {
    // Wait for MakkoEngine to be available
    if (window.MakkoEngine && window.MakkoEngine.isLoaded()) {
      this.loadSprite();
    } else {
      // Try again after a short delay
      setTimeout(() => this.initializeSprite(), 100);
    }
  }
  
  /**
   * Load sprite from MakkoEngine
   */
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
  
  /**
   * Update animation state
   * @param {number} dt - Delta time in seconds
   * @param {Object} playerState - Player state object
   * @param {boolean} isMoving - Whether player is moving
   * @param {boolean} isSprinting - Whether player is sprinting
   * @param {Array} activePowerups - List of active power-ups
   */
  updateAnimation(dt, playerState, isMoving, isSprinting, activePowerups) {
    this.animationTime += dt;
    
    // Update sprite animation if available
    if (this.spriteLoaded && this.sprite) {
      this.sprite.update(dt * 1000); // MakkoEngine expects milliseconds
      this.updateSpriteAnimation(playerState, isMoving, isSprinting, activePowerups);
    }
  }
  
  /**
   * Update sprite animation based on state
   * @param {Object} playerState - Player state object
   * @param {boolean} isMoving - Whether player is moving
   * @param {boolean} isSprinting - Whether player is sprinting
   * @param {Array} activePowerups - List of active power-ups
   */
  updateSpriteAnimation(playerState, isMoving, isSprinting, activePowerups) {
    if (!this.spriteLoaded || !this.sprite) return;
    
    // Determine appropriate animation based on state
    let targetAnimation = 'idle';
    
    if (playerState.isCaught) {
      targetAnimation = 'hurt'; // or 'dead' if available
    } else if (playerState.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      targetAnimation = 'run'; // Panic animation
    } else if (isSprinting) {
      targetAnimation = 'run';
    } else if (isMoving) {
      targetAnimation = playerState.isHidden ? 'walk' : 'walk';
    } else if (playerState.isHidden) {
      targetAnimation = 'idle';
    } else {
      targetAnimation = 'idle';
    }
    
    // Add power-up modifiers
    if (activePowerups.includes('invisibility')) {
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
  
  /**
   * Render player
   * @param {Object} renderer - Renderer object
   * @param {Vector2D} position - Player position
   * @param {Object} playerState - Player state object
   * @param {boolean} isMoving - Whether player is moving
   * @param {Array} activePowerups - List of active power-ups
   * @param {number} width - Player width
   * @param {number} height - Player height
   */
  render(renderer, position, playerState, isMoving, activePowerups, width, height) {
    // Update dimensions
    this.width = width;
    this.height = height;
    
    // Update facing from movement system
    this.facing = playerState.facing || this.facing;
    
    // Draw shadow first
    this.renderShadow(renderer, position);
    
    // Try to render sprite if available
    if (this.spriteLoaded && this.sprite) {
      this.renderSprite(renderer, position, playerState, activePowerups);
    } else {
      // Fallback to shape-based rendering
      this.renderFallback(renderer, position, playerState, isMoving);
    }
    
    // Draw effects on top of sprite
    this.renderEffects(renderer, position, playerState);
    
    // Draw power-up indicators
    this.renderPowerupIndicators(renderer, position, activePowerups);
  }
  
  /**
   * Render player shadow
   * @param {Object} renderer - Renderer object
   * @param {Vector2D} position - Player position
   */
  renderShadow(renderer, position) {
    renderer.drawCircle(
      position.x, 
      position.y + this.height / 2, 
      this.width / 3, 
      'rgba(0,0,0,0.3)', 
      true
    );
  }
  
  /**
   * Render player sprite
   * @param {Object} renderer - Renderer object
   * @param {Vector2D} position - Player position
   * @param {Object} playerState - Player state object
   * @param {Array} activePowerups - List of active power-ups
   */
  renderSprite(renderer, position, playerState, activePowerups) {
    if (!this.sprite || !this.spriteLoaded) return;
    
    const ctx = renderer.ctx;
    
    // Calculate sprite scale based on player size
    const spriteSize = this.getCurrentSpriteSize();
    const scale = this.width / Math.max(spriteSize.width, spriteSize.height);
    
    // Apply power-up visual effects
    let alpha = 1.0;
    let tint = null;
    
    if (activePowerups.includes('invisibility')) {
      alpha = 0.5; // Semi-transparent when invisible
    }
    
    if (playerState.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      tint = 'rgba(244, 67, 54, 0.3)'; // Red tint when detected
    } else if (playerState.state === window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS) {
      tint = 'rgba(255, 152, 0, 0.3)'; // Orange tint when suspicious
    } else if (playerState.isHidden) {
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
    this.sprite.draw(ctx, position.x, position.y, {
      scale: scale,
      flipH: this.facing === 'left',
      debug: false // Set to true to see hitboxes
    });
    
    ctx.restore();
  }
  
  /**
   * Render fallback shape-based player
   * @param {Object} renderer - Renderer object
   * @param {Vector2D} position - Player position
   * @param {Object} playerState - Player state object
   * @param {boolean} isMoving - Whether player is moving
   */
  renderFallback(renderer, position, playerState, isMoving) {
    let playerColor = window.GAME_CONSTANTS.COLORS.PLAYER;
    if (playerState.state === window.GAME_CONSTANTS.PLAYER_STATES.HIDDEN) {
      playerColor = '#2196F3';
    } else if (playerState.state === window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS) {
      playerColor = '#FF9800';
    } else if (playerState.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      playerColor = '#F44336';
    }
    
    if (playerState.isSprinting) {
      playerColor = '#00BCD4'; // Cyan when sprinting
    }
    
    // Draw player body
    renderer.drawRect(
      position.x - this.width / 2,
      position.y - this.height / 2,
      this.width,
      this.height,
      playerColor,
      true
    );
    
    // Draw player outline
    renderer.drawRect(
      position.x - this.width / 2,
      position.y - this.height / 2,
      this.width,
      this.height,
      '#000',
      false
    );
    
    // Draw direction indicator
    const indicatorLength = this.width / 2;
    const indicatorX = this.facing === 'right' ? 
      position.x + this.width / 2 + indicatorLength / 2 :
      position.x - this.width / 2 - indicatorLength / 2;
    
    renderer.drawLine(
      position.x,
      position.y,
      indicatorX,
      position.y,
      '#fff',
      2
    );
  }
  
  /**
   * Render player effects
   * @param {Object} renderer - Renderer object
   * @param {Vector2D} position - Player position
   * @param {Object} playerState - Player state object
   */
  renderEffects(renderer, position, playerState) {
    // Draw stealth effect when hidden
    if (playerState.isHidden) {
      renderer.drawCircle(
        position.x,
        position.y,
        this.width,
        'rgba(33, 150, 243, 0.2)',
        true
      );
    }
    
    // Draw detection warning
    if (playerState.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.3;
      renderer.drawCircle(
        position.x,
        position.y,
        this.width * pulseScale,
        'rgba(244, 67, 54, 0.3)',
        true
      );
    }
  }
  
  /**
   * Render power-up indicators
   * @param {Object} renderer - Renderer object
   * @param {Vector2D} position - Player position
   * @param {Array} activePowerups - List of active power-ups
   */
  renderPowerupIndicators(renderer, position, activePowerups) {
    let yOffset = -this.height / 2 - 10;
    for (const powerup of activePowerups) {
      let color = '#00BCD4';
      switch (powerup) {
        case 'speed_boost': color = '#4CAF50'; break;
        case 'stealth_boost': color = '#2196F3'; break;
        case 'invisibility': color = '#9C27B0'; break;
      }
      
      const remainingPercent = powerup.duration / window.GAME_CONSTANTS.POWERUP_DURATION;
      
      renderer.drawRect(
        position.x - 15,
        position.y + yOffset,
        30 * remainingPercent,
        4,
        color,
        true
      );
      
      yOffset -= 8;
    }
  }
  
  /**
   * Get current sprite frame size
   * @returns {Object} Sprite dimensions
   */
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
  
  /**
   * Get rendering state for debugging
   * @returns {Object} Current rendering state
   */
  getState() {
    return {
      animationTime: this.animationTime,
      facing: this.facing,
      currentAnimation: this.currentAnimation,
      spriteLoaded: this.spriteLoaded,
      width: this.width,
      height: this.height
    };
  }
};