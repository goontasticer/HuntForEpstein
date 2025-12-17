// Level generation system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/level-generator.js',
  exports: ['LevelGenerator'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'Room']
});

window.LevelGenerator = class LevelGenerator {
  constructor() {
    this.roomWidth = window.GAME_CONSTANTS.ROOM_WIDTH;
    this.roomHeight = window.GAME_CONSTANTS.ROOM_HEIGHT;
  }
  
  generateLevel(levelNumber) {
    const gridSize = Math.ceil(Math.sqrt(levelNumber + 5));
    
    // Create 2D grid structure
    const rooms = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    
    // Calculate offset to center grid around player starting position
    const playerStartX = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
    const playerStartY = window.GAME_CONSTANTS.CANVAS_HEIGHT / 2;
    const gridPixelWidth = gridSize * this.roomWidth;
    const gridPixelHeight = gridSize * this.roomHeight;
    const offsetX = playerStartX - (gridPixelWidth / 2) + (this.roomWidth / 2);
    const offsetY = playerStartY - (gridPixelHeight / 2) + (this.roomHeight / 2);
    
    console.log(`Centering ${gridSize}x${gridSize} room grid around player at (${playerStartX}, ${playerStartY}) with offset (${offsetX}, ${offsetY})`);
    
    // Generate grid of rooms
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const roomX = x * this.roomWidth + offsetX;
        const roomY = y * this.roomHeight + offsetY;
        
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
    
    // Distribute files across level
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
    // Flatten 2D array for easier processing
    const flatRooms = [];
    for (let y = 0; y < rooms.length; y++) {
      for (let x = 0; x < rooms[y].length; x++) {
        if (rooms[y][x]) {
          flatRooms.push(rooms[y][x]);
        }
      }
    }
    
    if (flatRooms.length === 0) return false;
    
    // Use BFS to check if all rooms are reachable from entry room
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
    // This method now ensures 10-file minimum across level
    
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