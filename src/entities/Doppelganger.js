/**
 * @file Doppelganger.js
 * @description Psychological hallucination entity: a shadowy duplicate of the player
 * that lurks in the distance, mimics movements, and dissolves into ash when approached.
 */

import Entity from '../engine/Entity.js';
import SpriteRenderer from '../art/SpriteRenderer.js';
import { events } from '../core/EventBus.js';

export class Doppelganger extends Entity {
    constructor(x, y, facingRight = true) {
        super(x, y, 10, 17);
        this.type = 'doppelganger';
        this.facingRight = facingRight;
        this.timer = Math.random() * 10;
        this.isDissolving = false;
        this.dissolveTimer = 0;
        this.smokeParticles = [];
        this.spawnSanityThreshold = 70;
    }

    update(dt, input, scene) {
        this.timer += dt;

        // Update smoke dissolution particles
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.smokeParticles.splice(i, 1);
            }
        }

        if (this.isDissolving) {
            this.dissolveTimer -= dt;
            if (this.dissolveTimer <= 0 && this.smokeParticles.length === 0) {
                this.active = false;
            }
            return;
        }

        const player = scene.getPlayer();
        if (!player) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        // Turn to stare directly at player as they approach
        if (dist < 150) {
            this.facingRight = dx > 0;
        }

        // Dissolve into void smoke when player approaches or illuminates it
        const effectiveLightRadius = player.lightRadius || 150;
        if (dist <= 75 || (dist <= effectiveLightRadius * 0.7 && Math.abs(dy) < 40)) {
            this.dissolve(scene);
        }
    }

    dissolve(scene) {
        if (this.isDissolving) return;
        this.isDissolving = true;
        this.dissolveTimer = 0.5;

        // Spawn void smoke particles
        for (let i = 0; i < 22; i++) {
            this.smokeParticles.push({
                x: this.x + 5 + (Math.random() - 0.5) * 8,
                y: this.y + 8 + (Math.random() - 0.5) * 14,
                vx: (Math.random() - 0.5) * 80,
                vy: -30 - Math.random() * 60,
                life: 0.5 + Math.random() * 0.4,
                color: Math.random() < 0.5 ? '#1e293b' : '#0f172a'
            });
        }

        // Psychological audio shock
        if (scene && scene.audio) {
            if (scene.audio.buffers.has('phantom_whisper')) {
                scene.audio.play('phantom_whisper', { volume: 0.9 });
            } else if (scene.audio.buffers.has('whisper')) {
                scene.audio.play('whisper', { volume: 0.8 });
            }
        }

        // Camera tremor and subtle sanity shock
        if (scene && scene.postProcessing) {
            scene.postProcessing.addTrauma(0.28);
        }

        if (scene && scene.gameState) {
            scene.gameState.drainSanity(8);
        }

        events.emit('DOPPELGANGER_VANISHED', { x: this.x, y: this.y });
    }

    render(renderer) {
        // Draw void smoke particles
        for (const p of this.smokeParticles) {
            renderer.drawRect(p.x, p.y, 2, 2, p.color);
        }

        if (this.isDissolving) return;

        SpriteRenderer.drawDoppelganger(renderer, this.x, this.y, this.facingRight, this.timer);
    }
}
