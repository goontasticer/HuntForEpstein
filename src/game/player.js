// Player entity for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/player.js',
  exports: ['Player'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'AABB', 'PlayerMovement', 'PlayerStealth', 'PlayerInteraction', 'PlayerRendering']
});

window.Player = class Player {
  constructor(x, y) {
    // Position and collision
    this.position = new window.Vector2D(x, y);
    this.width = window.GAME_CONSTANTS.PLAYER_SIZE;
    this.height = window.GAME_CONSTANTS.PLAYER_SIZE;
    this.collider = new window.AABB(
      x - this.width / 2,
      y - this.height / 2,
      this.width,
      this.height
    );
    
    // Initialize subsystems
    this.movement = new window.PlayerMovement();
    this.stealth = new window.PlayerStealth();
    this.interaction = new window.PlayerInteraction();
    this.rendering = new window.PlayerRendering();
    
    // Collision physics
    this.physics = {
      velocity: this.movement.velocity,
      friction: 0.15
    };
    
    // Make movement accessible to physics system
    this.movement = this.movement; // Reference for physics system

    
    // State
    this.state = window.GAME_CONSTANTS.PLAYER_STATES.NORMAL;
    this.isCaught = false;
    
    // Initialize sprite when MakkoEngine is available
    this.rendering.initializeSprite();
  }
  
  /**
   * Update player
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.isCaught) return;
    
    // Handle input
    this.movement.handleInput(dt);
    
    // Update position using delta time
    this.movement.updatePosition(this.position, dt);
    
    // Update collision box
    this.updateCollider();
    
    // Update stealth state
    this.stealth.update(dt, this.movement.isMoving, this.movement.isSprinting, this.interaction.getActivePowerupTypes());
    
    // Update animation
    this.rendering.updateAnimation(dt, this.stealth.getState(), this.movement.isMoving, this.movement.isSprinting, this.interaction.getActivePowerupTypes());
    
    // Update power-ups
    this.interaction.updatePowerups(dt);
    
    // Check if caught
    if (this.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      if (this.stealth.isCaught()) {
        this.isCaught = true;
      }
    }
    
    // Handle room transitions
    this.handleRoomTransitions();
    
    // Handle interaction
    const isSneaking = window.Input.isActionDown('sneak');
    if (isSneaking) {
      this.stealth.enterHidden();
    } else {
      this.stealth.exitHidden();
    }
    
    if (window.Input.isActionPressed('interact')) {
      this.interaction.interact(this.position, this.stealth.isHidden);
    }
    
    // Handle attack input
    if (window.Input.isActionPressed('attack')) {
      this.interaction.handleAttack(this.position, this.movement.facing, this.movement.isGrounded);
    }

  }
  
  /**
   * Update collision box to match entity position
   */
  updateCollider() {
    this.collider.x = this.position.x - this.width / 2;
    this.collider.y = this.position.y - this.height / 2;
  }
  
  /**
   * Handle room transitions
   */
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
  
  /**
   * Reposition player for room transition
   * @param {string} direction - Transition direction
   */
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
  
  /**
   * Render player
   * @param {Object} renderer - Renderer object
   */
  render(renderer) {
    const stealthState = this.stealth.getState();
    const movementState = this.movement.getState();
    const activePowerups = this.interaction.getActivePowerupTypes();
    
    // Combine states for rendering
    const renderState = {
      ...stealthState,
      ...movementState,
      isCaught: this.isCaught
    };
    
    this.rendering.render(renderer, this.position, renderState, movementState.isMoving, activePowerups, this.width, this.height);
  }
  
  /**
   * Collision detection methods
   */
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
  
  // State management methods (delegated to subsystems)
  
  becomeSuspicious() {
    this.stealth.becomeSuspicious();
  }
  
  becomeDetected() {
    this.stealth.becomeDetected();
  }
  
  escapeDetection() {
    this.stealth.escapeDetection();
  }
  
  enterHidden() {
    this.stealth.enterHidden();
  }
  
  exitHidden() {
    this.stealth.exitHidden();
  }
  
  collectFile(file) {
    this.interaction.collectFile(file);
  }
  
  addPowerup(powerup) {
    this.interaction.addPowerup(powerup);
  }
  
  applySpeedBoost(multiplier) {
    this.movement.applyPowerupEffect('speed_boost', true);
  }
  
  removeSpeedBoost() {
    this.movement.applyPowerupEffect('speed_boost', false);
  }
  
  applyStealthBoost(bonus) {
    this.stealth.applyPowerupEffect('stealth_boost', true);
  }
  
  removeStealthBoost() {
    this.stealth.applyPowerupEffect('stealth_boost', false);
  }
  
  applyNeuralink() {
    // Neuralink effects are handled by the power-up class
  }
  
  removeNeuralink() {
    // Neuralink effects are handled by the power-up class
  }
  
  getDetectionRadius() {
    return this.stealth.getDetectionRadius(this.movement.isMoving, this.movement.isSprinting, this.interaction.getActivePowerupTypes());
  }
  
  getVisibilityMultiplier() {
    return this.stealth.getVisibilityMultiplier(this.movement.isMoving, this.movement.isSprinting, this.interaction.getActivePowerupTypes());
  }
  
  hasWallHack() {
    return this.interaction.hasPowerup('neuralink');
  }
  
  /**
   * Reset player state
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  reset(x, y) {
    this.position.set(x, y);
    this.updateCollider();
    
    // Reset all subsystems
    this.movement.reset();
    this.stealth.reset();
    this.interaction.reset();
    
    this.state = window.GAME_CONSTANTS.PLAYER_STATES.NORMAL;
    this.isCaught = false;
    
    // Reset position to center of current room
    if (window.game && window.game.world) {
      this.position.x = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
      this.position.y = window.GAME_CONSTANTS.CANVAS_HEIGHT / 2;
      this.updateCollider();
    }
  }
  
  /**
   * Get player state for debugging
   * @returns {Object} Complete player state
   */
  getState() {
    return {
      position: { x: this.position.x, y: this.position.y },
      width: this.width,
      height: this.height,
      state: this.state,
      isCaught: this.isCaught,
      movement: this.movement.getState(),
      stealth: this.stealth.getState(),
      interaction: this.interaction.getState(),
      rendering: this.rendering.getState(),
      detectionRadius: this.getDetectionRadius(),
      visibilityMultiplier: this.getVisibilityMultiplier()
    };
  }
};