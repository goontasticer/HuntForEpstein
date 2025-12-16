// Game entities system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/entities.js',
  exports: ['Enemy', 'CollectibleFile', 'PowerUp', 'InvisibilityDevice', 'NeuralinkChip', 'Trap'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'AABB', 'Circle']
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
    // Simple raycast check
    const result = window.gamePhysics.raycast(this.position, targetPosition, [this]);
    return !result.hit;
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

// Collectible File - Enhanced version with proper collision and integration
window.CollectibleFile = class CollectibleFile {
  constructor(x, y, id) {
    this.position = new window.Vector2D(x, y);
    this.id = id;
    this.collected = false;
    this.animationTime = 0;
    
    // Visual properties
    this.width = 20;
    this.height = 20;
    this.rotation = 0;
    this.floatOffset = 0;
    
    // Collision
    this.collider = new window.AABB(
      x - this.width / 2,
      y - this.height / 2,
      this.width,
      this.height
    );
    
    // Spawn placement data
    this.spawnStrategy = 'floor'; // 'floor', 'furniture', 'hidden'
    this.furnitureContainer = null;
  }
  
  update(dt) {
    this.animationTime += dt;
    this.rotation += dt * 0.5;
    this.floatOffset = Math.sin(this.animationTime * 2) * 3;
    
    // Update collider position
    this.collider.x = this.position.x - this.width / 2;
    this.collider.y = this.position.y - this.height / 2;
  }
  
  collect(player) {
    if (this.collected) return false;
    
    this.collected = true;
    
    // Check if player has collect method (from T8)
    if (player.collectFile) {
      player.collectFile(this);
    } else {
      // Fallback: try through game world system
      if (window.game && window.game.world) {
        const collected = window.game.world.collectFile(this.id);
        if (collected) {
          window.game.filesCollected++;
          console.log(`Collected file: ${this.id}. Total: ${window.game.filesCollected}`);
        }
      }
    }
    
    return true;
  }
  
  render(renderer) {
    if (this.collected) return;
    
    const pulse = Math.sin(this.animationTime * 3) * 0.2 + 0.8;
    
    // Draw glow effect
    renderer.drawCircle(
      this.position.x,
      this.position.y + this.floatOffset,
      20,
      `rgba(255, 193, 7, ${pulse * 0.3})`,
      true
    );
    
    // Draw file icon (folder shape)
    renderer.drawRect(
      this.position.x - 10,
      this.position.y + this.floatOffset - 10,
      20,
      20,
      `rgba(255, 193, 7, ${pulse})`,
      true
    );
    
    renderer.drawRect(
      this.position.x - 10,
      this.position.y + this.floatOffset - 10,
      20,
      20,
      '#FFC107',
      false
    );
    
    // Draw tab on folder
    renderer.drawRect(
      this.position.x - 10,
      this.position.y + this.floatOffset - 10,
      8,
      5,
      '#FFC107',
      true
    );
    
    // Draw document lines inside folder
    const lineColor = `rgba(0, 0, 0, ${pulse * 0.5})`;
    for (let i = 0; i < 3; i++) {
      renderer.drawLine(
        this.position.x - 6,
        this.position.y + this.floatOffset - 4 + i * 4,
        this.position.x + 6,
        this.position.y + this.floatOffset - 4 + i * 4,
        lineColor,
        1
      );
    }
  }
  
  // Placement strategies for level generator
  static placeInRoom(room, id) {
    const file = new window.CollectibleFile(0, 0, id);
    
    // Determine spawn strategy based on room type and furniture
    const suitableFurniture = room.furniture.filter(f => f.canHoldFiles);
    
    if (suitableFurniture.length > 0 && Math.random() < 0.7) {
      // Place in furniture
      const furniture = suitableFurniture[Math.floor(Math.random() * suitableFurniture.length)];
      file.position.set(
        furniture.x + furniture.width / 2,
        furniture.y + furniture.height / 2
      );
      file.spawnStrategy = 'furniture';
      file.furnitureContainer = furniture;
    } else if (room.type === window.GAME_CONSTANTS.ROOM_TYPES.HIDEOUT && Math.random() < 0.4) {
      // Hidden placement in hideouts
      const hiddenSpots = [
        { x: 30, y: 30 },
        { x: room.width - 30, y: 30 },
        { x: 30, y: room.height - 30 },
        { x: room.width - 30, y: room.height - 30 }
      ];
      const spot = hiddenSpots[Math.floor(Math.random() * hiddenSpots.length)];
      file.position.set(room.x + spot.x, room.y + spot.y);
      file.spawnStrategy = 'hidden';
    } else {
      // Floor placement with higher density near walls/clutter
      const edgeBias = Math.random() < 0.6;
      let x, y;
      
      if (edgeBias) {
        // Near edges
        if (Math.random() < 0.5) {
          x = room.x + (Math.random() < 0.5 ? 40 : room.width - 40);
          y = room.y + Math.random() * (room.height - 80) + 40;
        } else {
          x = room.x + Math.random() * (room.width - 80) + 40;
          y = room.y + (Math.random() < 0.5 ? 40 : room.height - 40);
        }
      } else {
        // Random placement
        x = room.x + Math.random() * (room.width - 80) + 40;
        y = room.y + Math.random() * (room.height - 80) + 40;
      }
      
      file.position.set(x, y);
      file.spawnStrategy = 'floor';
    }
    
    // Update collider after placement
    file.collider.x = file.position.x - file.width / 2;
    file.collider.y = file.position.y - file.height / 2;
    
    return file;
  }
};

// Legacy File class for backward compatibility
window.File = window.CollectibleFile;

// Power-Up base class
window.PowerUp = class PowerUp {
  constructor(x, y, type, duration = 10000) {
    this.position = new window.Vector2D(x, y);
    this.type = type;
    this.duration = duration;
    this.collected = false;
    this.animationTime = 0;
    
    // Visual properties
    this.width = 24;
    this.height = 24;
    this.color = '#00BCD4';
    
    // Collision
    this.collider = new window.AABB(
      x - this.width / 2,
      y - this.height / 2,
      this.width,
      this.height
    );
    
    // Power-up specific data
    this.effectData = {};
  }
  
  update(dt) {
    this.animationTime += dt;
    
    // Update collider position
    this.collider.x = this.position.x - this.width / 2;
    this.collider.y = this.position.y - this.height / 2;
  }
  
  collect(player) {
    if (this.collected) return false;
    
    this.collected = true;
    
    // Create power-up data object
    const powerupData = {
      type: this.type,
      duration: this.duration,
      effectData: this.effectData,
      startTime: Date.now()
    };
    
    // Apply effect immediately
    this.applyEffect(player, powerupData);
    
    // Add to player's power-up inventory if method exists
    if (player.addPowerup) {
      player.addPowerup(powerupData);
    }
    
    return true;
  }
  
  applyEffect(player, powerupData) {
    // Override in subclasses
    console.log(`Power-up ${this.type} collected by player`);
  }
  
  removeEffect(player, powerupData) {
    // Override in subclasses
    console.log(`Power-up ${this.type} expired for player`);
  }
  
  render(renderer) {
    if (this.collected) return;
    
    const pulse = Math.sin(this.animationTime * 4) * 0.3 + 0.7;
    const rotation = this.animationTime * 2;
    
    // Draw glow effect
    renderer.drawCircle(
      this.position.x,
      this.position.y,
      18,
      `${this.color}33`,
      true
    );
    
    // Draw power-up base (circle)
    renderer.drawCircle(
      this.position.x,
      this.position.y,
      12,
      this.color,
      true
    );
    
    // Draw power-up specific icon
    this.renderIcon(renderer, rotation, pulse);
  }
  
  renderIcon(renderer, rotation, pulse) {
    // Override in subclasses
    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(rotation);
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 0);
    ctx.restore();
  }
  
  // Static placement method for level generator
  static placeInRoom(room, type) {
    const powerup = this.createPowerUp(type);
    
    // Strategic placement based on room type
    let x, y;
    
    if (room.type === window.GAME_CONSTANTS.ROOM_TYPES.HIDEOUT) {
      // Hideouts always have power-ups
      x = room.x + room.width / 2;
      y = room.y + room.height / 2;
    } else if (room.type === window.GAME_CONSTANTS.ROOM_TYPES.TRAP_ROOM) {
      // Place power-ups as rewards in trap rooms
      const safeSpots = room.hideSpots.length > 0 ? room.hideSpots : [
        { position: new window.Vector2D(room.x + 50, room.y + 50) },
        { position: new window.Vector2D(room.x + room.width - 50, room.y + 50) },
        { position: new window.Vector2D(room.x + 50, room.y + room.height - 50) },
        { position: new window.Vector2D(room.x + room.width - 50, room.y + room.height - 50) }
      ];
      const spot = safeSpots[Math.floor(Math.random() * safeSpots.length)];
      x = spot.position.x;
      y = spot.position.y;
    } else {
      // Random placement with clearance from walls
      x = room.x + Math.random() * (room.width - 100) + 50;
      y = room.y + Math.random() * (room.height - 100) + 50;
    }
    
    powerup.position.set(x, y);
    powerup.collider.x = x - powerup.width / 2;
    powerup.collider.y = y - powerup.height / 2;
    
    return powerup;
  }
  
  static createPowerUp(type) {
    switch (type) {
      case 'invisibility':
        return new window.InvisibilityDevice(0, 0);
      case 'neuralink':
        return new window.NeuralinkChip(0, 0);
      case 'speed_boost':
        return new window.SpeedBoost(0, 0);
      case 'stealth_boost':
        return new window.StealthBoost(0, 0);
      default:
        return new window.PowerUp(0, 0, type);
    }
  }
};

// Invisibility Device Power-Up
window.InvisibilityDevice = class InvisibilityDevice extends window.PowerUp {
  constructor(x, y) {
    super(x, y, 'invisibility', 15000); // 15 second duration
    this.color = '#9C27B0';
    this.effectData = {
      stealthBonus: 50,
      detectionReduction: 0.7
    };
  }
  
  applyEffect(player, powerupData) {
    console.log('Invisibility device activated - player becomes harder to detect');
    
    // Apply stealth bonus
    if (player.maxStealth) {
      player.maxStealth += this.effectData.stealthBonus;
      player.stealthMeter = Math.min(player.stealthMeter + this.effectData.stealthBonus, player.maxStealth);
    }
    
    // Force player into hidden state
    if (player.enterHidden) {
      player.enterHidden();
    }
    
    // Create visual effect
    if (window.game && window.game.ui) {
      window.game.ui.showNotification('INVISIBILITY ACTIVATED', this.color);
    }
  }
  
  removeEffect(player, powerupData) {
    console.log('Invisibility device expired');
    
    // Remove stealth bonus
    if (player.maxStealth) {
      player.maxStealth -= this.effectData.stealthBonus;
      player.stealthMeter = Math.min(player.stealthMeter, player.maxStealth);
    }
    
    // Exit hidden state if not manually hidden
    if (player.isHidden && !window.Input.isActionDown('sneak')) {
      if (player.exitHidden) {
        player.exitHidden();
      }
    }
  }
  
  renderIcon(renderer, rotation, pulse) {
    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(rotation);
    
    // Draw invisibility icon (eye with slash)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw slash
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(6, 6);
    ctx.stroke();
    
    ctx.restore();
  }
};

// Neuralink Chip Power-Up
window.NeuralinkChip = class NeuralinkChip extends window.PowerUp {
  constructor(x, y) {
    super(x, y, 'neuralink', 20000); // 20 second duration
    this.color = '#00BCD4';
    this.effectData = {
      speedMultiplier: 1.5,
      detectionRadius: 0.5,
      enemySlowdown: 0.8
    };
  }
  
  applyEffect(player, powerupData) {
    console.log('Neuralink chip activated - enhanced reflexes and enemy disruption');
    
    // Store original values
    this.originalSpeed = player.speed || 0;
    
    // Apply speed boost
    if (player.speed) {
      player.speed *= this.effectData.speedMultiplier;
    }
    
    // Apply sprint enhancement
    if (player.sprintDuration) {
      player.sprintDuration *= 1.5;
    }
    
    // Apply enemy disruption
    this.applyEnemyDisruption();
    
    // Create visual effect
    if (window.game && window.game.ui) {
      window.game.ui.showNotification('NEURALINK ENHANCED', this.color);
    }
  }
  
  removeEffect(player, powerupData) {
    console.log('Neuralink chip expired');
    
    // Restore original speed
    if (player.speed && this.originalSpeed) {
      player.speed = this.originalSpeed;
    }
    
    // Restore sprint duration
    if (player.sprintDuration) {
      player.sprintDuration /= 1.5;
    }
    
    // Remove enemy disruption
    this.removeEnemyDisruption();
  }
  
  applyEnemyDisruption() {
    // Slow down all enemies
    if (window.game && window.game.entities) {
      for (const entity of window.game.entities) {
        if (entity instanceof window.Enemy) {
          if (!entity.neuralinkSlowdown) {
            entity.neuralinkSlowdown = this.effectData.enemySlowdown;
            entity.originalSpeed = entity.speed;
            entity.speed *= this.effectData.enemySlowdown;
          }
        }
      }
    }
  }
  
  removeEnemyDisruption() {
    // Restore enemy speeds
    if (window.game && window.game.entities) {
      for (const entity of window.game.entities) {
        if (entity instanceof window.Enemy && entity.neuralinkSlowdown) {
          entity.speed = entity.originalSpeed || entity.speed / entity.neuralinkSlowdown;
          entity.neuralinkSlowdown = null;
        }
      }
    }
  }
  
  renderIcon(renderer, rotation, pulse) {
    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(rotation);
    
    // Draw neural chip icon (circuit pattern)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    // Central chip
    ctx.rect(-4, -4, 8, 8);
    ctx.stroke();
    
    // Circuit lines
    ctx.moveTo(-8, 0);
    ctx.lineTo(-4, 0);
    ctx.moveTo(4, 0);
    ctx.lineTo(8, 0);
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -4);
    ctx.moveTo(0, 4);
    ctx.lineTo(0, 8);
    ctx.stroke();
    
    // Connection points
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-8, 0, 1.5, 0, Math.PI * 2);
    ctx.arc(8, 0, 1.5, 0, Math.PI * 2);
    ctx.arc(0, -8, 1.5, 0, Math.PI * 2);
    ctx.arc(0, 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
};

// Speed Boost Power-Up
window.SpeedBoost = class SpeedBoost extends window.PowerUp {
  constructor(x, y) {
    super(x, y, 'speed_boost', 12000); // 12 second duration
    this.color = '#4CAF50';
    this.effectData = {
      multiplier: 1.8
    };
  }
  
  applyEffect(player, powerupData) {
    console.log('Speed boost activated');
    if (player.speed) {
      player.speed *= this.effectData.multiplier;
    }
    if (window.game && window.game.ui) {
      window.game.ui.showNotification('SPEED BOOST', this.color);
    }
  }
  
  removeEffect(player, powerupData) {
    console.log('Speed boost expired');
    if (player.speed) {
      player.speed /= this.effectData.multiplier;
    }
  }
  
  renderIcon(renderer, rotation, pulse) {
    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(rotation);
    
    // Draw lightning bolt
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.lineTo(2, -2);
    ctx.lineTo(-1, -2);
    ctx.lineTo(2, 8);
    ctx.lineTo(-2, 2);
    ctx.lineTo(1, 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
};

// Stealth Boost Power-Up
window.StealthBoost = class StealthBoost extends window.PowerUp {
  constructor(x, y) {
    super(x, y, 'stealth_boost', 18000); // 18 second duration
    this.color = '#2196F3';
    this.effectData = {
      stealthBonus: 100,
      detectionReduction: 0.5
    };
  }
  
  applyEffect(player, powerupData) {
    console.log('Stealth boost activated');
    if (player.maxStealth) {
      player.maxStealth += this.effectData.stealthBonus;
      player.stealthMeter = player.maxStealth;
    }
    if (window.game && window.game.ui) {
      window.game.ui.showNotification('STEALTH ENHANCED', this.color);
    }
  }
  
  removeEffect(player, powerupData) {
    console.log('Stealth boost expired');
    if (player.maxStealth) {
      player.maxStealth -= this.effectData.stealthBonus;
      player.stealthMeter = Math.min(player.stealthMeter, player.maxStealth);
    }
  }
  
  renderIcon(renderer, rotation, pulse) {
    const ctx = renderer.ctx;
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(rotation);
    
    // Draw shadow icon
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -2, 6, Math.PI, 0);
    ctx.ellipse(0, 2, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
};

// Legacy Powerup class for backward compatibility
window.Powerup = window.PowerUp;

window.Trap = class Trap {
  constructor(x, y, type) {
    this.position = new window.Vector2D(x, y);
    this.type = type;
    this.triggered = false;
    this.cooldown = 0;
    this.animationTime = 0;
    
    // Properties based on type
    switch (type) {
      case 'laser':
        this.width = 40;
        this.height = 2;
        this.color = '#f44336';
        this.damage = 50;
        break;
      case 'pressure_plate':
        this.width = 30;
        this.height = 30;
        this.color = '#9c27b0';
        this.damage = 25;
        break;
      case 'motion_sensor':
        this.width = 20;
        this.height = 20;
        this.color = '#ff9800';
        this.damage = 0; // Triggers alarm instead
        break;
    }
    
    this.collider = new window.Circle(this.position.x, this.position.y, 20);
  }
  
  update(dt) {
    this.animationTime += dt;
    
    // Update cooldown
    if (this.cooldown > 0) {
      this.cooldown -= dt * 1000;
    }
    
    // Check for player collision
    if (!this.triggered && this.cooldown <= 0) {
      this.checkTrigger();
    }
  }
  
  checkTrigger() {
    if (!window.game.player) return;
    
    const player = window.game.player;
    const distance = this.position.distanceTo(player.position);
    
    if (distance < this.collider.radius) {
      this.trigger();
    }
  }
  
  trigger() {
    this.triggered = true;
    this.cooldown = window.GAME_CONSTANTS.TRAP_COOLDOWN;
    
    if (this.type === 'motion_sensor') {
      // Trigger alarm - alert nearby enemies
      this.alertNearbyEnemies();
    } else if (window.game.player) {
      // Apply damage to player
      if (this.damage > 0) {
        // Player would take damage here when health system is implemented
        console.log(`Player hit by ${this.type} trap for ${this.damage} damage`);
      }
    }
    
    // Reset triggered state after animation
    setTimeout(() => {
      this.triggered = false;
    }, 500);
  }
  
  alertNearbyEnemies() {
    // Alert all enemies within range
    const alertRange = 200;
    
    if (window.game && window.game.entities) {
      for (const entity of window.game.entities) {
        if (entity instanceof window.Enemy) {
          const distance = this.position.distanceTo(entity.position);
          if (distance < alertRange) {
            entity.state = window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING;
            entity.investigationTarget = this.position.clone();
          }
        }
      }
    }
  }
  
  render(renderer) {
    const ctx = renderer.ctx;
    
    // Draw trigger radius when debugging
    if (window.game && window.game.ui && window.game.ui.showDebug) {
      renderer.drawCircle(
        this.position.x,
        this.position.y,
        this.collider.radius,
        'rgba(255, 0, 0, 0.1)',
        true
      );
    }
    
    let color = this.color;
    if (this.triggered) {
      color = '#ff0000';
    } else if (this.cooldown > 0) {
      color = '#ff6666';
    }
    
    switch (this.type) {
      case 'laser':
        // Draw laser beam
        const beamOffset = Math.sin(this.animationTime * 5) * 2;
        renderer.drawLine(
          this.position.x - this.width / 2,
          this.position.y + beamOffset,
          this.position.x + this.width / 2,
          this.position.y + beamOffset,
          color,
          3
        );
        
        // Draw laser emitters
        renderer.drawCircle(this.position.x - this.width / 2, this.position.y, 4, color, true);
        renderer.drawCircle(this.position.x + this.width / 2, this.position.y, 4, color, true);
        break;
        
      case 'pressure_plate':
        // Draw pressure plate
        const plateY = this.triggered ? this.position.y + 2 : this.position.y;
        renderer.drawRect(
          this.position.x - this.width / 2,
          plateY - this.height / 2,
          this.width,
          this.height,
          color,
          true
        );
        
        // Draw plate border
        renderer.drawRect(
          this.position.x - this.width / 2,
          plateY - this.height / 2,
          this.width,
          this.height,
          '#000',
          false
        );
        break;
        
      case 'motion_sensor':
        // Draw motion sensor
        const sensorRadius = 8 + Math.sin(this.animationTime * 3) * 2;
        renderer.drawCircle(this.position.x, this.position.y, sensorRadius, color, true);
        
        // Draw sensor waves
        const waveRadius = 15 + Math.sin(this.animationTime * 2) * 5;
        renderer.drawCircle(this.position.x, this.position.y, waveRadius, `${color}44`, true);
        break;
    }
  }
};