// Player movement system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/player-movement.js',
  exports: ['PlayerMovement'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'Input']
});

window.PlayerMovement = class PlayerMovement {
  constructor() {
    this.velocity = new window.Vector2D(0, 0);
    this.speed = window.GAME_CONSTANTS.PLAYER_SPEED;
    this.stealthSpeed = window.GAME_CONSTANTS.PLAYER_STEALTH_SPEED;
    
    // Movement state
    this.isMoving = false;
    this.isSprinting = false;
    this.facing = 'right';
    
    // Sprint mechanics
    this.canSprint = true;
    this.sprintDuration = 2000; // 2 seconds
    this.sprintCooldown = 5000; // 5 seconds
    this.lastSprintTime = 0;
    
    // Physics
    this.physics = {
      velocity: this.velocity,
      friction: 0.15
    };
  }
  
  /**
   * Handle player input and update movement
   * @param {number} dt - Delta time in seconds
   */
  handleInput(dt) {
    let moveX = 0, moveY = 0;
    
    // Get movement from Input system
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
    }
    
    // Check for sprint
    const now = Date.now();
    if ((window.Input.isActionDown('moveUp') || window.Input.isActionDown('moveDown') || 
        window.Input.isActionDown('moveLeft') || window.Input.isActionDown('moveRight')) &&
        window.Input.isDown(window.Input.KEY_CODES.SHIFT) && this.canSprint && !isSneaking) {
      if (now - this.lastSprintTime > this.sprintCooldown) {
        this.isSprinting = true;
        this.lastSprintTime = now;
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
      } else {
        this.facing = moveY > 0 ? 'down' : 'up';
      }
    } else {
      this.isMoving = false;
    }
  }
  
  /**
   * Update player position using delta time
   * @param {Vector2D} position - Player position to update
   * @param {number} dt - Delta time in seconds
   */
  updatePosition(position, dt) {
    // Apply velocity with delta time
    position.x += this.velocity.x * dt;
    position.y += this.velocity.y * dt;
    
    // Apply friction
    this.velocity.x *= Math.pow(0.9, dt * 60); // Frame-independent friction
    this.velocity.y *= Math.pow(0.9, dt * 60);
    
    // Stop very small movement
    if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
  }
  
  /**
   * Apply power-up effects to movement
   * @param {string} powerupType - Type of power-up
   * @param {boolean} add - True to add effect, false to remove
   */
  applyPowerupEffect(powerupType, add) {
    switch (powerupType) {
      case 'speed_boost':
        if (add) {
          this.speed = (this.speed || window.GAME_CONSTANTS.PLAYER_SPEED) * 1.5;
        } else {
          this.speed = window.GAME_CONSTANTS.PLAYER_SPEED;
        }
        break;
    }
  }
  
  /**
   * Get current speed based on state
   * @returns {number} Current speed value
   */
  getCurrentSpeed() {
    let currentSpeed = this.speed;
    if (this.isSprinting) {
      currentSpeed *= 1.8;
    }
    return currentSpeed;
  }
  
  /**
   * Reset movement to default state
   */
  reset() {
    this.velocity.set(0, 0);
    this.isMoving = false;
    this.isSprinting = false;
    this.facing = 'right';
    this.canSprint = true;
    this.lastSprintTime = 0;
    this.speed = window.GAME_CONSTANTS.PLAYER_SPEED;
  }
  
  /**
   * Get movement state for debugging
   * @returns {Object} Current movement state
   */
  getState() {
    return {
      velocity: { x: this.velocity.x, y: this.velocity.y },
      speed: this.getCurrentSpeed(),
      isMoving: this.isMoving,
      isSprinting: this.isSprinting,
      facing: this.facing,
      canSprint: this.canSprint,
      sprintTimeLeft: Math.max(0, this.sprintDuration - (Date.now() - this.lastSprintTime))
    };
  }
};