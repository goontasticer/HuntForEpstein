// HUD display system for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/ui/hud.js',
  exports: ['HUD'],
  dependencies: ['GAME_CONSTANTS', 'uiSystem', 'gameState']
});

window.HUD = class HUD {
  constructor() {
    this.elements = {};
    this.animations = {};
    this.pulseTime = 0;
    this.warningFlash = 0;
    this.lastPowerupUpdate = 0;
    
    // HUD layout
    this.layout = {
      topLeft: { x: 20, y: 20 },
      topRight: { x: window.GAME_CONSTANTS.CANVAS_WIDTH - 220, y: 20 },
      bottomLeft: { x: 20, y: window.GAME_CONSTANTS.CANVAS_HEIGHT - 100 },
      centerTop: { x: window.GAME_CONSTANTS.CANVAS_WIDTH / 2, y: 100 }
    };
    
    // Initialize HUD elements
    this.initializeElements();
  }
  
  initializeElements() {
    // Player status section
    this.elements.playerStatus = {
      x: this.layout.topLeft.x,
      y: this.layout.topLeft.y,
      width: 200,
      height: 80
    };
    
    // File counter section
    this.elements.fileCounter = {
      x: this.layout.topLeft.x,
      y: this.layout.topLeft.y + 90,
      width: 200,
      height: 40
    };
    
    // Level indicator section
    this.elements.levelIndicator = {
      x: this.layout.topRight.x,
      y: this.layout.topRight.y,
      width: 200,
      height: 40
    };
    
    // Power-up status section
    this.elements.powerupStatus = {
      x: this.layout.bottomLeft.x,
      y: this.layout.bottomLeft.y,
      width: 300,
      height: 80
    };
    
    // Stealth system status section
    this.elements.stealthStatus = {
      x: this.layout.topRight.x,
      y: this.layout.topRight.y + 50,
      width: 200,
      height: 60
    };
    
    // Controls hint section
    this.elements.controlsHint = {
      x: this.layout.centerTop.x,
      y: this.layout.centerTop.y,
      width: 400,
      height: 30
    };
  }
  
  update(dt) {
    // Update animations
    this.pulseTime += dt;
    this.warningFlash += dt;
    
    // Update power-up status
    this.updatePowerupStatus(dt);
    
    // Update player status animations
    this.updatePlayerStatusAnimations(dt);
  }
  
  updatePowerupStatus(dt) {
    const now = Date.now();
    
    // Throttle updates
    if (now - this.lastPowerupUpdate < 100) return;
    this.lastPowerupUpdate = now;
    
    // Update power-up animations
    if (window.game && window.game.player && window.game.player.powerups) {
      window.game.player.powerups.forEach(powerup => {
        if (!powerup.animationOffset) {
          powerup.animationOffset = Math.random() * Math.PI * 2;
        }
      });
    }
  }
  
  updatePlayerStatusAnimations(dt) {
    // Update warning flash for detected state
    if (window.game && window.game.player && 
        window.game.player.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      this.warningFlash = (this.warningFlash + dt * 5) % 1;
    } else {
      this.warningFlash = 0;
    }
  }
  
  render(ctx) {
    // Only render HUD during gameplay
    if (!window.gameState.isInGame() && !window.gameState.isPaused()) return;
    
    // Save context
    ctx.save();
    
    // Render HUD elements
    this.renderPlayerStatus(ctx);
    this.renderFileCounter(ctx);
    this.renderLevelIndicator(ctx);
    this.renderStealthStatus(ctx);
    this.renderPowerupStatus(ctx);
    this.renderControlsHint(ctx);
    
    // Render pause indicator if paused
    if (window.gameState.isPaused()) {
      this.renderPauseIndicator(ctx);
    }
    
    // Restore context
    ctx.restore();
  }
  
  renderPlayerStatus(ctx) {
    const elem = this.elements.playerStatus;
    const colors = window.GAME_CONSTANTS.COLORS;
    
    if (!window.game || !window.game.player) return;
    
    const player = window.game.player;
    
    // Background panel
    ctx.fillStyle = colors.UI_BACKGROUND;
    ctx.fillRect(elem.x, elem.y, elem.width, elem.height);
    
    // Border
    ctx.strokeStyle = colors.UI_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(elem.x, elem.y, elem.width, elem.height);
    
    // Player state indicator
    const stateText = this.getPlayerStateText(player.state);
    const stateColor = this.getPlayerStateColor(player.state);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('STATUS', elem.x + 10, elem.y + 5);
    
    // State text with animation
    ctx.font = '16px monospace';
    
    if (player.state === window.GAME_CONSTANTS.PLAYER_STATES.DETECTED) {
      // Flashing red for detected
      const alpha = 0.5 + Math.sin(this.warningFlash * Math.PI * 2) * 0.5;
      ctx.fillStyle = `rgba(244, 67, 54, ${alpha})`;
    } else {
      ctx.fillStyle = stateColor;
    }
    
    ctx.fillText(stateText, elem.x + 10, elem.y + 25);
    
    // Stealth meter
    this.renderStealthMeter(ctx, elem.x + 10, elem.y + 50, elem.width - 20, 20, player.stealthMeter, player.maxStealth);
  }
  
  renderStealthMeter(ctx, x, y, width, height, current, max) {
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x, y, width, height);
    
    // Stealth meter fill
    const fillPercent = Math.max(0, Math.min(1, current / max));
    const fillWidth = width * fillPercent;
    
    // Color based on stealth level
    let meterColor;
    if (fillPercent > 0.6) {
      meterColor = '#2196F3'; // Blue - good stealth
    } else if (fillPercent > 0.3) {
      meterColor = '#FF9800'; // Orange - caution
    } else {
      meterColor = '#F44336'; // Red - danger
    }
    
    ctx.fillStyle = meterColor;
    ctx.fillRect(x, y, fillWidth, height);
    
    // Border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`STEALTH ${Math.round(fillPercent * 100)}%`, x + width / 2, y + height / 2);
  }
  
  renderFileCounter(ctx) {
    const elem = this.elements.fileCounter;
    const colors = window.GAME_CONSTANTS.COLORS;
    
    // Get file count from world or legacy system
    let filesCollected = 0;
    let filesTotal = window.GAME_CONSTANTS.FILES_PER_LEVEL;
    
    if (window.game && window.game.world) {
      const stats = window.game.world.getStats();
      const currentLevel = stats.currentLevel || 0;
      filesCollected = stats.filesPerLevel[currentLevel] || 0;
      filesTotal = window.GAME_CONSTANTS.FILES_PER_LEVEL;
    } else if (window.game) {
      filesCollected = window.game.filesCollected || 0;
    }
    
    // Background panel
    ctx.fillStyle = colors.UI_BACKGROUND;
    ctx.fillRect(elem.x, elem.y, elem.width, elem.height);
    
    // Border
    ctx.strokeStyle = colors.UI_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(elem.x, elem.y, elem.width, elem.height);
    
    // File icon (simple folder icon)
    ctx.fillStyle = '#FFC107';
    ctx.fillRect(elem.x + 10, elem.y + 8, 20, 16);
    ctx.fillRect(elem.x + 10, elem.y + 20, 24, 8);
    
    // Text
    ctx.fillStyle = '#FFC107';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`FILES: ${filesCollected}/${filesTotal}`, elem.x + 40, elem.y + elem.height / 2);
    
    // Progress bar
    const barX = elem.x + 10;
    const barY = elem.y + elem.height - 5;
    const barWidth = elem.width - 20;
    const barHeight = 3;
    const progress = filesCollected / filesTotal;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    ctx.fillStyle = '#FFC107';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
  }
  
  renderLevelIndicator(ctx) {
    const elem = this.elements.levelIndicator;
    const colors = window.GAME_CONSTANTS.COLORS;
    
    // Get level info
    let currentLevel = 1;
    let maxLevel = window.GAME_CONSTANTS.BUILDING_LEVELS;
    
    if (window.game && window.game.world) {
      currentLevel = window.game.world.currentLevel;
      maxLevel = window.game.world.maxLevel;
    } else if (window.game) {
      currentLevel = window.game.currentLevel;
    }
    
    // Background panel
    ctx.fillStyle = colors.UI_BACKGROUND;
    ctx.fillRect(elem.x, elem.y, elem.width, elem.height);
    
    // Border
    ctx.strokeStyle = colors.UI_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(elem.x, elem.y, elem.width, elem.height);
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`FLOOR ${currentLevel}/${maxLevel}`, elem.x + elem.width - 10, elem.y + elem.height / 2);
  }
  
  renderStealthStatus(ctx) {
    const elem = this.elements.stealthStatus;
    const colors = window.GAME_CONSTANTS.COLORS;
    
    if (!window.stealthSystem) return;
    
    const stealthSummary = window.stealthSystem.getDetectionSummary();
    const playerVisibility = window.stealthSystem.getPlayerVisibility();
    
    // Background panel
    ctx.fillStyle = colors.UI_BACKGROUND;
    ctx.fillRect(elem.x, elem.y, elem.width, elem.height);
    
    // Border
    ctx.strokeStyle = colors.UI_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(elem.x, elem.y, elem.width, elem.height);
    
    // Title
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('DETECTION', elem.x + 10, elem.y + 5);
    
    // Alert level bar
    const alertBarY = elem.y + 20;
    const alertBarHeight = 8;
    const alertPercent = stealthSummary.alertLevel / 100;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(elem.x + 10, alertBarY, elem.width - 20, alertBarHeight);
    
    const alertColor = stealthSummary.alertLevel > 80 ? '#F44336' :
                       stealthSummary.alertLevel > 50 ? '#FF9800' :
                       stealthSummary.alertLevel > 20 ? '#FFC107' : '#4CAF50';
    
    ctx.fillStyle = alertColor;
    ctx.fillRect(elem.x + 10, alertBarY, (elem.width - 20) * alertPercent, alertBarHeight);
    
    // Detection status
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    let statusText = 'CLEAR';
    let statusColor = '#4CAF50';
    
    if (stealthSummary.activeDetectors > 0) {
      if (stealthSummary.maxDetection > 0.8) {
        statusText = 'DETECTED!';
        statusColor = '#F44336';
      } else if (stealthSummary.maxDetection > 0.3) {
        statusText = 'SUSPICIOUS';
        statusColor = '#FF9800';
      } else {
        statusText = 'WATCHED';
        statusColor = '#FFC107';
      }
    }
    
    ctx.fillStyle = statusColor;
    ctx.fillText(statusText, elem.x + 10, alertBarY + 10);
    
    // Visibility multiplier (debug info)
    if (window.game && window.game.debug) {
      ctx.fillStyle = '#666';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`VIS: ${Math.round(playerVisibility * 100)}%`, elem.x + elem.width - 10, alertBarY + 10);
    }
    
    // Wall-hack indicator
    if (window.game && window.game.player && window.game.player.hasWallHack && window.game.player.hasWallHack()) {
      ctx.fillStyle = '#E91E63';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEURALINK ACTIVE', elem.x + elem.width / 2, elem.y + elem.height - 5);
    }
  }
  
  renderPowerupStatus(ctx) {
    const elem = this.elements.powerupStatus;
    const colors = window.GAME_CONSTANTS.COLORS;
    
    if (!window.game || !window.game.player || !window.game.player.powerups || 
        window.game.player.powerups.length === 0) {
      return; // No power-ups to display
    }
    
    const powerups = window.game.player.powerups;
    const itemWidth = 80;
    const itemHeight = 70;
    const spacing = 10;
    
    // Background panel
    const totalWidth = Math.min(elem.width, powerups.length * (itemWidth + spacing) - spacing);
    const panelWidth = totalWidth + 20;
    const panelX = elem.x;
    const panelY = elem.y;
    
    ctx.fillStyle = colors.UI_BACKGROUND;
    ctx.fillRect(panelX, panelY, panelWidth, elem.height);
    
    ctx.strokeStyle = colors.UI_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, elem.height);
    
    // Render each power-up
    powerups.forEach((powerup, index) => {
      const x = panelX + 10 + index * (itemWidth + spacing);
      const y = panelY + 5;
      
      this.renderPowerupItem(ctx, x, y, itemWidth, itemHeight, powerup);
    });
  }
  
  renderPowerupItem(ctx, x, y, width, height, powerup) {
    // Power-up background with pulse effect
    const pulse = 0.9 + Math.sin(this.pulseTime * 3 + (powerup.animationOffset || 0)) * 0.1;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x + (width * (1 - pulse)) / 2, y + (height * (1 - pulse)) / 2, 
                 width * pulse, height * pulse);
    
    // Power-up icon and color
    const powerupConfig = this.getPowerupConfig(powerup.type);
    ctx.fillStyle = powerupConfig.color;
    
    // Draw icon (simple shapes for now)
    switch (powerup.type) {
      case 'invisibility':
        // Ghost-like shape
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2 - 5, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + width / 2 - 8, y + height / 2 - 5, 16, 15);
        break;
        
      case 'neuralink':
        // Brain-like shape
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + width / 2 - 5, y + height / 2 - 3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + width / 2 + 5, y + height / 2 - 3, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'speed_boost':
        // Lightning bolt shape
        ctx.beginPath();
        ctx.moveTo(x + width / 2 - 8, y + 10);
        ctx.lineTo(x + width / 2 + 2, y + height / 2);
        ctx.lineTo(x + width / 2 - 2, y + height / 2);
        ctx.lineTo(x + width / 2 + 8, y + height - 10);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'stealth_boost':
        // Shield shape
        ctx.beginPath();
        ctx.moveTo(x + width / 2, y + 8);
        ctx.lineTo(x + width - 8, y + height / 2);
        ctx.lineTo(x + width / 2, y + height - 8);
        ctx.lineTo(x + 8, y + height / 2);
        ctx.closePath();
        ctx.fill();
        break;
        
      default:
        // Default circle
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, 12, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Duration bar
    const durationPercent = powerup.duration / window.GAME_CONSTANTS.POWERUP_DURATION;
    const barY = y + height - 8;
    const barHeight = 4;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x + 5, barY, width - 10, barHeight);
    
    ctx.fillStyle = powerupConfig.color;
    ctx.fillRect(x + 5, barY, (width - 10) * durationPercent, barHeight);
    
    // Border
    ctx.strokeStyle = powerupConfig.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  }
  
  getPowerupConfig(type) {
    const configs = {
      'invisibility': { color: '#9C27B0', name: 'INVIS' },
      'neuralink': { color: '#E91E63', name: 'NEURAL' },
      'speed_boost': { color: '#4CAF50', name: 'SPEED' },
      'stealth_boost': { color: '#2196F3', name: 'STEALTH' }
    };
    
    return configs[type] || { color: '#666', name: 'UNKNOWN' };
  }
  
  renderControlsHint(ctx) {
    const elem = this.elements.controlsHint;
    const colors = window.GAME_CONSTANTS.COLORS;
    
    // Only show controls hint for new players or when paused
    const showHint = window.gameState.isPaused() || 
                     (window.game && window.game.currentLevel === 1 && 
                      Date.now() < window.game.stateStartTime + 10000);
    
    if (!showHint) return;
    
    // Background
    ctx.fillStyle = colors.UI_BACKGROUND;
    const hintWidth = 400;
    const hintX = elem.x - hintWidth / 2;
    ctx.fillRect(hintX, elem.y, hintWidth, elem.height);
    
    // Border
    ctx.strokeStyle = colors.UI_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(hintX, elem.y, hintWidth, elem.height);
    
    // Text
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const hintText = window.gameState.isPaused() ? 
      'PAUSED - Press ESC to Resume | Arrow Keys: Move | Space: Interact | Shift: Sprint' :
      'Arrow Keys: Move | Space: Interact | Shift: Sprint | Hold Ctrl: Sneak | ESC: Pause';
    
    ctx.fillText(hintText, elem.x, elem.y + elem.height / 2);
  }
  
  renderPauseIndicator(ctx) {
    const centerX = window.GAME_CONSTANTS.CANVAS_WIDTH / 2;
    const centerY = window.GAME_CONSTANTS.CANVAS_HEIGHT / 2;
    
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, window.GAME_CONSTANTS.CANVAS_WIDTH, window.GAME_CONSTANTS.CANVAS_HEIGHT);
    
    // Pause text with pulse effect
    const pulse = 0.9 + Math.sin(this.pulseTime * 2) * 0.1;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(pulse, pulse);
    
    // Background panel
    const panelWidth = 300;
    const panelHeight = 150;
    ctx.fillStyle = window.GAME_CONSTANTS.COLORS.UI_BACKGROUND;
    ctx.fillRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
    
    ctx.strokeStyle = window.GAME_CONSTANTS.COLORS.UI_BORDER;
    ctx.lineWidth = 3;
    ctx.strokeRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', 0, -30);
    
    ctx.font = '16px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Press ESC to Resume', 0, 20);
    
    ctx.restore();
  }
  
  getPlayerStateText(state) {
    const stateTexts = {
      [window.GAME_CONSTANTS.PLAYER_STATES.NORMAL]: 'NORMAL',
      [window.GAME_CONSTANTS.PLAYER_STATES.HIDDEN]: 'HIDDEN',
      [window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS]: 'SUSPICIOUS',
      [window.GAME_CONSTANTS.PLAYER_STATES.DETECTED]: 'DETECTED!'
    };
    
    return stateTexts[state] || 'UNKNOWN';
  }
  
  getPlayerStateColor(state) {
    const stateColors = {
      [window.GAME_CONSTANTS.PLAYER_STATES.NORMAL]: '#4CAF50',
      [window.GAME_CONSTANTS.PLAYER_STATES.HIDDEN]: '#2196F3',
      [window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS]: '#FF9800',
      [window.GAME_CONSTANTS.PLAYER_STATES.DETECTED]: '#F44336'
    };
    
    return stateColors[state] || '#fff';
  }
  
  // Utility methods
  showNotification(message, type = 'info') {
    if (window.uiSystem) {
      const color = type === 'success' ? '#4CAF50' :
                   type === 'warning' ? '#FF9800' :
                   type === 'error' ? '#F44336' : '#fff';
      window.uiSystem.showNotification(message, color, type);
    }
  }
  
  updateLayout(canvasWidth, canvasHeight) {
    this.layout = {
      topLeft: { x: 20, y: 20 },
      topRight: { x: canvasWidth - 220, y: 20 },
      bottomLeft: { x: 20, y: canvasHeight - 100 },
      centerTop: { x: canvasWidth / 2, y: 100 }
    };
    
    this.initializeElements();
  }
};

// Create global instance
window.hud = new window.HUD();