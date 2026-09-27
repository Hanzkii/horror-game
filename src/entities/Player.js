import Entity from '../engine/Entity.js';

export const PLAYER_STATES = {
    IDLE: 0,
    WALKING: 1,
    JUMPING: 2,
    FALLING: 3,
    WALL_SLIDING: 4
};

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 12, 20);
        this.type = 'player';
        
        // Store spawn point for respawning
        this.spawnX = x;
        this.spawnY = y;
        
        // Physics constants
        this.gravity = 980; // px/s^2
        this.maxFallSpeed = 400; // px/s
        this.maxSpeed = 120; // px/s
        this.accel = 600; // px/s^2
        this.decel = 800; // px/s^2
        this.jumpForce = -250; // initial burst
        this.jumpHoldForce = -400; // continued force while holding
        this.wallSlideSpeed = 50; // max fall speed while sliding
        
        // State
        this.state = PLAYER_STATES.IDLE;
        this.facingRight = true;
        this.grounded = false;
        this.touchingWallLeft = false;
        this.touchingWallRight = false;
        this.jumpTimer = 0;
        this.maxJumpHoldTime = 0.2; // seconds
        
        // Visuals
        this.lightRadius = 150; // pixels
        this.breathTimer = 0;
        
        // Sound & Interaction
        this.footstepTimer = 0;
        this.footstepInterval = 0.4; // seconds
        this.interactRadius = 30; // pixels
    }
    
    update(dt, input, scene) {
        if (!input) return;
        this.breathTimer += dt;
        
        this.handleInput(dt, input, scene);
        this.applyPhysics(dt);
        this.resolveCollisions(scene);
        this.updateState();
        this.handleSounds(dt, scene);
    }
    
    handleInput(dt, input, scene) {
        // Horizontal Movement — use lowercase action names matching Input.js mappings
        if (input.isPressed('left')) {
            this.vx -= this.accel * dt;
            this.facingRight = false;
        } else if (input.isPressed('right')) {
            this.vx += this.accel * dt;
            this.facingRight = true;
        } else {
            // Decelerate
            if (this.vx > 0) {
                this.vx = Math.max(0, this.vx - this.decel * dt);
            } else if (this.vx < 0) {
                this.vx = Math.min(0, this.vx + this.decel * dt);
            }
        }
        
        // Clamp speed
        this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
        
        // Jumping
        if (input.isJustPressed('jump') && this.grounded) {
            this.vy = this.jumpForce;
            this.grounded = false;
            this.jumpTimer = this.maxJumpHoldTime;
        } else if (input.isPressed('jump') && this.jumpTimer > 0) {
            // Variable jump height
            this.vy += this.jumpHoldForce * dt;
            this.jumpTimer -= dt;
        } else {
            this.jumpTimer = 0;
        }
        
        // Interaction
        if (input.isJustPressed('interact')) {
            this.tryInteract(scene);
        }
    }
    
    applyPhysics(dt) {
        // Apply Gravity
        if (this.state === PLAYER_STATES.WALL_SLIDING) {
            this.vy += this.gravity * 0.5 * dt;
            if (this.vy > this.wallSlideSpeed) {
                this.vy = this.wallSlideSpeed;
            }
        } else {
            this.vy += this.gravity * dt;
            if (this.vy > this.maxFallSpeed) {
                this.vy = this.maxFallSpeed;
            }
        }
        
        // Apply velocities
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
    
    resolveCollisions(scene) {
        if (!scene || !scene.getTile) return;
        
        this.grounded = false;
        this.touchingWallLeft = false;
        this.touchingWallRight = false;
        
        const tileSize = scene.tileSize || 16;
        
        // Get overlapping tiles
        const leftCol = Math.floor(this.x / tileSize);
        const rightCol = Math.floor((this.x + this.width - 1) / tileSize);
        const topRow = Math.floor(this.y / tileSize);
        const bottomRow = Math.floor((this.y + this.height - 1) / tileSize);
        
        for (let r = topRow; r <= bottomRow; r++) {
            for (let c = leftCol; c <= rightCol; c++) {
                const tile = scene.getTile(c, r);
                if (tile === 1 || tile === 2) { // solid tiles
                    
                    const tileX = c * tileSize;
                    const tileY = r * tileSize;
                    
                    // AABB overlap amounts
                    const overlapLeft = (this.x + this.width) - tileX;
                    const overlapRight = (tileX + tileSize) - this.x;
                    const overlapTop = (this.y + this.height) - tileY;
                    const overlapBottom = (tileY + tileSize) - this.y;
                    
                    // Find min overlap for resolution
                    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                    
                    if (minOverlap === overlapTop && this.vy >= 0) {
                        this.y = tileY - this.height;
                        this.vy = 0;
                        this.grounded = true;
                    } else if (minOverlap === overlapBottom && this.vy <= 0) {
                        this.y = tileY + tileSize;
                        this.vy = 0;
                    } else if (minOverlap === overlapLeft) {
                        this.x = tileX - this.width;
                        this.vx = 0;
                        this.touchingWallRight = true;
                    } else if (minOverlap === overlapRight) {
                        this.x = tileX + tileSize;
                        this.vx = 0;
                        this.touchingWallLeft = true;
                    }
                }
            }
        }
    }
    
    updateState() {
        if (this.grounded) {
            if (Math.abs(this.vx) > 5) {
                this.state = PLAYER_STATES.WALKING;
            } else {
                this.state = PLAYER_STATES.IDLE;
            }
        } else {
            if (this.vy < 0) {
                this.state = PLAYER_STATES.JUMPING;
            } else {
                if ((this.touchingWallLeft || this.touchingWallRight) && this.vy > 0) {
                    this.state = PLAYER_STATES.WALL_SLIDING;
                } else {
                    this.state = PLAYER_STATES.FALLING;
                }
            }
        }
    }
    
    handleSounds(dt, scene) {
        if (this.state === PLAYER_STATES.WALKING && this.grounded) {
            this.footstepTimer -= dt;
            if (this.footstepTimer <= 0) {
                if (scene && scene.audio) scene.audio.play('footstep');
                this.footstepTimer = this.footstepInterval;
            }
        } else {
            this.footstepTimer = 0;
        }
    }
    
    tryInteract(scene) {
        if (!scene || !scene.entities) return;
        
        const center = { x: this.x + this.width / 2, y: this.y + this.height / 2 };
        
        for (const ent of scene.entities) {
            if (ent.type === 'interactable') {
                const entCenter = { x: ent.x + ent.width / 2, y: ent.y + ent.height / 2 };
                const distSq = Math.pow(center.x - entCenter.x, 2) + Math.pow(center.y - entCenter.y, 2);
                
                if (distSq <= Math.pow(this.interactRadius, 2)) {
                    ent.trigger(this, scene);
                    break;
                }
            }
        }
    }
    
    render(renderer) {
        // Breathing animation: scale height slightly
        const breathScale = 1 + Math.sin(this.breathTimer * 2) * 0.05;
        const renderHeight = this.height * breathScale;
        const yOffset = this.height - renderHeight;
        
        // Player body — pale glowing rectangle
        renderer.drawRect(this.x, this.y + yOffset, this.width, renderHeight, '#e0e0e0');
        
        // Draw facing indicator (eye)
        if (this.facingRight) {
            renderer.drawRect(this.x + this.width - 4, this.y + 4 + yOffset, 3, 3, '#999999');
        } else {
            renderer.drawRect(this.x + 1, this.y + 4 + yOffset, 3, 3, '#999999');
        }
    }
}
