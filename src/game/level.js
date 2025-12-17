// Level system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/level.js',
  exports: ['Level'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'AABB', 'Room', 'LevelGenerator']
});

window.Level = class Level {
  constructor(levelNumber) {
    this.levelNumber = levelNumber;
    this.rooms = [];
    this.currentRoom = null;
    this.generator = new window.LevelGenerator();
    
    this.generate();
  }
  
  generate() {
    this.rooms = this.generator.generateLevel(this.levelNumber);
    this.currentRoom = this.rooms[0]; // Start in entry room
    
    // Add room colliders to physics with error handling
    if (window.gamePhysics && window.gamePhysics.addStaticCollider) {
      for (const room of this.rooms) {
        try {
          window.gamePhysics.addStaticCollider(room.bounds);
        } catch (error) {
          console.warn('Failed to add room collider to physics system:', error.message);
        }
      }
    } else {
      console.warn('Physics system not available - room colliders disabled');
    }
  }
  
  update(dt) {
    // Update current room
    if (this.currentRoom) {
      this.currentRoom.update(dt);
    }
    
    // Check for room transitions
    this.checkRoomTransitions();
  }
  
  checkRoomTransitions() {
    if (!window.game.player || !this.currentRoom) return;
    
    const player = window.game.player;
    
    // Simple room detection based on player position
    for (const room of this.rooms) {
      if (room.bounds.contains(player.position)) {
        if (room !== this.currentRoom) {
          // Room transition
          this.currentRoom = room;
          this.currentRoom.isVisited = true;
          
          // Update camera to center on new room
          const roomCenter = room.bounds.getCenter();
          if (window.gameRenderer && window.gameRenderer.setCameraPosition) {
            window.gameRenderer.setCameraPosition(roomCenter.x, roomCenter.y);
          }
          
          console.log(`Entered room: ${room.type}`);
        }
        break;
      }
    }
  }
  
  render(renderer) {
    // Render all rooms
    for (const room of this.rooms) {
      room.render(renderer);
    }
    
    // Render entities
    for (const room of this.rooms) {
      for (const entity of room.entities) {
        if (entity.render) {
          entity.render(renderer);
        }
      }
    }
  }
  
  allFilesCollected() {
    let totalFiles = 0;
    let collectedFiles = 0;
    
    for (const room of this.rooms) {
      for (const item of room.items) {
        if (item.type === 'file') {
          totalFiles++;
          if (item.collected) {
            collectedFiles++;
          }
        }
      }
    }
    
    return collectedFiles >= window.GAME_CONSTANTS.FILES_PER_LEVEL;
  }
  
  getFilesInRadius(position, radius) {
    if (this.currentRoom) {
      return this.currentRoom.getFilesInRadius(position, radius);
    }
    return [];
  }
  
  getPowerupsInRadius(position, radius) {
    if (this.currentRoom) {
      return this.currentRoom.getPowerupsInRadius(position, radius);
    }
    return [];
  }
  
  getRoomAt(position) {
    for (const room of this.rooms) {
      if (room.bounds.contains(position)) {
        return room;
      }
    }
    return null;
  }
  
  // Legacy method for backward compatibility
  getCollectibles() {
    const collectibles = [];
    
    for (const room of this.rooms) {
      for (const item of room.items) {
        if (!item.collected) {
          collectibles.push(item);
        }
      }
    }
    
    return collectibles;
  }
  
  // Legacy method for backward compatibility
  collectFile(fileId) {
    for (const room of this.rooms) {
      for (const item of room.items) {
        if (item.id === fileId && !item.collected) {
          item.collected = true;
          return true;
        }
      }
    }
    return false;
  }
};