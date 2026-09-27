import Entity from '../engine/Entity.js';

export const HAZARD_TYPES = {
    SPIKES: 0,
    FALLING_BLOCK: 1
};

export class Hazard extends Entity {
    constructor(x, y, type = HAZARD_TYPES.SPIKES, width = 16, height = 16) {
        super(x, y, width, height);
        this.type = 'hazard';
        this.hazardType = type;
        
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
        }
        
        this.checkPlayerCollision(player, scene);
    }
    
    checkPlayerCollision(player, scene) {
        if (this.dead) return;
        
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
        
        let renderX = this.x;
        let renderY = this.y;
        
        if (this.hazardType === HAZARD_TYPES.FALLING_BLOCK) {
            if (this.triggered && !this.isFalling) {
                renderX += (Math.random() - 0.5) * 4;
            }
            renderer.drawRect(renderX, renderY, this.width, this.height, '#8a0f0f');
        } else if (this.hazardType === HAZARD_TYPES.SPIKES) {
            // Draw spikes as dark red rectangles for simplicity
            renderer.drawRect(renderX, renderY + this.height * 0.5, this.width, this.height * 0.5, '#8a0f0f');
            // Spike tips
            for (let i = 0; i < this.width; i += 8) {
                renderer.drawRect(renderX + i + 2, renderY, 4, this.height * 0.6, '#6a0a0a');
            }
        }
    }
}
