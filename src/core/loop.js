// Game loop implementation with delta time for frame-independent updates.
// Provides start/stop control and global dt access for all systems.
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/core/loop.js',
  exports: ['GameLoop'],
  dependencies: []
});

window.GameLoop = {
    // Core timing state
    isRunning: false,
    animationId: null,
    lastTime: 0,
    
    // Delta time settings
    minFrameTime: 0.001,  // Minimum dt to prevent division by zero (1ms)
    maxFrameTime: 0.25,   // Maximum dt to prevent "spiral of death" (250ms)
    
    // Frame statistics
    frameCount: 0,
    fps: 0,
    fpsUpdateTime: 0,
    fpsUpdateInterval: 1.0, // Update FPS display every second
};

/**
 * Initialize the game loop system
 */
window.GameLoop.init = function() {
    // Set initial time
    this.lastTime = performance.now();
    
    // Make dt globally available
    window.dt = 0;
    
    console.log('GameLoop: Initialized');
};

/**
 * Main game loop function - called every frame via requestAnimationFrame
 */
window.GameLoop.gameLoop = function(currentTime) {
    if (!this.isRunning) {
        return;
    }
    
    // Calculate delta time in seconds
    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // Clamp delta time to prevent issues
    dt = Math.max(this.minFrameTime, Math.min(dt, this.maxFrameTime));
    
    // Store dt globally for all systems to use
    window.dt = dt;
    
    // Update input system for frame-independent input processing
    if (window.Input && typeof window.Input.update === 'function') {
        window.Input.update();
    }
    
    // Update game systems (will be implemented in future tasks)
    this.updateGame(dt);
    
    // Render the scene (will be implemented in future tasks)
    this.render();
    
    // Update frame statistics
    this.updateFrameStats(currentTime);
    
    // Request next frame
    this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
};

/**
 * Update all game systems with delta time
 * @param {number} dt - Delta time in seconds
 */
window.GameLoop.updateGame = function(dt) {
    // Update game systems
    if (window.updateGame && typeof window.updateGame === 'function') {
        window.updateGame(dt);
    }
};


/**
 * Render the current frame
 */
window.GameLoop.render = function() {
    // Get canvas and context
    if (!window.epsteinGame || !window.epsteinGame.canvas) {
        return;
    }
    
    const canvas = window.epsteinGame.canvas;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render game
    if (window.renderGame && typeof window.renderGame === 'function') {
        window.renderGame(ctx);
    }
    
    // Render UI
    if (window.renderUI && typeof window.renderUI === 'function') {
        window.renderUI(ctx);
    }
};


/**
 * Update frame statistics (FPS counter)
 * @param {number} currentTime - Current timestamp from performance.now()
 */
window.GameLoop.updateFrameStats = function(currentTime) {
    this.frameCount++;
    
    // Update FPS display every second
    if (currentTime - this.fpsUpdateTime >= this.fpsUpdateInterval * 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.fpsUpdateTime = currentTime;
        
        // Update global FPS access for debugging
        window.fps = this.fps;
    }
};

/**
 * Start the game loop
 */
window.GameLoop.start = function() {
    if (this.isRunning) {
        console.warn('GameLoop: Already running');
        return;
    }
    
    console.log('GameLoop: Starting game loop');
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsUpdateTime = this.lastTime;
    
    // Start the loop
    this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
};

/**
 * Stop the game loop
 */
window.GameLoop.stop = function() {
    if (!this.isRunning) {
        console.warn('GameLoop: Not running');
        return;
    }
    
    console.log('GameLoop: Stopping game loop');
    
    this.isRunning = false;
    
    // Cancel the animation frame
    if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
    }
    
    // Reset delta time
    window.dt = 0;
};

/**
 * Get current FPS
 * @returns {number} Current frames per second
 */
window.GameLoop.getFPS = function() {
    return this.fps;
};

/**
 * Check if the game loop is currently running
 * @returns {boolean} True if loop is active
 */
window.GameLoop.isActive = function() {
    return this.isRunning;
};

/**
 * Pause/unpause the game loop
 * @param {boolean} paused - Whether to pause the game
 */
window.GameLoop.setPaused = function(paused) {
    if (paused && this.isRunning) {
        this.stop();
        this.wasRunning = true;
    } else if (!paused && !this.isRunning && this.wasRunning) {
        this.start();
        this.wasRunning = false;
    }
};

/**
 * Reset the game loop state
 */
window.GameLoop.reset = function() {
    this.isRunning = false;
    this.frameCount = 0;
    this.fps = 0;
    this.fpsUpdateTime = 0;
    
    if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
    }
    
    console.log('GameLoop: Reset');
};

// Initialize the game loop system
window.GameLoop.init();
