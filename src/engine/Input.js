/**
 * @file Input.js
 * @description Input handler for keyboard controls with state tracking and key rebinding.
 */

export default class Input {
    constructor() {
        this.keys = {};
        this.prevKeys = {};
        
        // Default Key Mappings
        this.mappings = {
            'up': ['KeyW', 'ArrowUp'],
            'down': ['KeyS', 'ArrowDown'],
            'left': ['KeyA', 'ArrowLeft'],
            'right': ['KeyD', 'ArrowRight'],
            'jump': ['Space'],
            'interact': ['KeyE'],
            'pause': ['Escape']
        };
        
        // Event listeners
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    /**
     * Updates the previous key states. Should be called at the end of every frame.
     */
    update() {
        this.prevKeys = { ...this.keys };
    }
    
    /**
     * Rebinds an action to a new key.
     * @param {string} action - e.g., 'jump'
     * @param {string} key - e.g., 'KeySpace'
     */
    rebind(action, key) {
        if (this.mappings[action]) {
            this.mappings[action] = [key]; // Overwrites current mappings for that action
        }
    }
    
    /**
     * Checks if any key for a given action is currently pressed.
     * @param {string} action 
     * @returns {boolean}
     */
    isPressed(action) {
        const mappedKeys = this.mappings[action];
        if (!mappedKeys) return false;
        
        return mappedKeys.some(key => this.keys[key]);
    }
    
    /**
     * Checks if any key for a given action was pressed this exact frame.
     * @param {string} action 
     * @returns {boolean}
     */
    isJustPressed(action) {
        const mappedKeys = this.mappings[action];
        if (!mappedKeys) return false;
        
        return mappedKeys.some(key => this.keys[key] && !this.prevKeys[key]);
    }
    
    /**
     * Checks if any key for a given action was released this exact frame.
     * @param {string} action 
     * @returns {boolean}
     */
    isJustReleased(action) {
        const mappedKeys = this.mappings[action];
        if (!mappedKeys) return false;
        
        return mappedKeys.some(key => !this.keys[key] && this.prevKeys[key]);
    }
}
