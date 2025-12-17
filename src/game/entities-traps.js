// Trap entities system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/entities-traps.js',
  exports: ['Trap'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'Circle']
});

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