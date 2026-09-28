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
        super(x, y, 10, 17); // Vulnerable, fragile human survivor scale
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
        
        // Visuals & Fear
        this.lightRadius = 150; // pixels
        this.breathTimer = 0;
        this.walkFrame = 0;
        this.walkTimer = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.idleTimer = 0;
        this.isLookingBack = false;
        this.isScared = false;

        // Psychological Hallucinations: Delayed Footsteps
        this.wasWalking = false;
        this.walkDuration = 0;
        this.hallucinationStepTimer = 0;
        
        // Sound & Interaction
        this.footstepTimer = 0;
        this.footstepInterval = 0.38; // seconds
        this.interactRadius = 32; // pixels

        // Horror trauma & combat response
        this.stunTimer = 0;
        this.invulnerableTimer = 0;
        this.panicLightTimer = 0;
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
        
        this.stunTimer = Math.max(0, this.stunTimer - dt);
        this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
        this.panicLightTimer = Math.max(0, this.panicLightTimer - dt);

        // Suffocating darkness effect: light radius drops dramatically when attacked
        if (this.panicLightTimer > 0) {
            this.lightRadius = 65 + Math.random() * 12;
        } else {
            this.lightRadius = 150;
        }

        // Fear state assessment
        const currentSanity = (scene?.gameState?.sanity !== undefined) ? scene.gameState.sanity : 100;
        this.isScared = (currentSanity < 50) || (this.panicLightTimer > 0);

        // Paranoid backward glances when idle in dark corridors
        if (this.state === PLAYER_STATES.IDLE && this.grounded) {
            this.idleTimer += dt;
            if (this.idleTimer > 1.8 && this.idleTimer < 3.2) {
                this.isLookingBack = true;
            } else {
                this.isLookingBack = false;
                if (this.idleTimer >= 4.5) this.idleTimer = 0;
            }
        } else {
            this.idleTimer = 0;
            this.isLookingBack = false;
        }

        // Psychological Hallucinations: Delayed Footstep behind the player
        if (this.state === PLAYER_STATES.WALKING && this.grounded) {
            this.wasWalking = true;
            this.walkDuration += dt;
        } else if (this.wasWalking) {
            // Player just stopped moving
            if (this.walkDuration > 0.6 && currentSanity < 75) {
                this.hallucinationStepTimer = 0.38 + Math.random() * 0.12;
            }
            this.wasWalking = false;
            this.walkDuration = 0;
        }

        if (this.hallucinationStepTimer > 0) {
            this.hallucinationStepTimer -= dt;
            if (this.hallucinationStepTimer <= 0) {
                if (scene && scene.audio && scene.audio.buffers.has('hallucination_step')) {
                    scene.audio.play('hallucination_step', { volume: 0.85 });
                    if (scene.postProcessing) {
                        scene.postProcessing.addTrauma(0.18);
                    }
                }
            }
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

    /**
     * Called when the shadow stalker attacks the player.
     * @param {number} dir - Direction to knock the player back (-1 or 1)
     * @returns {boolean} Whether the hit was accepted
     */
    onShadowHit(dir) {
        if (this.invulnerableTimer > 0) return false;
        this.invulnerableTimer = 1.4;
        this.stunTimer = 0.55;
        this.vx = dir * 280;
        this.vy = -180;
        this.grounded = false;
        this.panicLightTimer = 2.5;
        return true;
    }
    
    handleInput(dt, input, scene) {
        // If stunned by attack, cannot move or jump
        if (this.stunTimer > 0) {
            return;
        }

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
        
        // Interaction (Keyboard 'E' only when standing near object)
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

        // Sub-stepping to prevent high-speed tunneling through thin or stacked floors
        const stepDist = Math.max(Math.abs(this.vx * dt), Math.abs(this.vy * dt));
        const numSteps = Math.max(1, Math.min(4, Math.ceil(stepDist / 8)));
        const subDt = dt / numSteps;

        for (let s = 0; s < numSteps; s++) {
            // --- 1. HORIZONTAL MOVEMENT & COLLISION RESOLUTION ---
            this.x += this.vx * subDt;
            this.touchingWallLeft = false;
            this.touchingWallRight = false;
            
            let leftCol = Math.floor(this.x / tileSize);
            let rightCol = Math.floor((this.x + this.width - 0.001) / tileSize);
            let topRow = Math.floor(this.y / tileSize);
            let bottomRow = Math.floor((this.y + this.height - 0.001) / tileSize);
            
            if (this.vx > 0) {
                // Moving right: check right leading edge
                for (let r = topRow; r <= bottomRow; r++) {
                    const tile = scene.getTile(rightCol, r);
                    if (tile === 1 || tile === 2 || tile === 6 || tile === 7) {
                        this.x = rightCol * tileSize - this.width;
                        this.vx = 0;
                        this.touchingWallRight = true;
                        break;
                    }
                }
            } else if (this.vx < 0) {
                // Moving left: check left leading edge
                for (let r = topRow; r <= bottomRow; r++) {
                    const tile = scene.getTile(leftCol, r);
                    if (tile === 1 || tile === 2 || tile === 6 || tile === 7) {
                        this.x = (leftCol + 1) * tileSize;
                        this.vx = 0;
                        this.touchingWallLeft = true;
                        break;
                    }
                }
            }
            
            // --- 2. VERTICAL MOVEMENT & COLLISION RESOLUTION ---
            const prevY = this.y;
            const movingDown = this.vy >= 0;
            this.y += this.vy * subDt;
            this.grounded = false;
            
            leftCol = Math.floor(this.x / tileSize);
            rightCol = Math.floor((this.x + this.width - 0.001) / tileSize);
            topRow = Math.floor(this.y / tileSize);
            bottomRow = Math.floor((this.y + this.height - 0.001) / tileSize);
            
            if (movingDown) {
                // Moving DOWN: Search from highest row to lowest row, land on the FIRST solid surface encountered
                let landed = false;
                for (let r = topRow; r <= bottomRow; r++) {
                    for (let c = leftCol; c <= rightCol; c++) {
                        const tile = scene.getTile(c, r);
                        if (tile === 1 || tile === 2 || tile === 6 || tile === 7) { // solid stone, brick, grass, or dirt
                            this.y = r * tileSize - this.height;
                            this.vy = 0;
                            this.grounded = true;
                            landed = true;
                            break;
                        } else if (tile === 3 || tile === 5) { // one-way semi-solid platform or crumbling stone
                            const platTop = r * tileSize;
                            if (prevY + this.height <= platTop + 8) {
                                this.y = platTop - this.height;
                                this.vy = 0;
                                this.grounded = true;
                                landed = true;
                                if (tile === 5 && typeof scene.triggerCrumble === 'function') {
                                    scene.triggerCrumble(c, r);
                                }
                                break;
                            }
                        }
                    }
                    if (landed) break; // STOP checking lower rows so we never penetrate into bedrock!
                }
            } else {
                // Moving UP: Search from bottom to top, bump ceiling on the lowest ceiling tile
                let bumped = false;
                for (let r = bottomRow; r >= topRow; r--) {
                    for (let c = leftCol; c <= rightCol; c++) {
                        const tile = scene.getTile(c, r);
                        if (tile === 1 || tile === 2 || tile === 6 || tile === 7) {
                            this.y = (r + 1) * tileSize;
                            this.vy = 0;
                            this.jumpTimer = 0;
                            bumped = true;
                            break;
                        }
                    }
                    if (bumped) break;
                }
            }
        }

        // --- 3. HORIZONTAL BOUNDARY CLAMPING ---
        if (scene.width > 0) {
            this.x = Math.max(0, Math.min(scene.width - this.width, this.x));
        }

        // --- 4. ANTI-STUCK EJECTION SAFETY ---
        // If player's center is ever embedded inside solid rock (e.g. from an edge glitch), eject upward to air
        const centerCol = Math.floor((this.x + this.width / 2) / tileSize);
        const centerRow = Math.floor((this.y + this.height / 2) / tileSize);
        const centerTile = scene.getTile(centerCol, centerRow);
        if (centerTile === 1 || centerTile === 2 || centerTile === 6 || centerTile === 7) {
            let unstuck = false;
            for (let r = centerRow - 1; r >= Math.max(0, centerRow - 8); r--) {
                if (scene.getTile(centerCol, r) === 0 && scene.getTile(centerCol, r - 1) === 0) {
                    this.y = (r + 1) * tileSize - this.height;
                    this.vy = 0;
                    this.grounded = true;
                    unstuck = true;
                    break;
                }
            }
            if (!unstuck && scene.respawnPlayer) {
                // If completely encased in solid terrain with no air above, safely respawn
                scene.respawnPlayer();
            }
        }

        // --- 5. ABYSS PIT-FALL BOUNDARY SAFETY ---
        if (scene.height > 0 && this.y > scene.height + 16) {
            if (scene.audio) {
                try { scene.audio.play('shadow_hit'); } catch (e) {}
            }
            if (scene.gameState) {
                scene.gameState.takeDamage(100);
            }
            if (scene.respawnPlayer) {
                scene.respawnPlayer();
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
                    const set = Math.random() < 0.25 ? 'footstep_wet' : 'footstep_stone';
                    const soundName = scene.audio.buffers.has(`${set}_${stepNum}`) ? `${set}_${stepNum}` : (scene.audio.buffers.has(`footstep_${stepNum}`) ? `footstep_${stepNum}` : 'footstep');
                    scene.audio.play(soundName, { volume: 0.65 });
                }
                this.footstepTimer = this.footstepInterval;
            }
        } else {
            this.footstepTimer = 0;
        }
    }
    
    tryInteract(scene) {
        if (!scene || !scene.entities) return false;
        
        const center = { x: this.x + this.width / 2, y: this.y + this.height / 2 };
        const reachRadius = 38; // interaction distance when player walks up to object
        
        let targetEnt = null;
        let closestDist = Infinity;
        for (const ent of scene.entities) {
            if (ent.type === 'interactable' && ent.active) {
                const isTorch = (ent.interactType === 3 || ent.properties?.interactType === 3);
                if (isTorch) continue;

                const entCenter = { x: ent.x + ent.width / 2, y: ent.y + ent.height / 2 };
                const dist = Math.hypot(center.x - entCenter.x, center.y - entCenter.y);
                if (dist <= reachRadius && dist < closestDist) {
                    closestDist = dist;
                    targetEnt = ent;
                }
            }
        }

        if (targetEnt) {
            targetEnt.trigger(this, scene);
            return true;
        }
        return false;
    }
    
    render(renderer) {
        // Flicker sprite when recovering from shadow attack
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
            return;
        }

        SpriteRenderer.drawPlayer(renderer, this.x, this.y, this.state, this.walkFrame, this.facingRight, this.breathTimer, this.isBlinking, {
            isScared: this.isScared,
            isLookingBack: this.isLookingBack
        });
    }
}
