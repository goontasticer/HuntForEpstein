// Stealth system integration for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/stealth-system.js',
  exports: ['StealthSystem'],
  dependencies: ['GAME_CONSTANTS', 'Vector2D']
});

window.StealthSystem = class StealthSystem {
  constructor() {
    this.detectionSources = [];
    this.stealthZones = [];
    this.alertLevel = 0; // 0-100, overall base alertness
    this.lastGlobalDetection = 0;
    this.detectionHistory = [];
    this.maxHistoryLength = 30;
    
    // Detection modifiers
    this.globalVisibilityMultiplier = 1.0;
    this.environmentalFactors = {
      lighting: 1.0,
      noise: 1.0,
      cover: 1.0
    };
    
    // Performance optimization
    this.lastUpdate = 0;
    this.updateInterval = 100; // Update every 100ms
  }
  
  initialize() {
    this.detectionSources = [];
    this.stealthZones = [];
    this.alertLevel = 0;
    this.detectionHistory = [];
    this.lastGlobalDetection = 0;
    
    // Register existing cameras as detection sources
    if (window.game && window.game.level && window.game.level.entities) {
      for (const entity of window.game.level.entities) {
        if (entity instanceof window.Camera) {
          this.addDetectionSource(entity);
        }
      }
    }
    
    console.log('Stealth system initialized');
  }
  
  addDetectionSource(source) {
    if (!this.detectionSources.includes(source)) {
      this.detectionSources.push(source);
      console.log(`Added detection source: ${source.constructor.name}`);
    }
  }
  
  removeDetectionSource(source) {
    const index = this.detectionSources.indexOf(source);
    if (index > -1) {
      this.detectionSources.splice(index, 1);
    }
  }
  
  addStealthZone(zone) {
    this.stealthZones.push(zone);
  }
  
  removeStealthZone(zone) {
    const index = this.stealthZones.indexOf(zone);
    if (index > -1) {
      this.stealthZones.splice(index, 1);
    }
  }
  
  update(dt) {
    const now = Date.now();
    
    // Throttle updates for performance
    if (now - this.lastUpdate < this.updateInterval) {
      return;
    }
    this.lastUpdate = now;
    
    if (!window.game || !window.game.player) return;
    
    const player = window.game.player;
    
    // Update environmental factors
    this.updateEnvironmentalFactors(player);
    
    // Check all detection sources
    this.updateDetectionSources(dt, player);
    
    // Check stealth zones
    this.updateStealthZones(player);
    
    // Update global alert level
    this.updateGlobalAlert(dt, player);
    
    // Update visual effects
    this.updateVisualEffects(player);
  }
  
  updateEnvironmentalFactors(player) {
    // Reset factors
    this.environmentalFactors = {
      lighting: 1.0,
      noise: 1.0,
      cover: 1.0
    };
    
    // Check player movement state
    if (player.isSprinting) {
      this.environmentalFactors.noise = 2.0;
    } else if (player.isMoving) {
      this.environmentalFactors.noise = 1.3;
    }
    
    // Check stealth zones
    for (const zone of this.stealthZones) {
      if (this.isPlayerInZone(player, zone)) {
        // Apply zone modifiers
        if (zone.modifiers) {
          if (zone.modifiers.lighting) {
            this.environmentalFactors.lighting *= zone.modifiers.lighting;
          }
          if (zone.modifiers.noise) {
            this.environmentalFactors.noise *= zone.modifiers.noise;
          }
          if (zone.modifiers.cover) {
            this.environmentalFactors.cover *= zone.modifiers.cover;
          }
        }
      }
    }
  }
  
  updateDetectionSources(dt, player) {
    let totalDetection = 0;
    let activeDetectors = 0;
    
    for (const source of this.detectionSources) {
      if (!source.updateDetection) continue;
      
      // Update individual source detection
      source.updateDetection(dt);
      
      // Accumulate detection levels
      if (source.detectionLevel > 0) {
        totalDetection += source.detectionLevel;
        activeDetectors++;
      }
    }
    
    // Average detection level
    const averageDetection = activeDetectors > 0 ? totalDetection / activeDetectors : 0;
    
    // Update detection history
    this.detectionHistory.push(averageDetection);
    if (this.detectionHistory.length > this.maxHistoryLength) {
      this.detectionHistory.shift();
    }
  }
  
  updateStealthZones(player) {
    for (const zone of this.stealthZones) {
      if (this.isPlayerInZone(player, zone)) {
        // Apply zone effects
        if (zone.onEnter && !zone.wasTriggered) {
          zone.onEnter(player);
        }
        zone.wasTriggered = true;
      } else {
        if (zone.onExit && zone.wasTriggered) {
          zone.onExit(player);
        }
        zone.wasTriggered = false;
      }
    }
  }
  
  updateGlobalAlert(dt, player) {
    // Calculate current detection from history
    const recentDetection = this.detectionHistory.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, this.detectionHistory.length);
    
    // Update alert level
    if (recentDetection > 0.5) {
      this.alertLevel = Math.min(100, this.alertLevel + dt * 20);
    } else if (recentDetection < 0.1) {
      this.alertLevel = Math.max(0, this.alertLevel - dt * 10);
    }
    
    // Trigger global alerts if needed
    if (this.alertLevel > 80 && this.lastGlobalDetection < Date.now() - 5000) {
      this.triggerGlobalAlert();
      this.lastGlobalDetection = Date.now();
    }
  }
  
  updateVisualEffects(player) {
    // Update renderer effects
    if (window.game && window.game.renderer) {
      const renderer = window.game.renderer;
      
      // Stealth effect based on player state
      let stealthIntensity = 0;
      if (player.state === window.GAME_CONSTANTS.PLAYER_STATES.HIDDEN) {
        stealthIntensity = 0.3;
      } else if (player.state === window.GAME_CONSTANTS.PLAYER_STATES.SUSPICIOUS) {
        stealthIntensity = 0.1;
      }
      renderer.setStealthEffect(stealthIntensity);
      
      // Wall-hack effect for Neuralink power-up
      if (player.hasWallHack && player.hasWallHack()) {
        renderer.setWallHackEffect(1.0);
      } else {
        renderer.setWallHackEffect(0);
      }
    }
  }
  
  isPlayerInZone(player, zone) {
    if (!zone.collider) return false;
    
    if (zone.collider instanceof window.AABB) {
      return zone.collider.contains(player.position);
    } else if (zone.collider instanceof window.Circle) {
      return zone.collider.contains(player.position);
    }
    
    return false;
  }
  
  triggerGlobalAlert() {
    console.log('GLOBAL ALERT TRIGGERED!');
    
    // Make all cameras more alert
    for (const source of this.detectionSources) {
      if (source instanceof window.Camera) {
        source.suspicionLevel = 100;
        source.state = window.GAME_CONSTANTS.ENEMY_STATES.INVESTIGATING;
        source.targetGlowIntensity = 0.8;
      }
    }
    
    // Visual feedback
    if (window.game && window.game.renderer) {
      window.game.renderer.triggerScreenShake(0.5, 1.0);
    }
    
    // Audio feedback (if available)
    if (window.game && window.game.audio) {
      // Play alert sound
    }
  }
  
  getDetectionSummary() {
    const activeDetectors = this.detectionSources.filter(source => source.detectionLevel > 0);
    const maxDetection = Math.max(...this.detectionSources.map(source => source.detectionLevel || 0));
    const averageDetection = this.detectionHistory.length > 0 ? 
      this.detectionHistory.reduce((a, b) => a + b, 0) / this.detectionHistory.length : 0;
    
    return {
      totalSources: this.detectionSources.length,
      activeDetectors: activeDetectors.length,
      maxDetection: maxDetection,
      averageDetection: averageDetection,
      alertLevel: this.alertLevel,
      environmentalFactors: { ...this.environmentalFactors }
    };
  }
  
  getPlayerVisibility() {
    if (!window.game || !window.game.player) return 1.0;
    
    const player = window.game.player;
    let visibility = player.getVisibilityMultiplier ? player.getVisibilityMultiplier() : 1.0;
    
    // Apply environmental factors
    visibility *= this.environmentalFactors.lighting;
    visibility *= this.environmentalFactors.noise;
    visibility *= this.environmentalFactors.cover;
    
    // Apply global alert modifier
    if (this.alertLevel > 50) {
      visibility *= 1.0 + (this.alertLevel - 50) / 100; // Up to 50% increase at max alert
    }
    
    return Math.max(0.05, Math.min(3.0, visibility)); // Clamp between 5% and 300%
  }
  
  createStealthZone(x, y, width, height, modifiers = {}) {
    const zone = {
      collider: new window.AABB(x, y, width, height),
      modifiers: {
        lighting: modifiers.lighting || 1.0,
        noise: modifiers.noise || 1.0,
        cover: modifiers.cover || 1.0
      },
      onEnter: modifiers.onEnter || null,
      onExit: modifiers.onExit || null,
      wasTriggered: false
    };
    
    this.addStealthZone(zone);
    return zone;
  }
  
  // Utility methods for creating common stealth zones
  createShadowZone(x, y, width, height) {
    return this.createStealthZone(x, y, width, height, {
      lighting: 0.5,
      cover: 0.8
    });
  }
  
  createHideSpot(x, y, radius) {
    const zone = {
      collider: new window.Circle(x, y, radius),
      modifiers: {
        lighting: 0.3,
        noise: 0.5,
        cover: 0.2
      },
      onEnter: (player) => {
        player.enterHidden();
      },
      onExit: (player) => {
        if (!window.Input.isActionDown('sneak')) {
          player.exitHidden();
        }
      },
      wasTriggered: false
    };
    
    this.addStealthZone(zone);
    return zone;
  }
  
  createNoiseZone(x, y, radius, noiseMultiplier) {
    return this.createStealthZone(x - radius, y - radius, radius * 2, radius * 2, {
      noise: noiseMultiplier
    });
  }
  
  reset() {
    this.alertLevel = 0;
    this.detectionHistory = [];
    this.lastGlobalDetection = 0;
    this.environmentalFactors = {
      lighting: 1.0,
      noise: 1.0,
      cover: 1.0
    };
    
    // Reset all detection sources
    for (const source of this.detectionSources) {
      if (source.reset) {
        source.reset();
      }
    }
    
    console.log('Stealth system reset');
  }
};

// Create global instance
window.stealthSystem = new window.StealthSystem();