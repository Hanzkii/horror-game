import Entity from '../engine/Entity.js';
import SpriteRenderer from '../art/SpriteRenderer.js';

export const HAZARD_TYPES = {
    SPIKES: 0,
    FALLING_BLOCK: 1,
    PENDULUM_BLADE: 2
};

export class Hazard extends Entity {
    constructor(x, y, type = HAZARD_TYPES.SPIKES, width = 16, height = 16, properties = {}) {
        super(x, y, width, height);
        this.type = 'hazard';
        this.hazardType = type;
        this.properties = properties;
        
        this.damage = 1;
        
        // Falling block state
        this.triggered = false;
        this.triggerTimer = 0;
        this.triggerDelay = 0.5;
        this.isFalling = false;
        this.gravity = 500;
        
        this.startX = x;
        this.startY = y;
        this.respawnTimer = 0;
        this.respawnDelay = 3;
        this.dead = false;

        // Pendulum Blade state
        this.pivotX = properties.pivotX !== undefined ? properties.pivotX : (x + width / 2);
        this.pivotY = properties.pivotY !== undefined ? properties.pivotY : y;
        this.length = properties.length || 56;
        this.swingSpeed = properties.swingSpeed || 2.2;
        this.maxAngle = properties.maxAngle || (Math.PI / 3);
        this.swingTimer = properties.phase !== undefined ? properties.phase : (Math.random() * Math.PI * 2);
        this.angle = 0;
        this.bladeX = this.pivotX;
        this.bladeY = this.pivotY + this.length;
        this.bladeRadius = properties.bladeRadius || 11;
    }
    
    update(dt, input, scene) {
        if (this.dead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.reset();
            }
            return;
        }
        
        const player = scene.getPlayer();
        if (!player) return;
        
        if (this.hazardType === HAZARD_TYPES.FALLING_BLOCK) {
            if (!this.triggered) {
                // Check player proximity
                if (Math.abs(player.x - this.x) < 32 && player.y > this.y && player.y - this.y < 150) {
                    this.triggered = true;
                    this.triggerTimer = this.triggerDelay;
                    if (scene.audio) scene.audio.play('rumble');
                }
            } else if (!this.isFalling) {
                this.triggerTimer -= dt;
                if (this.triggerTimer <= 0) {
                    this.isFalling = true;
                }
            } else {
                this.vy += this.gravity * dt;
                this.y += this.vy * dt;
                
                // Collision with floor
                const tileY = Math.floor((this.y + this.height) / 16);
                const tileX = Math.floor((this.x + this.width / 2) / 16);
                if (scene.getTile && scene.getTile(tileX, tileY) > 0) {
                    this.dead = true;
                    this.respawnTimer = this.respawnDelay;
                    if (scene.audio) scene.audio.play('thud');
                }
            }
            this.checkPlayerCollision(player, scene);
        } else if (this.hazardType === HAZARD_TYPES.PENDULUM_BLADE) {
            // Harmonic swing update
            this.swingTimer += dt * this.swingSpeed;
            this.angle = Math.sin(this.swingTimer) * this.maxAngle;
            this.bladeX = this.pivotX + Math.sin(this.angle) * this.length;
            this.bladeY = this.pivotY + Math.cos(this.angle) * this.length;

            // Check circular blade collision against player AABB
            const cx = Math.max(player.x, Math.min(this.bladeX, player.x + player.width));
            const cy = Math.max(player.y, Math.min(this.bladeY, player.y + player.height));
            const distSq = Math.pow(this.bladeX - cx, 2) + Math.pow(this.bladeY - cy, 2);

            if (distSq < Math.pow(this.bladeRadius, 2)) {
                if (scene.gameState && scene.gameState.godMode) return;
                if (scene.gameState) {
                    scene.gameState.takeDamage(this.damage);
                }
                if (scene.postProcessing) {
                    scene.postProcessing.addTrauma(0.65);
                }
                if (scene.audio) {
                    scene.audio.play('stinger_sharp');
                }
                if (scene.respawnPlayer) {
                    scene.respawnPlayer();
                }
            }
        } else if (this.hazardType === HAZARD_TYPES.SPIKES) {
            this.checkPlayerCollision(player, scene);
        }
    }
    
    checkPlayerCollision(player, scene) {
        if (this.dead) return;
        if (scene.gameState && scene.gameState.godMode) return;
        
        // AABB Collision
        if (player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y) {
            
            if (scene.gameState) {
                scene.gameState.takeDamage(this.damage);
            }
            if (scene.respawnPlayer) {
                scene.respawnPlayer();
            }
            
            if (this.hazardType === HAZARD_TYPES.FALLING_BLOCK && this.isFalling) {
                this.dead = true;
                this.respawnTimer = this.respawnDelay;
            }
        }
    }
    
    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.dead = false;
        this.triggered = false;
        this.isFalling = false;
        this.vy = 0;
    }
    
    render(renderer) {
        if (this.dead) return;
        
        if (this.hazardType === HAZARD_TYPES.FALLING_BLOCK) {
            const isShaking = this.triggered && !this.isFalling;
            SpriteRenderer.drawFallingBlock(renderer, this.x, this.y, this.width, this.height, isShaking);
        } else if (this.hazardType === HAZARD_TYPES.SPIKES) {
            SpriteRenderer.drawSpikes(renderer, this.x, this.y, this.width, this.height);
        } else if (this.hazardType === HAZARD_TYPES.PENDULUM_BLADE) {
            SpriteRenderer.drawPendulum(renderer, this.pivotX, this.pivotY, this.bladeX, this.bladeY, this.angle);
        }
    }
}
