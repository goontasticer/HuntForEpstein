// Game coordination system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/game-coordinator.js',
  exports: ['GameCoordinator'],
  dependencies: ['AssetLoader', 'GameSetup']
});

window.GameCoordinator = class GameCoordinator {
  constructor() {
    this.isInitialized = false;
    this.canvas = null;
    this.ctx = null;
    this.assetLoader = new window.AssetLoader();
    this.gameSetup = new window.GameSetup();
  }
  
  /**
   * Initialize the complete game system with MakkoEngine asset loading
   * @param {HTMLCanvasElement} canvas - Game canvas element
   * @returns {Promise<void>}
   */
  async initialize(canvas) {
    if (this.isInitialized) {
      console.warn('Game already initialized');
      return;
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    if (!this.ctx) {
        console.error('GameCoordinator: Failed to get canvas context during initialization');
        throw new Error('Failed to initialize canvas context');
    } else {
        console.log('GameCoordinator: Canvas context cached successfully');
    }
    
    try {
      // Phase 1: Load MakkoEngine assets with graceful error handling
      await this.assetLoader.loadAssets(canvas);
      
      // Phase 2: Validate dependencies
      this.gameSetup.validateDependencies();
      
      // Phase 3: Initialize systems in dependency order
      await this.gameSetup.initializeSystems(canvas, this.assetLoader);
      
      // Phase 4: Set up coordination
      this.gameSetup.setupCoordination();
      
      this.isInitialized = true;
      console.log('The Hunt For The Epstein Files initialized successfully');
      
    } catch (error) {
      console.error('Game initialization failed:', error.message);
      this.assetLoader.showErrorScreen(canvas, 'Failed to initialize game: ' + error.message);
      throw error;
    }
  }
  
  /**
   * Start the game loop
   */
  start() {
    if (!this.isInitialized) {
      throw new Error('Game not initialized. Call initialize() first.');
    }

    const systems = this.gameSetup.getSystems();
    if (systems.gameState.isState('menu')) {
      // Start the game loop but stay in menu state until user selects start
      systems.loop.start();
      console.log('Game started - showing main menu');
    }
  }
  
  /**
   * Restart the game with fresh state
   */
  restart() {
    this.gameSetup.restart();
    console.log('Game restarted');
  }
  
  /**
   * Get system statistics
   * @returns {Object} System status information
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      assetsLoaded: this.assetLoader.isAssetsLoaded,
      hasAssetError: this.assetLoader.hasAssetError,
      currentLevel: window.game.currentLevel,
      filesCollected: window.game.filesCollected,
      playerPosition: window.game.player ? {
        x: window.game.player.position.x,
        y: window.game.player.position.y
      } : null,
      worldStats: window.game.world ? window.game.world.getStats() : null
    };
  }
  
  /**
   * Get asset loader for external access
   */
  getAssetLoader() {
    return this.assetLoader;
  }
  
  /**
   * Get game setup for external access
   */
  getGameSetup() {
    return this.gameSetup;
  }
};