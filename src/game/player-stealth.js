// Player stealth system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/player-stealth.js',
  exports: ['PlayerStealth'],
  dependencies: ['GAME_CONSTANTS']
});

window.PlayerStealth = class PlayerStealth {
  constructor() {
    // State
    this.state = window.GAME_CONSTANTS.PLAYER_STATES.NORMAL;
    this.isHidden = false;
    this.suspicionLevel = 0;
    this.lastDetectionTime = 0;
    this.detectionCooldown = 2000; // 2 seconds
    
    // Stealth mechanics
    this.stealthMeter = 100;
    this.maxStealth = 100;
  }
  
  /**
   * Update stealth state
   * @param {number} dt - Delta time in seconds
   * @param {boolean} isMoving - Whether player is moving
   * @param {boolean} isSprinting - Whether player is sprinting
   * @param {Array} activePowerups - List of active power-ups
   */
  update(dt, isMoving, isSprinting, activePowerups) {
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
    if (activePowerups.includes('stealth_boost')) {
      drainRate *= 0.5; // 50% less drain
      regenRate *= 1.5; // 50% more regen
    }
    
    if (activePowerups.includes('invisibility')) {
      drainRate = 0; // No drain while invisible
      regenRate *= 2; // Double regen
    }
    
    // Update stealth meter
    if (this.isHidden) {
      this.stealthMeter = Math.min(this.maxStealth, this.stealthMeter + dt * regenRate);
    } else if (isSprinting) {
      this.stealthMeter = Math.max(0, this.stealthMeter - dt * (drainRate * 3)); // Triple drain while sprinting
    } else {
      this.stealthMeter = Math.max(0, this.stealthMeter - dt * drainRate);
    }
  }
  
  /**
   * Enter hidden state
   */
  enterHidden() {
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.NORMAL || 
        this.state === window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS) {
      this.state = window.GAME_CONSTANTS.PLAYER_STATES.HIDDEN;
      this.isHidden = true;
    }
  }
  
  /**
   * Exit hidden state
   */
  exitHidden() {
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.HIDDEN) {
      this.state = window.GAME_CONSTANTS.PLAYER_STATES.NORMAL;
      this.isHidden = false;
    }
  }
  
  /**
   * Make player suspicious
   */
  becomeSuspicious() {
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.NORMAL) {
      this.state = window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS;
    }
  }
  
  /**
   * Make player detected
   */
  becomeDetected() {
    this.state = window.GAME_CONSTANTS.PLAYER_STATES.DETECTED;
    this.lastDetectionTime = Date.now();
    this.exitHidden();
  }
  
  /**
   * Escape from detection
   */
  escapeDetection() {
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      this.state = window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS;
      this.suspicionLevel = 50;
    }
  }
  
  /**
   * Check if player is caught
   * @returns {boolean} True if caught
   */
  isCaught() {
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      const now = Date.now();
      if (now - this.lastDetectionTime > 3000) { // 3 seconds to escape
        return true;
      }
    }
    return false;
  }
  
  /**
   * Apply power-up effects to stealth
   * @param {string} powerupType - Type of power-up
   * @param {boolean} add - True to add effect, false to remove
   */
  applyPowerupEffect(powerupType, add) {
    switch (powerupType) {
      case 'stealth_boost':
        if (add) {
          this.maxStealth += 50;
          this.stealthMeter = Math.min(this.stealthMeter + 50, this.maxStealth);
        } else {
          this.maxStealth = 100;
          this.stealthMeter = Math.min(this.stealthMeter, this.maxStealth);
        }
        break;
    }
  }
  
  /**
   * Get detection radius based on current state
   * @param {boolean} isMoving - Whether player is moving
   * @param {boolean} isSprinting - Whether player is sprinting
   * @param {Array} activePowerups - List of active power-ups
   * @returns {number} Detection radius
   */
  getDetectionRadius(isMoving, isSprinting, activePowerups) {
    let radius = window.GAME_CONSTANTS.DETECTION_RADIUS;
    
    // Apply stealth state modifiers
    if (this.isHidden) {
      radius *= 0.3; // 70% reduction when hidden
    }
    
    // Apply movement modifiers
    if (isSprinting) {
      radius *= 2.0; // Double detection radius when sprinting
    } else if (isMoving) {
      radius *= 1.2; // Slightly more visible when moving
    }
    
    // Apply power-up modifiers
    if (activePowerups.includes('invisibility')) {
      radius *= 0.1; // 90% reduction when invisible
    }
    
    if (activePowerups.includes('stealth_boost')) {
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
  
  /**
   * Get visibility multiplier
   * @param {boolean} isMoving - Whether player is moving
   * @param {boolean} isSprinting - Whether player is sprinting
   * @param {Array} activePowerups - List of active power-ups
   * @returns {number} Visibility multiplier
   */
  getVisibilityMultiplier(isMoving, isSprinting, activePowerups) {
    let multiplier = 1.0;
    
    // Base visibility from stealth meter
    const stealthPercent = this.stealthMeter / this.maxStealth;
    multiplier *= (0.5 + stealthPercent * 0.5); // 50% to 100% visibility based on meter
    
    // State modifiers
    if (this.isHidden) {
      multiplier *= 0.3;
    }
    
    if (isSprinting) {
      multiplier *= 2.0;
    } else if (isMoving) {
      multiplier *= 1.3;
    }
    
    // Power-up modifiers
    if (activePowerups.includes('invisibility')) {
      multiplier *= 0.1;
    }
    
    if (activePowerups.includes('stealth_boost')) {
      multiplier *= 0.5;
    }
    
    return Math.max(0.05, Math.min(2.0, multiplier)); // Clamp between 5% and 200%
  }
  
  /**
   * Reset stealth to default state
   */
  reset() {
    this.state = window.GAME_CONSTANTS.PLAYER_STATES.NORMAL;
    this.isHidden = false;
    this.suspicionLevel = 0;
    this.lastDetectionTime = 0;
    this.stealthMeter = 100;
    this.maxStealth = 100;
  }
  
  /**
   * Get stealth state for debugging
   * @returns {Object} Current stealth state
   */
  getState() {
    return {
      state: this.state,
      stealthMeter: this.stealthMeter,
      maxStealth: this.maxStealth,
      suspicionLevel: this.suspicionLevel,
      isHidden: this.isHidden,
      stealthPercent: Math.round((this.stealthMeter / this.maxStealth) * 100)
    };
  }
};