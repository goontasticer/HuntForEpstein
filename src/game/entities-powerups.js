// Power-ups system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/entities-powerups.js',
  exports: ['PowerUp', 'InvisibilityDevice', 'NeuralinkChip', 'SpeedBoost', 'StealthBoost'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'AABB']
});

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