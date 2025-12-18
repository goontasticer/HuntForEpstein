// FILE_MANIFEST: game.js

/**
 * PRESIDENT PEDO: The Hunt For The Epstein Files
 * A dark platformer adventure through hidden data centers
 */

// Game Configuration
const Game = {
    width: 1024,
    height: 768,
    state: 'MENU', // MENU, PLAYING, PAUSED, GAMEOVER
    currentLevel: 1,
    totalLevels: 5,
    score: 0,
    lives: 3,
    hearts: 5, // Ammo for subweapons
    time: 400, // Timer in seconds
    difficulty: 'NORMAL'
};

// Canvas Context
let canvas, ctx;

// The Investigator
const Investigator = {
    x: 200,
    y: 602,
    width: 32,
    height: 48,
    velocityX: 0,
    velocityY: 0,
    
    // Movement stats
    walkSpeed: 120,
    jumpPower: -400,
    gravity: 1200,
    fallSpeed: 500,
    
    // Combat
    whipExtended: false,
    whipTimer: 0,
    whipLength: 80,
    facing: 1, // 1 for right, -1 for left
    attacking: false,
    attackCooldown: 0,
    
    // Subweapons
    currentSubweapon: 'none', // none, laptop, drive, server, firewall
    subweaponLevel: 1,
    
    // State
    isGrounded: true, // Start grounded!
    isJumping: false,
    isStairs: false,
    stairsDirection: 0,
    health: 16, // 16 hearts health bar
    maxHealth: 16,
    invulnerable: 0,
    knockbackX: 0,
    knockbackY: 0,
    
    // Animation
    animationTime: 0,
    currentAnimation: 'idle',
    frame: 0
};

// Camera System
const Camera = {
    x: 0,
    y: 0,
    width: Game.width,
    height: Game.height,
    followSpeed: 0.1,
    
    update(targetX, targetY) {
        const idealX = targetX - this.width / 2;
        const idealY = targetY - this.height / 2;
        
        this.x += (idealX - this.x) * this.followSpeed;
        this.y += (idealY - this.y) * this.followSpeed;
        
        // Camera bounds
        this.x = Math.max(0, Math.min(DataCenter.width - this.width, this.x));
        this.y = Math.max(0, Math.min(DataCenter.height - this.height, this.y));

    },
    
    apply(entity) {
        return {
            x: entity.x - this.x,
            y: entity.y - this.y
        };
    }
};

// Input System
const Input = {
    keys: {},
    
    init() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            e.preventDefault();
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            e.preventDefault();
        });
    },
    
    isPressed(key) {
        return this.keys[key] || false;
    },
    
    justPressed(key) {
        return this.keys[key] && !this.previousKeys?.[key];
    },
    
    updatePrevious() {
        this.previousKeys = { ...this.keys };
    }
};

// Data Center Level System
const DataCenter = {
    currentRoom: 0,
    rooms: [],
    width: 2048,
    height: 768,
    
    // Level elements
    platforms: [],
    stairs: [],
    enemies: [],
    servers: [],
    files: [],
    doors: [],
    breakableWalls: [],
    bottomlessPits: [],
    
    init(level) {
        this.platforms = [];
        this.stairs = [];
        this.enemies = [];
        this.servers = [];
        this.files = [];
        this.doors = [];
        this.breakableWalls = [];
        this.bottomlessPits = [];
        
        this.generateLevel(level);
    },
    
    generateLevel(levelNum) {
        // Level 1: Entry Floor
        if (levelNum === 1) {
            this.width = 2048;
            this.height = 768;
            
            // Floor platforms
            this.platforms.push(
                { x: 0, y: 650, width: 2048, height: 118, type: 'concrete' },
                { x: 400, y: 550, width: 200, height: 20, type: 'metal' },
                { x: 700, y: 450, width: 150, height: 20, type: 'metal' },
                { x: 1000, y: 500, width: 300, height: 20, type: 'metal' },
                { x: 1400, y: 400, width: 200, height: 20, type: 'metal' }
            );
            
            // Walls
            this.platforms.push(
                { x: -50, y: 0, width: 50, height: 768, type: 'wall' },
                { x: 2048, y: 0, width: 50, height: 768, type: 'wall' }
            );
            
            // Stairs
            this.stairs.push(
                { x: 600, y: 550, width: 32, height: 100, direction: 'up' },
                { x: 850, y: 450, width: 32, height: 100, direction: 'down' },
                { x: 1300, y: 500, width: 32, height: 150, direction: 'up' }
            );
            
            // Servers (replace candles)
            this.servers.push(
                { x: 300, y: 600, width: 32, height: 40, active: true, item: 'smallHeart', type: 'database' },
                { x: 500, y: 500, width: 32, height: 40, active: true, item: 'whipUpgrade', type: 'server' },
                { x: 750, y: 400, width: 32, height: 40, active: true, item: 'laptop', type: 'mainframe' },
                { x: 950, y: 450, width: 32, height: 40, active: true, item: 'drive', type: 'database' },
                { x: 1100, y: 450, width: 32, height: 40, active: true, item: 'smallHeart', type: 'server' },
                { x: 1350, y: 350, width: 32, height: 40, active: true, item: 'server', type: 'mainframe' },
                { x: 1600, y: 350, width: 32, height: 40, active: true, item: 'largeHeart', type: 'database' }
            );
            
            // Enemies
            this.enemies.push(
                // Security guards
                { x: 400, y: 600, width: 32, height: 48, type: 'guard', health: 2, maxHealth: 2, speed: 30 },
                { x: 800, y: 400, width: 32, height: 48, type: 'guard', health: 2, maxHealth: 2, speed: 30 },
                { x: 1200, y: 450, width: 32, height: 48, type: 'guard', health: 2, maxHealth: 2, speed: 30 },
                
                // Security drones
                { x: 600, y: 300, width: 24, height: 24, type: 'drone', health: 1, maxHealth: 1, speed: 100, amplitude: 50 },
                { x: 1000, y: 250, width: 24, height: 24, type: 'drone', health: 1, maxHealth: 1, speed: 100, amplitude: 50 },
                { x: 1500, y: 200, width: 24, height: 24, type: 'drone', health: 1, maxHealth: 1, speed: 100, amplitude: 50 },
                
                // Elite security
                { x: 500, y: 600, width: 32, height: 48, type: 'elite', health: 3, maxHealth: 3, speed: 50, throwCooldown: 0 },
                { x: 900, y: 400, width: 32, height: 48, type: 'elite', health: 3, maxHealth: 3, speed: 50, throwCooldown: 0 }
            );
            
            // Files to collect (add 5th hidden file)
            this.files.push(
                { x: 350, y: 300, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 750, y: 250, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1150, y: 300, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1550, y: 200, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1800, y: 150, width: 20, height: 20, collected: false, type: 'epstein', hidden: true }
            );

        }
        
        // Level 2: Server Rooms
        else if (levelNum === 2) {
            this.width = 2560;
            this.height = 768;
            
            this.platforms.push(
                { x: 0, y: 650, width: 2560, height: 118, type: 'concrete' },
                { x: 300, y: 550, width: 150, height: 20, type: 'metal' },
                { x: 550, y: 450, width: 200, height: 20, type: 'metal' },
                { x: 900, y: 500, width: 180, height: 20, type: 'metal' },
                { x: 1200, y: 400, width: 250, height: 20, type: 'metal' },
                { x: 1600, y: 350, width: 200, height: 20, type: 'metal' },
                { x: 2000, y: 450, width: 180, height: 20, type: 'metal' }
            );
            
            this.platforms.push(
                { x: -50, y: 0, width: 50, height: 768, type: 'wall' },
                { x: 2560, y: 0, width: 50, height: 768, type: 'wall' }
            );
            
            this.servers.push(
                { x: 200, y: 600, width: 32, height: 40, active: true, item: 'smallHeart', type: 'database' },
                { x: 450, y: 500, width: 32, height: 40, active: true, item: 'laptop', type: 'mainframe' },
                { x: 650, y: 400, width: 32, height: 40, active: true, item: 'drive', type: 'server' },
                { x: 850, y: 450, width: 32, height: 40, active: true, item: 'smallHeart', type: 'database' },
                { x: 1100, y: 350, width: 32, height: 40, active: true, item: 'server', type: 'mainframe' },
                { x: 1350, y: 300, width: 32, height: 40, active: true, item: 'firewall', type: 'security' }
            );
            
            this.enemies.push(
                { x: 300, y: 600, width: 32, height: 48, type: 'guard', health: 3, maxHealth: 3, speed: 40 },
                { x: 600, y: 450, width: 32, height: 48, type: 'elite', health: 4, maxHealth: 4, speed: 60 },
                { x: 900, y: 400, width: 32, height: 48, type: 'guard', health: 3, maxHealth: 3, speed: 40 },
                { x: 1200, y: 450, width: 32, height: 48, type: 'elite', health: 4, maxHealth: 4, speed: 60 },
                { x: 1500, y: 300, width: 32, height: 48, type: 'guard', health: 3, maxHealth: 3, speed: 40 }
            );
            
            this.files.push(
                { x: 400, y: 250, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 800, y: 200, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1300, y: 250, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1800, y: 200, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 2200, y: 350, width: 20, height: 20, collected: false, type: 'epstein' }
            );
        }
        
        // Level 3: Underground Bunkers
        else if (levelNum === 3) {
            this.width = 2048;
            this.height = 896;
            
            this.platforms.push(
                { x: 0, y: 778, width: 2048, height: 118, type: 'concrete' },
                { x: 200, y: 650, width: 120, height: 20, type: 'metal' },
                { x: 400, y: 550, width: 180, height: 20, type: 'metal' },
                { x: 700, y: 480, width: 150, height: 20, type: 'metal' },
                { x: 1000, y: 550, width: 200, height: 20, type: 'metal' },
                { x: 1400, y: 650, width: 160, height: 20, type: 'metal' },
                { x: 1700, y: 450, width: 120, height: 20, type: 'metal' }
            );
            
            this.platforms.push(
                { x: -50, y: 0, width: 50, height: 896, type: 'wall' },
                { x: 2048, y: 0, width: 50, height: 896, type: 'wall' }
            );
            
            this.servers.push(
                { x: 150, y: 600, width: 32, height: 40, active: true, item: 'largeHeart', type: 'mainframe' },
                { x: 350, y: 500, width: 32, height: 40, active: true, item: 'drive', type: 'database' },
                { x: 550, y: 400, width: 32, height: 40, active: true, item: 'firewall', type: 'security' },
                { x: 800, y: 350, width: 32, height: 40, active: true, item: 'laptop', type: 'server' },
                { x: 1100, y: 450, width: 32, height: 40, active: true, item: 'smallHeart', type: 'database' },
                { x: 1500, y: 550, width: 32, height: 40, active: true, item: 'server', type: 'mainframe' },
                { x: 1800, y: 350, width: 32, height: 40, active: true, item: 'whipUpgrade', type: 'security' }
            );
            
            this.enemies.push(
                { x: 300, y: 650, width: 32, height: 48, type: 'elite', health: 4, maxHealth: 4, speed: 50 },
                { x: 600, y: 480, width: 32, height: 48, type: 'guard', health: 2, maxHealth: 2, speed: 30 },
                { x: 900, y: 550, width: 32, height: 48, type: 'elite', health: 4, maxHealth: 4, speed: 50 },
                { x: 1200, y: 450, width: 32, height: 48, type: 'guard', health: 2, maxHealth: 2, speed: 30 },
                { x: 1500, y: 650, width: 32, height: 48, type: 'elite', health: 4, maxHealth: 4, speed: 50 }
            );
            
            this.files.push(
                { x: 250, y: 350, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 600, y: 250, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 950, y: 300, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1400, y: 350, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1700, y: 300, width: 20, height: 20, collected: false, type: 'epstein', hidden: true }
            );

            
            // Bottomless pits
            this.bottomlessPits.push(
                { x: 500, y: 896, width: 100, height: 100 },
                { x: 1300, y: 896, width: 120, height: 100 }
            );
        }
        
        // Level 4: Private Island
        else if (levelNum === 4) {
            this.width = 2560;
            this.height = 768;
            
            this.platforms.push(
                { x: 0, y: 650, width: 2560, height: 118, type: 'sand' },
                { x: 250, y: 550, width: 180, height: 20, type: 'wood' },
                { x: 550, y: 450, width: 200, height: 20, type: 'wood' },
                { x: 850, y: 500, width: 160, height: 20, type: 'wood' },
                { x: 1100, y: 400, width: 220, height: 20, type: 'wood' },
                { x: 1400, y: 350, width: 180, height: 20, type: 'wood' },
                { x: 1700, y: 450, width: 200, height: 20, type: 'wood' },
                { x: 2000, y: 500, width: 160, height: 20, type: 'wood' }
            );
            
            this.platforms.push(
                { x: -50, y: 0, width: 50, height: 768, type: 'wall' },
                { x: 2560, y: 0, width: 50, height: 768, type: 'wall' }
            );
            
            this.servers.push(
                { x: 200, y: 600, width: 32, height: 40, active: true, item: 'smallHeart', type: 'database' },
                { x: 450, y: 500, width: 32, height: 40, active: true, item: 'laptop', type: 'mainframe' },
                { x: 700, y: 400, width: 32, height: 40, active: true, item: 'drive', type: 'server' },
                { x: 950, y: 450, width: 32, height: 40, active: true, item: 'firewall', type: 'security' },
                { x: 1250, y: 350, width: 32, height: 40, active: true, item: 'server', type: 'mainframe' },
                { x: 1550, y: 300, width: 32, height: 40, active: true, item: 'smallHeart', type: 'database' },
                { x: 1850, y: 400, width: 32, height: 40, active: true, item: 'whipUpgrade', type: 'server' },
                { x: 2150, y: 450, width: 32, height: 40, active: true, item: 'largeHeart', type: 'database' }
            );
            
            this.enemies.push(
                { x: 300, y: 600, width: 32, height: 48, type: 'elite', health: 5, maxHealth: 5, speed: 60 },
                { x: 600, y: 450, width: 32, height: 48, type: 'guard', health: 3, maxHealth: 3, speed: 40 },
                { x: 900, y: 400, width: 32, height: 48, type: 'elite', health: 5, maxHealth: 5, speed: 60 },
                { x: 1200, y: 450, width: 32, height: 48, type: 'guard', health: 3, maxHealth: 3, speed: 40 },
                { x: 1500, y: 350, width: 32, height: 48, type: 'elite', health: 5, maxHealth: 5, speed: 60 },
                { x: 1800, y: 400, width: 32, height: 48, type: 'guard', health: 3, maxHealth: 3, speed: 40 }
            );
            
            this.files.push(
                { x: 350, y: 250, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 750, y: 200, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1150, y: 250, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1650, y: 200, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 2050, y: 350, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 450, y: 150, width: 20, height: 20, collected: false, type: 'epstein', hidden: true }
            );

        }
        
        // Level 5: Final Confrontation
        else if (levelNum === 5) {
            this.width = 2048;
            this.height = 768;
            
            this.platforms.push(
                { x: 0, y: 650, width: 2048, height: 118, type: 'marble' },
                { x: 300, y: 550, width: 200, height: 20, type: 'marble' },
                { x: 600, y: 450, width: 250, height: 20, type: 'marble' },
                { x: 950, y: 500, width: 200, height: 20, type: 'marble' },
                { x: 1300, y: 400, width: 300, height: 20, type: 'marble' },
                { x: 1700, y: 350, width: 200, height: 20, type: 'marble' }
            );
            
            this.platforms.push(
                { x: -50, y: 0, width: 50, height: 768, type: 'wall' },
                { x: 2048, y: 0, width: 50, height: 768, type: 'wall' }
            );
            
            this.servers.push(
                { x: 400, y: 600, width: 32, height: 40, active: true, item: 'largeHeart', type: 'mainframe' },
                { x: 800, y: 500, width: 32, height: 40, active: true, item: 'firewall', type: 'security' },
                { x: 1200, y: 450, width: 32, height: 40, active: true, item: 'drive', type: 'server' },
                { x: 1600, y: 350, width: 32, height: 40, active: true, item: 'laptop', type: 'database' }
            );
            
            this.enemies.push(
                // Boss area with many guards
                { x: 400, y: 600, width: 32, height: 48, type: 'elite', health: 6, maxHealth: 6, speed: 70 },
                { x: 700, y: 450, width: 32, height: 48, type: 'guard', health: 4, maxHealth: 4, speed: 50 },
                { x: 1000, y: 500, width: 32, height: 48, type: 'elite', health: 6, maxHealth: 6, speed: 70 },
                { x: 1400, y: 400, width: 32, height: 48, type: 'guard', health: 4, maxHealth: 4, speed: 50 },
                { x: 1800, y: 350, width: 32, height: 48, type: 'elite', health: 6, maxHealth: 6, speed: 70 }
            );
            
            this.files.push(
                { x: 450, y: 250, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 850, y: 200, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1250, y: 250, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1650, y: 200, width: 20, height: 20, collected: false, type: 'epstein' },
                { x: 1850, y: 150, width: 20, height: 20, collected: false, type: 'epstein', hidden: true },
                // Final secret file
                { x: 1920, y: 250, width: 24, height: 24, collected: false, type: 'blackbook' }
            );

        }
    }
};

// Investigator's Laptop (Whip)
const Laptop = {
    extending: false,
    extendingTimer: 0,
    segments: [],
    
    attack(x, y, facing) {
        if (Investigator.attackCooldown <= 0 && !Investigator.whipExtended) {
            Investigator.attacking = true;
            Investigator.whipExtended = true;
            Investigator.whipTimer = 0.3;
            Investigator.attackCooldown = 0.4;
            
            // Create laptop segments
            this.segments = [];
            for (let i = 0; i < 4; i++) {
                this.segments.push({
                    x: x + (facing > 0 ? (i + 1) * 20 : -(i + 1) * 20),
                    y: y + 16,
                    width: 16,
                    height: 4
                });
            }
        }
    },
    
    update(dt) {
        if (Investigator.whipTimer > 0) {
            Investigator.whipTimer -= dt;
            
            // Update laptop segments position
            for (let i = 0; i < this.segments.length; i++) {
                this.segments[i].x = Investigator.x + Investigator.width/2 + (Investigator.facing > 0 ? (i + 1) * 20 : -(i + 1) * 20);
                this.segments[i].y = Investigator.y + 16;
            }
            
            if (Investigator.whipTimer <= 0) {
                Investigator.whipExtended = false;
                Investigator.attacking = false;
                this.segments = [];
            }
        }
        
        if (Investigator.attackCooldown > 0) {
            Investigator.attackCooldown -= dt;
        }
    },
    
    checkCollisions() {
        for (let segment of this.segments) {
            // Check enemy collisions
            for (let enemy of DataCenter.enemies) {
                if (segment.x < enemy.x + enemy.width &&
                    segment.x + segment.width > enemy.x &&
                    segment.y < enemy.y + enemy.height &&
                    segment.y + segment.height > enemy.y) {
                    
                    enemy.health--;
                    enemy.knockbackX = Investigator.facing * 100;
                    enemy.knockbackY = -50;
                    enemy.invulnerable = 0.5;
                    
                    if (enemy.health <= 0) {
                        const index = DataCenter.enemies.indexOf(enemy);
                        DataCenter.enemies.splice(index, 1);
                        const points = enemy.type === 'guard' ? 100 : enemy.type === 'elite' ? 200 : 300;
                        Game.score += points;
                    }
                    
                    return; // Only hit once per attack
                }
            }
            
            // Check server collisions
            for (let server of DataCenter.servers) {
                if (server.active) {
                    if (segment.x < server.x + server.width &&
                        segment.x + segment.width > server.x &&
                        segment.y < server.y + server.height &&
                        segment.y + segment.height > server.y) {
                        
                        server.active = false;
                        spawnServerItem(server);
                        break;
                    }
                }
            }
        }
    }
};

// Subweapon System
const Subweapons = {
    projectiles: [],
    
    use(type, x, y, facing) {
        if (Game.hearts <= 0) return;
        
        const heartCost = { laptop: 1, drive: 2, server: 3, firewall: 2 }[type] || 0;
        if (Game.hearts < heartCost) return;
        
        Game.hearts -= heartCost;
        
        switch(type) {
            case 'laptop':
                this.projectiles.push({
                    x: x + Investigator.width/2,
                    y: y + Investigator.height/2,
                    velocityX: facing * 400,
                    velocityY: 0,
                    width: 20,
                    height: 8,
                    type: 'laptop',
                    damage: 1
                });
                break;
                
            case 'drive':
                this.projectiles.push({
                    x: x + Investigator.width/2 + (facing * 20),
                    y: y + Investigator.height,
                    velocityX: facing * 150,
                    velocityY: -200,
                    width: 16,
                    height: 16,
                    type: 'drive',
                    damage: 2,
                    exploding: false,
                    explosionTimer: 0
                });
                break;
                
            case 'server':
                this.projectiles.push({
                    x: x + Investigator.width/2,
                    y: y + Investigator.height/2,
                    velocityX: facing * 200,
                    velocityY: 0,
                    width: 24,
                    height: 24,
                    type: 'server',
                    damage: 2,
                    boomerang: true,
                    returnTimer: 0
                });
                break;
        }
    },
    
    update(dt) {
        this.projectiles = this.projectiles.filter(proj => {
            proj.x += proj.velocityX * dt;
            proj.y += proj.velocityY * dt;
            
            if (proj.type === 'drive') {
                proj.velocityY += 800 * dt; // Gravity
                if (proj.y >= 620 && !proj.exploding) {
                    proj.exploding = true;
                    proj.velocityY = 0;
                    proj.velocityX = 0;
                }
                if (proj.exploding) {
                    proj.explosionTimer += dt;
                    if (proj.explosionTimer > 1) return false;
                }
            }
            
            if (proj.type === 'server' && proj.boomerang) {
                proj.returnTimer += dt;
                if (proj.returnTimer > 1.5) {
                    // Return to player
                    const dx = Investigator.x + Investigator.width/2 - proj.x;
                    proj.velocityX = (dx > 0 ? 300 : -300);
                }
            }
            
            // Remove if off screen
            return proj.x > -50 && proj.x < DataCenter.width + 50 && proj.y > -50 && proj.y < DataCenter.height + 50;
        });
    }
};

function spawnServerItem(server) {
    const x = server.x + server.width/2;
    const y = server.y + server.height/2;
    
    switch(server.item) {
        case 'smallHeart':
            Game.hearts = Math.min(99, Game.hearts + 1);
            break;
        case 'largeHeart':
            Game.hearts = Math.min(99, Game.hearts + 5);
            break;
        case 'whipUpgrade':
            // Laptop would level up in full implementation
            break;
        case 'laptop':
        case 'drive':
        case 'server':
        case 'firewall':
            Investigator.currentSubweapon = server.item;
            break;
    }
}

// Update Functions
function updateInvestigator(dt) {
    Input.updatePrevious();
    
    // Handle stairs
    let onStairs = false;
    for (let stair of DataCenter.stairs) {
        if (Investigator.x + Investigator.width > stair.x &&
            Investigator.x < stair.x + stair.width &&
            Investigator.y + Investigator.height > stair.y &&
            Investigator.y < stair.y + stair.height) {
            onStairs = true;
            Investigator.isStairs = true;
            
            // Stair movement
            if (Input.isPressed('ArrowUp')) {
                Investigator.velocityY = -80;
                Investigator.velocityX = 0;
            } else if (Input.isPressed('ArrowDown')) {
                Investigator.velocityY = 80;
                Investigator.velocityX = 0;
            } else {
                Investigator.velocityY = 0;
            }
            
            if (stair.direction === 'down' && Input.justPressed('ArrowUp')) {
                Investigator.x -= 32; // Exit stairs up
                Investigator.isStairs = false;
            } else if (stair.direction === 'up' && Input.justPressed('ArrowDown')) {
                Investigator.x += 32; // Exit stairs down
                Investigator.isStairs = false;
            }

            
            break;
        }
    }
    
    if (!onStairs) {
        Investigator.isStairs = false;
        
        // Normal movement
        if (Input.isPressed('ArrowLeft')) {
            Investigator.velocityX = -Investigator.walkSpeed;
            Investigator.facing = -1;
            Investigator.currentAnimation = 'walk';
        } else if (Input.isPressed('ArrowRight')) {
            Investigator.velocityX = Investigator.walkSpeed;
            Investigator.facing = 1;
            Investigator.currentAnimation = 'walk';
        } else {
            Investigator.velocityX *= 0.8;
            if (Math.abs(Investigator.velocityX) < 10) {
                Investigator.velocityX = 0;
                Investigator.currentAnimation = 'idle';
            }
        }
        
        // Jump (can't change direction mid-air)
        if (Input.justPressed('Space') && Investigator.isGrounded) {
            Investigator.velocityY = Investigator.jumpPower;
            Investigator.isJumping = true;
            Investigator.isGrounded = false; // Important: Set immediately!
        }
        
        // Apply gravity
        Investigator.velocityY += Investigator.gravity * dt;
        Investigator.velocityY = Math.min(Investigator.velocityY, Investigator.fallSpeed);
    }
    
    // Apply knockback
    if (Investigator.knockbackX !== 0) {
        Investigator.velocityX = Investigator.knockbackX;
        Investigator.knockbackX *= 0.9;
        if (Math.abs(Investigator.knockbackX) < 1) Investigator.knockbackX = 0;
    }
    if (Investigator.knockbackY !== 0) {
        Investigator.velocityY = Investigator.knockbackY;
        Investigator.knockbackY *= 0.9;
        if (Math.abs(Investigator.knockbackY) < 1) Investigator.knockbackY = 0;
    }
    
    // Update position
    Investigator.x += Investigator.velocityX * dt;
    Investigator.y += Investigator.velocityY * dt;
    
    // Update invulnerability
    if (Investigator.invulnerable > 0) {
        Investigator.invulnerable -= dt;
    }
    
    // Update animation
    Investigator.animationTime += dt;
}

function checkCollisions() {
    Investigator.isGrounded = false;
    
    // Platform collisions
    for (let platform of DataCenter.platforms) {
        if (Investigator.x < platform.x + platform.width &&
            Investigator.x + Investigator.width > platform.x &&
            Investigator.y < platform.y + platform.height &&
            Investigator.y + Investigator.height > platform.y) {
            
            if (!Investigator.isStairs) {
                // Landing on top
                if (Investigator.velocityY >= 0 && Investigator.y + Investigator.height > platform.y) {
                    Investigator.y = platform.y - Investigator.height;
                    Investigator.velocityY = 0;
                    Investigator.isGrounded = true;
                    Investigator.isJumping = false;
                }
            }
        }
    }
    
    // File collection
    for (let file of DataCenter.files) {
        if (!file.collected &&
            Investigator.x < file.x + file.width &&
            Investigator.x + Investigator.width > file.x &&
            Investigator.y < file.y + file.height &&
            Investigator.y + Investigator.height > file.y) {
            
            file.collected = true;
            Game.score += file.type === 'blackbook' ? 1000 : 500;
            
            // Check level completion
            const allFilesCollected = DataCenter.files.every(f => f.collected);
            if (allFilesCollected) {
                if (Game.currentLevel >= Game.totalLevels) {
                    Game.state = 'VICTORY';
                } else {
                    Game.currentLevel++;
                    DataCenter.init(Game.currentLevel);
                    Investigator.x = 200;
                    Investigator.y = 602;
                    Investigator.health = Investigator.maxHealth;
                }
            }
        }
    }
    
    // Bottomless pit collision
    for (let pit of DataCenter.bottomlessPits) {
        if (Investigator.x < pit.x + pit.width &&
            Investigator.x + Investigator.width > pit.x &&
            Investigator.y < pit.y &&
            Investigator.y + Investigator.height > pit.y - pit.height) {
            takeDamage(99); // Instant death
        }
    }
}

function updateEnemies(dt) {
    for (let enemy of DataCenter.enemies) {
        enemy.animationTime = (enemy.animationTime || 0) + dt;
        
        // Apply knockback
        if (enemy.knockbackX) {
            enemy.velocityX = enemy.knockbackX;
            enemy.knockbackX *= 0.9;
            if (Math.abs(enemy.knockbackX) < 1) enemy.knockbackX = 0;
        }
        
        // Enemy AI based on type
        switch(enemy.type) {
            case 'guard':
                const guardDx = Investigator.x - enemy.x;
                if (Math.abs(guardDx) > 50) {
                    enemy.velocityX = (guardDx > 0 ? enemy.speed : -enemy.speed);
                } else {
                    enemy.velocityX = 0;
                }
                break;
                
            case 'drone':
                enemy.x += enemy.speed * (enemy.x < Investigator.x ? 1 : -1) * dt;
                enemy.y += Math.sin(enemy.animationTime * 3) * enemy.amplitude * dt;
                break;
                
            case 'elite':
                enemy.x += enemy.speed * (enemy.x < Investigator.x ? 1 : -1) * dt;
                enemy.throwCooldown -= dt;
                
                const eliteDist = Math.abs(Investigator.x - enemy.x);
                if (eliteDist < 300 && enemy.throwCooldown <= 0) {
                    // Throw object
                    Subweapons.projectiles.push({
                        x: enemy.x + enemy.width/2,
                        y: enemy.y + enemy.height/2,
                        velocityX: (Investigator.x > enemy.x ? 200 : -200),
                        velocityY: -100,
                        width: 12,
                        height: 8,
                        type: 'drive',
                        damage: 1,
                        enemyProjectile: true
                    });
                    enemy.throwCooldown = 2;
                }
                break;
        }
        
        // Update position
        if (!enemy.knockbackX) {
            enemy.x += enemy.velocityX * dt;
            enemy.y += enemy.velocityY * dt;
        }
        
        // Update invulnerability
        if (enemy.invulnerable > 0) {
            enemy.invulnerable -= dt;
        }
        
        // Check collision with player
        const dx = Investigator.x - enemy.x;
        const dy = Investigator.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 40 && Investigator.invulnerable <= 0) {
            takeDamage(1);
            Investigator.knockbackX = (dx > 0 ? 150 : -150);
            Investigator.knockbackY = -100;
        }
    }
}

function updateProjectiles(dt) {
    Subweapons.update(dt);
    
    // Check projectile collisions
    for (let proj of Subweapons.projectiles) {
        // Enemy projectiles vs player
        if (proj.enemyProjectile && Investigator.invulnerable <= 0) {
            if (proj.x < Investigator.x + Investigator.width &&
                proj.x + proj.width > Investigator.x &&
                proj.y < Investigator.y + Investigator.height &&
                proj.y + proj.height > Investigator.y) {
                takeDamage(1);
                const index = Subweapons.projectiles.indexOf(proj);
                Subweapons.projectiles.splice(index, 1);
            }
        }
        
        // Player projectiles vs enemies
        if (!proj.enemyProjectile) {
            for (let enemy of DataCenter.enemies) {
                if (enemy.invulnerable <= 0 &&
                    proj.x < enemy.x + enemy.width &&
                    proj.x + proj.width > enemy.x &&
                    proj.y < enemy.y + enemy.height &&
                    proj.y + proj.height > enemy.y) {
                    
                    enemy.health -= proj.damage;
                    enemy.knockbackX = (proj.x < enemy.x ? -50 : 50);
                    enemy.knockbackY = -30;
                    enemy.invulnerable = 0.5;
                    
                    if (proj.type !== 'drive' || !proj.exploding) {
                        const index = Subweapons.projectiles.indexOf(proj);
                        Subweapons.projectiles.splice(index, 1);
                    }
                    
                    if (enemy.health <= 0) {
                        const enemyIndex = DataCenter.enemies.indexOf(enemy);
                        DataCenter.enemies.splice(enemyIndex, 1);
                        const points = enemy.type === 'guard' ? 100 : enemy.type === 'elite' ? 200 : 300;
                        Game.score += points;
                    }
                    
                    break;
                }
            }
        }
    }
}

function takeDamage(amount) {
    Investigator.health -= amount;
    Investigator.invulnerable = 1.5;
    
    if (Investigator.health <= 0) {
        Game.lives--;
        if (Game.lives <= 0) {
            Game.state = 'GAMEOVER';
        } else {
            // Respawn
            Investigator.x = 200;
            Investigator.y = 602;
            Investigator.health = Investigator.maxHealth;
            Investigator.invulnerable = 3;
        }
    }
}

// Input Handling
function handleInput() {
    // Laptop attack
    if (Input.justPressed('KeyZ')) {
        Laptop.attack(Investigator.x, Investigator.y, Investigator.facing);
    }
    
    // Subweapon
    if (Input.justPressed('KeyX') && Investigator.currentSubweapon !== 'none') {
        Subweapons.use(Investigator.currentSubweapon, Investigator.x, Investigator.y, Investigator.facing);
    }
}

// Game Update
function updateGame(dt) {
    // Update timer
    if (Game.time > 0) {
        Game.time -= dt;
        if (Game.time <= 0) {
            Game.time = 0;
            takeDamage(99); // Time's up - instant death
        }
    }
    
    handleInput();
    updateInvestigator(dt);
    checkCollisions();
    updateEnemies(dt);
    updateProjectiles(dt);
    Laptop.update(dt);
    Laptop.checkCollisions();
    Camera.update(Investigator.x + Investigator.width/2, Investigator.y + Investigator.height/2);
}

// Rendering
function renderInvestigator() {
    const screenPos = Camera.apply(Investigator);
    
    ctx.save();
    
    // Flashing when invulnerable
    if (Investigator.invulnerable > 0 && Math.floor(Investigator.invulnerable * 10) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // Investigator body
    ctx.fillStyle = '#2C3E50'; // Dark suit
    ctx.fillRect(screenPos.x, screenPos.y + 16, Investigator.width, Investigator.height - 16);
    
    // Head
    ctx.fillStyle = '#FDBCB4'; // Skin tone
    ctx.fillRect(screenPos.x + 8, screenPos.y, 16, 16);
    
    // Hair
    ctx.fillStyle = '#4B3621'; // Dark hair
    ctx.fillRect(screenPos.x + 6, screenPos.y, 20, 8);
    
    // Laptop (whip)
    if (Investigator.whipExtended) {
        for (let segment of Laptop.segments) {
            const segmentPos = Camera.apply(segment);
            ctx.fillStyle = '#34495E'; // Laptop gray
            ctx.fillRect(segmentPos.x, segmentPos.y, segment.width, segment.height);
        }
    }
    
    ctx.restore();
}

function renderDataCenter() {
    // Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, Game.height);
    if (Game.currentLevel <= 2) {
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(1, '#0a0a1e');
    } else if (Game.currentLevel <= 4) {
        bgGradient.addColorStop(0, '#2a2a3e');
        bgGradient.addColorStop(1, '#1a1a2e');
    } else {
        bgGradient.addColorStop(0, '#3a3a4e');
        bgGradient.addColorStop(1, '#2a2a3e');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, Game.width, Game.height);
    
    // Platforms
    for (let platform of DataCenter.platforms) {
        const screenPos = Camera.apply(platform);
        
        let color;
        switch(platform.type) {
            case 'concrete': color = '#696969'; break;
            case 'metal': color = '#708090'; break;
            case 'wood': color = '#8B4513'; break;
            case 'sand': color = '#F4A460'; break;
            case 'marble': color = '#F0F8FF'; break;
            default: color = '#4a4a4a';
        }
        
        const gradient = ctx.createLinearGradient(0, screenPos.y, 0, screenPos.y + platform.height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#2a2a2a');
        ctx.fillStyle = gradient;
        ctx.fillRect(screenPos.x, screenPos.y, platform.width, platform.height);
        
        // Platform edge highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenPos.x, screenPos.y, platform.width, platform.height);
    }
    
    // Servers
    for (let server of DataCenter.servers) {
        const screenPos = Camera.apply(server);
        
        if (server.active) {
            // Server rack
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(screenPos.x, screenPos.y, server.width, server.height);
            
            // LED lights
            ctx.fillStyle = '#00FF00';
            for (let i = 0; i < 3; i++) {
                const blink = Math.sin(Date.now() * 0.005 + i) > 0;
                ctx.fillRect(screenPos.x + 4 + i * 8, screenPos.y + 4, 4, 4);
            }
            
            // Glow when active
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fillRect(screenPos.x - 5, screenPos.y - 5, server.width + 10, server.height + 10);
        } else {
            // Deactivated server
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(screenPos.x, screenPos.y, server.width, server.height);
        }
    }
    
    // Files to collect
    for (let file of DataCenter.files) {
        if (!file.collected) {
            const screenPos = Camera.apply(file);
            const pulse = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
            
            // File icon
            if (file.hidden) {
                // Hidden file - barely visible
                ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                ctx.fillRect(screenPos.x, screenPos.y, file.width, file.height);
                
                // Faint outline only
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenPos.x, screenPos.y, file.width, file.height);
            } else if (file.type === 'blackbook') {
                ctx.fillStyle = '#000000';
                ctx.fillRect(screenPos.x, screenPos.y, file.width, file.height);
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(screenPos.x + 4, screenPos.y + 4, file.width - 8, file.height - 8);
            } else {
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(screenPos.x, screenPos.y, file.width, file.height);
                
                // File label
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '8px monospace';
                ctx.fillText('EPI', screenPos.x + 2, screenPos.y + file.height - 2);
            }
            
            // Glow effect
            const glowColor = file.hidden ? 'rgba(255, 215, 0, 0.1)' : 
                           file.type === 'blackbook' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
            ctx.fillStyle = glowColor;
            ctx.fillRect(screenPos.x - 10, screenPos.y - 10, file.width + 20, file.height + 20);
        }
    }

    
    // Bottomless pits
    for (let pit of DataCenter.bottomlessPits) {
        const screenPos = Camera.apply(pit);
        ctx.fillStyle = '#000000';
        ctx.fillRect(screenPos.x, screenPos.y - pit.height, pit.width, pit.height);
        
        // Danger lines
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(screenPos.x, screenPos.y - pit.height, pit.width, pit.height);
        ctx.setLineDash([]);
    }
}

function renderEnemies() {
    for (let enemy of DataCenter.enemies) {
        const screenPos = Camera.apply(enemy);
        
        // Flashing when invulnerable
        if (enemy.invulnerable > 0 && Math.floor(enemy.invulnerable * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        switch(enemy.type) {
            case 'guard':
                // Security guard
                ctx.fillStyle = '#1a1a1a'; // Black uniform
                ctx.fillRect(screenPos.x, screenPos.y, enemy.width, enemy.height - 16);
                ctx.fillStyle = '#2C3E50'; // Face
                ctx.fillRect(screenPos.x + 4, screenPos.y, enemy.width - 8, 12);
                break;
                
            case 'drone':
                // Security drone
                const flap = Math.sin(Date.now() * 0.02) * 5;
                ctx.fillStyle = '#34495E';
                ctx.fillRect(screenPos.x, screenPos.y + 8, enemy.width, enemy.height - 8);
                // Rotors
                ctx.fillRect(screenPos.x - 8 + flap, screenPos.y, 8, 8);
                ctx.fillRect(screenPos.x + enemy.width, screenPos.y, 8 - flap, 8);
                break;
                
            case 'elite':
                // Elite security
                ctx.fillStyle = '#8B0000'; // Red uniform
                ctx.fillRect(screenPos.x, screenPos.y, enemy.width, enemy.height - 16);
                ctx.fillStyle = '#2C3E50'; // Face
                ctx.fillRect(screenPos.x + 6, screenPos.y, enemy.width - 12, 12);
                // Helmet
                ctx.fillStyle = '#4a4a4a';
                ctx.fillRect(screenPos.x + 4, screenPos.y - 4, enemy.width - 8, 8);
                break;
        }
        
        // Health bar
        if (enemy.health < enemy.maxHealth) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(screenPos.x, screenPos.y - 10, enemy.width, 4);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(screenPos.x, screenPos.y - 10, enemy.width * (enemy.health / enemy.maxHealth), 4);
        }
        
        ctx.globalAlpha = 1;
    }
}

function renderProjectiles() {
    for (let proj of Subweapons.projectiles) {
        const screenPos = Camera.apply(proj);
        
        switch(proj.type) {
            case 'laptop':
                ctx.fillStyle = '#34495E';
                ctx.fillRect(screenPos.x, screenPos.y, proj.width, proj.height);
                break;
                
            case 'drive':
                if (!proj.exploding) {
                    ctx.fillStyle = '#0066CC';
                    ctx.fillRect(screenPos.x, screenPos.y, proj.width, proj.height);
                } else {
                    // Data explosion
                    ctx.fillStyle = 'rgba(0, 100, 255, ' + (1 - proj.explosionTimer) + ')';
                    ctx.fillRect(screenPos.x - 20, screenPos.y - 20, 40, 40);
                }
                break;
                
            case 'server':
                ctx.fillStyle = '#FF6600';
                ctx.fillRect(screenPos.x, screenPos.y + 8, proj.width, proj.height - 16);
                ctx.fillRect(screenPos.x + 8, screenPos.y, proj.width - 16, proj.height);
                break;
        }
    }
}

function renderHUD() {
    // HUD background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, Game.width, 60);
    
    // Lives
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`LIVES: ${Game.lives}`, 20, 30);
    
    // Score
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`SCORE: ${Game.score.toString().padStart(6, '0')}`, 200, 30);
    
    // Timer
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`TIME: ${Math.floor(Game.time).toString().padStart(3, '0')}`, 500, 30);
    
    // Level
    ctx.fillStyle = '#00FFFF';
    ctx.fillText(`LEVEL: ${Game.currentLevel}/${Game.totalLevels}`, 700, 30);
    
    // Hearts (subweapon ammo)
    ctx.fillStyle = '#FF0000';
    for (let i = 0; i < Game.hearts; i++) {
        ctx.fillText('♥', 850 + i * 15, 30);
    }

    
    // Current subweapon
    if (Investigator.currentSubweapon !== 'none') {
        ctx.fillStyle = '#00FF00';
        ctx.fillText(`SUB: ${Investigator.currentSubweapon.toUpperCase()}`, 1000, 30);
    }
    
    // Health bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(20, Game.height - 40, 200, 30);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, Game.height - 40, 200, 30);
    
    ctx.fillStyle = '#FF0000';
    for (let i = 0; i < Investigator.health; i++) {
        ctx.fillRect(25 + i * 11, Game.height - 35, 8, 20);
    }
}

function renderMenu() {
    // Dark conspiracy background
    const gradient = ctx.createLinearGradient(0, 0, 0, Game.height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.5, '#1a0a0a');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, Game.width, Game.height);
    
    // Title
    ctx.fillStyle = '#8B0000';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;
    ctx.fillText('PRESIDENT PEDO', Game.width/2, 200);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px serif';
    ctx.shadowBlur = 10;
    ctx.fillText('The Hunt For The Epstein Files', Game.width/2, 260);
    
    // Menu options
    const options = ['START HUNT', 'CONTROLS', 'EXIT'];
    const selected = 0; // Simplified for now
    
    for (let i = 0; i < options.length; i++) {
        const y = 400 + i * 80;
        const isSelected = i === selected;
        
        if (isSelected) {
            ctx.fillStyle = '#FFD700';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = '#CCCCCC';
            ctx.shadowBlur = 5;
        }
        
        ctx.font = isSelected ? 'bold 24px serif' : '20px serif';
        ctx.fillText(options[i], Game.width/2, y);
    }
    
    // Instructions
    ctx.fillStyle = '#888888';
    ctx.font = '18px serif';
    ctx.shadowBlur = 0;
    ctx.fillText('Press ENTER to select', Game.width/2, Game.height - 50);
    ctx.fillText('Arrow Keys to move, Space to jump, Z to attack, X for subweapon', Game.width/2, Game.height - 20);
}

function renderGame() {
    renderDataCenter();
    renderEnemies();
    renderProjectiles();
    renderInvestigator();
    renderHUD();
}

function renderGameOver() {
    renderGame(); // Show game state
    
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, Game.width, Game.height);
    
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.fillText('MISSION FAILED', Game.width/2, Game.height/2 - 50);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px serif';
    ctx.fillText(`Final Score: ${Game.score}`, Game.width/2, Game.height/2);
    ctx.fillText('Press ENTER to continue', Game.width/2, Game.height/2 + 50);
}

function renderVictory() {
    renderGame();
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, Game.width, Game.height);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRUTH REVEALED!', Game.width/2, Game.height/2 - 50);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px serif';
    ctx.fillText(`All Files Recovered: ${Game.score}`, Game.width/2, Game.height/2);
    ctx.fillText('The hunt is complete...', Game.width/2, Game.height/2 + 50);
    ctx.fillText('Press ENTER to continue', Game.width/2, Game.height/2 + 100);
}

// Main Render
function render() {
    ctx.clearRect(0, 0, Game.width, Game.height);
    
    switch(Game.state) {
        case 'MENU':
            renderMenu();
            break;
        case 'PLAYING':
            renderGame();
            break;
        case 'GAMEOVER':
            renderGameOver();
            break;
        case 'VICTORY':
            renderVictory();
            break;
    }
}

// Game Loop
let lastTime = 0;

function gameLoop(currentTime) {
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    if (dt > 0.1) return; // Prevent huge jumps
    
    // Update
    switch(Game.state) {
        case 'PLAYING':
            updateGame(dt);
            break;
        case 'MENU':
            // Handle menu input
            if (Input.justPressed('Enter')) {
                Game.state = 'PLAYING';
                Game.currentLevel = 1;
                DataCenter.init(Game.currentLevel);
                // Reset game state
                Game.lives = 3;
                Game.score = 0;
                Game.hearts = 5;
                Game.time = 400;
                Investigator.health = Investigator.maxHealth;
                Investigator.x = 200;
                Investigator.y = 602;
            }
            break;
        case 'GAMEOVER':
        case 'VICTORY':
            if (Input.justPressed('Enter')) {
                Game.state = 'MENU';
            }
            break;
    }
    
    // Render
    render();
    
    requestAnimationFrame(gameLoop);
}

// Initialize Game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = Game.width;
    canvas.height = Game.height;
    
    Input.init();
    DataCenter.init(1);
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Start the hunt
window.addEventListener('load', init);