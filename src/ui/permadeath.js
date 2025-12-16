// Permadeath management system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/ui/permadeath.js',
  exports: ['PermadeathManager'],
  dependencies: ['GAME_CONSTANTS', 'gameState']
});

window.PermadeathManager = class PermadeathManager {
  constructor() {
    this.isPermadeathEnabled = true;
    this.attempts = [];
    this.currentRun = null;
    this.highScore = 0;
    this.totalDeaths = 0;
    
    // Permadeath statistics
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      averageRunTime: 0,
      bestRunTime: Infinity,
      totalFilesCollected: 0,
      bestRunFiles: 0
    };
    
    // Load saved data
    this.loadGameData();
  }
  
  // Run management
  startRun() {
    this.currentRun = {
      startTime: Date.now(),
      endTime: null,
      level: 1,
      filesCollected: 0,
      totalFilesCollected: 0,
      deaths: 0,
      score: 0,
      completionPercentage: 0,
      causeOfDeath: null,
      timeSpentPerLevel: {},
      powerupsCollected: [],
      enemiesAvoided: 0,
      detections: 0,
      successfulHacks: 0
    };
    
    this.stats.totalRuns++;
  }
  
  endRun(successful = false, causeOfDeath = null) {
    if (!this.currentRun) return;
    
    this.currentRun.endTime = Date.now();
    this.currentRun.successful = successful;
    
    if (!successful) {
      this.currentRun.causeOfDeath = causeOfDeath;
      this.totalDeaths++;
    } else {
      this.stats.successfulRuns++;
    }
    
    // Calculate final statistics
    this.calculateRunStatistics();
    
    // Update overall stats
    this.updateOverallStats();
    
    // Save run attempt
    this.attempts.push({ ...this.currentRun });
    
    // Limit attempts history
    if (this.attempts.length > 50) {
      this.attempts.shift();
    }
    
    // Save game data
    this.saveGameData();
    
    // Clear current run
    this.currentRun = null;
  }
  
  calculateRunStatistics() {
    if (!this.currentRun) return;
    
    const runTime = this.currentRun.endTime - this.currentRun.startTime;
    this.currentRun.runTime = runTime;
    
    // Calculate score based on multiple factors
    let score = 0;
    
    // Files collected (primary objective)
    score += this.currentRun.totalFilesCollected * 1000;
    
    // Time bonus (quicker is better)
    const timeBonus = Math.max(0, 10000 - Math.floor(runTime / 100));
    score += timeBonus;
    
    // Stealth bonus (fewer detections)
    const stealthBonus = Math.max(0, 5000 - (this.currentRun.detections * 500));
    score += stealthBonus;
    
    // Completion bonus
    if (this.currentRun.successful) {
      score += 10000;
      score += (6 - this.currentRun.level) * 2000; // Bonus for completing quickly
    }
    
    this.currentRun.score = score;
    
    // Update high score
    if (score > this.highScore) {
      this.highScore = score;
    }
    
    // Calculate completion percentage
    const totalPossibleFiles = window.GAME_CONSTANTS.FILES_PER_LEVEL * window.GAME_CONSTANTS.BUILDING_LEVELS;
    this.currentRun.completionPercentage = (this.currentRun.totalFilesCollected / totalPossibleFiles) * 100;
  }
  
  updateOverallStats() {
    if (!this.currentRun) return;
    
    // Update best run time
    if (this.currentRun.successful && this.currentRun.runTime < this.stats.bestRunTime) {
      this.stats.bestRunTime = this.currentRun.runTime;
    }
    
    // Update total files collected
    this.stats.totalFilesCollected += this.currentRun.totalFilesCollected;
    
    // Update best run files
    if (this.currentRun.totalFilesCollected > this.stats.bestRunFiles) {
      this.stats.bestRunFiles = this.currentRun.totalFilesCollected;
    }
    
    // Calculate average run time
    const totalRunTime = this.attempts.reduce((sum, attempt) => sum + (attempt.runTime || 0), 0);
    this.stats.averageRunTime = this.attempts.length > 0 ? totalRunTime / this.attempts.length : 0;
  }
  
  // Progress tracking during run
  updateLevel(level) {
    if (!this.currentRun) return;
    
    // Record time spent on previous level
    if (this.currentRun.level && this.currentRun.startTime) {
      const levelTime = Date.now() - (this.currentRun.lastLevelTime || this.currentRun.startTime);
      this.currentRun.timeSpentPerLevel[this.currentRun.level] = levelTime;
    }
    
    this.currentRun.level = level;
    this.currentRun.lastLevelTime = Date.now();
  }
  
  collectFile() {
    if (!this.currentRun) return;
    
    this.currentRun.filesCollected++;
    this.currentRun.totalFilesCollected++;
  }
  
  collectPowerup(powerupType) {
    if (!this.currentRun) return;
    
    this.currentRun.powerupsCollected.push({
      type: powerupType,
      timestamp: Date.now()
    });
  }
  
  recordDetection() {
    if (!this.currentRun) return;
    
    this.currentRun.detections++;
  }
  
  recordDeath(cause) {
    if (!this.currentRun) return;
    
    this.currentRun.deaths++;
    if (this.isPermadeathEnabled) {
      this.endRun(false, cause);
    }
  }
  
  // Permadeath settings
  enablePermadeath() {
    this.isPermadeathEnabled = true;
  }
  
  disablePermadeath() {
    this.isPermadeathEnabled = false;
  }
  
  togglePermadeath() {
    this.isPermadeathEnabled = !this.isPermadeathEnabled;
    return this.isPermadeathEnabled;
  }
  
  // Run history and statistics
  getRunHistory(limit = 10) {
    return this.attempts.slice(-limit).reverse();
  }
  
  getCurrentRun() {
    return this.currentRun ? { ...this.currentRun } : null;
  }
  
  getStatistics() {
    return {
      ...this.stats,
      highScore: this.highScore,
      totalDeaths: this.totalDeaths,
      successRate: this.stats.totalRuns > 0 ? (this.stats.successfulRuns / this.stats.totalRuns) * 100 : 0,
      isPermadeathEnabled: this.isPermadeathEnabled
    };
  }
  
  getFormattedRunTime(runTimeMs) {
    if (!runTimeMs) return '0:00';
    
    const totalSeconds = Math.floor(runTimeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  getDeathReasonText(cause) {
    const reasons = {
      'caught': 'Caught by Security',
      'trap': 'Triggered Trap',
      'timeout': 'Time Expired',
      'fell': 'Fell from Height',
      'explosion': 'Explosion',
      'surrender': 'Surrendered',
      'unknown': 'Unknown Cause'
    };
    
    return reasons[cause] || reasons.unknown;
  }
  
  // Save/Load system
  saveGameData() {
    if (typeof localStorage !== 'undefined') {
      try {
        const gameData = {
          highScore: this.highScore,
          totalDeaths: this.totalDeaths,
          stats: this.stats,
          attempts: this.attempts.slice(-20), // Save last 20 attempts
          isPermadeathEnabled: this.isPermadeathEnabled
        };
        
        localStorage.setItem('epsteinFilesGameData', JSON.stringify(gameData));
      } catch (error) {
        console.warn('Failed to save game data:', error.message);
      }
    }
  }
  
  loadGameData() {
    if (typeof localStorage !== 'undefined') {
      try {
        const savedData = localStorage.getItem('epsteinFilesGameData');
        if (savedData) {
          const gameData = JSON.parse(savedData);
          
          this.highScore = gameData.highScore || 0;
          this.totalDeaths = gameData.totalDeaths || 0;
          this.stats = { ...this.stats, ...gameData.stats };
          this.attempts = gameData.attempts || [];
          this.isPermadeathEnabled = gameData.isPermadeathEnabled !== false; // Default to true
          
          // Recalculate derived stats
          this.recalculateStatistics();
        }
      } catch (error) {
        console.warn('Failed to load game data:', error.message);
      }
    }
  }
  
  recalculateStatistics() {
    // Recalculate statistics from loaded data
    this.stats.totalRuns = this.attempts.length;
    this.stats.successfulRuns = this.attempts.filter(attempt => attempt.successful).length;
    
    if (this.attempts.length > 0) {
      const totalRunTime = this.attempts.reduce((sum, attempt) => sum + (attempt.runTime || 0), 0);
      this.stats.averageRunTime = totalRunTime / this.attempts.length;
    }
  }
  
  clearGameData() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('epsteinFilesGameData');
      } catch (error) {
        console.warn('Failed to clear game data:', error.message);
      }
    }
    
    // Reset all data
    this.highScore = 0;
    this.totalDeaths = 0;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      averageRunTime: 0,
      bestRunTime: Infinity,
      totalFilesCollected: 0,
      bestRunFiles: 0
    };
    this.attempts = [];
    this.currentRun = null;
  }
  
  // UI integration methods
  getRunSummary() {
    if (!this.currentRun) return null;
    
    const currentRunTime = Date.now() - this.currentRun.startTime;
    
    return {
      runTime: this.getFormattedRunTime(currentRunTime),
      level: this.currentRun.level,
      filesCollected: this.currentRun.totalFilesCollected,
      detections: this.currentRun.detections,
      estimatedScore: this.calculateEstimatedScore(currentRunTime)
    };
  }
  
  calculateEstimatedScore(currentRunTime) {
    if (!this.currentRun) return 0;
    
    let score = this.currentRun.totalFilesCollected * 1000;
    score += Math.max(0, 10000 - Math.floor(currentRunTime / 100));
    score += Math.max(0, 5000 - (this.currentRun.detections * 500));
    
    return score;
  }
  
  // Permadeath enforcement
  checkPermadeathCondition() {
    if (!this.isPermadeathEnabled || !this.currentRun) return false;
    
    // Check various permadeath conditions
    if (this.currentRun.deaths > 0) {
      return true;
    }
    
    // Add other permadeath conditions here if needed
    
    return false;
  }
  
  enforcePermadeath(cause = 'caught') {
    if (this.checkPermadeathCondition()) {
      this.recordDeath(cause);
      window.gameState.gameOver(cause);
      return true;
    }
    return false;
  }
};

// Create global instance
window.permadeathManager = new window.PermadeathManager();