// Input handling system for keyboard controls
window.FILE_MANIFEST = window.FILE_MANIFEST || [];
window.FILE_MANIFEST.push({
  name: 'src/core/input.js',
  exports: ['Input'],
  dependencies: []
});

/**
 * Input handling system for keyboard controls
 * Provides state tracking for continuous and single-press events
 * Supports action mapping for cleaner game code
 */
window.Input = (function() {
    'use strict';
    
    // Private state
    const keysDown = new Set();           // Currently pressed keys
    const keysPressed = new Set();        // Keys pressed this frame (buffer)
    const keysReleased = new Set();       // Keys released this frame (buffer)
    
    // Action mapping: game actions -> key codes
    const actionMap = new Map();
    const reverseActionMap = new Map();   // For debugging
    
    // Input state
    let isEnabled = true;
    
    // Key code constants for common keys
    const KEY_CODES = {
        // Arrow keys
        UP: 'ArrowUp',
        DOWN: 'ArrowDown', 
        LEFT: 'ArrowLeft',
        RIGHT: 'ArrowRight',
        
        // WASD
        W: 'KeyW',
        A: 'KeyA',
        S: 'KeyS',
        D: 'KeyD',
        
        // Action keys
        SPACE: 'Space',
        ENTER: 'Enter',
        ESCAPE: 'Escape',
        SHIFT: 'ShiftLeft',
        CTRL: 'ControlLeft',
        
        // Number keys
        NUM_1: 'Digit1',
        NUM_2: 'Digit2',
        NUM_3: 'Digit3',
        NUM_4: 'Digit4',
        NUM_5: 'Digit5'
    };
    
    /**
     * Default action mappings
     */
    function initializeDefaultMappings() {
        // Movement
        mapAction('moveUp', [KEY_CODES.UP, KEY_CODES.W]);
        mapAction('moveDown', [KEY_CODES.DOWN, KEY_CODES.S]);
        mapAction('moveLeft', [KEY_CODES.LEFT, KEY_CODES.A]);
        mapAction('moveRight', [KEY_CODES.RIGHT, KEY_CODES.D]);
        
        // Game actions
        mapAction('interact', [KEY_CODES.SPACE, KEY_CODES.ENTER]);
        mapAction('jump', [KEY_CODES.SPACE]);
        mapAction('attack', [KEY_CODES.Z]);
        mapAction('subweapon', [KEY_CODES.X]);
        mapAction('sneak', [KEY_CODES.SHIFT, KEY_CODES.CTRL]);
        mapAction('pause', [KEY_CODES.ESCAPE]);

        
        // Debug/utility
        mapAction('debug1', [KEY_CODES.NUM_1]);
        mapAction('debug2', [KEY_CODES.NUM_2]);
        mapAction('debug3', [KEY_CODES.NUM_3]);
        mapAction('debug4', [KEY_CODES.NUM_4]);
        mapAction('debug5', [KEY_CODES.NUM_5]);
    }
    
    /**
     * Event handler for key down
     */
    function handleKeyDown(event) {
        if (!isEnabled) return;
        
        const code = event.code;
        
        // Prevent browser defaults for game keys
        if (isGameKey(code)) {
            event.preventDefault();
        }
        
        // Track key state
        if (!keysDown.has(code)) {
            keysDown.add(code);
            keysPressed.add(code);
        }
    }
    
    /**
     * Event handler for key up
     */
    function handleKeyUp(event) {
        if (!isEnabled) return;
        
        const code = event.code;
        
        // Prevent browser defaults for game keys
        if (isGameKey(code)) {
            event.preventDefault();
        }
        
        // Update key state
        keysDown.delete(code);
        keysReleased.add(code);
    }
    
    /**
     * Check if a key should prevent browser default behavior
     */
    function isGameKey(code) {
        return actionMap.has(code) || 
               Object.values(KEY_CODES).includes(code);
    }
    
    /**
     * Update input state (call once per frame)
     */
    function update(dt) {
        // Clear single-frame buffers
        keysPressed.clear();
        keysReleased.clear();
    }
    
    /**
     * Check if a key is currently held down
     */
    function isDown(keyCode) {
        return keysDown.has(keyCode);
    }
    
    /**
     * Check if a key was pressed this frame (single press)
     */
    function isPressed(keyCode) {
        return keysPressed.has(keyCode);
    }
    
    /**
     * Check if a key was released this frame
     */
    function isReleased(keyCode) {
        return keysReleased.has(keyCode);
    }
    
    /**
     * Check if an action is currently held down
     */
    function isActionDown(action) {
        const keys = actionMap.get(action);
        if (!keys) return false;
        
        return keys.some(key => keysDown.has(key));
    }
    
    /**
     * Check if an action was pressed this frame
     */
    function isActionPressed(action) {
        const keys = actionMap.get(action);
        if (!keys) return false;
        
        return keys.some(key => keysPressed.has(key));
    }
    
    /**
     * Check if an action was released this frame
     */
    function isActionReleased(action) {
        const keys = actionMap.get(action);
        if (!keys) return false;
        
        return keys.some(key => keysReleased.has(key));
    }
    
    /**
     * Map game action to key(s)
     */
    function mapAction(action, keyCodes) {
        // Remove existing mapping
        if (actionMap.has(action)) {
            const oldKeys = actionMap.get(action);
            oldKeys.forEach(key => reverseActionMap.delete(key));
        }
        
        // Add new mapping
        actionMap.set(action, keyCodes);
        keyCodes.forEach(key => reverseActionMap.set(key, action));
    }
    
    /**
     * Get key(s) mapped to an action
     */
    function getActionKeys(action) {
        return actionMap.get(action) || [];
    }
    
    /**
     * Get action mapped to a key
     */
    function getKeyAction(keyCode) {
        return reverseActionMap.get(keyCode);
    }
    
    /**
     * Get all currently active keys
     */
    function getActiveKeys() {
        return Array.from(keysDown);
    }
    
    /**
     * Get all currently active actions
     */
    function getActiveActions() {
        const active = [];
        for (const [action, keys] of actionMap) {
            if (keys.some(key => keysDown.has(key))) {
                active.push(action);
            }
        }
        return active;
    }
    
    /**
     * Enable input processing
     */
    function enable() {
        isEnabled = true;
    }
    
    /**
     * Disable input processing
     */
    function disable() {
        isEnabled = false;
        // Clear all states when disabled
        keysDown.clear();
        keysPressed.clear();
        keysReleased.clear();
    }
    
    /**
     * Check if input is enabled
     */
    function getEnabled() {
        return isEnabled;
    }
    
    /**
     * Initialize the input system
     */
    function initialize() {
        // Set up event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        // Initialize default mappings
        initializeDefaultMappings();
        
        console.log('Input system initialized');
    }
    
    /**
     * Clean up the input system
     */
    function destroy() {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        
        keysDown.clear();
        keysPressed.clear();
        keysReleased.clear();
        actionMap.clear();
        reverseActionMap.clear();
    }
    
    // Public interface
    return {
        // State checking
        isDown,
        isPressed,
        isReleased,
        isActionDown,
        isActionPressed,
        isActionReleased,
        
        // Action mapping
        mapAction,
        getActionKeys,
        getKeyAction,
        
        // State queries
        getActiveKeys,
        getActiveActions,
        getEnabled,
        
        // Control
        update,
        enable,
        disable,
        initialize,
        destroy,
        
        // Constants
        KEY_CODES,
        
        // Debug info
        _getDebugState: function() {
            return {
                keysDown: Array.from(keysDown),
                keysPressed: Array.from(keysPressed),
                keysReleased: Array.from(keysReleased),
                actionMap: Object.fromEntries(actionMap),
                isEnabled
            };
        }
    };
})();

// Auto-initialize when script loads
window.Input.initialize();