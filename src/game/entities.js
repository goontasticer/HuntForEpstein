// Main entities system for The Hunt For The Epstein Files
// This file serves as a registry for all entity types
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/game/entities.js',
  exports: [], // No direct exports - just loads the modules
  dependencies: ['Enemy', 'CollectibleFile', 'PowerUp', 'InvisibilityDevice', 'NeuralinkChip', 'SpeedBoost', 'StealthBoost', 'Trap']
});

// Entity types are loaded from separate modules:
// - Enemy: src/game/entities-enemy.js
// - CollectibleFile: src/game/entities-collectibles.js  
// - PowerUp family: src/game/entities-powerups.js
// - Trap: src/game/entities-traps.js

// This file ensures all entity modules are loaded in the correct order
// and provides backward compatibility by ensuring all classes are available on window.*

console.log('Entities system loaded - all entity types available');