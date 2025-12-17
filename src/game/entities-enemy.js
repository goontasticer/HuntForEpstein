// Enemy entity system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/entities-enemy.js',
  exports: ['Enemy'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'AABB']
});

window.Enemy = class Enemy {
  constructor(x, y, type = 'guard') {
    // Position and movement
    this.position = new window.Vector2D(x, y);
    this.velocity = new window.Vector2D(0, 0);
    this.speed = window.GAME_CONSTANTS.ENEMY_SPEED;
    
    // Collision
    this.width = 28;
    this.height = 28;
    this.collider = new window.AABB(
      x - this.width / 2,
      y - this.height / 2,
      this.width,
      this.height
    );
    
    // Physics
    this.physics = {
      velocity: this.velocity,
      friction: 0.1
    };
    
    // Enemy properties
    this.type = type;
    this.state = window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING;
    this.health = 100;
    this.maxHealth = 100;
    
    // AI properties
    this.visionRange = window.GAME_CONSTANTS.ENEMY_VISION_RANGE;
    this.visionCone = window.GAME_CONSTANTS.ENEMY_VISION_CONE;
    this.detectionRadius = window.GAME_CONSTANTS.DETECTION_RADIUS;
    this.suspicionRadius = window.GAME_CONSTANTS.SUSPICION_RADIUS;
    
    // Patrol
    this.patrolPath = [];
    this.currentPatrolIndex = 0;
    this.patrolWaitTime = 0;
    
    // Investigation
    this.investigationTarget = null;
    this.investigationTime = 0;
    
    // Chase
    this.lastKnownPlayerPosition = null;
    this.searchPositions = [];
    this.currentSearchIndex = 0;
    
    // Animation
    this.animationTime = 0;
    this.facing = 'down';
    
    // Detection
    this.suspicionLevel = 0;
    this.lastSeenTime = 0;
    
    // Initialize patrol path
    this.generatePatrolPath();
  }
  
  generatePatrolPath() {
    const pathRadius = 100;
    const pointCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;
      const x = this.position.x + Math.cos(angle) * pathRadius * (0.5 + Math.random() * 0.5);
      const y = this.position.y + Math.sin(angle) * pathRadius * (0.5 + Math.random() * 0.5);
      
      this.patrolPath.push(new window.Vector2D(x, y));
    }
  }
  
  update(dt) {
    this.animationTime += dt;
    
    switch (this.state) {
      case window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING:
        this.updatePatrol(dt);
        break;
      case window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING:
        this.updateInvestigation(dt);
        break;
      case window.GAME_CONSTANTS.ENEMY_STATES.CHASING:
        this.updateChase(dt);
        break;
      case window.GAME_CONSTANTS.ENEMY_STATES.SEARCHING:
        this.updateSearch(dt);
        break;
    }
    
    // Update suspicion
    this.updateSuspicion(dt);
    
    // Check for player detection
    this.checkForPlayer();
    
    // Update facing direction based on movement
    this.updateFacing();
  }
  
  updatePatrol(dt) {
    if (this.patrolPath.length === 0) return;
    
    const target = this.patrolPath[this.currentPatrolIndex];
    const direction = target.subtract(this.position);
    const distance = direction.length();
    
    if (distance < 20) {
      // Reached waypoint
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPath.length;
      this.patrolWaitTime = 2 + Math.random() * 2; // Wait 2-4 seconds
    } else if (this.patrolWaitTime > 0) {
      // Waiting at waypoint
      this.patrolWaitTime -= dt;
      this.velocity.x *= 0.9;
      this.velocity.y *= 0.9;
    } else {
      // Move to waypoint
      const moveDirection = direction.normalize();
      this.velocity.x = moveDirection.x * this.speed * 0.5; // Slower when patrolling
      this.velocity.y = moveDirection.y * this.speed * 0.5;
    }
  }
  
  updateInvestigation(dt) {
    if (!this.investigationTarget) {
      this.state = window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING;
      return;
    }
    
    const direction = this.investigationTarget.subtract(this.position);
    const distance = direction.length();
    
    if (distance < 30) {
      // Reached investigation point
      this.investigationTime += dt;
      
      if (this.investigationTime > 3) {
        // Done investigating
        this.state = window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING;
        this.investigationTarget = null;
        this.investigationTime = 0;
        this.suspicionLevel = 0;
      } else {
        // Look around
        this.velocity.x *= 0.8;
        this.velocity.y *= 0.8;
      }
    } else {
      // Move to investigation point
      const moveDirection = direction.normalize();
      this.velocity.x = moveDirection.x * this.speed * 0.8;
      this.velocity.y = moveDirection.y * this.speed * 0.8;
    }
  }
  
  updateChase(dt) {
    if (!window.game.player) {
      this.state = window.GAME_CONSTANTS.ENEMY_STATES.SEARCHING;
      return;
    }
    
    const playerPosition = window.game.player.position;
    const direction = playerPosition.subtract(this.position);
    const distance = direction.length();
    
    if (distance < 50) {
      // Close enough to catch player
      window.game.player.becomeDetected();
      this.state = window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING;
      this.suspicionLevel = 0;
    } else if (distance > this.visionRange) {
      // Lost sight of player
      this.state = window.GAME_CONSTANTS.ENEMY_STATES.SEARCHING;
      this.lastKnownPlayerPosition = playerPosition.clone();
      this.generateSearchPositions();
    } else {
      // Chase player
      const moveDirection = direction.normalize();
      this.velocity.x = moveDirection.x * this.speed * 1.2; // Faster when chasing
      this.velocity.y = moveDirection.y * this.speed * 1.2;
    }
  }
  
  updateSearch(dt) {
    if (this.searchPositions.length === 0) {
      this.state = window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING;
      return;
    }
    
    const target = this.searchPositions[this.currentSearchIndex];
    const direction = target.subtract(this.position);
    const distance = direction.length();
    
    if (distance < 30) {
      // Reached search position
      this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchPositions.length;
      
      // After checking all positions, give up
      if (this.currentSearchIndex === 0) {
        this.state = window.GAME_CONSTANTS.ENEMY_STATES.PATROLLING;
        this.searchPositions = [];
        this.suspicionLevel = 0;
      }
    } else {
      // Move to search position
      const moveDirection = direction.normalize();
      this.velocity.x = moveDirection.x * this.speed;
      this.velocity.y = moveDirection.y * this.speed;
    }
  }
  
  updateSuspicion(dt) {
    // Natural decay of suspicion
    if (this.suspicionLevel > 0) {
      this.suspicionLevel = Math.max(0, this.suspicionLevel - dt * 10);
    }
    
    // Update player suspicion based on enemy state
    if (window.game.player && this.state === window.GAME_CONSTANTS.ENEMY_STATES.CHASING) {
      window.game.player.becomeDetected();
    } else if (window.game.player && this.suspicionLevel > 50) {
      window.game.player.becomeSuspicious();
    }
  }
  
  checkForPlayer() {
    if (!window.game.player) return;
    
    const player = window.game.player;
    const playerPosition = player.position;
    const playerDistance = this.position.distanceTo(playerPosition);
    
    // Check if player is in range
    if (playerDistance > this.visionRange) {
      return;
    }
    
    // Check if player is in vision cone
    const toPlayer = playerPosition.subtract(this.position);
    const toPlayerAngle = Math.atan2(toPlayer.y, toPlayer.x);
    const facingAngle = this.getFacingAngle();
    const angleDiff = Math.abs(toPlayerAngle - facingAngle);
    
    // Normalize angle difference
    let normalizedDiff = angleDiff;
    if (normalizedDiff > Math.PI) {
      normalizedDiff = 2 * Math.PI - normalizedDiff;
    }
    
    const inVisionCone = normalizedDiff < (this.visionCone * Math.PI / 180);
    
    if (inVisionCone) {
      // Check line of sight
      const hasLineOfSight = this.checkLineOfSight(playerPosition);
      
      if (hasLineOfSight) {
        this.suspicionLevel = 100;
        
        if (player.isHidden) {
          this.state = window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING;
          this.investigationTarget = playerPosition.clone();
        } else {
          this.state = window.GAME_CONSTANTS.ENEMY_STATES.CHASING;
        }
      }
    }
  }
  
  checkLineOfSight(targetPosition) {
    // Simple raycast check with error handling
    if (window.gamePhysics && window.gamePhysics.raycast) {
      try {
        const result = window.gamePhysics.raycast(this.position, targetPosition, [this]);
        return !result.hit;
      } catch (error) {
        console.warn('Raycast failed:', error.message);
        return true; // Assume clear line of sight if raycast fails
      }
    } else {
      console.warn('Physics system not available - line of sight check disabled');
      return true; // Fallback: assume clear line of sight
    }
  }
  
  updateFacing() {
    if (Math.abs(this.velocity.x) > Math.abs(this.velocity.y)) {
      this.facing = this.velocity.x > 0 ? 'right' : 'left';
    } else {
      this.facing = this.velocity.y > 0 ? 'down' : 'up';
    }
  }
  
  getFacingAngle() {
    switch (this.facing) {
      case 'right': return 0;
      case 'down': return Math.PI / 2;
      case 'left': return Math.PI;
      case 'up': return -Math.PI / 2;
      default: return 0;
    }
  }
  
  generateSearchPositions() {
    this.searchPositions = [];
    
    if (!this.lastKnownPlayerPosition) return;
    
    // Generate search positions around last known player location
    const searchRadius = 80;
    const positionCount = 4;
    
    for (let i = 0; i < positionCount; i++) {
      const angle = (i / positionCount) * Math.PI * 2;
      const x = this.lastKnownPlayerPosition.x + Math.cos(angle) * searchRadius;
      const y = this.lastKnownPlayerPosition.y + Math.sin(angle) * searchRadius;
      
      this.searchPositions.push(new window.Vector2D(x, y));
    }
    
    this.currentSearchIndex = 0;
  }
  
  render(renderer) {
    const ctx = renderer.ctx;
    
    // Render vision cone (when debugging or for visual effect)
    if (window.game && window.game.ui && window.game.ui.showDebug) {
      this.renderVisionCone(renderer);
    }
    
    // Enemy color based on state
    let enemyColor = window.GAME_CONSTANTS.COLORS.ENEMY;
    if (this.state === window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING) {
      enemyColor = '#FF9800';
    } else if (this.state === window.GAME_CONSTANTS.ENEMY_STATES.CHASING) {
      enemyColor = '#ff0000';
    }
    
    // Draw enemy body
    renderer.drawRect(
      this.position.x - this.width / 2,
      this.position.y - this.height / 2,
      this.width,
      this.height,
      enemyColor,
      true
    );
    
    // Draw enemy outline
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
    const angle = this.getFacingAngle();
    const indicatorX = this.position.x + Math.cos(angle) * indicatorLength;
    const indicatorY = this.position.y + Math.sin(angle) * indicatorLength;
    
    renderer.drawLine(
      this.position.x,
      this.position.y,
      indicatorX,
      indicatorY,
      '#fff',
      2
    );
    
    // Draw suspicion indicator
    if (this.suspicionLevel > 0) {
      const suspicionRadius = 10 + (this.suspicionLevel / 100) * 20;
      renderer.drawCircle(
        this.position.x,
        this.position.y,
        suspicionRadius,
        `rgba(255, 152, 0, ${this.suspicionLevel / 200})`,
        true
      );
    }
    
    // Draw health bar
    if (this.health < this.maxHealth) {
      const barWidth = 30;
      const barHeight = 4;
      const barY = this.position.y - this.height / 2 - 10;
      
      renderer.drawRect(
        this.position.x - barWidth / 2,
        barY,
        barWidth,
        barHeight,
        '#333',
        true
      );
      
      const healthPercent = this.health / this.maxHealth;
      renderer.drawRect(
        this.position.x - barWidth / 2,
        barY,
        barWidth * healthPercent,
        barHeight,
        '#F44336',
        true
      );
    }
  }
  
  renderVisionCone(renderer) {
    const ctx = renderer.ctx;
    const centerX = this.position.x;
    const centerY = this.position.y;
    const baseAngle = this.getFacingAngle();
    const coneAngle = this.visionCone * Math.PI / 180;
    
    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    
    // Draw vision cone arc
    ctx.arc(centerX, centerY, this.visionRange, baseAngle - coneAngle / 2, baseAngle + coneAngle / 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
};