// Main game controller for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/main.js',
  exports: ['EpsteinGame', 'initGame', 'startGame', 'restartGame'],
  dependencies: ['GAME_CONSTANTS', 'GameCoordinator']
});

/**
 * Main game class that coordinates all subsystems
 * Handles initialization, asset loading, state management, and system coordination
 */
window.EpsteinGame = class EpsteinGame {
  constructor() {
    this.coordinator = new window.GameCoordinator();
  }
  
  /**
   * Initialize complete game system with MakkoEngine asset loading
   * @param {HTMLCanvasElement} canvas - Game canvas element
   * @returns {Promise<void>}
   */
  async initialize(canvas) {
    return this.coordinator.initialize(canvas);
  }
  
  /**
   * Start the game loop
   */
  start() {
    return this.coordinator.start();
  }
  
  /**
   * Restart the game with fresh state
   */
  restart() {
    return this.coordinator.restart();
  }
  
  /**
   * Get system statistics
   * @returns {Object} System status information
   */
  getStats() {
    return this.coordinator.getStats();
  }
};

// Legacy compatibility functions
window.game = window.game || {
  state: window.GAME_CONSTANTS ? window.GAME_CONSTANTS.GAME_STATES.MENU : 'menu',
  currentLevel: 1,
  filesCollected: 0,
  totalFiles: 0,
  player: null,
  level: null,
  world: null,
  entities: [],
  ui: {
    showFPS: false,
    showDebug: false
  },
  stateStartTime: Date.now(),
  hasAssetError: false
};

// Global game instance
window.epsteinGame = null;

/**
 * Initialize game (legacy compatibility)
 */
window.initGame = function() {
  // Enhanced canvas detection with multiple fallback strategies
  let canvas = null;
  
  // Strategy 1: Direct ID lookup
  canvas = document.getElementById('gameCanvas');
  
  // Strategy 2: Try common alternative IDs
  if (!canvas) {
    const alternativeIds = ['canvas', 'game-canvas', 'mainCanvas', 'game_canvas'];
    for (const id of alternativeIds) {
      canvas = document.getElementById(id);
      if (canvas) break;
    }
  }
  
  // Strategy 3: Find any canvas element
  if (!canvas) {
    const canvases = document.getElementsByTagName('canvas');
    if (canvases.length > 0) {
      canvas = canvases[0];
      console.warn('Using first available canvas element instead of #gameCanvas');
    }
  }
  
  // Strategy 4: Create canvas if none exists
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.width = window.GAME_CONSTANTS ? window.GAME_CONSTANTS.CANVAS_WIDTH : 800;
    canvas.height = window.GAME_CONSTANTS ? window.GAME_CONSTANTS.CANVAS_HEIGHT : 600;
    canvas.style.border = '2px solid red';
    
    // Add to document body
    document.body.appendChild(canvas);
    console.warn('Created new canvas element as fallback');
  }
  
  // Validate canvas is actually usable
  if (!canvas || !canvas.getContext) {
    console.error('Canvas element is not usable');
    return;
  }

  try {
    window.epsteinGame = new window.EpsteinGame();
    return window.epsteinGame.initialize(canvas).catch(error => {
      console.error('Game initialization failed:', error.message);
      throw error;
    });
  } catch (error) {
    console.error('Failed to create game instance:', error.message);
  }
};

/**
 * Start game (legacy compatibility)
 */
window.startGame = function() {
  if (window.epsteinGame) {
    window.epsteinGame.start();
  } else {
    console.error('Game not initialized');
  }
};

/**
 * Restart game (legacy compatibility)
 */
window.restartGame = function() {
  if (window.epsteinGame) {
    window.epsteinGame.restart();
  } else {
    console.error('Game not initialized');
  }
};

// Enhanced auto-initialization with robust DOM readiness
function initializeGameWhenReady() {
  // Check if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGameWhenReady);
    return;
  }
  
  // MakkoEngine is optional - proceed with initialization
  console.log('Initializing game - MakkoEngine ' + (window.MakkoEngine ? 'available' : 'not available (using fallback)'));

  // Wait for all scripts to load with multiple fallbacks
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max wait
  
  function tryInitialize() {
    attempts++;
    
    // Prevent multiple simultaneous initializations
    if (window.epsteinGame) {
      console.log('Game already initialized - skipping duplicate attempt');
      return;
    }
    
    // Check if critical dependencies are loaded - match the validation logic
    const requiredDeps = [
      'GAME_CONSTANTS',
      'Input', 
      'GameLoop',
      'Renderer',
      'PhysicsEngine',
      'GameWorld',
      'GameStateManager',
      'UISystem',
      'HUD',
      'MenuManager',
      'PermadeathManager'
    ];
    const missingDeps = requiredDeps.filter(dep => !window[dep]);
    
    if (missingDeps.length === 0) {
      try {
        window.initGame();
      } catch (error) {
        console.error('Game initialization failed:', error.message);
      }
    } else if (attempts < maxAttempts) {
      console.log(`Waiting for dependencies (attempt ${attempts}/${maxAttempts}): ${missingDeps.join(', ')}`);
      setTimeout(tryInitialize, 100);
    } else {
      console.error('Failed to initialize game - dependencies not loaded:', missingDeps);
      // Try anyway as a fallback
      try {
        window.initGame();
      } catch (error) {
        console.error('Fallback initialization failed:', error.message);
      }
    }
  }
  
  tryInitialize();
}

// Try multiple initialization strategies
if (document.readyState === 'complete') {
  // Page already loaded
  initializeGameWhenReady();
} else {
  // Page still loading
  window.addEventListener('load', initializeGameWhenReady);
  document.addEventListener('DOMContentLoaded', initializeGameWhenReady);
}