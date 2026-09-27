/**
 * @file Shadow.js
 * @description Dynamic horror stalker entity.
 * Stays DORMANT until awakened by puzzle interactions (pulling levers, discovering cursed notes).
 * Can be escaped by outrunning (>280px) or seeking refuge in torchlight sanctuaries.
 */

import Entity from '../engine/Entity.js';

export const SHADOW_STATES = {
    DORMANT: 0,
    AWAKENING: 1,
    STALKING: 2,
    OBSERVING: 3,
    CONFRONTING: 4,
    DISPERSING: 5
};

export class Shadow extends Entity {
    constructor(x, y) {
        super(x, y, 16, 32);
        this.type = 'shadow';
        
        this.homeX = x;
        this.homeY = y;
        
        // Starts DORMANT: waiting for a puzzle trigger / surprise awakening
        this.state = SHADOW_STATES.DORMANT;
        this.alpha = 0;
        this.timer = 0;
        this.stalkSpeed = 55; // creeps forward quietly
        this.rushSpeed = 120;
        
        // Visuals
        this.eyeGlow = 0;
        this.tendrilTimer = 0;
        
        // Audio, Trauma & Hunt timers
        this.soundCooldown = 0;
        this.breathCooldown = 0;
        this.jumpScareTimer = 0;
        this.freezeTimer = 0;
        this.teleportBehindTimer = 15.0;
        this.stalkTimer = 0;       // Max duration of an active hunt
        this.escapeTimer = 0;      // Time held out of range before losing trail
        
        this.lastPlayerDist = Infinity;
        this.history = [];
        this.originalLights = null;
        this.burnParticles = [];
    }

    getDistanceToPlayer() {
        return this.lastPlayerDist;
    }

    /**
     * Sizzles, screeches, and completely despawns when entering or touching holy torchlight.
     * @param {Scene} scene 
     * @param {Object} light 
     */
    despawnInLight(scene, light) {
        if (this.state === SHADOW_STATES.DORMANT) return;

        // Spawn fiery burst of disintegrating shadow particles
        for (let i = 0; i < 28; i++) {
            this.burnParticles.push({
                x: this.x + 8 + (Math.random() - 0.5) * 16,
                y: this.y + 16 + (Math.random() - 0.5) * 24,
                vx: (Math.random() - 0.5) * 150,
                vy: -50 - Math.random() * 100,
                life: 0.7 + Math.random() * 0.4,
                maxLife: 1.1,
                color: Math.random() < 0.65 ? '#ffaa33' : '#4a2060'
            });
        }

        // Screech and burning sizzle sound
        if (scene && scene.audio) {
            scene.audio.play('shadow_burn');
            scene.audio.play('shadow_scream');
        }

        // Camera trauma flash
        if (scene && scene.postProcessing) {
            scene.postProcessing.addTrauma(0.5);
        }

        // Notify HUD
        if (scene && scene.gameState) {
            scene.gameState.sanctuaryPromptTimer = 2.5;
        }

        // Restore any flickering torchlights
        if (this.originalLights && scene && scene.lights) {
            for (let i = 0; i < scene.lights.length; i++) {
                if (this.originalLights[i] !== undefined && scene.lights[i]) {
                    scene.lights[i].radius = this.originalLights[i];
                }
            }
            this.originalLights = null;
        }

        // Instantly banish back to dormancy!
        this.state = SHADOW_STATES.DORMANT;
        this.alpha = 0;
        this.lastPlayerDist = Infinity;
        this.stalkTimer = 0;
        this.escapeTimer = 0;
    }

    /**
     * Awaken the shadow from dormancy upon interacting with a puzzle or cursed note.
     * @param {Entity} player 
     * @param {Scene} scene 
     * @param {string} reason - 'lever', 'note', 'curse'
     */
    awaken(player, scene, reason = 'lever') {
        if (this.state !== SHADOW_STATES.DORMANT && this.state !== SHADOW_STATES.DISPERSING) {
            return; // Already active
        }

        if (player) {
            // Spawn at an ominous distance (~230-270px) behind player or in dark corridor
            const spawnDir = player.facingRight ? -1 : 1;
            this.x = player.x + spawnDir * (220 + Math.random() * 50);
            this.y = player.y - 8;
            this.homeX = this.x;
            this.homeY = this.y;
        }

        this.state = SHADOW_STATES.AWAKENING;
        this.alpha = 0.1;
        this.eyeGlow = 1.0;
        this.stalkTimer = 22.0; // 22-second stalking window before it naturally dissolves
        this.escapeTimer = 0;

        // Suspense stinger audio cue
        if (scene && scene.audio) {
            if (reason === 'lever') {
                scene.audio.play('stinger_sharp');
            } else {
                scene.audio.play('dissonance');
            }
        }

        if (scene && scene.postProcessing) {
            scene.postProcessing.addTrauma(0.5);
        }
    }

    /**
     * Banish / escape the shadow back to dormancy.
     * @param {string} reason - 'light', 'distance', 'timeout', 'respawn', 'confrontation'
     * @param {Scene} scene 
     */
    banish(reason = 'distance', scene = null) {
        if (this.state === SHADOW_STATES.DORMANT) return;

        this.state = SHADOW_STATES.DISPERSING;
        this.stalkTimer = 0;
        this.escapeTimer = 0;

        // Restore any flickering torchlights
        if (this.originalLights && scene && scene.lights) {
            for (let i = 0; i < scene.lights.length; i++) {
                if (this.originalLights[i] !== undefined && scene.lights[i]) {
                    scene.lights[i].radius = this.originalLights[i];
                }
            }
            this.originalLights = null;
        }

        if (scene && scene.audio) {
            if (reason === 'light') {
                scene.audio.play('shadow_scream');
            } else if (reason === 'distance' || reason === 'timeout') {
                scene.audio.play('breathing');
            }
        }
    }
    
    update(dt, input, scene) {
        // Update burn / disintegrating particles
        for (let i = this.burnParticles.length - 1; i >= 0; i--) {
            const p = this.burnParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.burnParticles.splice(i, 1);
            }
        }

        // 1. DORMANT: Completely quiet and hidden
        if (this.state === SHADOW_STATES.DORMANT) {
            this.alpha = 0;
            this.lastPlayerDist = Infinity;
            return;
        }

        this.timer += dt;
        this.tendrilTimer += dt * 3;
        this.soundCooldown = Math.max(0, this.soundCooldown - dt);
        this.breathCooldown = Math.max(0, this.breathCooldown - dt);

        // 2. DISPERSING: Fading out to dormancy
        if (this.state === SHADOW_STATES.DISPERSING) {
            this.alpha -= dt * 1.5;
            if (this.alpha <= 0) {
                this.alpha = 0;
                this.state = SHADOW_STATES.DORMANT;
                this.lastPlayerDist = Infinity;
            }
            return;
        }

        // 3. AWAKENING: Emerging from darkness
        if (this.state === SHADOW_STATES.AWAKENING) {
            this.alpha += dt * 2.0;
            if (this.alpha >= 0.9) {
                this.alpha = 0.9;
                this.state = SHADOW_STATES.STALKING;
            }
        }
        
        // Confrontation Jump Scare recovery
        if (this.jumpScareTimer > 0) {
            this.jumpScareTimer -= dt;
            if (this.jumpScareTimer <= 0) {
                // After the confrontation, the shadow dissolves rather than spawn-camping!
                this.banish('confrontation', scene);
            }
            return;
        }

        // Freeze-frame hesitation
        if (this.freezeTimer > 0) {
            this.freezeTimer -= dt;
            if (this.freezeTimer <= 0) {
                const player = scene.getPlayer();
                if (player) {
                    const dir = Math.sign(player.x - this.x);
                    this.x += dir * 25; // snap closer
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

        // Restore lights from previous frame
        if (this.originalLights && scene.lights) {
            for (let i = 0; i < scene.lights.length; i++) {
                if (this.originalLights[i] !== undefined && scene.lights[i]) {
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
        
        // Floating hover motion
        this.y = this.homeY + Math.sin(this.timer * 2.5) * 4;

        // --- ESCAPE / DESPAWN MECHANIC 1: TORCHES & SACRED FLAMES ---
        // Torches automatically despawn shadow lurkers upon collision/proximity, and shadow lurkers actively avoid flames!
        if (scene && scene.entities) {
            for (const ent of scene.entities) {
                const isTorch = ent.type === 'interactable' && (ent.interactType === 3 || ent.properties?.interactType === 3);
                if (!isTorch) continue;

                const torchCenterX = ent.x + ent.width / 2;
                const torchCenterY = ent.y + ent.height / 2;
                const shadowCenterX = this.x + this.width / 2;
                const shadowCenterY = this.y + this.height / 2;
                const playerCenterX = player.x + player.width / 2;
                const playerCenterY = player.y + player.height / 2;

                const distShadowToTorch = Math.hypot(shadowCenterX - torchCenterX, shadowCenterY - torchCenterY);
                const distPlayerToTorch = Math.hypot(playerCenterX - torchCenterX, playerCenterY - torchCenterY);

                // 1. DESPAWN / BANISH: If shadow collides with or approaches flame (<70px) OR player reaches sanctuary near torch (<60px):
                if (distShadowToTorch < 70 || distPlayerToTorch < 60) {
                    this.despawnInLight(scene, { x: torchCenterX, y: torchCenterY, radius: 85 });
                    return;
                }

                // 2. FLAME AVOIDANCE: If shadow gets near the flame (between 70px and 150px):
                // Shadow actively fears fire — steers away with repellent force!
                if (distShadowToTorch < 150) {
                    const avoidDir = Math.sign(shadowCenterX - torchCenterX) || 1;
                    this.x += avoidDir * (120 * dt);
                    this.homeX = this.x;
                    
                    if (this.soundCooldown <= 0) {
                        if (scene && scene.audio) scene.audio.play('whisper');
                        this.soundCooldown = 1.8;
                    }
                }
            }
        }

        // --- ESCAPE MECHANIC 2: OUTRUNNING / BREAKING DISTANCE ---
        // If the player creates distance (>280px) and maintains it, the shadow loses the trail!
        if (dist > 280) {
            this.escapeTimer += dt;
            if (this.escapeTimer >= 3.5) {
                this.banish('distance', scene);
                return;
            }
        } else {
            this.escapeTimer = Math.max(0, this.escapeTimer - dt * 2);
        }

        // --- ESCAPE MECHANIC 3: HUNT TIMER EXPIRATION ---
        this.stalkTimer -= dt;
        if (this.stalkTimer <= 0) {
            this.banish('timeout', scene);
            return;
        }

        // Light Interference when lurking nearby
        if (dist < 150 && scene.lights) {
            this.originalLights = [];
            for (let i = 0; i < scene.lights.length; i++) {
                this.originalLights[i] = scene.lights[i].radius;
                scene.lights[i].radius *= (1 - (0.2 + Math.random() * 0.4));
            }
        }
        
        // --- ACTIVE STALKING LOGIC ---
        if (dist < 500) {
            if (!facingShadow && dist > 60) {
                // Player's back is turned: CREEP CLOSER!
                const dir = Math.sign(dx);
                let speed = this.stalkSpeed;
                if (scene.gameState && scene.gameState.sanity < 0.5) speed = this.rushSpeed;
                
                this.x += dir * speed * dt;
                this.eyeGlow = Math.min(1.0, this.eyeGlow + dt * 2);

                if (Math.random() < 0.005) {
                    this.freezeTimer = 0.5; // Occasional hesitation
                }
            } else if (facingShadow) {
                // Player stares down the shadow: freezes and wavers
                this.eyeGlow = 0.7 + Math.sin(this.timer * 8) * 0.3;
            }

            // Unpredictable teleport behind
            if (!facingShadow && this.teleportBehindTimer <= 0) {
                this.teleportBehindTimer = 15.0;
                if (Math.random() < 0.4) {
                    this.x = player.x + (player.facingRight ? -80 : 80);
                    this.homeX = this.x;
                }
            } else if (facingShadow) {
                this.teleportBehindTimer = 15.0;
            }
            
            // Audio tension trigger when stalker gets close
            if (dist < 180 && this.soundCooldown <= 0) {
                if (scene.audio) scene.audio.play('dissonance');
                this.soundCooldown = 4.0;
            }

            if (dist < 100 && this.breathCooldown <= 0) {
                if (scene.audio) scene.audio.play('breathing');
                this.breathCooldown = 2.5;
            }
            
            // Drain sanity proportional to proximity
            if (dist < 140 && scene.gameState) {
                const drainMultiplier = (140 - dist) / 140;
                scene.gameState.drainSanity(dt * (3 + drainMultiplier * 8));
            }
            
            // CONFRONTATION: Caught the player!
            if (dist < 32) {
                if (!player.invulnerableTimer || player.invulnerableTimer <= 0) {
                    const knockDir = dx < 0 ? -1 : 1;
                    if (typeof player.onShadowHit === 'function') {
                        player.onShadowHit(knockDir);
                    }

                    if (scene.audio) {
                        scene.audio.play('shadow_hit');
                        scene.audio.play('shadow_scream');
                    }

                    if (scene.gameState) {
                        scene.gameState.takeDamage(45);
                        scene.gameState.drainSanity(35);

                        // If lethal, respawn and reset all puzzles!
                        if (scene.gameState.health <= 0) {
                            scene.respawnPlayer();
                            return;
                        }
                    }

                    if (scene.postProcessing) {
                        scene.postProcessing.addTrauma(1.0);
                    }

                    this.jumpScareTimer = 0.45;
                }

                this.banish('confrontation', scene);
                return;
            }
        }
    }
    
    render(renderer) {
        // Render burn / disintegrating particles in world coordinates
        for (const p of this.burnParticles) {
            renderer.drawRect(p.x, p.y, 2, 2, p.color);
        }

        if (this.jumpScareTimer > 0) return;
        if (this.alpha <= 0.01) return;
        
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
        
        // Eye halo
        renderer.drawRect(this.x + 2 + waverX, this.y + 6 + waverY, 11, 5, `rgba(130, 80, 255, ${this.alpha * 0.25})`);
    }
}
