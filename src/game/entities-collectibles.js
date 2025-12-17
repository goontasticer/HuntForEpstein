// Collectibles system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/entities-collectibles.js',
  exports: ['CollectibleFile'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'AABB']
});

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