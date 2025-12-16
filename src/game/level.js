// Level system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/level.js',
  exports: ['Level', 'Room', 'LevelGenerator', 'FurnitureType', 'OfficeLayoutGenerator'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'AABB', 'MathUtils']
});

// Furniture types for office generation
window.FurnitureType = {
  DESK: { width: 64, height: 32, color: '#8B4513', name: 'desk', blocksMovement: true },
  CHAIR: { width: 24, height: 24, color: '#654321', name: 'chair', blocksMovement: true },
  FILING_CABINET: { width: 32, height: 24, color: '#696969', name: 'filing_cabinet', blocksMovement: true, canHoldFiles: true },
  COMPUTER: { width: 20, height: 16, color: '#C0C0C0', name: 'computer', blocksMovement: false },
  PLANT: { width: 16, height: 16, color: '#228B22', name: 'plant', blocksMovement: true },
  PRINTER: { width: 32, height: 24, color: '#2F4F4F', name: 'printer', blocksMovement: true },
  WATER_COOLER: { width: 24, height: 24, color: '#4682B4', name: 'water_cooler', blocksMovement: true },
  WHITEBOARD: { width: 80, height: 8, color: '#F5F5DC', name: 'whiteboard', blocksMovement: false }
};

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
    // Find a clear position for the guard
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
};

// Office layout generator for procedural furniture placement
window.OfficeLayoutGenerator = class OfficeLayoutGenerator {
  constructor(room) {
    this.room = room;
  }
  
  generateStandardOffice() {
    // Place desks and chairs in office clusters
    const deskClusters = Math.floor(Math.random() * 2) + 1;
    
    for (let cluster = 0; cluster < deskClusters; cluster++) {
      this.placeDeskCluster();
    }
    
    // Add miscellaneous office items
    this.addOfficeItems();
  }
  
  generateFileRoom() {
    // File rooms have more filing cabinets and storage
    const cabinetCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < cabinetCount; i++) {
      const x = Math.floor(Math.random() * (this.room.gridWidth - 4)) + 1;
      const y = Math.floor(Math.random() * (this.room.gridHeight - 3)) + 1;
      
      if (this.room.canPlaceFurniture(x, y, 'FILING_CABINET')) {
        this.room.placeFurniture(x, y, 'FILING_CABINET');
      }
    }
    
    // Add a few desks for working
    const deskCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < deskCount; i++) {
      this.placeDeskWithChair();
    }
  }
  
  generateGuardRoom() {
    // Guard rooms have minimal furniture for clear patrol paths
    const tableCount = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < tableCount; i++) {
      const x = Math.floor(Math.random() * (this.room.gridWidth - 5)) + 2;
      const y = Math.floor(Math.random() * (this.room.gridHeight - 3)) + 1;
      
      if (this.room.canPlaceFurniture(x, y, 'DESK')) {
        this.room.placeFurniture(x, y, 'DESK');
        
        // Add chair near desk
        const chairX = x + 4;
        const chairY = y + 1;
        if (this.room.canPlaceFurniture(chairX, chairY, 'CHAIR')) {
          this.room.placeFurniture(chairX, chairY, 'CHAIR');
        }
      }
    }
    
    // Add water cooler for guard rooms
    const coolerX = this.room.gridWidth - 3;
    const coolerY = Math.floor(this.room.gridHeight / 2);
    if (this.room.canPlaceFurniture(coolerX, coolerY, 'WATER_COOLER')) {
      this.room.placeFurniture(coolerX, coolerY, 'WATER_COOLER');
    }
  }
  
  generateCorridor() {
    // Corridors have minimal furniture to allow movement
    const chance = Math.random();
    
    if (chance < 0.3) {
      // Add a plant
      const x = Math.floor(Math.random() * (this.room.gridWidth - 2)) + 1;
      const y = Math.floor(Math.random() * (this.room.gridHeight - 2)) + 1;
      
      if (this.room.canPlaceFurniture(x, y, 'PLANT')) {
        this.room.placeFurniture(x, y, 'PLANT');
      }
    } else if (chance < 0.5) {
      // Add a water cooler
      const x = Math.floor(this.room.gridWidth / 2);
      const y = Math.floor(Math.random() * (this.room.gridHeight - 2)) + 1;
      
      if (this.room.canPlaceFurniture(x, y, 'WATER_COOLER')) {
        this.room.placeFurniture(x, y, 'WATER_COOLER');
      }
    }
  }
  
  placeDeskCluster() {
    // Find a suitable location for a desk cluster
    const startX = Math.floor(Math.random() * (this.room.gridWidth - 6)) + 1;
    const startY = Math.floor(Math.random() * (this.room.gridHeight - 4)) + 1;
    
    // Try to place 2-3 desks in a cluster
    const deskCount = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < deskCount; i++) {
      const deskX = startX + (i % 2) * 4;
      const deskY = startY + Math.floor(i / 2) * 3;
      
      if (this.room.canPlaceFurniture(deskX, deskY, 'DESK')) {
        this.room.placeFurniture(deskX, deskY, 'DESK');
        
        // Add computer on desk
        if (this.room.canPlaceFurniture(deskX + 2, deskY + 1, 'COMPUTER')) {
          this.room.placeFurniture(deskX + 2, deskY + 1, 'COMPUTER');
        }
        
        // Add chair
        const chairX = deskX + (i % 2 === 0 ? -1 : 4);
        const chairY = deskY + 1;
        if (this.room.canPlaceFurniture(chairX, chairY, 'CHAIR')) {
          this.room.placeFurniture(chairX, chairY, 'CHAIR');
        }
      }
    }
  }
  
  placeDeskWithChair() {
    const x = Math.floor(Math.random() * (this.room.gridWidth - 5)) + 1;
    const y = Math.floor(Math.random() * (this.room.gridHeight - 3)) + 1;
    
    if (this.room.canPlaceFurniture(x, y, 'DESK')) {
      this.room.placeFurniture(x, y, 'DESK');
      
      // Add computer
      if (this.room.canPlaceFurniture(x + 2, y + 1, 'COMPUTER')) {
        this.room.placeFurniture(x + 2, y + 1, 'COMPUTER');
      }
      
      // Add chair
      const chairX = x + 4;
      const chairY = y + 1;
      if (this.room.canPlaceFurniture(chairX, chairY, 'CHAIR')) {
        this.room.placeFurniture(chairX, chairY, 'CHAIR');
      }
    }
  }
  
  addOfficeItems() {
    // Randomly add various office items
    const itemChance = Math.random();
    
    if (itemChance < 0.3) {
      // Add printer
      const x = Math.floor(Math.random() * (this.room.gridWidth - 3)) + 1;
      const y = Math.floor(Math.random() * (this.room.gridHeight - 2)) + 1;
      
      if (this.room.canPlaceFurniture(x, y, 'PRINTER')) {
        this.room.placeFurniture(x, y, 'PRINTER');
      }
    }
    
    if (itemChance < 0.5) {
      // Add plants
      const plantCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < plantCount; i++) {
        const x = Math.floor(Math.random() * (this.room.gridWidth - 2)) + 1;
        const y = Math.floor(Math.random() * (this.room.gridHeight - 2)) + 1;
        
        if (this.room.canPlaceFurniture(x, y, 'PLANT')) {
          this.room.placeFurniture(x, y, 'PLANT');
        }
      }
    }
    
    if (itemChance < 0.7) {
      // Add whiteboard
      const x = Math.floor(Math.random() * (this.room.gridWidth - 6)) + 1;
      const y = Math.floor(Math.random() * 2); // Top or bottom
      
      if (this.room.canPlaceFurniture(x, y, 'WHITEBOARD')) {
        this.room.placeFurniture(x, y, 'WHITEBOARD');
      }
    }
  }
};

window.LevelGenerator = class LevelGenerator {
  constructor() {
    this.roomWidth = window.GAME_CONSTANTS.ROOM_WIDTH;
    this.roomHeight = window.GAME_CONSTANTS.ROOM_HEIGHT;
  }
  
  generateLevel(levelNumber) {
    const gridSize = Math.ceil(Math.sqrt(levelNumber + 5));
    
    // Create 2D grid structure
    const rooms = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    
    // Generate grid of rooms
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const roomX = x * this.roomWidth;
        const roomY = y * this.roomHeight;
        
        // Determine room type
        const roomType = this.determineRoomType(x, y, gridSize, levelNumber);
        
        const room = new window.Room(roomX, roomY, this.roomWidth, this.roomHeight, roomType);
        rooms[y][x] = room;
      }
    }
    
    // Connect rooms
    this.connectRooms(rooms, gridSize);
    
    // Validate connectivity
    if (!this.validateConnectivity(rooms)) {
      console.warn('Room connectivity validation failed - regenerating connections');
      this.repairConnectivity(rooms, gridSize);
    }
    
    // Distribute files across the level
    this.distributeFiles(rooms, levelNumber);
    
    return {
      rooms: rooms,
      gridWidth: gridSize,
      gridHeight: gridSize
    };
  }

  
  determineRoomType(x, y, gridSize, levelNumber) {
    // Special rooms
    if (x === 0 && y === 0) {
      return window.GAME_CONSTANTS.ROOM_TYPES.ENTRY;
    }
    if (x === gridSize - 1 && y === gridSize - 1) {
      return window.GAME_CONSTANTS.ROOM_TYPES.EXIT;
    }
    
    // Weighted random based on level
    const weights = {
      [window.GAME_CONSTANTS.ROOM_TYPES.FILE_ROOM]: 0.2 + (levelNumber * 0.05),
      [window.GAME_CONSTANTS.ROOM_TYPES.GUARD_POST]: 0.15 + (levelNumber * 0.03),
      [window.GAME_CONSTANTS.ROOM_TYPES.TRAP_ROOM]: 0.1 + (levelNumber * 0.02),
      [window.GAME_CONSTANTS.ROOM_TYPES.HIDEOUT]: 0.15,
      [window.GAME_CONSTANTS.ROOM_TYPES.CORRIDOR]: 0.4 - (levelNumber * 0.1)
    };
    
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * total;
    
    for (const [type, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return type;
      }
    }
    
    return window.GAME_CONSTANTS.ROOM_TYPES.CORRIDOR;
  }
  
  connectRooms(rooms, gridSize) {
    // Enhanced grid connection with strategic connections
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const currentRoom = rooms[y][x];
        if (!currentRoom) continue;
        
        // Always connect to right neighbor (horizontal connections)
        if (x < gridSize - 1 && rooms[y][x + 1]) {
          const rightRoom = rooms[y][x + 1];
          currentRoom.connectTo(rightRoom);
        }
        
        // Always connect to bottom neighbor (vertical connections)
        if (y < gridSize - 1 && rooms[y + 1][x]) {
          const bottomRoom = rooms[y + 1][x];
          currentRoom.connectTo(bottomRoom);
        }
        
        // Add diagonal connections for larger grids to improve flow
        if (gridSize > 3 && x < gridSize - 1 && y < gridSize - 1 && rooms[y + 1][x + 1]) {
          const diagonalRoom = rooms[y + 1][x + 1];
          if (Math.random() < 0.3) { // 30% chance for diagonal
            currentRoom.connectTo(diagonalRoom);
          }
        }
      }
    }
  }

  
  validateConnectivity(rooms) {
    // Flatten the 2D array for easier processing
    const flatRooms = [];
    for (let y = 0; y < rooms.length; y++) {
      for (let x = 0; x < rooms[y].length; x++) {
        if (rooms[y][x]) {
          flatRooms.push(rooms[y][x]);
        }
      }
    }
    
    if (flatRooms.length === 0) return false;
    
    // Use BFS to check if all rooms are reachable from the entry room
    const visited = new Set();
    const queue = [flatRooms[0]]; // Start with entry room
    visited.add(flatRooms[0]);
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      for (const connectedRoom of current.connections) {
        if (!visited.has(connectedRoom)) {
          visited.add(connectedRoom);
          queue.push(connectedRoom);
        }
      }
    }
    
    // All rooms should be visited
    return visited.size === flatRooms.length;
  }

  
  repairConnectivity(rooms, gridSize) {
    // Flatten 2D array for easier processing
    const flatRooms = [];
    for (let y = 0; y < rooms.length; y++) {
      for (let x = 0; x < rooms[y].length; x++) {
        if (rooms[y][x]) {
          flatRooms.push(rooms[y][x]);
        }
      }
    }
    
    if (flatRooms.length === 0) return;
    
    // Find disconnected rooms and connect them
    const visited = new Set();
    const queue = [flatRooms[0]];
    visited.add(flatRooms[0]);
    
    // First BFS to find connected component
    while (queue.length > 0) {
      const current = queue.shift();
      
      for (const connectedRoom of current.connections) {
        if (!visited.has(connectedRoom)) {
          visited.add(connectedRoom);
          queue.push(connectedRoom);
        }
      }
    }
    
    // Connect disconnected rooms to nearest connected room
    for (const room of flatRooms) {
      if (!visited.has(room)) {
        // Find nearest connected room
        let nearestRoom = null;
        let minDistance = Infinity;
        
        for (const connectedRoom of visited) {
          const distance = Math.sqrt(
            Math.pow(room.x - connectedRoom.x, 2) + 
            Math.pow(room.y - connectedRoom.y, 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestRoom = connectedRoom;
          }
        }
        
        if (nearestRoom) {
          room.connectTo(nearestRoom);
          visited.add(room);
          console.log(`Connected isolated room at (${room.x}, ${room.y}) to main network`);
        }
      }
    }
  }

  
  distributeFiles(rooms, levelNumber) {
    // File distribution is now handled by room content generation
    // This method now ensures the 10-file minimum across the level
    
    // Flatten 2D array for easier processing
    const flatRooms = [];
    for (let y = 0; y < rooms.length; y++) {
      for (let x = 0; x < rooms[y].length; x++) {
        if (rooms[y][x]) {
          flatRooms.push(rooms[y][x]);
        }
      }
    }
    
    let totalFiles = 0;
    
    // Count files spawned by individual rooms
    for (const room of flatRooms) {
      totalFiles += room.items.filter(item => item.type === 'file').length;
    }
    
    // Ensure minimum of 10 files per level
    const targetFileCount = 10;
    if (totalFiles < targetFileCount) {
      const filesNeeded = targetFileCount - totalFiles;
      console.log(`Adding ${filesNeeded} additional files to meet 10-file minimum`);
      
      // Add remaining files to file rooms first, then other rooms
      const fileRooms = flatRooms.filter(room => 
        room.type === window.GAME_CONSTANTS.ROOM_TYPES.FILE_ROOM
      );
      
      const availableRooms = fileRooms.length > 0 ? fileRooms : flatRooms;
      
      for (let i = 0; i < filesNeeded; i++) {
        const room = availableRooms[i % availableRooms.length];
        const fileId = `file_extra_${levelNumber}_${i}`;
        
        // Create file object directly
        const file = {
          type: 'file',
          position: new window.Vector2D(
            room.x + Math.random() * (room.width - 40) + 20,
            room.y + Math.random() * (room.height - 40) + 20
          ),
          collected: false,
          id: fileId
        };
        room.items.push(file);

      }
    }
    
    // Final count
    totalFiles = 0;
    for (const room of flatRooms) {
      totalFiles += room.items.filter(item => item.type === 'file').length;
    }
    
    console.log(`Level ${levelNumber} has ${totalFiles} files across ${flatRooms.length} rooms`);
  }

};

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
};