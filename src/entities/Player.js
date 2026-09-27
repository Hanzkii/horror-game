import Entity from '../engine/Entity.js';
import SpriteRenderer from '../art/SpriteRenderer.js';

export const PLAYER_STATES = {
    IDLE: 0,
    WALKING: 1,
    JUMPING: 2,
    FALLING: 3,
    WALL_SLIDING: 4
};

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 12, 17);
        this.type = 'player';
        
        // Store spawn point for respawning
        this.spawnX = x;
        this.spawnY = y;
        
        // Physics constants
        this.gravity = 980; // px/s^2
        this.maxFallSpeed = 380; // px/s
        this.maxSpeed = 125; // px/s
        this.accel = 700; // px/s^2
        this.decel = 850; // px/s^2
        this.jumpForce = -320; // responsive initial jump impulse (clears ~3.5 tiles)
        this.jumpHoldForce = -350; // continued lift while holding jump
        this.wallSlideSpeed = 60; // max fall speed while sliding
        
        // State
        this.state = PLAYER_STATES.IDLE;
        this.facingRight = true;
        this.grounded = false;
        this.touchingWallLeft = false;
        this.touchingWallRight = false;
        
        // Jump timers (variable jump height, coyote time, and jump buffering)
        this.jumpTimer = 0;
        this.maxJumpHoldTime = 0.18; // seconds
        this.coyoteTimer = 0; // grace period after stepping off a ledge
        this.coyoteDuration = 0.12;
        this.jumpBufferTimer = 0; // buffer jump press before touching ground
        this.jumpBufferDuration = 0.12;
        
        // Visuals
        this.lightRadius = 150; // pixels
        this.breathTimer = 0;
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
        
        // Sound & Interaction
        this.footstepTimer = 0;
        this.footstepInterval = 0.38; // seconds
        this.interactRadius = 32; // pixels
    }
    
    update(dt, input, scene) {
        if (!input) return;
        this.breathTimer += dt;
        
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
            if (this.isBlinking) {
                this.isBlinking = false;
                this.blinkTimer = 3 + Math.random() * 2;
            } else {
                this.isBlinking = true;
                this.blinkTimer = 0.15;
            }
        }
        
        // Coyote time & Jump buffer timers
        if (this.grounded) {
            this.coyoteTimer = this.coyoteDuration;
        } else {
            this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
        }
        
        if (input.isJustPressed('jump')) {
            this.jumpBufferTimer = this.jumpBufferDuration;
        } else {
            this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
        }
        
        this.handleInput(dt, input, scene);
        this.applyPhysicsAndCollision(dt, scene);
        this.updateState(dt);
        this.handleSounds(dt, scene);

        // Out of bounds respawn safety
        if (scene && scene.height && (this.y > scene.height + 32 || this.y < -200 || this.x < -100 || this.x > scene.width + 100)) {
            scene.respawnPlayer();
        }
    }
    
    handleInput(dt, input, scene) {
        // Horizontal Movement
        if (input.isPressed('left')) {
            this.vx -= this.accel * dt;
            this.facingRight = false;
        } else if (input.isPressed('right')) {
            this.vx += this.accel * dt;
            this.facingRight = true;
        } else {
            // Decelerate smoothly
            if (this.vx > 0) {
                this.vx = Math.max(0, this.vx - this.decel * dt);
            } else if (this.vx < 0) {
                this.vx = Math.min(0, this.vx + this.decel * dt);
            }
        }
        
        // Clamp speed
        this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
        
        // Jumping (can trigger if grounded, within coyote time, or if buffered)
        const canJump = this.grounded || this.coyoteTimer > 0;
        if (canJump && this.jumpBufferTimer > 0) {
            this.vy = this.jumpForce;
            this.grounded = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            this.jumpTimer = this.maxJumpHoldTime;
            if (scene && scene.audio) {
                scene.audio.play('footstep');
            }
        } else if (input.isPressed('jump') && this.jumpTimer > 0) {
            // Sustained variable jump height
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
    
    applyPhysicsAndCollision(dt, scene) {
        if (!scene) return;
        const tileSize = scene.tileSize || 16;
        
        // Apply Gravity
        if (this.state === PLAYER_STATES.WALL_SLIDING) {
            this.vy += this.gravity * 0.4 * dt;
            if (this.vy > this.wallSlideSpeed) {
                this.vy = this.wallSlideSpeed;
            }
        } else {
            this.vy += this.gravity * dt;
            if (this.vy > this.maxFallSpeed) {
                this.vy = this.maxFallSpeed;
            }
        }
        
        // --- 1. HORIZONTAL MOVEMENT & COLLISION RESOLUTION ---
        this.x += this.vx * dt;
        this.touchingWallLeft = false;
        this.touchingWallRight = false;
        
        let leftCol = Math.floor(this.x / tileSize);
        let rightCol = Math.floor((this.x + this.width - 0.001) / tileSize);
        let topRow = Math.floor(this.y / tileSize);
        let bottomRow = Math.floor((this.y + this.height - 0.001) / tileSize);
        
        for (let r = topRow; r <= bottomRow; r++) {
            for (let c = leftCol; c <= rightCol; c++) {
                const tile = scene.getTile(c, r);
                if (tile === 1 || tile === 2) { // solid stone or brick wall
                    if (this.vx > 0) {
                        this.x = c * tileSize - this.width;
                        this.vx = 0;
                        this.touchingWallRight = true;
                    } else if (this.vx < 0) {
                        this.x = (c + 1) * tileSize;
                        this.vx = 0;
                        this.touchingWallLeft = true;
                    }
                }
            }
        }
        
        // --- 2. VERTICAL MOVEMENT & COLLISION RESOLUTION ---
        const prevY = this.y;
        const movingDown = this.vy >= 0;
        this.y += this.vy * dt;
        this.grounded = false;
        
        leftCol = Math.floor(this.x / tileSize);
        rightCol = Math.floor((this.x + this.width - 0.001) / tileSize);
        topRow = Math.floor(this.y / tileSize);
        bottomRow = Math.floor((this.y + this.height - 0.001) / tileSize);
        
        for (let r = topRow; r <= bottomRow; r++) {
            for (let c = leftCol; c <= rightCol; c++) {
                const tile = scene.getTile(c, r);
                if (tile === 1 || tile === 2) { // solid stone or brick
                    if (movingDown) {
                        // Landing on floor
                        this.y = r * tileSize - this.height;
                        this.vy = 0;
                        this.grounded = true;
                    } else {
                        // Bumping ceiling when jumping upward
                        this.y = (r + 1) * tileSize;
                        this.vy = 0;
                        this.jumpTimer = 0;
                    }
                } else if (tile === 3) { // one-way semi-solid platform
                    if (movingDown) {
                        const platTop = r * tileSize;
                        // Only land if previous bottom was at or above platform top (with 8px tolerance)
                        if (prevY + this.height <= platTop + 8) {
                            this.y = platTop - this.height;
                            this.vy = 0;
                            this.grounded = true;
                        }
                    }
                }
            }
        }
    }
    
    updateState(dt) {
        if (this.grounded) {
            if (Math.abs(this.vx) > 8) {
                this.state = PLAYER_STATES.WALKING;
                this.walkTimer += dt;
                if (this.walkTimer >= 0.15) {
                    this.walkTimer = 0;
                    this.walkFrame = (this.walkFrame + 1) % 4;
                }
            } else {
                this.state = PLAYER_STATES.IDLE;
                this.walkFrame = 0;
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
                if (scene && scene.audio) {
                    const stepNum = Math.floor(Math.random() * 3) + 1;
                    const soundName = scene.audio.buffers.has(`footstep_${stepNum}`) ? `footstep_${stepNum}` : 'footstep';
                    scene.audio.play(soundName);
                }
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
        SpriteRenderer.drawPlayer(renderer, this.x, this.y, this.state, this.walkFrame, this.facingRight, this.breathTimer, this.isBlinking);
    }
}
