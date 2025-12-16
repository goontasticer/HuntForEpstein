// UI system coordination for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/ui/ui-system.js',
  exports: ['UISystem'],
  dependencies: ['GAME_CONSTANTS', 'gameState']
});

window.UISystem = class UISystem {
  constructor() {
    this.layers = [];
    this.notifications = [];
    this.activeScreens = new Set();
    this.screenTransitions = new Map();
    
    // UI settings
    this.notificationTimeout = 3000; // milliseconds
    this.maxNotifications = 5;
    this.notificationY = 100;
    
    // Animation settings
    this.animationSpeed = 0.3; // transition speed (0-1)
    this.pulseSpeed = 2; // pulses per second
    
    // Initialize layers
    this.initializeLayers();
    
    // Bind methods to maintain context
    this.update = this.update.bind(this);
    this.render = this.render.bind(this);
  }
  
  initializeLayers() {
    // Create UI layers in render order
    this.layers = [
      { name: 'background', zIndex: 0, visible: true },
      { name: 'game', zIndex: 1, visible: true },
      { name: 'hud', zIndex: 2, visible: true },
      { name: 'notifications', zIndex: 3, visible: true },
      { name: 'menus', zIndex: 4, visible: true },
      { name: 'overlay', zIndex: 5, visible: true }
    ];
    
    // Sort by zIndex
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
  }
  
  // Layer management
  getLayer(name) {
    return this.layers.find(layer => layer.name === name);
  }
  
  setLayerVisible(name, visible) {
    const layer = this.getLayer(name);
    if (layer) {
      layer.visible = visible;
    }
  }
  
  isLayerVisible(name) {
    const layer = this.getLayer(name);
    return layer ? layer.visible : false;
  }
  
  // Screen management
  showScreen(screenName, data = {}) {
    if (!this.activeScreens.has(screenName)) {
      this.activeScreens.add(screenName);
      this.startScreenTransition(screenName, 'enter', data);
      
      // Update layer visibility based on active screens
      this.updateLayerVisibility();
    }
  }
  
  hideScreen(screenName) {
    if (this.activeScreens.has(screenName)) {
      this.activeScreens.delete(screenName);
      this.startScreenTransition(screenName, 'exit');
      
      // Update layer visibility
      this.updateLayerVisibility();
    }
  }
  
  isScreenActive(screenName) {
    return this.activeScreens.has(screenName);
  }
  
  getActiveScreens() {
    return Array.from(this.activeScreens);
  }
  
  updateLayerVisibility() {
    // Reset all layers
    this.layers.forEach(layer => {
      layer.visible = layer.name === 'game' || layer.name === 'background';
    });
    
    // Show layers based on active screens
    if (this.activeScreens.has('hud') || window.gameState.isInGame()) {
      this.setLayerVisible('hud', true);
    }
    
    if (this.activeScreens.has('menu') || this.activeScreens.has('pause') || 
        this.activeScreens.has('gameover') || this.activeScreens.has('victory')) {
      this.setLayerVisible('menus', true);
    }
    
    if (this.notifications.length > 0) {
      this.setLayerVisible('notifications', true);
    }
  }
  
  // Screen transitions
  startScreenTransition(screenName, direction, data = {}) {
    const transitionKey = `${screenName}_${direction}`;
    const transition = {
      screen: screenName,
      direction: direction,
      startTime: Date.now(),
      duration: 300,
      data: data,
      progress: 0
    };
    
    this.screenTransitions.set(transitionKey, transition);
    
    // Call transition callbacks
    if (direction === 'enter' && window[screenName + 'Screen']) {
      const screen = window[screenName + 'Screen'];
      if (screen.onEnter) screen.onEnter(data);
    } else if (direction === 'exit' && window[screenName + 'Screen']) {
      const screen = window[screenName + 'Screen'];
      if (screen.onExit) screen.onExit();
    }
  }
  
  updateTransitions() {
    const now = Date.now();
    const completedTransitions = [];
    
    this.screenTransitions.forEach((transition, key) => {
      const elapsed = now - transition.startTime;
      transition.progress = Math.min(elapsed / transition.duration, 1);
      
      if (transition.progress >= 1) {
        completedTransitions.push(key);
      }
    });
    
    // Remove completed transitions
    completedTransitions.forEach(key => {
      this.screenTransitions.delete(key);
    });
  }
  
  // Notification system
  showNotification(message, color = '#fff', type = 'info') {
    const notification = {
      id: Date.now() + Math.random(),
      message: message,
      color: color,
      type: type,
      startTime: Date.now(),
      duration: this.notificationTimeout,
      y: this.notificationY,
      targetY: this.notificationY,
      alpha: 0,
      targetAlpha: 1
    };
    
    this.notifications.push(notification);
    
    // Limit number of notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.shift();
    }
    
    // Update notification positions
    this.updateNotificationPositions();
    
    return notification.id;
  }
  
  updateNotificationPositions() {
    const startY = this.notificationY;
    const spacing = 40;
    
    this.notifications.forEach((notification, index) => {
      notification.targetY = startY + (index * spacing);
    });
  }
  
  updateNotifications() {
    const now = Date.now();
    const expiredNotifications = [];
    
    this.notifications.forEach((notification, index) => {
      const elapsed = now - notification.startTime;
      const timeLeft = notification.duration - elapsed;
      
      // Update position with smooth interpolation
      notification.y += (notification.targetY - notification.y) * 0.1;
      
      // Update alpha based on lifetime
      if (timeLeft < 500) {
        notification.targetAlpha = (timeLeft / 500) * 0.8;
      } else if (elapsed < 200) {
        notification.targetAlpha = (elapsed / 200) * 0.8;
      } else {
        notification.targetAlpha = 0.8;
      }
      
      notification.alpha += (notification.targetAlpha - notification.alpha) * 0.1;
      
      // Mark for removal if expired
      if (elapsed >= notification.duration) {
        expiredNotifications.push(index);
      }
    });
    
    // Remove expired notifications
    expiredNotifications.reverse().forEach(index => {
      this.notifications.splice(index, 1);
    });
    
    // Update positions after removal
    if (expiredNotifications.length > 0) {
      this.updateNotificationPositions();
    }
  }
  
  // Input handling
  handleInput(inputManager) {
    // Handle input for active screens
    for (const screenName of this.activeScreens) {
      if (window[screenName + 'Screen'] && window[screenName + 'Screen'].handleInput) {
        window[screenName + 'Screen'].handleInput(inputManager);
      }
    }
  }
  
  // Update method
  update(dt) {
    // Update transitions
    this.updateTransitions();
    
    // Update notifications
    this.updateNotifications();
    
    // Update active screens
    for (const screenName of this.activeScreens) {
      if (window[screenName + 'Screen'] && window[screenName + 'Screen'].update) {
        window[screenName + 'Screen'].update(dt);
      }
    }
  }
  
  // Render method
  render(ctx) {
    // Render visible layers in order
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      
      this.renderLayer(ctx, layer);
    }
  }
  
  renderLayer(ctx, layer) {
    switch (layer.name) {
      case 'background':
        this.renderBackground(ctx);
        break;
      case 'hud':
        if (window.hud) window.hud.render(ctx);
        break;
      case 'notifications':
        this.renderNotifications(ctx);
        break;
      case 'menus':
        this.renderMenus(ctx);
        break;
      case 'overlay':
        this.renderOverlay(ctx);
        break;
    }
  }
  
  renderBackground(ctx) {
    // Render any background UI elements
    // Usually handled by the game renderer
  }
  
  renderNotifications(ctx) {
    const centerX = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
    
    this.notifications.forEach(notification => {
      ctx.save();
      
      // Set alpha
      ctx.globalAlpha = notification.alpha;
      
      // Draw notification background
      const padding = 20;
      const textMetrics = ctx.measureText(notification.message);
      const width = textMetrics.width + padding * 2;
      const height = 30;
      const x = centerX - width / 2;
      const y = notification.y - height / 2;
      
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(x, y, width, height);
      
      // Border
      ctx.strokeStyle = notification.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Text
      ctx.fillStyle = notification.color;
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(notification.message, centerX, notification.y);
      
      ctx.restore();
    });
  }
  
  renderMenus(ctx) {
    // Render active menu screens
    for (const screenName of this.activeScreens) {
      if (window[screenName + 'Screen'] && window[screenName + 'Screen'].render) {
        // Apply transition effects
        const transition = this.getScreenTransition(screenName);
        this.applyTransitionEffects(ctx, transition);
        
        window[screenName + 'Screen'].render(ctx);
        
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
  }
  
  renderOverlay(ctx) {
    // Render any overlay effects (like fade transitions)
    if (window.gameState.isTransitioning) {
      const progress = window.gameState.getTransitionProgress();
      
      // Fade effect
      ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * (1 - progress)})`;
      ctx.fillRect(0, 0, window.GAME_CONSTANTS.CANVAS_WIDTH, window.GAME_CONSTANTS.CANVAS_HEIGHT);
    }
  }
  
  getScreenTransition(screenName) {
    for (const transition of this.screenTransitions.values()) {
      if (transition.screen === screenName) {
        return transition;
      }
    }
    return null;
  }
  
  applyTransitionEffects(ctx, transition) {
    if (!transition) return;
    
    ctx.save();
    
    // Apply transition effects based on direction and progress
    switch (transition.direction) {
      case 'enter':
        // Fade in
        ctx.globalAlpha = transition.progress;
        // Scale in
        const scale = 0.9 + (0.1 * transition.progress);
        ctx.translate(window.GAME_CONSTANTS.CANVAS_WIDTH / 2, window.GAME_CONSTANTS.CANVAS_HEIGHT / 2);
        ctx.scale(scale, scale);
        ctx.translate(-window.GAME_CONSTANTS.CANVAS_WIDTH / 2, -window.GAME_CONSTANTS.CANVAS_HEIGHT / 2);
        break;
        
      case 'exit':
        // Fade out
        ctx.globalAlpha = 1 - transition.progress;
        // Scale out
        const scaleOut = 1 - (0.1 * transition.progress);
        ctx.translate(window.GAME_CONSTANTS.CANVAS_WIDTH / 2, window.GAME_CONSTANTS.CANVAS_HEIGHT / 2);
        ctx.scale(scaleOut, scaleOut);
        ctx.translate(-window.GAME_CONSTANTS.CANVAS_WIDTH / 2, -window.GAME_CONSTANTS.CANVAS_HEIGHT / 2);
        break;
    }
  }
  
  // Utility methods
  clearNotifications() {
    this.notifications = [];
  }
  
  clearScreens() {
    this.activeScreens.clear();
    this.screenTransitions.clear();
    this.updateLayerVisibility();
  }
  
  getDebugInfo() {
    return {
      activeScreens: Array.from(this.activeScreens),
      notifications: this.notifications.length,
      transitions: this.screenTransitions.size,
      layers: this.layers.map(layer => ({
        name: layer.name,
        visible: layer.visible
      }))
    };
  }
};

// Create global instance
window.uiSystem = new window.UISystem();