// Trap door system with dual-trigger mechanics
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/trapdoor.js',
  exports: ['TrapDoor', 'TrapDoorSystem'],
  dependencies: ['PhysicsEngine', 'Constants']
});
// Requires both camera detection AND player presence to activate

(function(window) {
    'use strict';

    /**
     * TrapDoor - Dual-trigger stealth obstacle
     * Requires camera detection AND player presence to activate
     */
    class TrapDoor {
        constructor(x, y, width, height, config = {}) {
            // Position and dimensions
            this.x = x;
            this.y = y;
            this.width = width || 64;
            this.height = height || 64;
            
            // Configuration
            this.config = {
                armingDuration: config.armingDuration || 1000,    // ms to arm when both triggers active
                triggeredDuration: config.triggeredDuration || 3000, // ms door stays open
                resetCooldown: config.resetCooldown || 2000,      // ms before can re-arm
                cameraId: config.cameraId || null,                // specific camera to watch
                triggerZone: config.triggerZone || null,          // optional separate trigger zone
                ...config
            };
            
            // State machine
            this.state = 'INACTIVE';  // INACTIVE, ARMING, ARMED, TRIGGERED, COOLDOWN
            
            // Trigger states
            this.cameraDetected = false;
            this.playerInZone = false;
            
            // Timing
            this.stateTimer = 0;
            this.armingProgress = 0;
            
            // Visual feedback
            this.glowIntensity = 0;
            this.warningPulse = 0;
            
            // Trigger zone (defaults to trap door bounds)
            this.triggerX = this.config.triggerZone ? this.config.triggerZone.x : this.x;
            this.triggerY = this.config.triggerZone ? this.config.triggerZone.y : this.y;
            this.triggerWidth = this.config.triggerZone ? this.config.triggerZone.width : this.width;
            this.triggerHeight = this.config.triggerZone ? this.config.triggerZone.height : this.height;
            
            // Collision
            this.collider = {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height,
                type: 'TRAP_DOOR',
                solid: this.state !== 'TRIGGERED'  // Only solid when not triggered
            };
            
            // References
            this.player = null;
            this.camera = null;
            this.level = null;
        }

        initialize(player, cameras, level) {
            this.player = player;
            this.level = level;
            
            // Find specific camera if configured
            if (this.config.cameraId && cameras) {
                this.camera = cameras.find(c => c.id === this.config.cameraId);
            }
        }

        update(dt) {
            // Update collision state
            this.collider.solid = this.state !== 'TRIGGERED';
            
            // Check trigger conditions
            this.updateTriggerConditions();
            
            // State machine update
            this.updateState(dt);
            
            // Visual feedback updates
            this.updateVisuals(dt);
        }

        updateTriggerConditions() {
            // Check camera detection
            this.cameraDetected = false;
            if (this.camera) {
                this.cameraDetected = this.camera.isDetecting();
            }
            
            // Check player presence in trigger zone
            this.playerInZone = false;
            if (this.player && window.PhysicsEngine) {
                const playerCollider = this.player.getCollider();
                if (playerCollider) {
                    this.playerInZone = window.PhysicsEngine.checkAABB(
                        playerCollider,
                        {
                            x: this.triggerX,
                            y: this.triggerY,
                            width: this.triggerWidth,
                            height: this.triggerHeight
                        }
                    );
                }
            }
        }

        updateState(dt) {
            const previousState = this.state;
            
            switch (this.state) {
                case 'INACTIVE':
                    if (this.cameraDetected && this.playerInZone) {
                        this.state = 'ARMING';
                        this.stateTimer = 0;
                        this.armingProgress = 0;
                    }
                    break;
                    
                case 'ARMING':
                    this.stateTimer += dt;
                    this.armingProgress = Math.min(this.stateTimer / this.config.armingDuration, 1);
                    
                    if (this.stateTimer >= this.config.armingDuration) {
                        if (this.cameraDetected && this.playerInZone) {
                            this.state = 'ARMED';
                            this.stateTimer = 0;
                        } else {
                            this.state = 'INACTIVE';
                            this.armingProgress = 0;
                        }
                    } else if (!this.cameraDetected || !this.playerInZone) {
                        this.state = 'INACTIVE';
                        this.armingProgress = 0;
                    }
                    break;
                    
                case 'ARMED':
                    // Stay armed as long as both conditions are met
                    if (!this.cameraDetected || !this.playerInZone) {
                        this.state = 'INACTIVE';
                        this.armingProgress = 0;
                    }
                    break;
                    
                case 'TRIGGERED':
                    this.stateTimer += dt;
                    if (this.stateTimer >= this.config.triggeredDuration) {
                        this.state = 'COOLDOWN';
                        this.stateTimer = 0;
                    }
                    break;
                    
                case 'COOLDOWN':
                    this.stateTimer += dt;
                    if (this.stateTimer >= this.config.resetCooldown) {
                        this.state = 'INACTIVE';
                        this.stateTimer = 0;
                        this.armingProgress = 0;
                    }
                    break;
            }
            
            // Trigger door when armed
            if (this.state === 'ARMED' && this.stateTimer === 0) {
                this.trigger();
            }
        }

        updateVisuals(dt) {
            // Update glow intensity based on state
            switch (this.state) {
                case 'INACTIVE':
                    this.glowIntensity = Math.max(0, this.glowIntensity - dt * 0.002);
                    break;
                case 'ARMING':
                    this.glowIntensity = this.armingProgress * 0.5;
                    this.warningPulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
                    break;
                case 'ARMED':
                    this.glowIntensity = 1.0;
                    this.warningPulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
                    break;
                case 'TRIGGERED':
                    this.glowIntensity = Math.max(0, this.glowIntensity - dt * 0.001);
                    break;
                case 'COOLDOWN':
                    this.glowIntensity = 0;
                    break;
            }
        }

        trigger() {
            if (this.state === 'ARMED') {
                this.state = 'TRIGGERED';
                this.stateTimer = 0;
                
                // Visual and gameplay effects
                this.createTriggerEffects();
                
                // Apply consequences to player if still in range
                if (this.playerInZone) {
                    this.applyConsequences();
                }
            }
        }

        createTriggerEffects() {
            // Could add particle effects, sounds, etc. here
            if (window.Constants && window.Constants.DEBUG) {
                console.log('Trap door triggered at', this.x, this.y);
            }
        }

        applyConsequences() {
            // Default consequence: reset player position
            if (this.player && this.level) {
                const spawnPoint = this.level.getPlayerSpawn();
                if (spawnPoint) {
                    this.player.setPosition(spawnPoint.x, spawnPoint.y);
                    this.player.setStealthState('normal');
                }
            }
        }

        render(renderer) {
            if (!renderer) return;
            
            // Choose color based on state
            let color = '#666666';  // Default inactive color
            
            switch (this.state) {
                case 'INACTIVE':
                    color = '#444444';
                    break;
                case 'ARMING':
                    const pulse = Math.floor(this.warningPulse * 255);
                    color = `rgb(${128 + pulse/2}, 64, 64)`;
                    break;
                case 'ARMED':
                    color = '#ff4444';
                    break;
                case 'TRIGGERED':
                    color = '#222222';  // Dark when open
                    break;
                case 'COOLDOWN':
                    color = '#333333';
                    break;
            }
            
            // Draw trap door
            renderer.drawRect(this.x, this.y, this.width, this.height, color);
            
            // Draw glow effect when active
            if (this.glowIntensity > 0) {
                const glowColor = `rgba(255, 100, 100, ${this.glowIntensity * 0.3})`;
                renderer.drawRect(
                    this.x - 4, 
                    this.y - 4, 
                    this.width + 8, 
                    this.height + 8, 
                    glowColor
                );
            }
            
            // Draw trigger zone outline when arming
            if (this.state === 'ARMING' || this.state === 'ARMED') {
                renderer.strokeRect(
                    this.triggerX, 
                    this.triggerY, 
                    this.triggerWidth, 
                    this.triggerHeight, 
                    'rgba(255, 255, 0, 0.3)'
                );
            }
            
            // Debug visualization
            if (window.Constants && window.Constants.DEBUG) {
                renderer.strokeRect(this.x, this.y, this.width, this.height, 'cyan');
                
                // Draw state text
                renderer.drawText(
                    this.state,
                    this.x,
                    this.y - 10,
                    '12px Arial',
                    'white'
                );
                
                // Draw trigger indicators
                if (this.cameraDetected) {
                    renderer.drawText('CAM', this.x, this.y + 20, '10px Arial', 'yellow');
                }
                if (this.playerInZone) {
                    renderer.drawText('PLY', this.x, this.y + 35, '10px Arial', 'cyan');
                }
            }
        }

        getCollider() {
            return this.collider;
        }

        getState() {
            return this.state;
        }

        isTriggered() {
            return this.state === 'TRIGGERED';
        }

        isArmed() {
            return this.state === 'ARMED';
        }

        reset() {
            this.state = 'INACTIVE';
            this.stateTimer = 0;
            this.armingProgress = 0;
            this.cameraDetected = false;
            this.playerInZone = false;
            this.glowIntensity = 0;
            this.warningPulse = 0;
        }
    }

    /**
     * TrapDoorSystem - Manages multiple trap doors
     */
    class TrapDoorSystem {
        constructor() {
            this.trapDoors = [];
            this.player = null;
            this.cameras = [];
            this.level = null;
        }

        initialize(player, cameras, level) {
            this.player = player;
            this.cameras = cameras;
            this.level = level;
            
            // Initialize all trap doors
            this.trapDoors.forEach(trap => {
                trap.initialize(player, cameras, level);
            });
        }

        addTrapDoor(trapDoor) {
            if (trapDoor instanceof TrapDoor) {
                this.trapDoors.push(trapDoor);
                if (this.player && this.cameras && this.level) {
                    trapDoor.initialize(this.player, this.cameras, this.level);
                }
            }
        }

        createTrapDoor(x, y, width, height, config) {
            const trap = new TrapDoor(x, y, width, height, config);
            this.addTrapDoor(trap);
            return trap;
        }

        update(dt) {
            this.trapDoors.forEach(trap => trap.update(dt));
        }

        render(renderer) {
            this.trapDoors.forEach(trap => trap.render(renderer));
        }

        getTrapDoors() {
            return this.trapDoors;
        }

        getTrapDoorsInArea(x, y, width, height) {
            return this.trapDoors.filter(trap => {
                return window.PhysicsEngine && window.PhysicsEngine.checkAABB(
                    { x, y, width, height },
                    trap.getCollider()
                );
            });
        }

        resetAll() {
            this.trapDoors.forEach(trap => trap.reset());
        }

        clear() {
            this.trapDoors = [];
        }
    }

    // Export to global namespace
    window.TrapDoor = TrapDoor;
    window.TrapDoorSystem = TrapDoorSystem;

})(window);