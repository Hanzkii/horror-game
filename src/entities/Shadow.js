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
        this.stalkSpeed = 55; // creeps forward quietly
        this.rushSpeed = 120;
        
        // Visuals
        this.alpha = 0.9;
        this.eyeGlow = 1.0;
        this.tendrilTimer = 0;
        
        // Audio & Trauma cooldowns
        this.soundCooldown = 0;
        this.breathCooldown = 0;
        this.vanishTimer = 0;
        this.jumpScareTimer = 0;
        this.freezeTimer = 0;
        this.teleportBehindTimer = 15.0;
        
        this.lastPlayerDist = Infinity;
        this.history = [];
        this.originalLights = null;
    }

    getDistanceToPlayer() {
        return this.lastPlayerDist;
    }
    
    update(dt, input, scene) {
        this.timer += dt;
        this.tendrilTimer += dt * 3;
        this.soundCooldown = Math.max(0, this.soundCooldown - dt);
        this.breathCooldown = Math.max(0, this.breathCooldown - dt);
        
        if (this.jumpScareTimer > 0) {
            this.jumpScareTimer -= dt;
            if (this.jumpScareTimer <= 0) {
                this.state = SHADOW_STATES.TELEPORTING;
            }
            return;
        }

        if (this.freezeTimer > 0) {
            this.freezeTimer -= dt;
            if (this.freezeTimer <= 0) {
                const player = scene.getPlayer();
                if (player) {
                    const dir = Math.sign(player.x - this.x);
                    this.x += dir * 30; // snap closer
                }
            }
            return;
        }

        this.teleportBehindTimer -= dt;
        
        // Afterimage history
        if (this.timer % 0.05 < dt) {
            this.history.unshift({x: this.x, y: this.y, alpha: this.alpha});
            if (this.history.length > 3) this.history.pop();
        }

        // Restore lights
        if (this.originalLights && scene.lights) {
            for (let i = 0; i < scene.lights.length; i++) {
                if (this.originalLights[i] !== undefined) {
                    scene.lights[i].radius = this.originalLights[i];
                }
            }
            this.originalLights = null;
        }
        
        const player = scene.getPlayer();
        if (!player) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.lastPlayerDist = dist;
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

        // Light Interference
        if (dist < 150 && scene.lights) {
            this.originalLights = [];
            for (let i = 0; i < scene.lights.length; i++) {
                this.originalLights[i] = scene.lights[i].radius;
                scene.lights[i].radius *= (1 - (0.2 + Math.random() * 0.4));
            }
        }
        
        // Active Stalking Logic
        if (dist < 500) {
            if (!facingShadow && dist > 70) {
                // Player's back is turned: CREEP CLOSER!
                const dir = Math.sign(dx);
                let speed = this.stalkSpeed;
                if (scene.gameState && scene.gameState.sanity < 0.5) speed = this.rushSpeed;
                
                this.x += dir * speed * dt;
                this.eyeGlow = Math.min(1.0, this.eyeGlow + dt * 2);

                if (Math.random() < 0.005) {
                    this.freezeTimer = 0.5; // Occasional freeze-frame
                }
            } else if (facingShadow) {
                // Player is looking at the shadow: freeze and waver ominously
                this.eyeGlow = 0.7 + Math.sin(this.timer * 8) * 0.3;
            }

            // Unpredictable teleport behind
            if (!facingShadow && this.teleportBehindTimer <= 0) {
                this.teleportBehindTimer = 15.0;
                if (Math.random() < 0.5) {
                    this.x = player.x + (player.facingRight ? -80 : 80);
                    this.homeX = this.x;
                }
            } else if (facingShadow) {
                this.teleportBehindTimer = 15.0; // reset if looked at
            }
            
            // Audio tension trigger when stalker gets close
            if (dist < 180 && this.soundCooldown <= 0) {
                if (scene.audio) scene.audio.play('dissonance');
                this.soundCooldown = 3.5;
            }

            if (dist < 100 && this.breathCooldown <= 0) {
                if (scene.audio) scene.audio.play('breathing');
                this.breathCooldown = 2.0;
            }
            
            // Drain player sanity proportional to proximity
            if (dist < 140 && scene.gameState) {
                const drainMultiplier = (140 - dist) / 140;
                scene.gameState.drainSanity(dt * (4 + drainMultiplier * 10));
            }
            
            // CONFRONTATION: Player approached too close!
            if (dist < 35) {
                this.jumpScareTimer = 0.15;

                if (Math.random() < 0.2) {
                    // Lunge
                    const dir = Math.sign(dx);
                    this.x += dir * 40;
                    if (scene.audio) scene.audio.play('shadow_scream');
                } else {
                    if (scene.audio) scene.audio.play('stinger_sharp');
                }

                if (scene.gameState && scene.gameState.takeDamage) {
                    scene.gameState.drainSanity(25);
                }
                if (scene.postProcessing) {
                    scene.postProcessing.addTrauma(0.8);
                }
            }
        }
    }
    
    render(renderer) {
        if (this.jumpScareTimer > 0) {
            // Massive jump scare eyes
            renderer.drawRect(0, 0, 480, 270, 'rgba(0, 0, 0, 0.9)');
            const eyeColor = `rgba(170, 190, 255, 1.0)`;
            const pupilColor = `rgba(220, 120, 255, 1.0)`;
            renderer.drawRect(90, 80, 80, 80, eyeColor);
            renderer.drawRect(120, 110, 20, 20, pupilColor);
            renderer.drawRect(310, 80, 80, 80, eyeColor);
            renderer.drawRect(340, 110, 20, 20, pupilColor);
            return;
        }

        if (this.alpha <= 0) return;
        
        // Afterimage trail
        this.history.forEach((hist, i) => {
            const alphaMod = i === 0 ? 0.2 : (i === 1 ? 0.1 : 0.05);
            renderer.drawRect(
                hist.x, hist.y,
                this.width, this.height,
                `rgba(15, 12, 28, ${this.alpha * alphaMod})`
            );
        });

        // Undulating waver offset
        const waverX = Math.sin(this.tendrilTimer) * 2;
        const waverY = Math.cos(this.tendrilTimer * 0.8) * 2;
        
        // 1. Dark Smoky Wisp Body
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

        // Pixel glitch effect
        for (let i = 0; i < 4; i++) {
            const gx = this.x + Math.random() * this.width * 1.5 - this.width * 0.25;
            const gy = this.y + Math.random() * this.height;
            const gw = 2 + Math.random() * 2;
            const gh = 2 + Math.random() * 2;
            renderer.drawRect(gx, gy, gw, gh, `rgba(15, 12, 28, ${this.alpha * 0.8})`);
        }
        
        // 2. Trailing Tendrils
        const tendrilLen = (this.state === SHADOW_STATES.STALKING) ? 14 : 8;
        for (let i = 0; i < 3; i++) {
            const tx = this.x + 3 + i * 4 + Math.sin(this.tendrilTimer + i) * 3;
            renderer.drawRect(tx, this.y + this.height - 2, 2, tendrilLen + i * 2, `rgba(18, 14, 32, ${this.alpha * 0.7})`);
        }
        
        // 3. Piercing Haunting Eyes
        const eyeColor = `rgba(170, 190, 255, ${this.alpha * this.eyeGlow})`;
        const pupilColor = `rgba(220, 120, 255, ${this.alpha * this.eyeGlow})`;
        const splitEyes = (this.timer % 8 < 0.5);
        
        // Left eye
        renderer.drawRect(this.x + 3 + waverX, this.y + 7 + waverY, 3, 3, eyeColor);
        renderer.drawRect(this.x + 4 + waverX, this.y + 8 + waverY, 1, 1, pupilColor);
        if (splitEyes) {
            renderer.drawRect(this.x + 3 + waverX, this.y + 11 + waverY, 3, 3, eyeColor);
            renderer.drawRect(this.x + 4 + waverX, this.y + 12 + waverY, 1, 1, pupilColor);
        }
        
        // Right eye
        renderer.drawRect(this.x + 9 + waverX, this.y + 7 + waverY, 3, 3, eyeColor);
        renderer.drawRect(this.x + 10 + waverX, this.y + 8 + waverY, 1, 1, pupilColor);
        if (splitEyes) {
            renderer.drawRect(this.x + 9 + waverX, this.y + 11 + waverY, 3, 3, eyeColor);
            renderer.drawRect(this.x + 10 + waverX, this.y + 12 + waverY, 1, 1, pupilColor);
        }
        
        // Subtle eye halo
        renderer.drawRect(this.x + 2 + waverX, this.y + 6 + waverY, 11, 5, `rgba(130, 80, 255, ${this.alpha * 0.25})`);
    }
}
