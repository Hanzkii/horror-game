/**
 * @file Entity.js
 * @description Base class for all game objects with physics and collision basics.
 */

export default class Entity {
    /**
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} width - Entity width
     * @param {number} height - Entity height
     */
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        this.vx = 0;
        this.vy = 0;
        
        this.active = true;
        this.tags = [];
    }
    
    /**
     * Checks AABB collision with another entity.
     * @param {Entity} other 
     * @returns {boolean}
     */
    collidesWith(other) {
        return (
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }
    
    /**
     * Called when a collision is detected by the Scene manager.
     * @param {Entity} other 
     */
    onCollision(other) {
        // Virtual method to be overridden
    }
    
    /**
     * Updates entity logic.
     * @param {number} dt - Delta time
     */
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
    
    /**
     * Renders the entity.
     * @param {Renderer} renderer 
     */
    render(renderer) {
        // Default render: a white box (placeholder)
        renderer.drawRect(this.x, this.y, this.width, this.height, '#FFFFFF');
    }
    
    /**
     * Adds a tag to the entity for filtering.
     * @param {string} tag 
     */
    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
    }
    
    /**
     * Checks if entity has a specific tag.
     * @param {string} tag 
     * @returns {boolean}
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }
}
