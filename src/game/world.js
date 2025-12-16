// GameWorld class for managing room grid, transitions, and level progression
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/world.js',
  exports: ['GameWorld'],
  dependencies: ['LevelGenerator']
});

window.GameWorld = class GameWorld {
    constructor() {
        this.currentLevel = 1;
        this.maxLevel = 5;
        this.rooms = []; // 2D grid [y][x]
        this.gridWidth = 0;
        this.gridHeight = 0;
        this.currentRoomX = 0;
        this.currentRoomY = 0;
        this.collectedFiles = new Set(); // Global file collection state
        this.levelFiles = {}; // Files found per level
        this.levelGenerator = new window.LevelGenerator();
        
        // Room transition state
        this.isTransitioning = false;
        this.transitionCallback = null;
    }
    
    /**
     * Initialize a new level
     */
    initializeLevel(levelNum) {
        if (levelNum < 1 || levelNum > this.maxLevel) {
            throw new Error(`Invalid level: ${levelNum}. Must be 1-${this.maxLevel}`);
        }
        
        this.currentLevel = levelNum;
        
        // Generate level using existing LevelGenerator
        const levelData = this.levelGenerator.generateLevel(levelNum);
        
        this.rooms = levelData.rooms;
        this.gridWidth = levelData.gridWidth;
        this.gridHeight = levelData.gridHeight;
        
        // Find starting room (typically top-left or first room with player spawn)
        this.findStartingRoom();
        
        // Initialize level files tracking
        if (!this.levelFiles[levelNum]) {
            this.levelFiles[levelNum] = new Set();
        }
        
        // Reset transition state
        this.isTransitioning = false;
        this.transitionCallback = null;
        
        console.log(`Level ${levelNum} initialized: ${this.gridWidth}x${this.gridHeight} grid`);
    }
    
    /**
     * Find the starting room for the player
     */
    findStartingRoom() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const room = this.rooms[y][x];
                if (room && room.hasPlayerSpawn) {
                    this.currentRoomX = x;
                    this.currentRoomY = y;
                    return;
                }
            }
        }
        
        // Fallback: use first available room
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.rooms[y][x]) {
                    this.currentRoomX = x;
                    this.currentRoomY = y;
                    return;
                }
            }
        }
    }
    
    /**
     * Get the current room object
     */
    getCurrentRoom() {
        if (this.currentRoomY < 0 || this.currentRoomY >= this.gridHeight ||
            this.currentRoomX < 0 || this.currentRoomX >= this.gridWidth) {
            return null;
        }
        return this.rooms[this.currentRoomY][this.currentRoomX];
    }
    
    /**
     * Attempt to transition to an adjacent room
     */
    transitionRoom(direction) {
        if (this.isTransitioning) {
            return false;
        }
        
        let newX = this.currentRoomX;
        let newY = this.currentRoomY;
        
        switch (direction) {
            case 'north':
                newY--;
                break;
            case 'south':
                newY++;
                break;
            case 'east':
                newX++;
                break;
            case 'west':
                newX--;
                break;
            default:
                return false;
        }
        
        // Check bounds
        if (newX < 0 || newX >= this.gridWidth || 
            newY < 0 || newY >= this.gridHeight) {
            return false;
        }
        
        const newRoom = this.rooms[newY][newX];
        if (!newRoom) {
            return false;
        }
        
        // Check if rooms are connected
        const currentRoom = this.getCurrentRoom();
        if (!this.areRoomsConnected(currentRoom, newRoom, direction)) {
            return false;
        }
        
        // Perform transition
        this.isTransitioning = true;
        this.currentRoomX = newX;
        this.currentRoomY = newY;
        
        // Reset transition flag after a frame
        setTimeout(() => {
            this.isTransitioning = false;
            if (this.transitionCallback) {
                this.transitionCallback(newRoom, direction);
                this.transitionCallback = null;
            }
        }, 16);
        
        return true;
    }
    
    /**
     * Check if two rooms are connected by a door in the given direction
     */
    areRoomsConnected(fromRoom, toRoom, direction) {
        if (!fromRoom || !toRoom) {
            return false;
        }
        
        // Check if fromRoom has exit in that direction
        const hasExit = fromRoom.exits && fromRoom.exits.includes(direction);
        
        // Check if toRoom has corresponding entrance
        const oppositeDirection = this.getOppositeDirection(direction);
        const hasEntrance = toRoom.exits && toRoom.exits.includes(oppositeDirection);
        
        return hasExit && hasEntrance;
    }
    
    /**
     * Get opposite direction for connection validation
     */
    getOppositeDirection(direction) {
        const opposites = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east'
        };
        return opposites[direction] || null;
    }
    
    /**
     * Collect a file in the current room
     */
    collectFile(fileId) {
        const currentRoom = this.getCurrentRoom();
        if (!currentRoom) {
            return false;
        }
        
        // Check if file exists in current room
        const fileIndex = currentRoom.files.indexOf(fileId);
        if (fileIndex === -1) {
            return false;
        }
        
        // Add to global collection
        this.collectedFiles.add(fileId);
        
        // Add to level-specific collection
        this.levelFiles[this.currentLevel].add(fileId);
        
        // Remove from room
        currentRoom.files.splice(fileIndex, 1);
        
        console.log(`File collected: ${fileId} (Level ${this.currentLevel}, Room ${this.currentRoomX},${this.currentRoomY})`);
        return true;
    }
    
    /**
     * Check if current level is complete (all files collected)
     */
    isLevelComplete() {
        const totalFilesInLevel = this.levelGenerator.getFileCountForLevel(this.currentLevel);
        const collectedInLevel = this.levelFiles[this.currentLevel].size;
        return collectedInLevel >= totalFilesInLevel;
    }
    
    /**
     * Progress to next level
     */
    progressToNextLevel() {
        if (this.currentLevel >= this.maxLevel) {
            return false; // Game complete
        }
        
        this.currentLevel++;
        this.initializeLevel(this.currentLevel);
        return true;
    }
    
    /**
     * Get game statistics
     */
    getStats() {
        return {
            currentLevel: this.currentLevel,
            maxLevel: this.maxLevel,
            totalFilesCollected: this.collectedFiles.size,
            filesPerLevel: Object.keys(this.levelFiles).reduce((acc, level) => {
                acc[level] = this.levelFiles[level].size;
                return acc;
            }, {}),
            currentRoom: `${this.currentRoomX},${this.currentRoomY}`,
            isLevelComplete: this.isLevelComplete()
        };
    }
    
    /**
     * Reset game progress
     */
    resetGame() {
        this.currentLevel = 1;
        this.collectedFiles.clear();
        this.levelFiles = {};
        this.initializeLevel(1);
    }
    
    /**
     * Update function to be called each frame
     */
    update(dt) {
        // Currently no per-frame updates needed for world management
        // Room transitions are handled synchronously
    }
    
    /**
     * Set callback for room transitions
     */
    onRoomTransition(callback) {
        this.transitionCallback = callback;
    }
};