/**
 * @file Shadow.js
 * @description Dynamic horror entity that stalks the player from the dark, responds to player orientation,
 * pulses with spectral eyes, drains sanity, and teleports when confronted.
 */

import Entity from '../engine/Entity.js';

export const SHADOW_STATES = {
    DORMANT: 0,
    STALKING: 1,
    OBSERVING: 2,
    TELEPORTING: 3
};

export class Shadow extends Entity {
    constructor(x, y) {
        super(x, y, 16, 32);
        this.type = 'shadow';
        
        this.homeX = x;
        this.homeY = y;
        
        this.state = SHADOW_STATES.STALKING;
        this.timer = 0;
        this.stalkSpeed = 35; // creeps forward quietly
        this.rushSpeed = 70;
        
        // Visuals
        this.alpha = 0.9;
        this.eyeGlow = 1.0;
        this.tendrilTimer = 0;
        
        // Audio & Trauma cooldowns
        this.soundCooldown = 0;
        this.vanishTimer = 0;
    }
    
    update(dt, input, scene) {
        this.timer += dt;
        this.tendrilTimer += dt * 3;
        this.soundCooldown = Math.max(0, this.soundCooldown - dt);
        
        const player = scene.getPlayer();
        if (!player) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        const facingShadow = (player.facingRight && dx < 0) || (!player.facingRight && dx > 0);
        
        // Eerie floating hover physics
        this.y = this.homeY + Math.sin(this.timer * 2.5) * 4;
        
        if (this.state === SHADOW_STATES.TELEPORTING) {
            this.alpha -= dt * 2.5;
            if (this.alpha <= 0) {
                // Relocate to an ominous distance away
                this.x = player.x + (Math.random() > 0.5 ? 200 : -200);
                this.homeX = this.x;
                this.state = SHADOW_STATES.STALKING;
                this.alpha = 0.9;
            }
            return;
        }
        
        // Active Stalking Logic
        if (dist < 360) {
            // Player is in stalking perimeter
            if (!facingShadow && dist > 70) {
                // Player's back is turned: CREEP CLOSER!
                const dir = Math.sign(dx);
                this.x += dir * this.stalkSpeed * dt;
                this.eyeGlow = Math.min(1.0, this.eyeGlow + dt * 2);
            } else if (facingShadow) {
                // Player is looking at the shadow: freeze and waver ominously
                this.eyeGlow = 0.7 + Math.sin(this.timer * 8) * 0.3;
            }
            
            // Audio tension trigger when stalker gets close
            if (dist < 180 && this.soundCooldown <= 0) {
                if (scene.audio) {
                    scene.audio.play('dissonance');
                }
                this.soundCooldown = 6.0; // don't spam
            }
            
            // Drain player sanity proportional to proximity
            if (dist < 140 && scene.gameState) {
                const drainMultiplier = (140 - dist) / 140;
                scene.gameState.drainSanity(dt * (4 + drainMultiplier * 10));
            }
            
            // CONFRONTATION: Player approached too close!
            if (dist < 45) {
                // Startle player with camera trauma
                if (scene.gameState && scene.gameState.takeDamage) {
                    scene.gameState.drainSanity(15);
                }
                if (scene.audio) {
                    scene.audio.play('rumble');
                }
                // Dissolve and warp away
                this.state = SHADOW_STATES.TELEPORTING;
            }
        }
    }
    
    render(renderer) {
        if (this.alpha <= 0) return;
        
        // Undulating waver offset
        const waverX = Math.sin(this.tendrilTimer) * 2;
        const waverY = Math.cos(this.tendrilTimer * 0.8) * 2;
        
        // 1. Dark Smoky Wisp Body (deep midnight indigo that contrasts with pure black)
        renderer.drawRect(
            this.x + waverX - 2, this.y + waverY - 2,
            this.width + 4, this.height + 4,
            `rgba(25, 20, 45, ${this.alpha * 0.5})`
        );
        renderer.drawRect(
            this.x + waverX, this.y + waverY,
            this.width, this.height,
            `rgba(15, 12, 28, ${this.alpha})`
        );
        
        // 2. Trailing Tendrils
        for (let i = 0; i < 3; i++) {
            const tx = this.x + 3 + i * 4 + Math.sin(this.tendrilTimer + i) * 3;
            renderer.drawRect(tx, this.y + this.height - 2, 2, 8 + i * 2, `rgba(18, 14, 32, ${this.alpha * 0.7})`);
        }
        
        // 3. Piercing Haunting Eyes (Bright cyan-violet that punch through darkness)
        const eyeColor = `rgba(170, 190, 255, ${this.alpha * this.eyeGlow})`;
        const pupilColor = `rgba(220, 120, 255, ${this.alpha * this.eyeGlow})`;
        
        // Left eye
        renderer.drawRect(this.x + 3 + waverX, this.y + 7 + waverY, 3, 3, eyeColor);
        renderer.drawRect(this.x + 4 + waverX, this.y + 8 + waverY, 1, 1, pupilColor);
        
        // Right eye
        renderer.drawRect(this.x + 9 + waverX, this.y + 7 + waverY, 3, 3, eyeColor);
        renderer.drawRect(this.x + 10 + waverX, this.y + 8 + waverY, 1, 1, pupilColor);
        
        // Subtle eye halo
        renderer.drawRect(this.x + 2 + waverX, this.y + 6 + waverY, 11, 5, `rgba(130, 80, 255, ${this.alpha * 0.25})`);
    }
}
