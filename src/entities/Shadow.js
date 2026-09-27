import Entity from '../engine/Entity.js';

export class Shadow extends Entity {
    constructor(x, y) {
        super(x, y, 16, 32);
        this.type = 'shadow';
        
        this.visible = false;
        this.timer = 0;
        this.alpha = 0;
        this.fadeSpeed = 1.0;
        this.fadingOut = false;
        this.disappearDist = 100;
        
        this.playedSound = false;
    }
    
    update(dt, input, scene) {
        this.timer += dt;
        
        const player = scene.getPlayer();
        if (!player) return;
        
        const dist = Math.abs(player.x - this.x);
        
        // Appear when player is somewhat near, disappear when too close
        if (dist < 300 && dist > this.disappearDist && !this.fadingOut) {
            this.visible = true;
            this.alpha = Math.min(0.8, this.alpha + this.fadeSpeed * dt);
            
            if (!this.playedSound && this.alpha > 0.5) {
                if (scene.audio) scene.audio.play('dissonance');
                this.playedSound = true;
            }
            
            // Drain player sanity
            if (scene.gameState) {
                scene.gameState.drainSanity(dt * 5);
            }
            
        } else if (dist <= this.disappearDist && this.visible) {
            this.fadingOut = true;
        }
        
        if (this.fadingOut) {
            this.alpha -= this.fadeSpeed * 3 * dt;
            if (this.alpha <= 0) {
                this.alpha = 0;
                this.visible = false;
                scene.remove(this);
            }
        }
    }
    
    render(renderer) {
        if (!this.visible || this.alpha <= 0) return;
        
        // Wavering effect
        const waverX = Math.sin(this.timer * 3) * 2;
        const waverY = Math.cos(this.timer * 2) * 1;
        
        // Draw shadowy body
        renderer.drawRect(
            this.x + waverX, this.y + waverY,
            this.width, this.height,
            `rgba(10, 10, 15, ${this.alpha})`
        );
        
        // Draw head (dark circle approximation)
        renderer.drawRect(
            this.x + waverX + 2, this.y - 10 + waverY,
            12, 12,
            `rgba(5, 5, 10, ${this.alpha})`
        );
    }
}
