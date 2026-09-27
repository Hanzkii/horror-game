/**
 * @file Renderer.js
 * @description Canvas-based rendering system with camera, layers, and horror effects.
 */

export default class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas - Target canvas element
     * @param {number} width - Internal resolution width (default 480)
     * @param {number} height - Internal resolution height (default 270)
     */
    constructor(canvas, width = 480, height = 270) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Internal offscreen buffer for resolution scaling
        this.buffer = document.createElement('canvas');
        this.buffer.width = width;
        this.buffer.height = height;
        this.bctx = this.buffer.getContext('2d');
        
        this.width = width;
        this.height = height;
        
        // Disable smoothing for retro pixel art look
        this.ctx.imageSmoothingEnabled = false;
        this.bctx.imageSmoothingEnabled = false;
        
        // Camera properties
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            shakeIntensity: 0,
            shakeDuration: 0,
            lerpSpeed: 5
        };
        
        this.worldWidth = null;
        this.worldHeight = null;

        // Lighting / Atmosphere
        this.fogDensity = 0;
        this.vignetteIntensity = 0.8;
    }
    
    /**
     * Sets the boundaries of the world to clamp camera within.
     * @param {number} width 
     * @param {number} height 
     */
    setWorldBounds(width, height) {
        this.worldWidth = width;
        this.worldHeight = height;
    }

    /**
     * Updates the camera position with clamping to world bounds.
     * @param {number} dt - Delta time in seconds
     */
    updateCamera(dt) {
        // Smooth follow target
        this.camera.x += (this.camera.targetX - this.width / 2 - this.camera.x) * this.camera.lerpSpeed * dt;
        this.camera.y += (this.camera.targetY - this.height / 2 - this.camera.y) * this.camera.lerpSpeed * dt;
        
        // Clamp camera within world bounds
        if (this.worldWidth && this.worldHeight) {
            if (this.worldWidth <= this.width) {
                this.camera.x = -(this.width - this.worldWidth) / 2;
            } else {
                this.camera.x = Math.max(0, Math.min(this.worldWidth - this.width, this.camera.x));
            }

            if (this.worldHeight <= this.height) {
                this.camera.y = -(this.height - this.worldHeight) / 2;
            } else {
                this.camera.y = Math.max(0, Math.min(this.worldHeight - this.height, this.camera.y));
            }
        }

        // Screen shake
        if (this.camera.shakeDuration > 0) {
            this.camera.shakeDuration -= dt;
        } else {
            this.camera.shakeIntensity = 0;
        }
    }

    /**
     * Instantly snaps the camera to a target position without lerping.
     * @param {number} x
     * @param {number} y
     */
    snapCamera(x, y) {
        this.lookAt(x, y);
        this.camera.x = this.camera.targetX - this.width / 2;
        this.camera.y = this.camera.targetY - this.height / 2;

        if (this.worldWidth && this.worldHeight) {
            if (this.worldWidth <= this.width) {
                this.camera.x = -(this.width - this.worldWidth) / 2;
            } else {
                this.camera.x = Math.max(0, Math.min(this.worldWidth - this.width, this.camera.x));
            }

            if (this.worldHeight <= this.height) {
                this.camera.y = -(this.height - this.worldHeight) / 2;
            } else {
                this.camera.y = Math.max(0, Math.min(this.worldHeight - this.height, this.camera.y));
            }
        }
    }
    
    /**
     * Sets the camera to follow a specific position.
     * @param {number} x
     * @param {number} y
     */
    lookAt(x, y) {
        this.camera.targetX = x;
        this.camera.targetY = y;
    }
    
    /**
     * Adds screen shake.
     * @param {number} intensity 
     * @param {number} duration - In seconds
     */
    shake(intensity, duration) {
        this.camera.shakeIntensity = intensity;
        this.camera.shakeDuration = duration;
    }
    
    /**
     * Clears the internal buffer.
     */
    clear() {
        this.bctx.fillStyle = '#000';
        this.bctx.fillRect(0, 0, this.width, this.height);
    }
    
    /**
     * Prepares context for world rendering with camera transform.
     */
    beginCamera() {
        this.bctx.save();
        let shakeX = 0;
        let shakeY = 0;
        
        if (this.camera.shakeDuration > 0) {
            shakeX = (Math.random() - 0.5) * 2 * this.camera.shakeIntensity;
            shakeY = (Math.random() - 0.5) * 2 * this.camera.shakeIntensity;
        }
        
        this.bctx.translate(-Math.floor(this.camera.x) + Math.floor(shakeX), -Math.floor(this.camera.y) + Math.floor(shakeY));
    }
    
    /**
     * Restores context after world rendering.
     */
    endCamera() {
        this.bctx.restore();
    }
    
    /**
     * Draws a sprite from an image.
     * @param {HTMLImageElement|HTMLCanvasElement} img 
     * @param {number} sx - Source x
     * @param {number} sy - Source y
     * @param {number} sw - Source width
     * @param {number} sh - Source height
     * @param {number} dx - Destination x
     * @param {number} dy - Destination y
     * @param {number} dw - Destination width
     * @param {number} dh - Destination height
     */
    drawSprite(img, sx, sy, sw, sh, dx, dy, dw, dh) {
        this.bctx.drawImage(img, sx, sy, sw, sh, Math.floor(dx), Math.floor(dy), dw, dh);
    }
    
    /**
     * Draws a rectangle.
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {string} color 
     * @param {boolean} isUI - If true, ignores camera transform
     */
    drawRect(x, y, w, h, color, isUI = false) {
        if (isUI) {
            this.bctx.fillStyle = color;
            this.bctx.fillRect(Math.floor(x), Math.floor(y), w, h);
        } else {
            this.bctx.fillStyle = color;
            this.bctx.fillRect(Math.floor(x), Math.floor(y), w, h);
        }
    }
    
    /**
     * Draws text.
     * @param {string} text 
     * @param {number} x 
     * @param {number} y 
     * @param {Object} options 
     */
    drawText(text, x, y, options = {}) {
        this.bctx.fillStyle = options.color || '#FFF';
        this.bctx.font = options.font || '10px sans-serif';
        this.bctx.textAlign = options.align || 'left';
        this.bctx.fillText(text, Math.floor(x), Math.floor(y));
    }
    
    /**
     * Renders post-processing effects like fog and vignette.
     */
    renderEffects() {
        // Fog/Darkness
        if (this.fogDensity > 0) {
            this.bctx.fillStyle = `rgba(0, 0, 0, ${this.fogDensity})`;
            this.bctx.fillRect(0, 0, this.width, this.height);
        }
        
        // Vignette
        if (this.vignetteIntensity > 0) {
            const gradient = this.bctx.createRadialGradient(
                this.width / 2, this.height / 2, this.width * 0.2,
                this.width / 2, this.height / 2, this.width * 0.7
            );
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(0,0,0,${this.vignetteIntensity})`);
            
            this.bctx.fillStyle = gradient;
            this.bctx.fillRect(0, 0, this.width, this.height);
        }
    }
    
    /**
     * Fills the entire screen with a color.
     * @param {string} color 
     */
    fillScreen(color) {
        this.bctx.fillStyle = color;
        this.bctx.fillRect(0, 0, this.width, this.height);
    }
    
    /**
     * Scales and draws the internal buffer to the display canvas.
     */
    present() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate aspect ratio preserving dimensions
        const scale = Math.min(
            this.canvas.width / this.width,
            this.canvas.height / this.height
        );
        
        const dw = this.width * scale;
        const dh = this.height * scale;
        const dx = (this.canvas.width - dw) / 2;
        const dy = (this.canvas.height - dh) / 2;
        
        this.ctx.drawImage(this.buffer, 0, 0, this.width, this.height, dx, dy, dw, dh);
    }
}
