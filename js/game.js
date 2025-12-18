// FILE_MANIFEST: game.js

/**
 * VAMPIRE KILLER - Castlevania-Inspired Action Platformer
 * Classic gothic action with whip combat, subweapons, and castle exploration
 */

// Game Configuration
const Game = {
    width: 1024,
    height: 768,
    state: 'MENU', // MENU, PLAYING, PAUSED, GAMEOVER
    currentLevel: 1,
    score: 0,
    lives: 3,
    hearts: 5, // Ammo for subweapons
    time: 400, // Timer in seconds
    difficulty: 'NORMAL'
};

// Canvas Context
let canvas, ctx;

// Belmont - The Vampire Hunter
const Belmont = {
    x: 200,
    y: 602,

    width: 32,
    height: 48,
    velocityX: 0,
    velocityY: 0,
    
    // Movement stats (slower, more methodical than modern games)
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
    currentSubweapon: 'none', // none, dagger, holyWater, cross, axe
    subweaponLevel: 1,
    
    // State
    isGrounded: false,
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

// Castle Level System
const Castle = {
    currentRoom: 0,
    rooms: [],
    width: 2048,
    height: 768,
    
    // Level elements
    platforms: [],
    stairs: [],
    enemies: [],
    candles: [],
    items: [],
    doors: [],
    breakableWalls: [],
    water: [], // Bottomless pits
    
    init() {
        this.rooms = [];
        this.platforms = [];
        this.stairs = [];
        this.enemies = [];
        this.candles = [];
        this.items = [];
        this.doors = [];
        this.breakableWalls = [];
        this.water = [];
        
        this.generateCastle();
    },
    
    generateCastle() {
        // Floor platforms
        this.platforms.push(
            { x: 0, y: 650, width: 2048, height: 118, type: 'stone' },
            { x: 400, y: 550, width: 200, height: 20, type: 'stone' },
            { x: 700, y: 450, width: 150, height: 20, type: 'stone' },
            { x: 1000, y: 500, width: 300, height: 20, type: 'stone' },
            { x: 1400, y: 400, width: 200, height: 20, type: 'stone' }
        );
        
        // Walls (classic Castlevania vertical design)
        this.platforms.push(
            { x: -50, y: 0, width: 50, height: 768, type: 'wall' },
            { x: 2048, y: 0, width: 50, height: 768, type: 'wall' }
        );
        
        // Stairs (signature Castlevania mechanic)
        this.stairs.push(
            { x: 600, y: 550, width: 32, height: 100, direction: 'up' },
            { x: 850, y: 450, width: 32, height: 100, direction: 'down' },
            { x: 1300, y: 500, width: 32, height: 150, direction: 'up' }
        );
        
        // Candles (destroy for items)
        this.candles.push(
            { x: 300, y: 600, width: 24, height: 32, lit: true, item: 'smallHeart' },
            { x: 500, y: 500, width: 24, height: 32, lit: true, item: 'whipUpgrade' },
            { x: 750, y: 400, width: 24, height: 32, lit: true, item: 'dagger' },
            { x: 950, y: 450, width: 24, height: 32, lit: true, item: 'holyWater' },
            { x: 1100, y: 450, width: 24, height: 32, lit: true, item: 'smallHeart' },
            { x: 1350, y: 350, width: 24, height: 32, lit: true, item: 'cross' },
            { x: 1600, y: 350, width: 24, height: 32, lit: true, item: 'largeHeart' }
        );
        
        // Enemies
        this.enemies.push(
            // Zombies - slow but relentless
            { x: 400, y: 600, width: 32, height: 48, type: 'zombie', health: 2, maxHealth: 2, speed: 30 },
            { x: 800, y: 400, width: 32, height: 48, type: 'zombie', health: 2, maxHealth: 2, speed: 30 },
            { x: 1200, y: 450, width: 32, height: 48, type: 'zombie', health: 2, maxHealth: 2, speed: 30 },
            
            // Bats - flying enemies
            { x: 600, y: 300, width: 24, height: 24, type: 'bat', health: 1, maxHealth: 1, speed: 100, amplitude: 50 },
            { x: 1000, y: 250, width: 24, height: 24, type: 'bat', health: 1, maxHealth: 1, speed: 100, amplitude: 50 },
            { x: 1500, y: 200, width: 24, height: 24, type: 'bat', health: 1, maxHealth: 1, speed: 100, amplitude: 50 },
            
            // Skeletons - throw bones
            { x: 500, y: 600, width: 28, height: 48, type: 'skeleton', health: 3, maxHealth: 3, speed: 50, throwCooldown: 0 },
            { x: 900, y: 400, width: 28, height: 48, type: 'skeleton', health: 3, maxHealth: 3, speed: 50, throwCooldown: 0 }
        );
        
        // Water pits (instant death)
        this.water.push(
            { x: 1200, y: 768, width: 150, height: 100 }
        );
    }
};

// Whip System
const Whip = {
    extending: false,
    extendingTimer: 0,
    segments: [],
    
    attack(x, y, facing) {
        if (Belmont.attackCooldown <= 0 && !Belmont.whipExtended) {
            Belmont.attacking = true;
            Belmont.whipExtended = true;
            Belmont.whipTimer = 0.3;
            Belmont.attackCooldown = 0.4;
            
            // Create whip segments
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
        if (Belmont.whipTimer > 0) {
            Belmont.whipTimer -= dt;
            
            // Update whip segments position
            for (let i = 0; i < this.segments.length; i++) {
                this.segments[i].x = Belmont.x + Belmont.width/2 + (Belmont.facing > 0 ? (i + 1) * 20 : -(i + 1) * 20);
                this.segments[i].y = Belmont.y + 16;
            }
            
            if (Belmont.whipTimer <= 0) {
                Belmont.whipExtended = false;
                Belmont.attacking = false;
                this.segments = [];
            }
        }
        
        if (Belmont.attackCooldown > 0) {
            Belmont.attackCooldown -= dt;
        }
    },
    
    checkEnemyCollisions() {
        for (let segment of this.segments) {
            for (let enemy of Castle.enemies) {
                if (segment.x < enemy.x + enemy.width &&
                    segment.x + segment.width > enemy.x &&
                    segment.y < enemy.y + enemy.height &&
                    segment.y + segment.height > enemy.y) {
                    
                    enemy.health--;
                    enemy.knockbackX = Belmont.facing * 100;
                    enemy.knockbackY = -50;
                    enemy.invulnerable = 0.5;
                    
                    if (enemy.health <= 0) {
                        const index = Castle.enemies.indexOf(enemy);
                        Castle.enemies.splice(index, 1);
                        Game.score += enemy.type === 'zombie' ? 100 : enemy.type === 'bat' ? 200 : 300;
                    }
                    
                    return; // Only hit once per attack
                }
            }
        }
        
        // Check candle collisions
        for (let candle of Castle.candles) {
            if (candle.lit) {
                for (let segment of this.segments) {
                    if (segment.x < candle.x + candle.width &&
                        segment.x + segment.width > candle.x &&
                        segment.y < candle.y + candle.height &&
                        segment.y + segment.height > candle.y) {
                        
                        candle.lit = false;
                        spawnCandleItem(candle);
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
        
        const heartCost = { dagger: 1, holyWater: 2, cross: 3, axe: 2 }[type] || 0;
        if (Game.hearts < heartCost) return;
        
        Game.hearts -= heartCost;
        
        switch(type) {
            case 'dagger':
                this.projectiles.push({
                    x: x + Belmont.width/2,
                    y: y + Belmont.height/2,
                    velocityX: facing * 400,
                    velocityY: 0,
                    width: 20,
                    height: 8,
                    type: 'dagger',
                    damage: 1
                });
                break;
                
            case 'holyWater':
                this.projectiles.push({
                    x: x + Belmont.width/2 + (facing * 20),
                    y: y + Belmont.height,
                    velocityX: facing * 150,
                    velocityY: -200,
                    width: 16,
                    height: 16,
                    type: 'holyWater',
                    damage: 2,
                    exploding: false,
                    explosionTimer: 0
                });
                break;
                
            case 'cross':
                this.projectiles.push({
                    x: x + Belmont.width/2,
                    y: y + Belmont.height/2,
                    velocityX: facing * 200,
                    velocityY: 0,
                    width: 24,
                    height: 24,
                    type: 'cross',
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
            
            if (proj.type === 'holyWater') {
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
            
            if (proj.type === 'cross' && proj.boomerang) {
                proj.returnTimer += dt;
                if (proj.returnTimer > 1.5) {
                    // Return to player
                    const dx = Belmont.x + Belmont.width/2 - proj.x;
                    proj.velocityX = (dx > 0 ? 300 : -300);
                }
            }
            
            // Remove if off screen
            return proj.x > -50 && proj.x < Castle.width + 50 && proj.y > -50 && proj.y < Castle.height + 50;
        });
    }
};

function spawnCandleItem(candle) {
    const x = candle.x + candle.width/2;
    const y = candle.y + candle.height/2;
    
    switch(candle.item) {
        case 'smallHeart':
            Game.hearts = Math.min(99, Game.hearts + 1);
            break;
        case 'largeHeart':
            Game.hearts = Math.min(99, Game.hearts + 5);
            break;
        case 'whipUpgrade':
            // Whip would level up in full implementation
            break;
        case 'dagger':
        case 'holyWater':
        case 'cross':
            Belmont.currentSubweapon = candle.item;
            break;
    }
}

// Update Functions
function updateBelmont(dt) {
    Input.updatePrevious();
    
    // Handle stairs (signature Castlevania mechanic)
    let onStairs = false;
    for (let stair of Castle.stairs) {
        if (Belmont.x + Belmont.width > stair.x &&
            Belmont.x < stair.x + stair.width &&
            Belmont.y + Belmont.height > stair.y &&
            Belmont.y < stair.y + stair.height) {
            onStairs = true;
            Belmont.isStairs = true;
            
            // Stair movement
            if (Input.isPressed('ArrowUp')) {
                Belmont.velocityY = -80;
                Belmont.velocityX = 0;
            } else if (Input.isPressed('ArrowDown')) {
                Belmont.velocityY = 80;
                Belmont.velocityX = 0;
            } else {
                Belmont.velocityY = 0;
            }
            
            if (stair.direction === 'down' && Input.justPressed('ArrowUp')) {
                Belmont.x -= 32; // Exit stairs up
                Belmont.isStairs = false;
            } else if (stair.direction === 'up' && Input.justPressed('ArrowDown')) {
                Belmont.x += 32; // Exit stairs down
                Belmont.isStairs = false;
            }
            
            break;
        }
    }
    
    if (!onStairs) {
        Belmont.isStairs = false;
        
        // Normal movement
        if (Input.isPressed('ArrowLeft')) {
            Belmont.velocityX = -Belmont.walkSpeed;
            Belmont.facing = -1;
            Belmont.currentAnimation = 'walk';
        } else if (Input.isPressed('ArrowRight')) {
            Belmont.velocityX = Belmont.walkSpeed;
            Belmont.facing = 1;
            Belmont.currentAnimation = 'walk';
        } else {
            Belmont.velocityX *= 0.8;
            if (Math.abs(Belmont.velocityX) < 10) {
                Belmont.velocityX = 0;
                Belmont.currentAnimation = 'idle';
            }
        }
        
        // Jump (can't change direction mid-air - classic Castlevania)
        if (Input.justPressed('Space') && Belmont.isGrounded) {
            Belmont.velocityY = Belmont.jumpPower;
            Belmont.isJumping = true;
        }
        
        // Apply gravity
        Belmont.velocityY += Belmont.gravity * dt;
        Belmont.velocityY = Math.min(Belmont.velocityY, Belmont.fallSpeed);
    }
    
    // Apply knockback
    if (Belmont.knockbackX !== 0) {
        Belmont.velocityX = Belmont.knockbackX;
        Belmont.knockbackX *= 0.9;
        if (Math.abs(Belmont.knockbackX) < 1) Belmont.knockbackX = 0;
    }
    if (Belmont.knockbackY !== 0) {
        Belmont.velocityY = Belmont.knockbackY;
        Belmont.knockbackY *= 0.9;
        if (Math.abs(Belmont.knockbackY) < 1) Belmont.knockbackY = 0;
    }
    
    // Update position
    Belmont.x += Belmont.velocityX * dt;
    Belmont.y += Belmont.velocityY * dt;
    
    // Update invulnerability
    if (Belmont.invulnerable > 0) {
        Belmont.invulnerable -= dt;
    }
    
    // Update animation
    Belmont.animationTime += dt;
}

function checkCollisions() {
    Belmont.isGrounded = false;
    
    // Platform collisions
    for (let platform of Castle.platforms) {
        if (Belmont.x < platform.x + platform.width &&
            Belmont.x + Belmont.width > platform.x &&
            Belmont.y < platform.y + platform.height &&
            Belmont.y + Belmont.height > platform.y) {
            
            if (!Belmont.isStairs) {
                // Landing on top
                if (Belmont.velocityY >= 0 && Belmont.y + Belmont.height > platform.y) {
                    Belmont.y = platform.y - Belmont.height;
                    Belmont.velocityY = 0;
                    Belmont.isGrounded = true;
                    Belmont.isJumping = false;
                }
            }
        }
    }
    
    // Water pit collision (instant death)
    for (let water of Castle.water) {
        if (Belmont.x < water.x + water.width &&
            Belmont.x + Belmont.width > water.x &&
            Belmont.y < water.y &&
            Belmont.y + Belmont.height > water.y - water.height) {
            takeDamage(99); // Instant death
        }
    }
}

function updateEnemies(dt) {
    for (let enemy of Castle.enemies) {
        enemy.animationTime = (enemy.animationTime || 0) + dt;
        
        // Apply knockback
        if (enemy.knockbackX) {
            enemy.velocityX = enemy.knockbackX;
            enemy.knockbackX *= 0.9;
            if (Math.abs(enemy.knockbackX) < 1) enemy.knockbackX = 0;
        }
        
        // Enemy AI based on type
        switch(enemy.type) {
            case 'zombie':
                // Slow, relentless advance toward player
                const zombieDx = Belmont.x - enemy.x;
                if (Math.abs(zombieDx) > 50) {
                    enemy.velocityX = (zombieDx > 0 ? enemy.speed : -enemy.speed);
                } else {
                    enemy.velocityX = 0;
                }
                break;
                
            case 'bat':
                // Flying sine wave pattern
                enemy.x += enemy.speed * (enemy.x < Belmont.x ? 1 : -1) * dt;
                enemy.y += Math.sin(enemy.animationTime * 3) * enemy.amplitude * dt;
                break;
                
            case 'skeleton':
                // Walk and throw bones
                enemy.x += enemy.speed * (enemy.x < Belmont.x ? 1 : -1) * dt;
                enemy.throwCooldown -= dt;
                
                const skeletonDist = Math.abs(Belmont.x - enemy.x);
                if (skeletonDist < 300 && enemy.throwCooldown <= 0) {
                    // Throw bone
                    Subweapons.projectiles.push({
                        x: enemy.x + enemy.width/2,
                        y: enemy.y + enemy.height/2,
                        velocityX: (Belmont.x > enemy.x ? 200 : -200),
                        velocityY: -100,
                        width: 12,
                        height: 8,
                        type: 'bone',
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
        const dx = Belmont.x - enemy.x;
        const dy = Belmont.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 40 && Belmont.invulnerable <= 0) {
            takeDamage(1);
            // Knockback
            Belmont.knockbackX = (dx > 0 ? 150 : -150);
            Belmont.knockbackY = -100;
        }
    }
}

function updateProjectiles(dt) {
    Subweapons.update(dt);
    
    // Check projectile collisions
    for (let proj of Subweapons.projectiles) {
        // Enemy projectiles vs player
        if (proj.enemyProjectile && Belmont.invulnerable <= 0) {
            if (proj.x < Belmont.x + Belmont.width &&
                proj.x + proj.width > Belmont.x &&
                proj.y < Belmont.y + Belmont.height &&
                proj.y + proj.height > Belmont.y) {
                takeDamage(1);
                // Remove projectile
                const index = Subweapons.projectiles.indexOf(proj);
                Subweapons.projectiles.splice(index, 1);
            }
        }
        
        // Player projectiles vs enemies
        if (!proj.enemyProjectile) {
            for (let enemy of Castle.enemies) {
                if (enemy.invulnerable <= 0 &&
                    proj.x < enemy.x + enemy.width &&
                    proj.x + proj.width > enemy.x &&
                    proj.y < enemy.y + enemy.height &&
                    proj.y + proj.height > enemy.y) {
                    
                    enemy.health -= proj.damage;
                    enemy.knockbackX = (proj.x < enemy.x ? -50 : 50);
                    enemy.knockbackY = -30;
                    enemy.invulnerable = 0.5;
                    
                    if (proj.type !== 'holyWater' || !proj.exploding) {
                        const index = Subweapons.projectiles.indexOf(proj);
                        Subweapons.projectiles.splice(index, 1);
                    }
                    
                    if (enemy.health <= 0) {
                        const enemyIndex = Castle.enemies.indexOf(enemy);
                        Castle.enemies.splice(enemyIndex, 1);
                        Game.score += enemy.type === 'zombie' ? 100 : enemy.type === 'bat' ? 200 : 300;
                    }
                    
                    break;
                }
            }
        }
    }
}

function takeDamage(amount) {
    Belmont.health -= amount;
    Belmont.invulnerable = 1.5; // 1.5 seconds of invulnerability
    
    if (Belmont.health <= 0) {
        Game.lives--;
        if (Game.lives <= 0) {
            Game.state = 'GAMEOVER';
        } else {
            // Respawn
            Belmont.x = 200;
            Belmont.y = 602;
            Belmont.health = Belmont.maxHealth;
            Belmont.invulnerable = 3;
        }

    }
}

// Input Handling
function handleInput() {
    // Whip attack
    if (Input.justPressed('KeyZ')) {
        Whip.attack(Belmont.x, Belmont.y, Belmont.facing);
    }
    
    // Subweapon
    if (Input.justPressed('KeyX') && Belmont.currentSubweapon !== 'none') {
        Subweapons.use(Belmont.currentSubweapon, Belmont.x, Belmont.y, Belmont.facing);
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
    updateBelmont(dt);
    checkCollisions();
    updateEnemies(dt);
    updateProjectiles(dt);
    Whip.update(dt);
    Whip.checkEnemyCollisions();
}

// Rendering
function renderBelmont() {
    ctx.save();
    
    const screenX = Belmont.x;
    const screenY = Belmont.y;
    
    // Flashing when invulnerable
    if (Belmont.invulnerable > 0 && Math.floor(Belmont.invulnerable * 10) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // Belmont body (simple rectangle for now)
    ctx.fillStyle = '#8B4513'; // Brown leather outfit
    ctx.fillRect(screenX, screenY + 16, Belmont.width, Belmont.height - 16);
    
    // Head
    ctx.fillStyle = '#FDBCB4'; // Skin tone
    ctx.fillRect(screenX + 8, screenY, 16, 16);
    
    // Hair
    ctx.fillStyle = '#4B3621'; // Dark brown hair
    ctx.fillRect(screenX + 6, screenY, 20, 8);
    
    // Whip
    if (Belmont.whipExtended) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(screenX + Belmont.width/2, screenY + 16);
        ctx.lineTo(screenX + Belmont.width/2 + Belmont.facing * Belmont.whipLength, screenY + 16);
        ctx.stroke();
        
        // Whip tip
        for (let segment of Whip.segments) {
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(segment.x, segment.y, segment.width, segment.height);
        }
    }
    
    ctx.restore();
}

function renderCastle() {
    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, Game.height);
    bgGradient.addColorStop(0, '#0a0a0a');
    bgGradient.addColorStop(0.5, '#1a1a2a');
    bgGradient.addColorStop(1, '#2a2a3a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, Castle.width, Game.height);
    
    // Moon
    ctx.fillStyle = '#F0E68C';
    ctx.beginPath();
    ctx.arc(Castle.width - 100, 100, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Platforms
    for (let platform of Castle.platforms) {
        const gradient = ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.height);
        gradient.addColorStop(0, '#4a4a4a');
        gradient.addColorStop(1, '#2a2a2a');
        ctx.fillStyle = gradient;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Stone texture
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 1;
        for (let x = platform.x; x < platform.x + platform.width; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, platform.y);
            ctx.lineTo(x, platform.y + platform.height);
            ctx.stroke();
        }
    }
    
    // Stairs
    for (let stair of Castle.stairs) {
        ctx.fillStyle = '#5a3a2a';
        ctx.fillRect(stair.x, stair.y, stair.width, stair.height);
        
        // Individual steps
        ctx.strokeStyle = '#4a2a1a';
        ctx.lineWidth = 1;
        for (let y = stair.y; y < stair.y + stair.height; y += 8) {
            ctx.beginPath();
            ctx.moveTo(stair.x, y);
            ctx.lineTo(stair.x + stair.width, y);
            ctx.stroke();
        }
    }
    
    // Candles
    for (let candle of Castle.candles) {
        if (candle.lit) {
            // Candle base
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(candle.x, candle.y + 20, candle.width, 12);
            
            // Flame
            const flicker = Math.sin(Date.now() * 0.01) * 2;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(candle.x + candle.width/2, candle.y + 16 + flicker, 6, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Flame glow
            ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(candle.x + candle.width/2, candle.y + 16, 15, 20, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Extinguished candle
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(candle.x, candle.y + 20, candle.width, 12);
        }
    }
    
    // Water pits
    for (let water of Castle.water) {
        ctx.fillStyle = '#001a33';
        ctx.fillRect(water.x, water.y - water.height, water.width, water.height);
        
        // Water waves
        ctx.strokeStyle = '#003366';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = water.x; x < water.x + water.width; x += 20) {
            const wave = Math.sin((x + Date.now() * 0.002) * 0.1) * 3;
            ctx.lineTo(x, water.y - water.height + wave);
        }
        ctx.stroke();
    }
}

function renderEnemies() {
    for (let enemy of Castle.enemies) {
        let x = enemy.x;
        let y = enemy.y;
        
        // Flashing when invulnerable
        if (enemy.invulnerable > 0 && Math.floor(enemy.invulnerable * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        switch(enemy.type) {
            case 'zombie':
                ctx.fillStyle = '#4a7c4e';
                ctx.fillRect(x, y, enemy.width, enemy.height - 16);
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x + 4, y, enemy.width - 8, 12);
                // Arms
                ctx.fillRect(x - 4, y + 12, 8, 20);
                ctx.fillRect(x + enemy.width - 4, y + 12, 8, 20);
                break;
                
            case 'bat':
                const flap = Math.sin(Date.now() * 0.02) * 5;
                ctx.fillStyle = '#2a2a2a';
                // Body
                ctx.fillRect(x, y + 8, enemy.width, enemy.height - 8);
                // Wings
                ctx.fillRect(x - 12 + flap, y, 12, 12);
                ctx.fillRect(x + enemy.width, y, 12 - flap, 12);
                break;
                
            case 'skeleton':
                ctx.fillStyle = '#F5F5DC';
                ctx.fillRect(x, y, enemy.width, enemy.height - 16);
                ctx.fillStyle = '#4a4a4a';
                ctx.fillRect(x + 6, y, enemy.width - 12, 12);
                // Bones
                ctx.fillRect(x - 2, y + 12, 6, 20);
                ctx.fillRect(x + enemy.width - 4, y + 12, 6, 20);
                break;
        }
        
        // Health bar
        if (enemy.health < enemy.maxHealth) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(x, y - 10, enemy.width, 4);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(x, y - 10, enemy.width * (enemy.health / enemy.maxHealth), 4);
        }
        
        ctx.globalAlpha = 1;
    }
}

function renderProjectiles() {
    for (let proj of Subweapons.projectiles) {
        switch(proj.type) {
            case 'dagger':
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
                break;
                
            case 'holyWater':
                if (!proj.exploding) {
                    ctx.fillStyle = '#4169E1';
                    ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
                } else {
                    // Holy fire explosion
                    ctx.fillStyle = 'rgba(255, 100, 0, ' + (1 - proj.explosionTimer) + ')';
                    ctx.fillRect(proj.x - 20, proj.y - 20, 40, 40);
                }
                break;
                
            case 'cross':
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(proj.x, proj.y + 8, proj.width, proj.height - 16);
                ctx.fillRect(proj.x + 8, proj.y, proj.width - 16, proj.height);
                break;
                
            case 'bone':
                ctx.fillStyle = '#F5F5DC';
                ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
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
    
    // Hearts (subweapon ammo)
    ctx.fillStyle = '#FF0000';
    for (let i = 0; i < Game.hearts; i++) {
        ctx.fillText('♥', 650 + i * 15, 30);
    }
    
    // Current subweapon
    if (Belmont.currentSubweapon !== 'none') {
        ctx.fillStyle = '#00FF00';
        ctx.fillText(`SUB: ${Belmont.currentSubweapon.toUpperCase()}`, 800, 30);
    }
    
    // Health bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(20, Game.height - 40, 200, 30);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, Game.height - 40, 200, 30);
    
    ctx.fillStyle = '#FF0000';
    for (let i = 0; i < Belmont.health; i++) {
        ctx.fillRect(25 + i * 11, Game.height - 35, 8, 20);
    }
}

function renderMenu() {
    // Dark gothic background
    const gradient = ctx.createLinearGradient(0, 0, 0, Game.height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.5, '#1a0a0a');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, Game.width, Game.height);
    
    // Title
    ctx.fillStyle = '#8B0000';
    ctx.font = 'bold 72px serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;
    ctx.fillText('VAMPIRE KILLER', Game.width/2, 200);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px serif';
    ctx.shadowBlur = 10;
    ctx.fillText('A Castlevania Adventure', Game.width/2, 260);
    
    // Menu options
    const options = ['START GAME', 'CONTROLS', 'EXIT'];
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
        
        ctx.font = isSelected ? 'bold 28px serif' : '24px serif';
        ctx.fillText(options[i], Game.width/2, y);
    }
    
    // Instructions
    ctx.fillStyle = '#888888';
    ctx.font = '18px serif';
    ctx.shadowBlur = 0;
    ctx.fillText('Press ENTER to select', Game.width/2, Game.height - 50);
    ctx.fillText('Arrow Keys to move, Space to jump, Z to whip, X for subweapon', Game.width/2, Game.height - 20);
}

function renderGame() {
    renderCastle();
    renderEnemies();
    renderProjectiles();
    renderBelmont();
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
    ctx.fillText('GAME OVER', Game.width/2, Game.height/2 - 50);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px serif';
    ctx.fillText(`Final Score: ${Game.score}`, Game.width/2, Game.height/2);
    ctx.fillText('Press ENTER to continue', Game.width/2, Game.height/2 + 50);
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
                Castle.init();
                // Reset game state
                Game.lives = 3;
                Game.score = 0;
                Game.hearts = 5;
                Game.time = 400;
                Belmont.health = Belmont.maxHealth;
                Belmont.x = 200;
                Belmont.y = 602;

            }
            break;
        case 'GAMEOVER':
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
    Castle.init();
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Start the game
window.addEventListener('load', init);