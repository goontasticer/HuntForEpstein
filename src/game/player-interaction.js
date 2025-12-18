// Player interaction system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/player-interaction.js',
  exports: ['PlayerInteraction'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D']
});

window.PlayerInteraction = class PlayerInteraction {
  constructor() {
    this.files = [];
    this.powerups = [];
    this.lastInteractionTime = 0;
    this.interactionCooldown = 500; // 0.5 seconds between interactions
    
    // Combat state
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackDuration = 0.3; // seconds
    this.attackTimer = 0;
  }

  
  /**
   * Handle player interaction with environment
   * @param {Vector2D} position - Player position
   * @param {boolean} isHidden - Whether player is hidden
   */
  interact(position, isHidden) {
    const now = Date.now();
    if (now - this.lastInteractionTime < this.interactionCooldown) {
      return;
    }
    this.lastInteractionTime = now;
    
    // Check for nearby interactables
    const interactionRadius = 50;
    
    // Check for files
    this.collectFiles(position, interactionRadius);
    
    // Check for power-ups
    this.collectPowerups(position, interactionRadius);
    
    // Check for hide spots
    this.interactHideSpots(position, interactionRadius, isHidden);
  }
  
  /**
   * Collect nearby files
   * @param {Vector2D} position - Player position
   * @param {number} radius - Interaction radius
   */
  collectFiles(position, radius) {
    if (window.game && window.game.level) {
      const files = window.game.level.getFilesInRadius(position, radius);
      for (const file of files) {
        if (file.collect) {
          file.collect(window.game.player);
        }
      }
    }
  }
  
  /**
   * Collect nearby power-ups
   * @param {Vector2D} position - Player position
   * @param {number} radius - Interaction radius
   */
  collectPowerups(position, radius) {
    if (window.game && window.game.level) {
      const powerups = window.game.level.getPowerupsInRadius(position, radius);
      for (const powerup of powerups) {
        if (powerup.collect) {
          powerup.collect(window.game.player);
        }
      }
    }
  }
  
  /**
   * Interact with hide spots
   * @param {Vector2D} position - Player position
   * @param {number} radius - Interaction radius
   * @param {boolean} isHidden - Whether player is currently hidden
   */
  interactHideSpots(position, radius, isHidden) {
    const hideSpots = this.getNearbyHideSpots(position, radius);
    for (const hideSpot of hideSpots) {
      if (hideSpot.canHide && hideSpot.canHide(position)) {
        if (!isHidden) {
          // Enter hidden state
          if (window.game.player && window.game.player.enterHidden) {
            window.game.player.enterHidden();
          }
        }
        break;
      }
    }
  }
  
  /**
   * Get nearby hide spots
   * @param {Vector2D} position - Player position
   * @param {number} radius - Search radius
   * @returns {Array} List of nearby hide spots
   */
  getNearbyHideSpots(position, radius) {
    const hideSpots = [];
    
    // Check current room for hide spots
    if (window.game && window.game.world) {
      const currentRoom = window.game.world.getCurrentRoom();
      if (currentRoom && currentRoom.hideSpots) {
        for (const hideSpot of currentRoom.hideSpots) {
          const distance = position.distanceTo(hideSpot.position);
          if (distance <= radius) {
            hideSpots.push(hideSpot);
          }
        }
      }
    }
    
    return hideSpots;
  }
  
  /**
   * Handle file collection
   * @param {Object} file - File object to collect
   */
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
        this.showNotification('FILE COLLECTED', '#FFC107', 'success');
        
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
      this.showNotification('FILE COLLECTED', '#FFC107', 'success');
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Add power-up to inventory
   * @param {Object} powerup - Power-up object to add
   */
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
    this.applyPowerupEffect(powerupData);
    
    // Show notification
    const color = this.getPowerupColor(powerupData.type);
    this.showNotification(`POWER-UP: ${powerupData.type.toUpperCase()}`, color, 'info');
  }
  
  /**
   * Remove power-up from inventory
   * @param {Object} powerup - Power-up object to remove
   */
  removePowerup(powerup) {
    const index = this.powerups.indexOf(powerup);
    if (index > -1) {
      this.powerups.splice(index, 1);
      
      // Remove power-up effects
      this.removePowerupEffect(powerup);
      
      // Show expiration notification
      this.showNotification('POWER-UP EXPIRED', '#666', 'info');
    }
  }
  
  /**
   * Apply power-up effects to player
   * @param {Object} powerup - Power-up data
   */
  applyPowerupEffect(powerup) {
    if (!window.game.player) return;
    
    switch (powerup.type) {
      case 'speed_boost':
        if (window.game.player.applySpeedBoost) {
          window.game.player.applySpeedBoost(1.5);
        }
        break;
      case 'stealth_boost':
        if (window.game.player.applyStealthBoost) {
          window.game.player.applyStealthBoost(50);
        }
        break;
      case 'invisibility':
        if (window.game.player.enterHidden) {
          window.game.player.enterHidden();
        }
        break;
      case 'neuralink':
        if (window.game.player.applyNeuralink) {
          window.game.player.applyNeuralink();
        }
        break;
    }
  }
  
  /**
   * Remove power-up effects from player
   * @param {Object} powerup - Power-up data
   */
  removePowerupEffect(powerup) {
    if (!window.game.player) return;
    
    switch (powerup.type) {
      case 'speed_boost':
        if (window.game.player.removeSpeedBoost) {
          window.game.player.removeSpeedBoost();
        }
        break;
      case 'stealth_boost':
        if (window.game.player.removeStealthBoost) {
          window.game.player.removeStealthBoost();
        }
        break;
      case 'invisibility':
        if (window.game.player.exitHidden) {
          window.game.player.exitHidden();
        }
        break;
      case 'neuralink':
        if (window.game.player.removeNeuralink) {
          window.game.player.removeNeuralink();
        }
        break;
    }
  }
  
  /**
   * Get color for power-up type
   * @param {string} type - Power-up type
   * @returns {string} Color string
   */
  getPowerupColor(type) {
    switch (type) {
      case 'speed_boost': return '#4CAF50';
      case 'stealth_boost': return '#2196F3';
      case 'invisibility': return '#9C27B0';
      case 'neuralink': return '#00BCD4';
      default: return '#00BCD4';
    }
  }
  
  /**
   * Show notification to player
   * @param {string} message - Notification message
   * @param {string} color - Notification color
   * @param {string} type - Notification type
   */
  showNotification(message, color, type) {
    // Try HUD first
    if (window.hud) {
      window.hud.showNotification(message, type);
    } else if (window.game && window.game.ui && window.game.ui.showNotification) {
      window.game.ui.showNotification(message, color);
    } else {
      console.log(`Notification: ${message}`);
    }
  }
  
  /**
   * Check if player has specific power-up
   * @param {string} type - Power-up type
   * @returns {boolean} True if has power-up
   */
  hasPowerup(type) {
    return this.powerups.some(powerup => powerup.type === type);
  }
  
  /**
   * Get active power-ups list
   * @returns {Array} List of active power-up types
   */
  getActivePowerupTypes() {
    return this.powerups.map(powerup => powerup.type);
  }
  
  /**
   * Handle attack input
   * @param {Vector2D} position - Player position
   * @param {string} facing - Direction player is facing
   * @param {boolean} isGrounded - Whether player is on ground
   */
  handleAttack(position, facing, isGrounded) {
    if (this.attackCooldown > 0) return;
    
    // Player can attack regardless of grounded state
    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
    this.attackCooldown = 0.4; // seconds
    
    // Create attack hitbox
    const attackRange = 80;
    const attackWidth = 20;
    const attackHeight = 40;
    
    let attackX = position.x;
    let attackY = position.y + 16; // Center height
    
    if (facing === 'right') {
      attackX += attackRange / 2;
    } else if (facing === 'left') {
      attackX -= attackRange / 2;
    }
    
    // Store attack data for collision detection
    this.attackHitbox = {
      x: attackX - attackWidth / 2,
      y: attackY - attackHeight / 2,
      width: attackWidth,
      height: attackHeight,
      damage: 1,
      facing: facing
    };
    
    console.log(`Attack executed facing: ${facing}, grounded: ${isGrounded}`);
  }
  
  /**
   * Update power-ups (handle duration)
   * @param {number} dt - Delta time in seconds
   */
  updatePowerups(dt) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i];
      
      // Update duration
      if (powerup.duration) {
        powerup.duration -= dt * 1000;
        
        if (powerup.duration <= 0) {
          this.removePowerup(powerup);
        }
      }
    }
    
    // Update attack timers
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }
    
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.attackHitbox = null;
      }
    }
  }

  
  /**
   * Reset interaction system
   */
  reset() {
    this.files = [];
    this.powerups = [];
    this.lastInteractionTime = 0;
    
    // Reset combat state
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackTimer = 0;
    this.attackHitbox = null;
  }

  
  /**
   * Get interaction state for debugging
   * @returns {Object} Current interaction state
   */
  getState() {
    return {
      filesCollected: this.files.length,
      activePowerups: this.powerups.length,
      powerupTypes: this.getActivePowerupTypes(),
      lastInteractionTime: this.lastInteractionTime,
      interactionCooldown: this.interactionCooldown,
      isAttacking: this.isAttacking,
      attackCooldown: this.attackCooldown,
      attackTimer: this.attackTimer
    };
  }

};