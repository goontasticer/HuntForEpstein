// Menu screens for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/ui/menus.js',
  exports: ['MenuManager', 'mainMenuScreen', 'pauseMenuScreen', 'gameOverScreen', 'victoryScreen'],
  dependencies: ['GAME_CONSTANTS', 'uiSystem', 'gameState', 'hud']
});

window.MenuManager = class MenuManager {
  constructor() {
    this.currentMenu = null;
    this.menuHistory = [];
    this.menuStack = [];
    
    // Menu navigation
    this.selectedIndex = 0;
    this.menuItems = [];
    this.menuAnimations = {};
    this.menuData = {};
    
    // Input handling
    this.inputCooldown = 200; // milliseconds
    this.lastInputTime = 0;
    
    // Initialize menu screens
    this.initializeMenus();
  }
  
  initializeMenus() {
    // Main menu
    window.mainMenuScreen = {
      items: [
        { text: 'START GAME', action: 'start', selectable: true },
        { text: 'CONTROLS', action: 'controls', selectable: true },
        { text: 'CREDITS', action: 'credits', selectable: true },
        { text: 'QUIT', action: 'quit', selectable: true }
      ],
      
      onEnter: (data) => {
        window.menuManager.showMenu('main');
      },
      
      onExit: () => {
        window.menuManager.hideMenu();
      },
      
      update: (dt) => {
        window.menuManager.updateMenuAnimations(dt);
      },
      
      render: (ctx) => {
        window.menuManager.renderMainMenu(ctx);
      },
      
      handleInput: (inputManager) => {
        window.menuManager.handleMenuInput(inputManager, 'main');
      }
    };
    
    // Pause menu
    window.pauseMenuScreen = {
      items: [
        { text: 'RESUME', action: 'resume', selectable: true },
        { text: 'RESTART LEVEL', action: 'restart', selectable: true },
        { text: 'MAIN MENU', action: 'mainmenu', selectable: true },
        { text: 'QUIT', action: 'quit', selectable: true }
      ],
      
      onEnter: (data) => {
        window.menuManager.showMenu('pause');
      },
      
      onExit: () => {
        window.menuManager.hideMenu();
      },
      
      update: (dt) => {
        window.menuManager.updateMenuAnimations(dt);
      },
      
      render: (ctx) => {
        window.menuManager.renderPauseMenu(ctx);
      },
      
      handleInput: (inputManager) => {
        window.menuManager.handleMenuInput(inputManager, 'pause');
      }
    };
    
    // Game over menu
    window.gameOverScreen = {
      items: [
        { text: 'TRY AGAIN', action: 'retry', selectable: true },
        { text: 'MAIN MENU', action: 'mainmenu', selectable: true },
        { text: 'QUIT', action: 'quit', selectable: true }
      ],
      
      onEnter: (data) => {
        window.menuManager.showMenu('gameover', data);
      },
      
      onExit: () => {
        window.menuManager.hideMenu();
      },
      
      update: (dt) => {
        window.menuManager.updateMenuAnimations(dt);
      },
      
      render: (ctx) => {
        window.menuManager.renderGameOverMenu(ctx);
      },
      
      handleInput: (inputManager) => {
        window.menuManager.handleMenuInput(inputManager, 'gameover');
      }
    };
    
    // Victory menu
    window.victoryScreen = {
      items: [
        { text: 'PLAY AGAIN', action: 'playagain', selectable: true },
        { text: 'MAIN MENU', action: 'mainmenu', selectable: true },
        { text: 'QUIT', action: 'quit', selectable: true }
      ],
      
      onEnter: (data) => {
        window.menuManager.showMenu('victory', data);
      },
      
      onExit: () => {
        window.menuManager.hideMenu();
      },
      
      update: (dt) => {
        window.menuManager.updateMenuAnimations(dt);
      },
      
      render: (ctx) => {
        window.menuManager.renderVictoryMenu(ctx);
      },
      
      handleInput: (inputManager) => {
        window.menuManager.handleMenuInput(inputManager, 'victory');
      }
    };
  }
  
  // Menu control methods
  showMenu(menuType, data = {}) {
    this.currentMenu = menuType;
    this.selectedIndex = 0;
    this.menuItems = [];
    
    // Get menu items based on type
    switch (menuType) {
      case 'main':
        this.menuItems = window.mainMenuScreen.items;
        break;
      case 'pause':
        this.menuItems = window.pauseMenuScreen.items;
        break;
      case 'gameover':
        this.menuItems = window.gameOverScreen.items;
        this.menuData = data;
        break;
      case 'victory':
        this.menuItems = window.victoryScreen.items;
        this.menuData = data;
        break;
    }
    
    // Initialize animations
    this.initializeMenuAnimations();
    
    // Show UI screen
    window.uiSystem.showScreen(menuType);
    
    // Pause game if in-game menu
    if (menuType === 'pause') {
      window.gameState.pauseGame();
    }
  }
  
  hideMenu() {
    this.currentMenu = null;
    this.menuItems = [];
    this.selectedIndex = 0;
    
    // Hide UI screen
    const activeScreens = window.uiSystem.getActiveScreens();
    activeScreens.forEach(screen => {
      if (['main', 'pause', 'gameover', 'victory'].includes(screen)) {
        window.uiSystem.hideScreen(screen);
      }
    });
  }
  
  initializeMenuAnimations() {
    this.menuAnimations = {
      title: { scale: 0, targetScale: 1, alpha: 0, targetAlpha: 1 },
      items: []
    };
    
    // Initialize item animations
    this.menuItems.forEach((item, index) => {
      this.menuAnimations.items.push({
        scale: 0,
        targetScale: 1,
        alpha: 0,
        targetAlpha: item.selectable ? 1 : 0.5,
        offsetY: 50,
        targetOffsetY: 0,
        delay: index * 0.1
      });
    });
  }
  
  updateMenuAnimations(dt) {
    if (!this.menuAnimations) return;
    
    // Update title animation
    this.menuAnimations.title.scale += (this.menuAnimations.title.targetScale - this.menuAnimations.title.scale) * 0.1;
    this.menuAnimations.title.alpha += (this.menuAnimations.title.targetAlpha - this.menuAnimations.title.alpha) * 0.1;
    
    // Update item animations
    this.menuAnimations.items.forEach((anim, index) => {
      if (anim.delay > 0) {
        anim.delay -= dt;
        if (anim.delay <= 0) {
          anim.delay = 0;
        }
      } else {
        anim.scale += (anim.targetScale - anim.scale) * 0.15;
        anim.alpha += (anim.targetAlpha - anim.alpha) * 0.15;
        anim.offsetY += (anim.targetOffsetY - anim.offsetY) * 0.15;
      }
    });
  }
  
  handleMenuInput(inputManager, menuType) {
    const now = Date.now();
    if (now - this.lastInputTime < this.inputCooldown) return;
    
    let handled = false;
    
    // Menu navigation
    if (inputManager.isBindingPressed('moveUp')) {
      this.moveSelection(-1);
      handled = true;
    } else if (inputManager.isBindingPressed('moveDown')) {
      this.moveSelection(1);
      handled = true;
    } else if (inputManager.isBindingPressed('interact')) {
      this.selectCurrentItem();
      handled = true;
    } else if (inputManager.isBindingPressed('back') || inputManager.isKeyPressed(27)) { // ESC
      this.handleBackAction();
      handled = true;
    }
    
    if (handled) {
      this.lastInputTime = now;
    }
  }
  
  moveSelection(direction) {
    if (!this.menuItems.length) return;
    
    const selectableIndices = this.menuItems
      .map((item, index) => item.selectable ? index : -1)
      .filter(index => index !== -1);
    
    if (selectableIndices.length === 0) return;
    
    const currentIndex = selectableIndices.indexOf(this.selectedIndex);
    let newIndex = currentIndex + direction;
    
    // Wrap around
    if (newIndex < 0) newIndex = selectableIndices.length - 1;
    if (newIndex >= selectableIndices.length) newIndex = 0;
    
    this.selectedIndex = selectableIndices[newIndex];
    
    // Update item alphas
    this.menuItems.forEach((item, index) => {
      const anim = this.menuAnimations.items[index];
      if (anim) {
        anim.targetAlpha = item.selectable && index === this.selectedIndex ? 1 : 0.5;
      }
    });
  }
  
  selectCurrentItem() {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.menuItems.length) return;
    
    const item = this.menuItems[this.selectedIndex];
    this.handleMenuAction(item.action);
  }
  
  handleMenuAction(action) {
    switch (action) {
      case 'start':
        // Transition to playing state properly
        window.gameState.setState(window.GAME_CONSTANTS.GAME_STATES.PLAYING);
        this.hideMenu();
        break;

        
      case 'resume':
        window.gameState.resumeGame();
        this.hideMenu();
        break;
        
      case 'restart':
      case 'retry':
        window.gameState.restart();
        this.hideMenu();
        break;
        
      case 'mainmenu':
        window.gameState.returnToMenu();
        this.hideMenu();
        break;
        
      case 'playagain':
        window.gameState.restart();
        this.hideMenu();
        break;
        
      case 'controls':
        this.showControlsScreen();
        break;
        
      case 'credits':
        this.showCreditsScreen();
        break;
        
      case 'quit':
        this.quitGame();
        break;
    }
  }
  
  handleBackAction() {
    if (this.currentMenu === 'pause') {
      // Resume game
      window.gameState.resumeGame();
      this.hideMenu();
    } else if (this.currentMenu === 'main') {
      // Quit game
      this.quitGame();
    }
  }
  
  showControlsScreen() {
    // Show controls as a notification for now
    const controlsText = [
      'Arrow Keys - Move',
      'Space - Interact',
      'Shift - Sprint',
      'Ctrl - Sneak',
      'ESC - Pause/Menu'
    ];
    
    controlsText.forEach((control, index) => {
      setTimeout(() => {
        window.hud.showNotification(control, 'info');
      }, index * 500);
    });
  }
  
  showCreditsScreen() {
    const creditsText = [
      'The Hunt For The Epstein Files',
      'A Stealth Exploration Game',
      '',
      'Made with Vanilla JavaScript',
      'Powered by MakkoEngine',
      '',
      '© 2024 - All Files Are Real'
    ];
    
    creditsText.forEach((credit, index) => {
      setTimeout(() => {
        window.hud.showNotification(credit, 'info');
      }, index * 600);
    });
  }
  
  quitGame() {
    // In a real game, this might close the window or navigate away
    if (confirm('Are you sure you want to quit?')) {
      window.location.reload();
    }
  }
  
  // Render methods
  renderMainMenu(ctx) {
    console.log('renderMainMenu() called - drawing main menu');
    const centerX = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
    const centerY = window.GAME_CONSTANTS.CANVAS_HEIGHT / 2;
    
    this.renderMenuBackground(ctx);
    this.renderMenuTitle(ctx, centerX, centerY - 150, 'THE HUNT FOR THE EPSTEIN FILES');
    this.renderMenuItems(ctx, centerX, centerY);
    this.renderMenuFooter(ctx);
  }

  
  renderPauseMenu(ctx) {
    const centerX = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
    const centerY = window.GAME_CONSTANTS.CANVAS_HEIGHT / 2;
    
    this.renderMenuBackground(ctx);
    this.renderMenuTitle(ctx, centerX, centerY - 150, 'PAUSED');
    this.renderMenuItems(ctx, centerX, centerY);
  }
  
  renderGameOverMenu(ctx) {
    const centerX = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
    const centerY = window.GAME_CONSTANTS.CANVAS_HEIGHT / 2;
    
    this.renderMenuBackground(ctx);
    this.renderMenuTitle(ctx, centerX, centerY - 200, 'MISSION FAILED', '#F44336');
    
    // Render game over stats
    this.renderGameStats(ctx, centerX, centerY - 100);
    
    this.renderMenuItems(ctx, centerX, centerY + 50);
  }
  
  renderVictoryMenu(ctx) {
    const centerX = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
    const centerY = window.GAME_CONSTANTS.CANVAS_HEIGHT / 2;
    
    this.renderMenuBackground(ctx);
    this.renderMenuTitle(ctx, centerX, centerY - 200, 'MISSION COMPLETE!', '#4CAF50');
    
    // Render victory stats
    this.renderVictoryStats(ctx, centerX, centerY - 100);
    
    this.renderMenuItems(ctx, centerX, centerY + 50);
  }
  
  renderMenuBackground(ctx) {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, window.GAME_CONSTANTS.CANVAS_WIDTH, window.GAME_CONSTANTS.CANVAS_HEIGHT);
  }
  
  renderMenuTitle(ctx, x, y, title, color = '#fff') {
    if (!this.menuAnimations.title) return;
    
    ctx.save();
    
    // Apply animations
    ctx.translate(x, y);
    ctx.scale(this.menuAnimations.title.scale, this.menuAnimations.title.scale);
    ctx.globalAlpha = this.menuAnimations.title.alpha;
    
    // Title background
    const padding = 20;
    const titleWidth = ctx.measureText(title).width + padding * 2;
    const titleHeight = 60;
    
    ctx.fillStyle = window.GAME_CONSTANTS.COLORS.UI_BACKGROUND;
    ctx.fillRect(-titleWidth / 2, -titleHeight / 2, titleWidth, titleHeight);
    
    ctx.strokeStyle = window.GAME_CONSTANTS.COLORS.UI_BORDER;
    ctx.lineWidth = 3;
    ctx.strokeRect(-titleWidth / 2, -titleHeight / 2, titleWidth, titleHeight);
    
    // Title text
    ctx.fillStyle = color;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 0, 0);
    
    ctx.restore();
  }
  
  renderMenuItems(ctx, centerX, centerY) {
    const itemHeight = 50;
    const itemSpacing = 10;
    const startY = centerY - ((this.menuItems.length - 1) * (itemHeight + itemSpacing)) / 2;
    
    this.menuItems.forEach((item, index) => {
      const y = startY + index * (itemHeight + itemSpacing);
      this.renderMenuItem(ctx, centerX, y, item, index);
    });
  }
  
  renderMenuItem(ctx, x, y, item, index) {
    const anim = this.menuAnimations.items[index];
    if (!anim) return;
    
    ctx.save();
    
    // Apply animations
    ctx.translate(x, y + anim.offsetY);
    ctx.scale(anim.scale, anim.scale);
    ctx.globalAlpha = anim.alpha;
    
    // Item dimensions
    const padding = 30;
    const itemWidth = 300;
    const itemHeight = 45;
    
    // Background
    const isSelected = index === this.selectedIndex;
    ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight);
    
    // Border
    ctx.strokeStyle = isSelected ? '#FFC107' : '#666';
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.strokeRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight);
    
    // Text
    ctx.fillStyle = item.selectable ? (isSelected ? '#FFC107' : '#fff') : '#666';
    ctx.font = isSelected ? 'bold 18px monospace' : '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.text, 0, 0);
    
    ctx.restore();
  }
  
  renderGameStats(ctx, centerX, centerY) {
    const stats = this.menuData || {};
    
    ctx.fillStyle = '#888';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let y = centerY;
    if (stats.reason) {
      ctx.fillText(`Reason: ${stats.reason.toUpperCase()}`, centerX, y);
      y += 20;
    }
    
    if (stats.finalScore) {
      ctx.fillText(`Final Score: ${stats.finalScore}`, centerX, y);
      y += 20;
    }
    
    if (stats.timePlayed) {
      const minutes = Math.floor(stats.timePlayed / 60000);
      const seconds = Math.floor((stats.timePlayed % 60000) / 1000);
      ctx.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, centerX, y);
    }
  }
  
  renderVictoryStats(ctx, centerX, centerY) {
    const stats = this.menuData || {};
    
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let y = centerY;
    ctx.fillText('All files recovered successfully!', centerX, y);
    y += 25;
    
    if (stats.finalScore) {
      ctx.fillStyle = '#FFC107';
      ctx.fillText(`Final Score: ${stats.finalScore}`, centerX, y);
      y += 20;
    }
    
    if (stats.timePlayed) {
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      const minutes = Math.floor(stats.timePlayed / 60000);
      const seconds = Math.floor((stats.timePlayed % 60000) / 1000);
      ctx.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, centerX, y);
    }
  }
  
  renderMenuFooter(ctx) {
    const centerX = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
    const bottomY = window.GAME_CONSTANTS.CANVAS_HEIGHT - 50;
    
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Use Arrow Keys to Navigate, Space to Select, ESC to Back', centerX, bottomY);
  }
};

// Create global instance - ensure it's available immediately
window.menuManager = window.menuManager || new window.MenuManager();
