// Game state management for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/ui/gamestate.js',
  exports: ['GameStateManager'],
  dependencies: ['GAME_CONSTANTS']
});

window.GameStateManager = class GameStateManager {
  constructor() {
    this.currentState = window.GAME_CONSTANTS.GAME_STATES.MENU;
    this.previousState = null;
    this.stateHistory = [];
    this.stateStartTime = Date.now();
    this.stateData = {};
    
    // Transition settings
    this.transitionDuration = 300; // milliseconds
    this.isTransitioning = false;
    this.transitionStart = 0;
    this.transitionFrom = null;
    this.transitionTo = null;
    
    // Event callbacks
    this.stateCallbacks = {};
    this.transitionCallbacks = {};
  }
  
  // State management
  getState() {
    return this.currentState;
  }
  
  getPreviousState() {
    return this.previousState;
  }
  
  isState(state) {
    return this.currentState === state;
  }
  
  isInGame() {
    return this.currentState === window.GAME_CONSTANTS.GAME_STATES.PLAYING;
  }
  
  isPaused() {
    return this.currentState === window.GAME_CONSTANTS.GAME_STATES.PAUSED;
  }
  
  canPause() {
    return this.currentState === window.GAME_CONSTANTS.GAME_STATES.PLAYING;
  }
  
  // State transitions
  setState(newState, data = {}) {
    if (this.currentState === newState) return false;
    
    // Don't allow certain transitions during gameplay
    if (this.isInGame() && !this.isValidGameTransition(newState)) {
      console.warn(`Invalid state transition from ${this.currentState} to ${newState}`);
      return false;
    }
    
    // Store state history
    this.stateHistory.push(this.currentState);
    if (this.stateHistory.length > 10) {
      this.stateHistory.shift();
    }
    
    // Start transition
    this.startTransition(this.currentState, newState, data);
    return true;
  }
  
  startTransition(fromState, toState, data) {
    this.isTransitioning = true;
    this.transitionStart = Date.now();
    this.transitionFrom = fromState;
    this.transitionTo = toState;
    
    // Call exit callback for current state
    if (this.stateCallbacks[fromState] && this.stateCallbacks[fromState].onExit) {
      this.stateCallbacks[fromState].onExit(data);
    }
    
    // Update state data
    this.stateData[toState] = { ...this.stateData[toState], ...data };
    
    // Store previous state
    this.previousState = this.currentState;
    this.currentState = toState;
    this.stateStartTime = Date.now();
    
    // Call enter callback for new state
    if (this.stateCallbacks[toState] && this.stateCallbacks[toState].onEnter) {
      this.stateCallbacks[toState].onEnter(data);
    }
    
    // Call transition callbacks
    if (this.transitionCallbacks[fromState + '_' + toState]) {
      this.transitionCallbacks[fromState + '_' + toState](data);
    }
    
    console.log(`State transition: ${fromState} -> ${toState}`);
  }
  
  isValidGameTransition(newState) {
    const validTransitions = [
      window.GAME_CONSTANTS.GAME_STATES.PAUSED,
      window.GAME_CONSTANTS.GAME_STATES.GAME_OVER,
      window.GAME_CONSTANTS.GAME_STATES.VICTORY
    ];
    
    return validTransitions.includes(newState);
  }
  
  // Game flow control
  startGame() {
    this.setState(window.GAME_CONSTANTS.GAME_STATES.PLAYING, {
      level: 1,
      score: 0,
      lives: 1
    });
  }
  
  pauseGame() {
    if (this.canPause()) {
      this.setState(window.GAME_CONSTANTS.GAME_STATES.PAUSED);
    }
  }
  
  resumeGame() {
    if (this.isPaused()) {
      this.setState(window.GAME_CONSTANTS.GAME_STATES.PLAYING);
    }
  }
  
  gameOver(reason = 'caught') {
    this.setState(window.GAME_CONSTANTS.GAME_STATES.GAME_OVER, {
      reason: reason,
      finalScore: this.getFinalScore(),
      timePlayed: this.getTimeInState(window.GAME_CONSTANTS.GAME_STATES.PLAYING)
    });
  }
  
  victory() {
    // End current run successfully if permadeath manager is available
    if (window.permadeathManager) {
      window.permadeathManager.endRun(true);
    }
    
    this.setState(window.GAME_CONSTANTS.GAME_STATES.VICTORY, {
      finalScore: this.getFinalScore(),
      timePlayed: this.getTimeInState(window.GAME_CONSTANTS.GAME_STATES.PLAYING),
      allFilesCollected: true
    });
  }
  
  returnToMenu() {
    this.setState(window.GAME_CONSTANTS.GAME_STATES.MENU);
  }
  
  restart() {
    this.setState(window.GAME_CONSTANTS.GAME_STATES.PLAYING, {
      level: 1,
      score: 0,
      lives: 1,
      restart: true
    });
  }
  
  // State data management
  setStateData(key, value) {
    this.stateData[this.currentState] = this.stateData[this.currentState] || {};
    this.stateData[this.currentState][key] = value;
  }
  
  getStateData(key, defaultValue = null) {
    const stateData = this.stateData[this.currentState] || {};
    return stateData[key] !== undefined ? stateData[key] : defaultValue;
  }
  
  getAllStateData() {
    return { ...this.stateData };
  }
  
  clearStateData(state = null) {
    if (state) {
      delete this.stateData[state];
    } else {
      this.stateData = {};
    }
  }
  
  // Time tracking
  getTimeInCurrentState() {
    return Date.now() - this.stateStartTime;
  }
  
  getTimeInState(state) {
    // This would need more sophisticated tracking for multiple visits
    // For now, return current state time if matching
    if (this.currentState === state) {
      return this.getTimeInCurrentState();
    }
    return 0;
  }
  
  getFormattedTimeInCurrentState() {
    const timeMs = this.getTimeInCurrentState();
    const seconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  // Game statistics
  getFinalScore() {
    // Calculate score based on files collected, time, stealth, etc.
    const baseScore = this.getStateData('filesCollected', 0) * 1000;
    const timeBonus = Math.max(0, 10000 - Math.floor(this.getTimeInState(window.GAME_CONSTANTS.GAME_STATES.PLAYING) / 100));
    const stealthBonus = this.getStateData('stealthBonus', 0);
    
    return baseScore + timeBonus + stealthBonus;
  }
  
  // Update method for transitions
  update(dt) {
    if (this.isTransitioning) {
      const elapsed = Date.now() - this.transitionStart;
      if (elapsed >= this.transitionDuration) {
        this.isTransitioning = false;
        this.transitionFrom = null;
        this.transitionTo = null;
      }
    }
  }
  
  // Callback system
  onStateEnter(state, callback) {
    if (!this.stateCallbacks[state]) {
      this.stateCallbacks[state] = {};
    }
    this.stateCallbacks[state].onEnter = callback;
  }
  
  onStateExit(state, callback) {
    if (!this.stateCallbacks[state]) {
      this.stateCallbacks[state] = {};
    }
    this.stateCallbacks[state].onExit = callback;
  }
  
  onTransition(fromState, toState, callback) {
    this.transitionCallbacks[fromState + '_' + toState] = callback;
  }
  
  // Utility methods
  reset() {
    this.currentState = window.GAME_CONSTANTS.GAME_STATES.MENU;
    this.previousState = null;
    this.stateHistory = [];
    this.stateStartTime = Date.now();
    this.stateData = {};
    this.isTransitioning = false;
    this.transitionStart = 0;
    this.transitionFrom = null;
    this.transitionTo = null;
  }
  
  getDebugInfo() {
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      timeInCurrentState: this.getTimeInCurrentState(),
      isTransitioning: this.isTransitioning,
      stateHistory: [...this.stateHistory],
      stateData: { ...this.stateData }
    };
  }
};

// Create global instance
window.gameState = new window.GameStateManager();