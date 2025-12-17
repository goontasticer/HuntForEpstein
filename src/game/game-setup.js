// Game setup and initialization system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/game-setup.js',
  exports: ['GameSetup'],
  dependencies: ['GAME_CONSTANTS', 'AssetLoader', 'Vector2D']
});

window.GameSetup = class GameSetup {
  constructor() {
    this.systems = {};
  }
  
  /**
   * Validate all required dependencies are available
   */
  validateDependencies() {
    const requiredSystems = [
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

    const missing = requiredSystems.filter(name => !window[name]);
    if (missing.length > 0) {
      console.error('Missing required systems:', missing);
      throw new Error(`Missing required systems: ${missing.join(', ')}`);
    }

    // Store system references
    this.systems = {
      constants: window.GAME_CONSTANTS,
      input: window.Input,
      loop: window.GameLoop,
      renderer: window.Renderer,
      physics: window.PhysicsEngine,
      world: window.GameWorld,
      gameState: window.GameStateManager,
      ui: window.UISystem,
      hud: window.HUD,
      menus: window.MenuManager,
      permadeath: window.PermadeathManager,
      makko: window.MakkoEngine || null
    };
  }
  
  /**
   * Initialize all systems in proper dependency order
   */
  async initializeSystems(canvas, assetLoader) {
    const { constants, input, loop, renderer, world, gameState, ui, hud, menus, permadeath } = this.systems;

    // Core systems are already stored in this.systems from validateDependencies()
    // Input and GameLoop are object literals, not constructors
    
    this.systems.renderer = new renderer(canvas);
    
    // Initialize physics engine with proper error handling
    if (window.PhysicsEngine) {
      try {
        // Check if global instance exists, if not create one
        if (!window.gamePhysics) {
          window.gamePhysics = new window.PhysicsEngine();
        }
        this.systems.physics = window.gamePhysics;
        console.log('Physics engine initialized successfully');
      } catch (error) {
        console.error('Physics engine initialization failed:', error.message);
        this.systems.physics = null;
      }
    } else {
      console.error('PhysicsEngine class not found');
      this.systems.physics = null;
    }
    
    // Expose renderer globally for other systems
    window.gameRenderer = this.systems.renderer;

    // Initialize game state
    window.game = {
      state: constants.GAME_STATES.MENU,
      currentLevel: 1,
      filesCollected: 0,
      totalFiles: constants.FILES_PER_LEVEL * constants.BUILDING_LEVELS,
      player: null,
      level: null,
      world: null,
      entities: [],
      ui: {
        showFPS: false,
        showDebug: false
      },
      stateStartTime: Date.now(),
      hasAssetError: assetLoader.hasAssetError,
      renderer: this.systems.renderer // Add renderer reference
    };

    // Create player instance
    if (window.Player) {
      try {
        // Start player at center - rooms will be positioned around them
        window.game.player = new window.Player(constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2);
        console.log(`Player created at (${window.game.player.position.x}, ${window.game.player.position.y})`);
        
        // Set camera to player position immediately
        if (this.systems.renderer) {
          this.systems.renderer.setCameraPosition(window.game.player.position.x, window.game.player.position.y, true);
        }
        
        // Add player to physics system with error handling
        if (this.systems.physics && this.systems.physics.addEntity) {
          this.systems.physics.addEntity(window.game.player);
        } else {
          console.warn('Physics system not available - player collision disabled');
        }
      } catch (error) {
        console.error('Player creation failed:', error.message);
      }
    }

    // Initialize stealth system
    if (window.StealthSystem) {
      try {
        window.stealthSystem.initialize();
      } catch (error) {
        console.warn('Stealth system initialization failed:', error.message);
      }
    }

    // Initialize world
    this.systems.world = new world();
    try {
      this.systems.world.initializeLevel(window.game.currentLevel);
      window.game.world = this.systems.world;
    } catch (error) {
      console.error('World initialization failed:', error.message);
      throw error;
    }

    // Initialize UI systems
    this.systems.gameState = new gameState();
    this.systems.ui = new ui(canvas);
    this.systems.hud = new hud();
    this.systems.menus = new menus();
    this.systems.permadeath = new permadeath();

    // Set up global render functions
    window.updateGame = this.updateGame.bind(this);
    window.renderGame = this.renderGame.bind(this);
    window.renderUI = this.renderUI.bind(this);
  }
  
  /**
   * Set up system coordination and event handlers
   */
  setupCoordination() {
    const { gameState, ui, permadeath } = this.systems;

    // Set up game state callbacks
    gameState.onStateEnter('menu', () => {
      ui.showScreen('main');
    });

    gameState.onStateEnter('playing', () => {
      ui.showScreen('hud');
      permadeath.startRun();
    });

    gameState.onStateEnter('paused', () => {
      ui.showScreen('pause');
    });

    gameState.onStateEnter('game_over', (data) => {
      ui.showScreen('gameover', data);
    });

    gameState.onStateEnter('victory', (data) => {
      ui.showScreen('victory', data);
    });

    // Set up input handlers
    this.setupInputHandlers();

    // Integrate UI rendering
    window.renderMainUI = (ctx) => {
      this.systems.ui.render(ctx);
    };
  }
  
  /**
   * Set up keyboard and input event handlers
   */
  setupInputHandlers() {
    const { gameState, menus, ui } = this.systems;

    window.addEventListener('keydown', (e) => {
      // ESC handling
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (gameState.isInGame()) {
          gameState.pauseGame();
        } else if (gameState.isPaused()) {
          gameState.resumeGame();
        } else if (gameState.isState('menu')) {
          menus.handleBackAction();
        }
      }

      // Restart handling
      if (e.key === 'r' || e.key === 'R') {
        if (gameState.isState('game_over') || gameState.isState('victory')) {
          this.restart();
        }
      }

      // Menu input handling
      if (gameState.isState('menu') || gameState.isState('paused') ||
          gameState.isState('game_over') || gameState.isState('victory')) {
        const inputEvent = {
          isActionPressed: (action) => {
            switch (action) {
              case 'moveUp': return e.key === 'ArrowUp';
              case 'moveDown': return e.key === 'ArrowDown';
              case 'interact': return e.key === ' ' || e.key === 'Enter';
              case 'back': return e.key === 'Escape' || e.key === 'Esc';
              default: return false;
            }
          },
          isKeyPressed: (key) => e.keyCode === key
        };

        if (menus.currentMenu) {
          menus.handleMenuInput(inputEvent, menus.currentMenu);
          e.preventDefault();
        }
      }
    });
  }
  
  /**
   * Get system references for coordination
   */
  getSystems() {
    return this.systems;
  }
  
  /**
   * Main game update function with delta time
   * @param {number} dt - Delta time in seconds
   */
  updateGame(dt) {
    if (window.game.state !== window.GAME_CONSTANTS.GAME_STATES.PLAYING) return;

    const { renderer, physics, world } = this.systems;

    try {
      // Update player first for camera following
      if (window.game.player) {
        window.game.player.update(dt);
        
        // Update camera to follow player
        const playerX = window.game.player.position.x;
        const playerY = window.game.player.position.y;
        renderer.setCameraPosition(playerX, playerY);
        console.log(`Camera following player: Player at (${playerX}, ${playerY}), Camera at (${renderer.camera.x}, ${renderer.camera.y})`);
      }

      // Update systems
      renderer.update(dt);
      
      // Update physics system if available
      if (this.systems.physics) {
        this.systems.physics.update(dt);
      }

      if (window.stealthSystem) {
        window.stealthSystem.update(dt);
      }

      // Update world
      world.update(dt);

      // Update entities
      for (let i = window.game.entities.length - 1; i >= 0; i--) {
        const entity = window.game.entities[i];
        if (entity.update) {
          entity.update(dt);
        }

        // Remove dead entities
        if (entity.isDead) {
          if (this.systems.physics && this.systems.physics.removeEntity) {
            this.systems.physics.removeEntity(entity);
          }
          window.game.entities.splice(i, 1);
        }
      }

      // Check win/lose conditions
      this.checkGameState();

      // Debug input
      if (window.Input && window.Input.isActionPressed('debug1')) {
        window.game.ui.showDebug = !window.game.ui.showDebug;
      }

    } catch (error) {
      console.error('Game update error:', error.message);
    }
  }
  
  /**
   * Main game render function
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderGame(ctx) {
    const { renderer } = this.systems;
    
    try {
      // Clear layers and repopulate
      renderer.clearLayers();
      
      // Render current room
      const currentRoom = window.game.world.getCurrentRoom();
      if (currentRoom && currentRoom.render) {
        console.log(`Rendering current room: ${currentRoom.type} at (${currentRoom.x}, ${currentRoom.y}) size ${currentRoom.width}x${currentRoom.height}`);
        currentRoom.render(renderer);
      } else {
        console.log(`No current room to render! currentRoom: ${currentRoom}`);
      }

      // Add entities to entity layer
      for (const entity of window.game.entities) {
        if (entity.render) {
          renderer.addToLayer('entities', entity);
        }
      }

      // Add player to entity layer (rendered last so on top)
      if (window.game.player) {
        renderer.addToLayer('entities', window.game.player);
      }

      // Use renderer's main render method which handles camera and layers
      renderer.render(window.dt);
      
      // Debug info is rendered separately
      if (window.game.ui.showDebug) {
        this.renderDebugInfo(ctx);
      }
    } catch (error) {
      console.error('Game render error:', error.message);
    }
  }
  
  /**
   * Main UI render function
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderUI(ctx) {
    try {
      this.systems.ui.render(ctx);
    } catch (error) {
      console.error('UI render error:', error.message);
    }
  }
  
  /**
   * Check game state conditions and handle transitions
   */
  checkGameState() {
    const { gameState, world, permadeath, constants } = this.systems;

    try {
      // Check level completion
      if (world.isLevelComplete()) {
        if (world.currentLevel >= world.maxLevel) {
          gameState.victory();
        } else {
          this.nextLevel();
        }
      }

      // Check player caught
      if (window.game.player && window.game.player.isCaught) {
        gameState.gameOver('caught');
        permadeath.enforcePermadeath('caught');
      }
    } catch (error) {
      console.error('Game state check error:', error.message);
    }
  }
  
  /**
   * Progress to next level
   */
  nextLevel() {
    const { world, constants, permadeath } = this.systems;

    try {
      window.game.currentLevel++;
      window.game.filesCollected = 0;

      // Clear entities except player
      window.game.entities = [];
      
      // Clear physics system if available, preserving player
      if (this.systems.physics) {
        this.systems.physics.entities = window.game.player ? [window.game.player] : [];
        this.systems.physics.staticColliders = [];
        this.systems.physics.triggers = [];
      }

      // Progress world
      world.progressToNextLevel();
      window.game.currentLevel = world.currentLevel;

      // Reset player position
      if (window.game.player) {
        window.game.player.position = new window.Vector2D(
          constants.CANVAS_WIDTH / 2,
          constants.CANVAS_HEIGHT / 2
        );
        window.game.player.isCaught = false;
      }

      // Update level indicator
      const levelIndicator = document.getElementById('level-indicator');
      if (levelIndicator) {
        levelIndicator.textContent = `Floor ${window.game.currentLevel}`;
      }

      // Update permadeath
      permadeath.updateLevel(window.game.currentLevel);
    } catch (error) {
      console.error('Next level transition error:', error.message);
    }
  }
  
  /**
   * Restart the game with fresh state
   */
  restart() {
    const { permadeath, gameState, world, constants } = this.systems;

    // End current run
    permadeath.endRun(false, 'restart');

    // Reset game state
    gameState.restart();

    // Clear entities except player
    window.game.entities = [];
    
    // Clear physics system if available
    if (this.systems.physics) {
      this.systems.physics.entities = [];
      this.systems.physics.staticColliders = [];
      this.systems.physics.triggers = [];
    }

    // Recreate player
    if (window.Player) {
      try {
        window.game.player = new window.Player(constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2);
        
        // Add player to physics system with error handling
        if (this.systems.physics && this.systems.physics.addEntity) {
          this.systems.physics.addEntity(window.game.player);
        } else {
          console.warn('Physics system not available - player collision disabled');
        }
      } catch (error) {
        console.error('Player recreation failed:', error.message);
      }
    }

    // Reset stealth system
    if (window.stealthSystem) {
      try {
        window.stealthSystem.reset();
        window.stealthSystem.initialize();
      } catch (error) {
        console.warn('Stealth system reset failed:', error.message);
      }
    }

    // Reset world
    world.resetGame();
    window.game.currentLevel = world.currentLevel;

    // Reset game loop
    if (this.systems.loop && typeof this.systems.loop.reset === 'function') {
      this.systems.loop.reset();
    }

    console.log('Game restarted');
  }
  
  /**
   * Render debug information overlay
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  renderDebugInfo(ctx) {
    try {
      const perf = { fps: this.systems.loop.getFPS(), frameCount: this.systems.loop.frameCount };

      const input = { activeKeys: window.Input.getActiveKeys() };

      this.systems.renderer.drawUIText(`FPS: ${perf.fps}`, 10, 10, '#0f0');
      this.systems.renderer.drawUIText(`Frame: ${perf.frameCount}`, 10, 25, '#0f0');
      this.systems.renderer.drawUIText(`Entities: ${window.game.entities.length}`, 10, 40, '#0f0');

      if (window.game.player) {
        this.systems.renderer.drawUIText(`Player: (${window.game.player.position.x.toFixed(1)}, ${window.game.player.position.y.toFixed(1)})`, 10, 55, '#0f0');
      }

      const stats = window.game.world.getStats();
      this.systems.renderer.drawUIText(`Room: ${stats.currentRoom}`, 10, 70, '#0f0');
      this.systems.renderer.drawUIText(`Total Files: ${stats.totalFilesCollected}`, 10, 85, '#0f0');

      if (window.stealthSystem) {
        const stealthSummary = window.stealthSystem.getDetectionSummary();
        this.systems.renderer.drawUIText(`Detectors: ${stealthSummary.activeDetectors}/${stealthSummary.totalSources}`, 10, 100, '#0f0');
        this.systems.renderer.drawUIText(`Alert Level: ${Math.round(stealthSummary.alertLevel)}%`, 10, 115, '#0f0');
        this.systems.renderer.drawUIText(`Visibility: ${Math.round(window.stealthSystem.getPlayerVisibility() * 100)}%`, 10, 130, '#0f0');
        this.systems.renderer.drawUIText(`Keys: [${input.activeKeys.join(', ')}]`, 10, 145, '#0f0');
      }

    } catch (error) {
      console.error('Debug info render error:', error.message);
    }
  }
};