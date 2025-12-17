// Room system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/level-room.js',
  exports: ['Room'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'AABB', 'MathUtils', 'FurnitureType', 'OfficeLayoutGenerator']
});

window.Room = class Room {
  constructor(x, y, width, height, type = window.GAME_CONSTANTS.ROOM_TYPES.CORRIDOR) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.bounds = new window.AABB(x, y, width, height);
    
    this.connections = []; // Connected rooms
    this.entities = [];
    this.items = [];
    this.traps = [];
    this.hideSpots = [];
    this.furniture = [];
    this.isVisited = false;
    this.isVisible = false;
    
    // Grid system for furniture placement (16px grid)
    this.gridSize = 16;
    this.gridWidth = Math.floor(width / this.gridSize);
    this.gridHeight = Math.floor(height / this.gridSize);
    this.occupationGrid = Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(false));
    
    // Generate room content based on type
    this.generateContent();
  }
  
  generateContent() {
    // Generate office layout first
    this.generateOfficeLayout();
    
    // Then generate room-specific content
    switch (this.type) {
      case window.GAME_CONSTANTS.ROOM_TYPES.FILE_ROOM:
        this.generateFileRoom();
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.GUARD_POST:
        this.generateGuardPost();
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.TRAP_ROOM:
        this.generateTrapRoom();
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.HIDEOUT:
        this.generateHideout();
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.CORRIDOR:
        this.generateCorridor();
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.ENTRY:
        this.generateEntry();
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.EXIT:
        this.generateExit();
        break;
    }
  }
  
  generateOfficeLayout() {
    // Different layouts based on room type
    switch (this.type) {
      case window.GAME_CONSTANTS.ROOM_TYPES.FILE_ROOM:
        this.generateFileRoomLayout();
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.GUARD_POST:
        this.generateGuardRoomLayout();
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.CORRIDOR:
        this.generateCorridorLayout();
        break;
      default:
        this.generateStandardOfficeLayout();
        break;
    }
  }
  
  generateStandardOfficeLayout() {
    const layoutGenerator = new window.OfficeLayoutGenerator(this);
    layoutGenerator.generateStandardOffice();
  }
  
  generateFileRoomLayout() {
    const layoutGenerator = new window.OfficeLayoutGenerator(this);
    layoutGenerator.generateFileRoom();
  }
  
  generateGuardRoomLayout() {
    const layoutGenerator = new window.OfficeLayoutGenerator(this);
    layoutGenerator.generateGuardRoom();
  }
  
  generateCorridorLayout() {
    const layoutGenerator = new window.OfficeLayoutGenerator(this);
    layoutGenerator.generateCorridor();
  }
  
  // Grid-based furniture placement
  canPlaceFurniture(gridX, gridY, furnitureType) {
    const furniture = window.FurnitureType[furnitureType];
    if (!furniture) return false;
    
    const gridWidth = Math.ceil(furniture.width / this.gridSize);
    const gridHeight = Math.ceil(furniture.height / this.gridSize);
    
    // Check bounds
    if (gridX + gridWidth > this.gridWidth || gridY + gridHeight > this.gridHeight) {
      return false;
    }
    
    // Check occupation
    for (let y = gridY; y < gridY + gridHeight; y++) {
      for (let x = gridX; x < gridX + gridWidth; x++) {
        if (this.occupationGrid[y][x]) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  placeFurniture(gridX, gridY, furnitureType) {
    if (!this.canPlaceFurniture(gridX, gridY, furnitureType)) {
      return false;
    }
    
    const furniture = window.FurnitureType[furnitureType];
    const gridWidth = Math.ceil(furniture.width / this.gridSize);
    const gridHeight = Math.ceil(furniture.height / this.gridSize);
    
    // Mark grid as occupied
    for (let y = gridY; y < gridY + gridHeight; y++) {
      for (let x = gridX; x < gridX + gridWidth; x++) {
        this.occupationGrid[y][x] = true;
      }
    }
    
    // Add furniture to room
    this.furniture.push({
      type: furnitureType,
      x: this.x + gridX * this.gridSize,
      y: this.y + gridY * this.gridSize,
      width: furniture.width,
      height: furniture.height,
      color: furniture.color,
      blocksMovement: furniture.blocksMovement,
      canHoldFiles: furniture.canHoldFiles || false
    });
    
    return true;
  }
  
  clearPathway(startX, startY, endX, endY, width = 2) {
    // Simple line-based pathway clearing using Bresenham's algorithm
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;
    let x = startX;
    let y = startY;
    
    while (true) {
      // Clear pathway around this point
      for (let wy = -width; wy <= width; wy++) {
        for (let wx = -width; wx <= width; wx++) {
          const clearX = x + wx;
          const clearY = y + wy;
          if (clearX >= 0 && clearX < this.gridWidth && clearY >= 0 && clearY < this.gridHeight) {
            this.occupationGrid[clearY][clearX] = false;
          }
        }
      }
      
      if (x === endX && y === endY) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
  
  generateFileRoom() {
    // Place files in furniture that can hold them (filing cabinets, desks)
    const suitableFurniture = this.furniture.filter(f => f.canHoldFiles);
    
    if (suitableFurniture.length > 0) {
      // Place 1-2 files in suitable furniture
      const fileCount = Math.min(Math.floor(Math.random() * 2) + 1, suitableFurniture.length);
      const shuffledFurniture = [...suitableFurniture].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < fileCount; i++) {
        const furniture = shuffledFurniture[i];
        this.items.push({
          type: 'file',
          position: new window.Vector2D(
            furniture.x + furniture.width / 2,
            furniture.y + furniture.height / 2
          ),
          collected: false,
          id: `file_${Date.now()}_${i}`,
          furnitureContainer: furniture
        });
      }
    } else {
      // Fallback: place files randomly if no suitable furniture
      const fileCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < fileCount; i++) {
        const pos = window.MathUtils.randomPositionInBounds(this.bounds.shrink(40));
        this.items.push({
          type: 'file',
          position: pos,
          collected: false,
          id: `file_${Date.now()}_${i}`
        });
      }
    }
    
    // Add some guards
    this.addGuard();
  }
  
  generateGuardPost() {
    // Multiple guards in guard rooms
    const guardCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < guardCount; i++) {
      this.addGuard();
    }
  }
  
  generateTrapRoom() {
    // Add various traps
    const trapCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < trapCount; i++) {
      this.addTrap();
    }
  }
  
  generateHideout() {
    // Add hiding spots and possibly a power-up
    const hideSpotCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < hideSpotCount; i++) {
      const x = this.x + Math.random() * (this.width - 60) + 30;
      const y = this.y + Math.random() * (this.height - 60) + 30;
      
      this.hideSpots.push({
        position: new window.Vector2D(x, y),
        radius: 25,
        occupied: false
      });
    }
    
    // Chance for power-up
    if (Math.random() < 0.5) {
      this.addPowerup();
    }
  }
  
  generateCorridor() {
    // Simple corridors with occasional guards
    if (Math.random() < 0.3) {
      this.addGuard();
    }
  }
  
  generateEntry() {
    // Starting room - no immediate threats
    // Add a hiding spot for player
    this.hideSpots.push({
      position: new window.Vector2D(this.x + this.width / 2, this.y + this.height / 2),
      radius: 30,
      occupied: false
    });
  }
  
  generateExit() {
    // Exit room - requires all files to access
    // Add stronger guard presence
    const guardCount = Math.floor(Math.random() * 2) + 3;
    for (let i = 0; i < guardCount; i++) {
      this.addGuard();
    }
    
    // Add traps near exit
    const trapCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < trapCount; i++) {
      this.addTrap();
    }
  }
  
  addGuard() {
    // Find a clear position for guard
    const pos = this.findClearPosition(40);
    
    // Enemy entity would be created here
    // For now, we'll add a placeholder
    this.entities.push({
      type: 'guard',
      position: pos,
      patrolPath: this.generatePatrolPath(),
      state: 'patrolling'
    });
  }
  
  findClearPosition(margin = 20) {
    const maxAttempts = 50;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = this.x + margin + Math.random() * (this.width - 2 * margin);
      const y = this.y + margin + Math.random() * (this.height - 2 * margin);
      const pos = new window.Vector2D(x, y);
      
      // Check if position is clear of furniture
      let clear = true;
      for (const furniture of this.furniture) {
        if (furniture.blocksMovement) {
          const furnitureBounds = new window.AABB(furniture.x, furniture.y, furniture.width, furniture.height);
          if (furnitureBounds.contains(pos)) {
            clear = false;
            break;
          }
        }
      }
      
      if (clear) {
        return pos;
      }
    }
    
    // Fallback to center of room
    return new window.Vector2D(this.x + this.width / 2, this.y + this.height / 2);
  }
  
  addTrap() {
    const trapTypes = ['laser', 'pressure_plate', 'motion_sensor'];
    const type = trapTypes[Math.floor(Math.random() * trapTypes.length)];
    
    const x = this.x + Math.random() * (this.width - 60) + 30;
    const y = this.y + Math.random() * (this.height - 60) + 30;
    
    this.traps.push({
      type: type,
      position: new window.Vector2D(x, y),
      triggered: false,
      cooldown: 0,
      radius: window.GAME_CONSTANTS.TRAP_TRIGGER_RADIUS
    });
  }
  
  addPowerup() {
    const powerupTypes = ['speed_boost', 'stealth_boost', 'invisibility'];
    const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    
    const x = this.x + Math.random() * (this.width - 40) + 20;
    const y = this.y + Math.random() * (this.height - 40) + 20;
    
    this.items.push({
      type: 'powerup',
      powerupType: type,
      position: new window.Vector2D(x, y),
      collected: false,
      duration: window.GAME_CONSTANTS.POWERUP_DURATION
    });
  }
  
  generatePatrolPath() {
    const path = [];
    const pointCount = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < pointCount; i++) {
      const pos = this.findClearPosition(30);
      path.push(pos);
    }
    
    return path;
  }
  
  connectTo(otherRoom) {
    if (!this.connections.includes(otherRoom)) {
      this.connections.push(otherRoom);
      otherRoom.connections.push(this);
    }
  }
  
  update(dt) {
    // Update room entities
    for (const entity of this.entities) {
      if (entity.update) {
        entity.update(dt);
      }
    }
    
    // Update traps
    for (const trap of this.traps) {
      if (trap.cooldown > 0) {
        trap.cooldown -= dt * 1000;
      }
    }
  }
  
  getItemsInRadius(position, radius) {
    const items = [];
    
    for (const item of this.items) {
      if (!item.collected && item.position.distanceTo(position) <= radius) {
        items.push(item);
      }
    }
    
    return items;
  }
  
  getPowerupsInRadius(position, radius) {
    const powerups = [];
    
    for (const item of this.items) {
      if (!item.collected && item.type === 'powerup' && item.position.distanceTo(position) <= radius) {
        powerups.push(item);
      }
    }
    
    return powerups;
  }
  
  getFilesInRadius(position, radius) {
    const files = [];
    
    for (const item of this.items) {
      if (!item.collected && item.type === 'file' && item.position.distanceTo(position) <= radius) {
        files.push(item);
      }
    }
    
    return files;
  }
  
  render(renderer) {
    const colors = window.GAME_CONSTANTS.COLORS;
    
    // Render floor
    let floorColor = colors.FLOOR;
    if (this.type === window.GAME_CONSTANTS.ROOM_TYPES.EXIT) {
      floorColor = '#1a2a1a'; // Darker green tint for exit
    } else if (this.type === window.GAME_CONSTANTS.ROOM_TYPES.ENTRY) {
      floorColor = '#1a1a2a'; // Slight blue tint for entry
    }
    
    renderer.ctx.fillStyle = floorColor;
    renderer.ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Render furniture
    for (const furniture of this.furniture) {
      renderer.ctx.fillStyle = furniture.color;
      renderer.ctx.fillRect(furniture.x, furniture.y, furniture.width, furniture.height);
      renderer.ctx.strokeStyle = '#000000';
      renderer.ctx.strokeRect(furniture.x, furniture.y, furniture.width, furniture.height);
      
      // Add details for specific furniture types
      if (furniture.type === 'COMPUTER') {
        // Draw screen
        renderer.ctx.fillStyle = '#333333';
        renderer.ctx.fillRect(furniture.x + 2, furniture.y + 2, furniture.width - 4, furniture.height - 4);
      } else if (furniture.type === 'PLANT') {
        // Draw plant leaves
        renderer.drawCircle(furniture.x + furniture.width/2, furniture.y + furniture.height/2, 6, '#90EE90', true);
      }
    }
    
    // Render walls
    renderer.ctx.strokeStyle = colors.WALL;
    renderer.ctx.lineWidth = 2;
    renderer.ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // Render room type indicator
    let indicatorColor = '#666';
    let roomName = 'Corridor';
    
    switch (this.type) {
      case window.GAME_CONSTANTS.ROOM_TYPES.FILE_ROOM:
        indicatorColor = '#FFC107';
        roomName = 'File Room';
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.GUARD_POST:
        indicatorColor = '#F44336';
        roomName = 'Guard Post';
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.TRAP_ROOM:
        indicatorColor = '#9C27B0';
        roomName = 'Trap Room';
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.HIDEOUT:
        indicatorColor = '#2196F3';
        roomName = 'Hideout';
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.ENTRY:
        indicatorColor = '#4CAF50';
        roomName = 'Entry';
        break;
      case window.GAME_CONSTANTS.ROOM_TYPES.EXIT:
        indicatorColor = '#00BCD4';
        roomName = 'Exit';
        break;
    }
    
    // Draw room indicator in corner
    renderer.ctx.fillStyle = indicatorColor;
    renderer.ctx.fillRect(this.x + 5, this.y + 5, 16, 16);
    
    // Render connections (doors)
    for (const connectedRoom of this.connections) {
      this.renderConnection(renderer, connectedRoom);
    }
    
    // Render hide spots
    for (const hideSpot of this.hideSpots) {
      renderer.ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
      renderer.ctx.beginPath();
      renderer.ctx.arc(hideSpot.position.x, hideSpot.position.y, hideSpot.radius, 0, Math.PI * 2);
      renderer.ctx.fill();
      renderer.ctx.strokeStyle = '#2196F3';
      renderer.ctx.lineWidth = 2;
      renderer.ctx.beginPath();
      renderer.ctx.arc(hideSpot.position.x, hideSpot.position.y, hideSpot.radius, 0, Math.PI * 2);
      renderer.ctx.stroke();
    }
    
    // Render traps
    for (const trap of this.traps) {
      let trapColor = colors.TRAP;
      if (trap.triggered) {
        trapColor = '#ff0000';
      } else if (trap.cooldown > 0) {
        trapColor = '#ff6666';
      }
      
      if (trap.type === 'laser') {
        renderer.ctx.strokeStyle = trapColor;
        renderer.ctx.lineWidth = 2;
        renderer.ctx.beginPath();
        renderer.ctx.moveTo(trap.position.x - 20, trap.position.y);
        renderer.ctx.lineTo(trap.position.x + 20, trap.position.y);
        renderer.ctx.stroke();
      } else {
        renderer.ctx.fillStyle = trapColor;
        renderer.ctx.beginPath();
        renderer.ctx.arc(trap.position.x, trap.position.y, 8, 0, Math.PI * 2);
        renderer.ctx.fill();
      }
    }
    
    // Render items
    for (const item of this.items) {
      if (!item.collected) {
        if (item.type === 'file') {
          // Draw file as glowing yellow rectangle
          const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
          renderer.ctx.fillStyle = `rgba(255, 193, 7, ${pulse})`;
          renderer.ctx.fillRect(item.position.x - 8, item.position.y - 8, 16, 16);
          renderer.ctx.strokeStyle = '#FFC107';
          renderer.ctx.lineWidth = 2;
          renderer.ctx.strokeRect(item.position.x - 8, item.position.y - 8, 16, 16);
        } else if (item.type === 'powerup') {
          // Draw powerup as glowing circle
          let color = '#00BCD4';
          switch (item.powerupType) {
            case 'speed_boost': color = '#4CAF50'; break;
            case 'stealth_boost': color = '#2196F3'; break;
            case 'invisibility': color = '#9C27B0'; break;
          }
          
          const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
          renderer.ctx.fillStyle = color;
          renderer.ctx.beginPath();
          renderer.ctx.arc(item.position.x, item.position.y, 10, 0, Math.PI * 2);
          renderer.ctx.fill();
          
          renderer.ctx.fillStyle = `${color}33`;
          renderer.ctx.beginPath();
          renderer.ctx.arc(item.position.x, item.position.y, 10 * pulse, 0, Math.PI * 2);
          renderer.ctx.fill();
        }
      }
    }
  }
  
  renderConnection(renderer, otherRoom) {
    const colors = window.GAME_CONSTANTS.COLORS;
    
    // Find connection point
    const connection = this.getConnectionPoint(otherRoom);
    if (connection) {
      // Draw door opening
      renderer.drawRect(connection.x - 2, connection.y - 2, 4, 4, colors.FLOOR, true);
    }
  }
  
  getConnectionPoint(otherRoom) {
    // Simple midpoint connection for now
    const thisCenter = this.bounds.getCenter();
    const otherCenter = otherRoom.bounds.getCenter();
    
    const midX = (thisCenter.x + otherCenter.x) / 2;
    const midY = (thisCenter.y + otherCenter.y) / 2;
    
    return { x: midX, y: midY };
  }
};