/**
 * @file Game.js
 * @description Main game class managing the engine subsystems, game loop, and states.
 */

export const GameState = {
    LOADING: 0,
    MENU: 1,
    PLAYING: 2,
    PAUSED: 3
};

export default class Game {
    /**
     * @param {Object} config
     * @param {number} config.width - Target internal width (default 480)
     * @param {number} config.height - Target internal height (default 270)
     */
    constructor(config = {}) {
        this.width = config.width || 480;
        this.height = config.height || 270;
        
        this.state = GameState.LOADING;
        
        // Subsystems to be injected or instantiated
        this.renderer = null;
        this.input = null;
        this.audio = null;
        this.scene = null;
        
        // Loop properties
        this.lastTime = 0;
        this.accumulator = 0;
        this.targetTimestep = 1000 / 60; // 60 FPS
        this.animationFrameId = null;
        
        this.loop = this.loop.bind(this);
    }
    
    /**
     * Initializes the game and its subsystems.
     * @param {Object} subsystems - Renderer, Input, Audio, Scene instances
     */
    init(subsystems = {}) {
        this.renderer = subsystems.renderer;
        this.input = subsystems.input;
        this.audio = subsystems.audio;
        this.scene = subsystems.scene;
        
        this.state = GameState.MENU;
    }
    
    /**
     * Starts the game loop.
     */
    start() {
        if (this.state === GameState.LOADING) {
            console.warn("Cannot start game before initialization.");
            return;
        }
        this.state = GameState.PLAYING;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.loop);
    }
    
    /**
     * Main game loop using fixed timestep.
     * @param {number} timestamp 
     */
    loop(timestamp) {
        if (this.state !== GameState.PLAYING) {
            this.lastTime = timestamp; // Prevent spiral of death on resume
        }
        
        let dt = timestamp - this.lastTime;
        
        // Cap dt to prevent spiral of death if tab is inactive
        if (dt > 250) {
            dt = 250;
        }
        
        this.lastTime = timestamp;
        
        if (this.state === GameState.PLAYING) {
            this.accumulator += dt;
            
            while (this.accumulator >= this.targetTimestep) {
                this.update(this.targetTimestep / 1000);
                this.accumulator -= this.targetTimestep;
            }
            
            // Pass alpha for rendering interpolation if needed (accumulator / targetTimestep)
            this.render(this.accumulator / this.targetTimestep);
        }
        
        this.animationFrameId = requestAnimationFrame(this.loop);
    }
    
    /**
     * Updates game logic.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (this.input) this.input.update();
        if (this.scene) this.scene.update(dt);
        if (this.renderer) this.renderer.updateCamera(dt);
    }
    
    /**
     * Renders the current state.
     * @param {number} alpha - Interpolation factor
     */
    render(alpha) {
        if (!this.renderer) return;
        this.renderer.clear();
        
        if (this.scene) {
            this.scene.render(this.renderer);
        }
        
        // Render overlays depending on state
        if (this.state === GameState.PAUSED) {
            this.renderer.drawRect(0, 0, this.width, this.height, 'rgba(0,0,0,0.5)', true);
            this.renderer.drawText("PAUSED", this.width / 2, this.height / 2, {
                align: 'center', color: '#FFF', font: '20px monospace'
            });
        }
        
        this.renderer.renderEffects(); // Vignette, Fog etc.
        this.renderer.present(); // Draw internal canvas to screen
    }
    
    /**
     * Pauses the game.
     */
    pause() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
        }
    }
    
    /**
     * Resumes the game.
     */
    resume() {
        if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
            this.lastTime = performance.now(); // Reset time to avoid large jump
        }
    }
}
