/**
 * @file Scene.js
 * @description Manages entities, tilemaps, collisions, and scene transitions.
 */

export default class Scene {
    constructor() {
        this.entities = [];
        this.entitiesToAdd = [];
        this.entitiesToRemove = [];
        
        // Player reference
        this.player = null;
        
        // Tilemap data
        this.tileSize = 16;
        this.columns = 0;
        this.rows = 0;
        this.mapData = []; // 2D array of tile IDs
        this.tilesetImage = null;
        
        // World dimensions (set after loading map)
        this.width = 0;
        this.height = 0;
        
        // Subsystems (wired up by main.js)
        this.audio = null;
        this.ui = null;
        this.gameState = null;
        this.input = null;
        
        // Transition state
        this.transitioning = false;
        this.transitionAlpha = 0;
        this.nextScene = null;
    }
    
    /**
     * Loads a tilemap.
     * @param {Array<Array<number>>} data - 2D array of tile IDs
     * @param {number} tileSize 
     * @param {HTMLImageElement} tilesetImage 
     */
    loadMap(data, tileSize, tilesetImage) {
        this.mapData = data;
        this.tileSize = tileSize;
        this.tilesetImage = tilesetImage;
        this.rows = data.length;
        this.columns = data[0] ? data[0].length : 0;
        this.width = this.columns * this.tileSize;
        this.height = this.rows * this.tileSize;
    }
    
    /**
     * Gets the player entity.
     * @returns {Entity|null}
     */
    getPlayer() {
        return this.player;
    }
    
    /**
     * Gets the tile ID at grid coordinates (column, row).
     * @param {number} col - Column index
     * @param {number} row - Row index
     * @returns {number} Tile ID, or 0 if out of bounds
     */
    getTile(col, row) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.columns) {
            return this.mapData[row][col];
        }
        return 0;
    }
    
    /**
     * Respawns the player at the level start position.
     */
    respawnPlayer() {
        if (this.player) {
            // Reset to start — we store the spawn point
            this.player.x = this.player.spawnX || 32;
            this.player.y = this.player.spawnY || 160;
            this.player.vx = 0;
            this.player.vy = 0;
        }
    }
    
    /**
     * Adds an entity to the scene.
     * @param {Entity} entity 
     */
    add(entity) {
        this.entitiesToAdd.push(entity);
    }
    
    /**
     * Marks an entity for removal. Also aliased as removeEntity.
     * @param {Entity} entity 
     */
    remove(entity) {
        this.entitiesToRemove.push(entity);
        entity.active = false;
    }
    
    /**
     * Alias for remove() — expected by some entities.
     * @param {Entity} entity
     */
    removeEntity(entity) {
        this.remove(entity);
    }
    
    /**
     * Gets all active entities with a specific tag.
     * @param {string} tag 
     * @returns {Array<Entity>}
     */
    getByTag(tag) {
        return this.entities.filter(e => e.active && e.hasTag(tag));
    }
    
    /**
     * Updates the scene and all entities.
     * @param {number} dt 
     * @param {Input} input - Input handler
     * @param {GameState} gameState - Game state
     */
    update(dt, input, gameState) {
        // Process additions and removals
        if (this.entitiesToAdd.length > 0) {
            this.entities.push(...this.entitiesToAdd);
            this.entitiesToAdd = [];
        }
        
        if (this.entitiesToRemove.length > 0) {
            this.entities = this.entities.filter(e => !this.entitiesToRemove.includes(e));
            this.entitiesToRemove = [];
        }
        
        // Update entities — pass input and scene (this) so entities have full context
        for (const entity of this.entities) {
            if (entity.active) {
                entity.update(dt, input || this.input, this);
            }
        }
        
        // Handle collisions (basic O(N^2) for small counts)
        for (let i = 0; i < this.entities.length; i++) {
            const e1 = this.entities[i];
            if (!e1.active) continue;
            
            for (let j = i + 1; j < this.entities.length; j++) {
                const e2 = this.entities[j];
                if (!e2.active) continue;
                
                if (e1.collidesWith(e2)) {
                    e1.onCollision(e2);
                    e2.onCollision(e1);
                }
            }
        }
        
        // Handle transition
        if (this.transitioning) {
            this.transitionAlpha += dt * 2;
            if (this.transitionAlpha >= 1) {
                this.transitionAlpha = 1;
            }
        }
    }
    
    /**
     * Checks if a rectangular area overlaps with solid tiles (Tile ID > 0).
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @returns {boolean}
     */
    collidesWithMap(x, y, w, h) {
        const startCol = Math.floor(x / this.tileSize);
        const endCol = Math.floor((x + w) / this.tileSize);
        const startRow = Math.floor(y / this.tileSize);
        const endRow = Math.floor((y + h) / this.tileSize);
        
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (r >= 0 && r < this.rows && c >= 0 && c < this.columns) {
                    const tile = this.mapData[r][c];
                    if (tile === 1 || tile === 2) { // solid tiles
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    /**
     * Initiates a transition to another scene.
     * @param {Scene} nextScene 
     */
    transitionTo(nextScene) {
        this.transitioning = true;
        this.nextScene = nextScene;
    }
    
    /**
     * Renders the tilemap and all entities.
     * @param {Renderer} renderer 
     */
    render(renderer) {
        renderer.beginCamera();
        
        // Render Tilemap — use colored rectangles since we have no tileset image
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.columns; c++) {
                const tileId = this.mapData[r][c];
                if (tileId > 0) {
                    let color;
                    switch (tileId) {
                        case 1: color = '#1a1a2e'; break; // stone — dark blue-grey
                        case 2: color = '#2a1a1a'; break; // brick — dark reddish
                        case 3: color = '#333344'; break; // platform — slightly lighter
                        case 4: color = '#0d0d15'; break; // background detail — very dark
                        default: color = '#1a1a2e';
                    }
                    renderer.drawRect(
                        c * this.tileSize, r * this.tileSize,
                        this.tileSize, this.tileSize,
                        color
                    );
                }
            }
        }
        
        // Render Entities (sorted by y for basic depth)
        for (const entity of this.entities) {
            if (entity.active) {
                entity.render(renderer);
            }
        }
        
        renderer.endCamera();
        
        // Render Transition overlay
        if (this.transitionAlpha > 0) {
            renderer.drawRect(0, 0, renderer.width, renderer.height, `rgba(0,0,0,${this.transitionAlpha})`, true);
        }
    }
}
