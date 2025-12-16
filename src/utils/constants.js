// Game constants for The Hunt For The Epstein Files
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/utils/constants.js',
  exports: ['GAME_CONSTANTS'],
  dependencies: []
});

window.GAME_CONSTANTS = {
  // Canvas dimensions
  CANVAS_WIDTH: 1920,
  CANVAS_HEIGHT: 1080,
  
  // Game timing
  MAX_FPS: 60,
  FRAME_DELAY: 1000 / 60, // ~16.67ms for 60fps
  MAX_DELTA_TIME: 100, // Max 100ms (10fps minimum)
  
  // Player settings
  PLAYER_SPEED: 300, // pixels per second
  PLAYER_STEALTH_SPEED: 150,
  PLAYER_SIZE: 32,
  
  // Level settings
  ROOM_WIDTH: 960,
  ROOM_HEIGHT: 540,
  GRID_SIZE: 16,
  
  // Stealth mechanics
  DETECTION_RADIUS: 150,
  SUSPICION_RADIUS: 100,
  HIDE_SPOT_DETECTION_REDUCTION: 0.7,
  
  // Enemy settings
  ENEMY_SPEED: 120,
  ENEMY_VISION_CONE: 90, // degrees
  ENEMY_VISION_RANGE: 200,
  
  // Trap settings
  TRAP_TRIGGER_RADIUS: 30,
  TRAP_COOLDOWN: 3000, // milliseconds
  
  // File collection
  FILES_PER_LEVEL: 5,
  FILE_PICKUP_RADIUS: 40,
  
  // Power-ups
  POWERUP_DURATION: 10000, // 10 seconds
  
  // UI settings
  HUD_TOP_OFFSET: 60,
  HUD_SIDE_OFFSET: 20,
  
  // Colors
  COLORS: {
    BACKGROUND: '#0a0a0a',
    WALL: '#2a2a2a',
    FLOOR: '#1a1a1a',
    PLAYER: '#4CAF50',
    ENEMY: '#F44336',
    FILE: '#FFC107',
    TRAP: '#9C27B0',
    HIDE_SPOT: '#2196F3',
    POWERUP: '#00BCD4',
    UI_BACKGROUND: 'rgba(0,0,0,0.8)',
    UI_BORDER: '#444'
  },
  
  // States
  GAME_STATES: {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    VICTORY: 'victory'
  },
  
  // Player states
  PLAYER_STATES: {
    NORMAL: 'normal',
    HIDDEN: 'hidden',
    DETECTED: 'detected',
    SUSPICIOUS: 'suspicious'
  },
  
  // Enemy states
  ENEMY_STATES: {
    PATROLLING: 'patrolling',
    INVESTIGATING: 'investigating',
    CHASING: 'chasing',
    SEARCHING: 'searching'
  },
  
  // Room types for procedural generation
  ROOM_TYPES: {
    ENTRY: 'entry',
    CORRIDOR: 'corridor',
    GUARD_POST: 'guard_post',
    FILE_ROOM: 'file_room',
    TRAP_ROOM: 'trap_room',
    HIDEOUT: 'hideout',
    EXIT: 'exit'
  },
  
  // Building levels (floors)
  BUILDING_LEVELS: 5,
  
  // Animation timings
  ANIMATION_TIMINGS: {
    WALK_CYCLE: 0.5, // seconds
    DETECTION_FLASH: 0.3,
    POWERUP_PULSE: 1.0,
    DOOR_OPEN: 1.5,
    TRAP_TRIGGER: 0.2
  }
};