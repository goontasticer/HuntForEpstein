// Furniture system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/level-furniture.js',
  exports: ['FurnitureType', 'OfficeLayoutGenerator'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D', 'MathUtils']
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