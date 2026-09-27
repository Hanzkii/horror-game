/**
 * @file Input.js
 * @description Input handler for keyboard controls with state tracking, key rebinding, and focus safety.
 */

export default class Input {
    constructor() {
        this.keys = {};
        this.prevKeys = {};
        
        // Default Key Mappings (supporting both WASD and Arrow keys, plus W/Up for jump)
        this.mappings = {
            'up': ['KeyW', 'ArrowUp'],
            'down': ['KeyS', 'ArrowDown'],
            'left': ['KeyA', 'ArrowLeft'],
            'right': ['KeyD', 'ArrowRight'],
            'jump': ['Space', 'KeyW', 'ArrowUp'],
            'interact': ['KeyE', 'Enter', 'NumpadEnter'],
            'pause': ['Escape']
        };
        
        // Event listeners with preventDefault on game keys to prevent page scrolling
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Also map key character fallbacks for non-standard keyboards
            if (e.key === ' ') this.keys['Space'] = true;
            if (e.key === 'w' || e.key === 'W') this.keys['KeyW'] = true;
            if (e.key === 'a' || e.key === 'A') this.keys['KeyA'] = true;
            if (e.key === 's' || e.key === 'S') this.keys['KeyS'] = true;
            if (e.key === 'd' || e.key === 'D') this.keys['KeyD'] = true;
            if (e.key === 'e' || e.key === 'E') this.keys['KeyE'] = true;
            if (e.key === 'q' || e.key === 'Q') this.keys['KeyQ'] = true;
            if (e.key === 'Enter') this.keys['Enter'] = true;
            if (e.key === 'Escape') this.keys['Escape'] = true;

            // Prevent space and arrow keys from scrolling the browser window
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || e.key === ' ') {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.key === ' ') this.keys['Space'] = false;
            if (e.key === 'w' || e.key === 'W') this.keys['KeyW'] = false;
            if (e.key === 'a' || e.key === 'A') this.keys['KeyA'] = false;
            if (e.key === 's' || e.key === 'S') this.keys['KeyS'] = false;
            if (e.key === 'd' || e.key === 'D') this.keys['KeyD'] = false;
            if (e.key === 'e' || e.key === 'E') this.keys['KeyE'] = false;
            if (e.key === 'q' || e.key === 'Q') this.keys['KeyQ'] = false;
            if (e.key === 'Enter') this.keys['Enter'] = false;
            if (e.key === 'Escape') this.keys['Escape'] = false;
        });

        // Reset keys on window blur to avoid stuck inputs
        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }
    
    /**
     * Updates previous key states. Called at the end of each frame.
     */
    update() {
        this.prevKeys = { ...this.keys };
    }
    
    /**
     * Rebinds an action to a new key.
     * @param {string} action
     * @param {string} key
     */
    rebind(action, key) {
        if (this.mappings[action]) {
            this.mappings[action] = [key];
        }
    }
    
    /**
     * Checks if any key for a given action is currently pressed down.
     * @param {string} action 
     * @returns {boolean}
     */
    isPressed(action) {
        const mappedKeys = this.mappings[action];
        if (!mappedKeys) return false;
        return mappedKeys.some(key => !!this.keys[key]);
    }
    
    /**
     * Checks if any key for a given action was pressed on this exact frame.
     * @param {string} action 
     * @returns {boolean}
     */
    isJustPressed(action) {
        const mappedKeys = this.mappings[action];
        if (!mappedKeys) return false;
        return mappedKeys.some(key => !!this.keys[key] && !this.prevKeys[key]);
    }
    
    /**
     * Checks if any key for a given action was released on this exact frame.
     * @param {string} action 
     * @returns {boolean}
     */
    isJustReleased(action) {
        const mappedKeys = this.mappings[action];
        if (!mappedKeys) return false;
        return mappedKeys.some(key => !this.keys[key] && !!this.prevKeys[key]);
    }
}
