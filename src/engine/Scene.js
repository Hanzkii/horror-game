/**
 * @file Scene.js
 * @description Manages entities, tilemaps, collisions, and scene transitions.
 */

import SpriteRenderer from '../art/SpriteRenderer.js';

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
        this.postProcessing = null;
        
        // Crumbling tiles state tracking
        this.crumblingTiles = new Map();
        
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
        if (this.crumblingTiles) {
            this.crumblingTiles.clear();
        }
    }

    /**
     * Triggers the crumbling sequence of a fragile stone platform tile (Tile 5).
     * @param {number} col - Column index
     * @param {number} row - Row index
     */
    triggerCrumble(col, row) {
        const key = `${col},${row}`;
        if (!this.crumblingTiles.has(key)) {
            this.crumblingTiles.set(key, {
                col,
                row,
                state: 'shaking',
                timer: 0.45,
                respawnTimer: 3.5
            });
            if (this.audio) {
                this.audio.play('drip');
            }
        }
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
            this.player.state = 0; // IDLE
        }

        if (this.gameState && this.gameState.godMode) {
            return;
        }

        // 1. Reset game state and puzzle flags
        if (this.gameState) {
            this.gameState.sanity = this.gameState.maxSanity || 100;
            if (this.gameState.flags) {
                if (typeof this.gameState.flags.clear === 'function') {
                    this.gameState.flags.clear();
                } else {
                    this.gameState.flags = {};
                }
            }
            this.gameState.activeNote = null;
            this.gameState.canInteract = false;
        }

        // 2. Reset all puzzle levers, switches, doors, traps, and banish active shadows
        for (const ent of this.entities) {
            if (ent.type === 'interactable') {
                // Reset switches / levers to unactivated state
                if (ent.interactType === 2 || ent.properties?.interactType === 2) {
                    ent.isActivated = false;
                    ent.timer = 0;
                }
                // Reset doors to locked state
                if (ent.interactType === 1 || ent.properties?.interactType === 1) {
                    ent.isActivated = false;
                    ent.isLocked = true;
                }
            } else if (ent.type === 'hazard') {
                if (ent.hazardType === 1) { // Falling block
                    ent.x = ent.spawnX || ent.x;
                    ent.y = ent.spawnY || ent.y;
                    ent.vy = 0;
                    ent.isFalling = false;
                    ent.isShaking = false;
                    ent.respawnTimer = 0;
                }
            } else if (ent.type === 'shadow') {
                if (typeof ent.banish === 'function') {
                    ent.banish('respawn', this);
                }
            }
        }

        // 3. Reset crumbling platforms
        if (this.crumblingTiles) {
            for (const [key, item] of this.crumblingTiles) {
                if (item.row < this.rows && item.col < this.columns) {
                    this.mapData[item.row][item.col] = 5;
                }
            }
            this.crumblingTiles.clear();
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
     * Gathers all environmental light sources from active entities.
     * @returns {Array<{x: number, y: number, radius: number, color: string, flare: boolean}>}
     */
    gatherLights() {
        const lights = [];
        for (const ent of this.entities) {
            if (!ent.active) continue;
            const isTorch = ent.type === 'interactable' && (ent.interactType === 3 || ent.properties?.interactType === 3);
            if (isTorch) {
                if (ent.extinguishTimer && ent.extinguishTimer > 0) {
                    continue; // Extinguished torch produces no sanctuary light
                }
                const timer = ent.timer || 0;
                let flicker = Math.sin(timer * 7) * 4 + Math.sin(timer * 19) * 2;
                if (ent.flickerIntensity && ent.flickerIntensity > 0) {
                    flicker -= ent.flickerIntensity * (30 + Math.random() * 25);
                }
                const isFlared = Boolean(ent.flareTimer && ent.flareTimer > 0);
                const baseRad = isFlared ? 150 : 85;
                const radius = Math.max(12, baseRad + flicker);
                const lightColor = isFlared
                    ? 'rgba(255, 230, 140, 0.95)'
                    : (ent.flickerIntensity > 0.3 ? 'rgba(210, 100, 30, 0.65)' : 'rgba(255, 175, 75, 0.85)');
                lights.push({
                    x: ent.x + 8,
                    y: ent.y + 6,
                    radius: radius,
                    color: lightColor,
                    flare: isFlared,
                    entity: ent
                });
            }
        }
        return lights;
    }

    /**
     * Updates the scene and all entities.
     * @param {number} dt 
     * @param {Input} input - Input handler
     * @param {GameState} gameState - Game state
     */
    update(dt, input, gameState) {
        // Collect all lights at frame start so all entities have access to sanctuary zones
        this.lights = this.gatherLights();

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
        
        // Handle crumbling platforms
        if (this.crumblingTiles && this.crumblingTiles.size > 0) {
            for (const [key, item] of this.crumblingTiles) {
                if (item.state === 'shaking') {
                    item.timer -= dt;
                    if (item.timer <= 0) {
                        item.state = 'broken';
                        if (item.row < this.rows && item.col < this.columns) {
                            this.mapData[item.row][item.col] = 0; // tile crumbles away!
                        }
                        if (this.audio) {
                            this.audio.play('thud');
                        }
                        if (this.postProcessing) {
                            this.postProcessing.addTrauma(0.25);
                        }
                    }
                } else if (item.state === 'broken') {
                    item.respawnTimer -= dt;
                    if (item.respawnTimer <= 0) {
                        if (item.row < this.rows && item.col < this.columns) {
                            this.mapData[item.row][item.col] = 5; // platform respawns!
                        }
                        this.crumblingTiles.delete(key);
                    }
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
                    // Solid structural tiles across all 5 strata and surface
                    if (tile === 1 || tile === 2 || tile === 6 || tile === 7 || tile === 8 || tile === 9 || tile === 10 || tile === 11) {
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
        
        // Render Tilemap — use SpriteRenderer
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.columns; c++) {
                const tileId = this.mapData[r][c];
                if (tileId > 0) {
                    const x = c * this.tileSize;
                    const y = r * this.tileSize;
                    const seed = c * 1000 + r;
                    
                    switch (tileId) {
                        case 1: 
                            SpriteRenderer.drawStone(renderer, x, y, this.tileSize, seed);
                            break;
                        case 2: 
                            SpriteRenderer.drawBrick(renderer, x, y, this.tileSize, seed);
                            break;
                        case 3: 
                            SpriteRenderer.drawPlatform(renderer, x, y, this.tileSize, seed);
                            break;
                        case 4: 
                            SpriteRenderer.drawBackdrop(renderer, x, y, this.tileSize, seed);
                            break;
                        case 5: {
                            const key = `${c},${r}`;
                            const crumble = this.crumblingTiles?.get(key);
                            const shakeOffset = (crumble && crumble.state === 'shaking')
                                ? (Math.random() - 0.5) * 2.5
                                : 0;
                            SpriteRenderer.drawCrumblingPlatform(renderer, x, y, this.tileSize, seed, shakeOffset, crumble?.state === 'shaking');
                            break;
                        }
                        case 6:
                            SpriteRenderer.drawSurfaceGrass(renderer, x, y, this.tileSize, seed);
                            break;
                        case 7:
                            SpriteRenderer.drawSurfaceDirt(renderer, x, y, this.tileSize, seed);
                            break;
                        case 8:
                            SpriteRenderer.drawObsidianRunic(renderer, x, y, this.tileSize, seed);
                            break;
                        case 9:
                            SpriteRenderer.drawIndustrialIron(renderer, x, y, this.tileSize, seed);
                            break;
                        case 10:
                            SpriteRenderer.drawWaterloggedPaver(renderer, x, y, this.tileSize, seed);
                            break;
                        case 11:
                            SpriteRenderer.drawEldritchVoid(renderer, x, y, this.tileSize, seed);
                            break;
                        case 12:
                            SpriteRenderer.drawAncientRelief(renderer, x, y, this.tileSize, seed);
                            break;
                        case 13: {
                            const isConduitOn = this.gameState && this.gameState.getFlag && this.gameState.getFlag('conduit_active_general');
                            SpriteRenderer.drawConduitCable(renderer, x, y, this.tileSize, seed, Boolean(isConduitOn));
                            break;
                        }
                        case 14:
                            SpriteRenderer.drawBonePile(renderer, x, y, this.tileSize, seed);
                            break;
                        default: 
                            SpriteRenderer.drawStone(renderer, x, y, this.tileSize, seed);
                    }
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
