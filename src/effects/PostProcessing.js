/**
 * @file PostProcessing.js
 * @description Modernized 2D pixel horror post-processing and lighting shader pipeline.
 * Features: Multi-point dynamic radial light cutouts, soft penumbra drop shadows,
 * volumetric illuminated dust motes/embers, water drip ripples, procedural 35mm film grain,
 * breathing vignette, analog scanlines, chromatic aberration, and camera trauma.
 */

export default class PostProcessing {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.shakeTrauma = 0;
        this.time = 0;

        // Dedicated offscreen darkness buffer for dynamic multi-light punchouts
        this.darknessCanvas = document.createElement('canvas');
        this.darknessCanvas.width = width;
        this.darknessCanvas.height = height;
        this.darknessCtx = this.darknessCanvas.getContext('2d');

        // Ambient Volumetric Dust & Soot Embers (illuminated when passing through light rays)
        this.motes = [];
        for (let i = 0; i < 55; i++) {
            this.motes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 6,
                vy: -2 - Math.random() * 5,
                size: Math.random() < 0.25 ? 2 : 1,
                alpha: 0.2 + Math.random() * 0.5,
                seed: Math.random() * 100
            });
        }

        // Ambient Water Drips (falling from dark subterranean ceilings)
        this.drips = [];
        for (let i = 0; i < 6; i++) {
            this.drips.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.4,
                vy: 50 + Math.random() * 60,
                active: false,
                respawnTimer: Math.random() * 6,
                splashTimer: 0,
                splashX: 0,
                splashY: 0
            });
        }
    }

    addTrauma(amount) {
        this.shakeTrauma = Math.min(this.shakeTrauma + amount, 1);
    }

    update(dt) {
        this.time += dt;
        if (this.shakeTrauma > 0) {
            this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 0.65); // decay
        }

        // Update volumetric dust motes
        for (const m of this.motes) {
            m.x += m.vx * dt + Math.sin(this.time * 1.5 + m.seed) * 0.15;
            m.y += m.vy * dt;
            if (m.y < -5) {
                m.y = this.height + 5;
                m.x = Math.random() * this.width;
            }
            if (m.x < -5) m.x = this.width + 5;
            if (m.x > this.width + 5) m.x = -5;
        }

        // Update ambient condensation water drips
        for (const d of this.drips) {
            if (d.splashTimer > 0) {
                d.splashTimer -= dt;
            } else if (d.active) {
                d.y += d.vy * dt;
                if (d.y >= this.height * 0.88 || Math.random() < 0.005) {
                    d.active = false;
                    d.splashTimer = 0.25;
                    d.splashX = d.x;
                    d.splashY = d.y;
                    d.respawnTimer = 2.5 + Math.random() * 5.0;
                }
            } else {
                d.respawnTimer -= dt;
                if (d.respawnTimer <= 0) {
                    d.active = true;
                    d.x = Math.random() * this.width;
                    d.y = 8 + Math.random() * 30;
                }
            }
        }
    }

    applyScreenShake() {
        if (this.shakeTrauma <= 0) return { x: 0, y: 0 };
        const shake = this.shakeTrauma * this.shakeTrauma;
        const maxOffset = 16;
        const offsetX = maxOffset * shake * (Math.random() * 2 - 1);
        const offsetY = maxOffset * shake * (Math.random() * 2 - 1);
        return { x: offsetX, y: offsetY };
    }

    render(playerPos, sanityLevel, additionalLights = [], shadowDistance = Infinity) {
        // 1. Dynamic darkness, radial light punchouts, and soft cast shadows
        this.renderDarkness(playerPos, sanityLevel, additionalLights, shadowDistance);

        // 2. Volumetric illuminated dust motes and ambient moisture drips
        this.renderVolumetrics(playerPos, additionalLights);

        // 3. Sanity degradation visual noise and chromatic flashes
        if (sanityLevel < 0.75) {
            this.renderSanityEffects(sanityLevel);
        }

        // 4. Proximity horror distortion when shadow lurker approaches
        if (shadowDistance < 220) {
            this.renderShadowProximity(shadowDistance);
        }

        // 5. Procedural 35mm film grain (keeps crisp pixel look with cinematic grit)
        this.renderFilmGrain();

        // 6. Breathing cinematic vignette
        this.renderVignette(sanityLevel);

        // 7. Subtle retro scanline pass
        this.renderScanlines();
    }

    renderDarkness(playerPos, sanityLevel, additionalLights = [], shadowDistance = Infinity) {
        const dctx = this.darknessCtx;
        const { width, height } = this;

        // 1. Clear & fill entire darkness canvas with rich atmospheric abyss tint
        dctx.globalCompositeOperation = 'source-over';
        dctx.fillStyle = 'rgba(4, 5, 10, 0.97)';
        dctx.fillRect(0, 0, width, height);

        // 2. Multi-point dynamic light punchouts using destination-out
        dctx.globalCompositeOperation = 'destination-out';

        // Organic player lantern cone with 3-harmonic breathing flicker
        const playerFlicker = Math.sin(this.time * 2.8) * 4 + Math.sin(this.time * 6.5) * 2;
        let playerRadius = 145 + playerFlicker;
        if (shadowDistance < 60) {
            playerRadius *= 0.72; // Suppressed by eldritch aura
        }

        const playerGrad = dctx.createRadialGradient(
            playerPos.x, playerPos.y, 6,
            playerPos.x, playerPos.y, playerRadius
        );
        playerGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        playerGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.88)');
        playerGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.45)');
        playerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        dctx.fillStyle = playerGrad;
        dctx.beginPath();
        dctx.arc(playerPos.x, playerPos.y, playerRadius, 0, Math.PI * 2);
        dctx.fill();

        // Additional light sources (Wall Torches, Altars, Holy Flames)
        for (const light of additionalLights) {
            const baseRad = light.radius || 80;
            const torchFlicker = Math.sin(this.time * 3.7 + light.x) * 3 + Math.sin(this.time * 8.9 + light.y) * 2;
            const rad = Math.max(25, baseRad + torchFlicker);

            const lgrad = dctx.createRadialGradient(
                light.x, light.y, 4,
                light.x, light.y, rad
            );
            lgrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
            lgrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.85)');
            lgrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.35)');
            lgrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
            dctx.fillStyle = lgrad;
            dctx.beginPath();
            dctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
            dctx.fill();

            // 2D Soft drop shadow / ground penumbra beneath light source
            dctx.globalCompositeOperation = 'source-over';
            const shadowY = light.y + 16;
            const penumbraGrad = dctx.createRadialGradient(
                light.x, shadowY, 2,
                light.x, shadowY, rad * 0.65
            );
            penumbraGrad.addColorStop(0, 'rgba(4, 5, 10, 0.45)');
            penumbraGrad.addColorStop(1, 'rgba(4, 5, 10, 0.0)');
            dctx.fillStyle = penumbraGrad;
            dctx.beginPath();
            dctx.ellipse(light.x, shadowY, rad * 0.6, 8, 0, 0, Math.PI * 2);
            dctx.fill();
            dctx.globalCompositeOperation = 'destination-out';
        }

        // 3. Composite darkness buffer onto main buffer
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.drawImage(this.darknessCanvas, 0, 0);

        // 4. Modern Additive Specular Bloom & Radiant Torch Halos
        this.ctx.globalCompositeOperation = 'screen';
        for (const light of additionalLights) {
            const rad = (light.radius || 80) * 0.75;
            const warmBloom = this.ctx.createRadialGradient(
                light.x, light.y, 2,
                light.x, light.y, rad
            );
            warmBloom.addColorStop(0, 'rgba(255, 180, 80, 0.35)');
            warmBloom.addColorStop(0.4, 'rgba(255, 120, 30, 0.15)');
            warmBloom.addColorStop(1, 'rgba(200, 60, 10, 0.0)');
            this.ctx.fillStyle = warmBloom;
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Player subtle lantern glow
        const playerBloom = this.ctx.createRadialGradient(
            playerPos.x, playerPos.y, 2,
            playerPos.x, playerPos.y, 60
        );
        playerBloom.addColorStop(0, 'rgba(210, 230, 255, 0.18)');
        playerBloom.addColorStop(1, 'rgba(150, 180, 240, 0.0)');
        this.ctx.fillStyle = playerBloom;
        this.ctx.beginPath();
        this.ctx.arc(playerPos.x, playerPos.y, 60, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.globalCompositeOperation = 'source-over';
    }

    renderVolumetrics(playerPos, additionalLights = []) {
        const { ctx } = this;

        // Render floating dust motes & burning embers
        for (const m of this.motes) {
            // Check illumination from player or nearby torches
            let illuminated = false;
            let emberColor = 'rgba(220, 235, 255, ';

            const dPlayer = Math.hypot(m.x - playerPos.x, m.y - playerPos.y);
            if (dPlayer < 120) {
                illuminated = true;
                const bright = (1 - dPlayer / 120) * m.alpha;
                ctx.fillStyle = `${emberColor}${bright})`;
            } else {
                for (const l of additionalLights) {
                    const dLight = Math.hypot(m.x - l.x, m.y - l.y);
                    if (dLight < (l.radius || 80)) {
                        illuminated = true;
                        const bright = (1 - dLight / (l.radius || 80)) * m.alpha;
                        ctx.fillStyle = `rgba(255, 190, 90, ${bright * 1.2})`;
                        break;
                    }
                }
            }

            if (illuminated) {
                ctx.fillRect(Math.floor(m.x), Math.floor(m.y), m.size, m.size);
            }
        }

        // Render ambient condensation water drips
        ctx.fillStyle = 'rgba(180, 210, 240, 0.6)';
        for (const d of this.drips) {
            if (d.active) {
                ctx.fillRect(Math.floor(d.x), Math.floor(d.y), 1, 2);
            } else if (d.splashTimer > 0) {
                const splashRad = Math.round((0.25 - d.splashTimer) * 16);
                ctx.strokeStyle = `rgba(160, 200, 230, ${d.splashTimer * 2.5})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(d.splashX - splashRad, d.splashY - 1, splashRad * 2, 2);
            }
        }
    }

    renderFilmGrain() {
        const { ctx, width, height } = this;
        // Procedural film grain pass: 75 micro-specks rendered each frame
        ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
        for (let i = 0; i < 70; i++) {
            const rx = (Math.random() * width) | 0;
            const ry = (Math.random() * height) | 0;
            ctx.fillRect(rx, ry, 1, 1);
        }
    }

    renderVignette(sanityLevel = 1.0) {
        const { ctx, width, height } = this;
        // Pulse breathing vignette with player panic / sanity
        const panicBreath = Math.sin(this.time * 2.0) * (0.04 * (1 - sanityLevel));
        const innerRad = Math.min(width, height) * (0.34 - panicBreath);
        const outerRad = Math.min(width, height) * (0.76 + panicBreath);

        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, innerRad,
            width / 2, height / 2, outerRad
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(2, 2, 6, 0.45)');
        gradient.addColorStop(1, 'rgba(2, 2, 6, 0.92)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    renderScanlines() {
        const { ctx, width, height } = this;
        // Subtle, elegant scanline overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        for (let y = 0; y < height; y += 3) {
            ctx.fillRect(0, y, width, 1);
        }
    }

    renderSanityEffects(sanityLevel) {
        const { ctx, width, height } = this;

        // Red panic vignette pulse
        if (sanityLevel < 0.45 && Math.random() < (0.05 * (1 - sanityLevel))) {
            ctx.fillStyle = 'rgba(160, 20, 20, 0.12)';
            ctx.fillRect(0, 0, width, height);
        }

        // Analog glitch artifacts
        if (Math.random() > sanityLevel) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + (1 - sanityLevel) * 0.06})`;
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(Math.random() * width, Math.random() * height, 2, 1);
            }
        }
    }

    renderShadowProximity(distance) {
        const { ctx, width, height } = this;
        
        // Chromatic aberration
        const intensity = (220 - distance) / 220; 
        const offset = distance < 60 ? 3 + Math.random() : 1 + Math.random();

        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 5 + intensity * 15; i++) {
            const y = Math.random() * height;
            const h = 1 + Math.random() * 3;
            ctx.fillStyle = `rgba(255, 0, 0, ${0.12 * intensity})`;
            ctx.fillRect(offset, y, width, h);
            ctx.fillStyle = `rgba(0, 0, 255, ${0.12 * intensity})`;
            ctx.fillRect(-offset, y, width, h);
        }
        ctx.globalCompositeOperation = 'source-over';

        if (distance < 120) {
            // Analog VHS screen tear
            const numTears = distance < 60 ? 4 + Math.random() * 3 : 2 + Math.random();
            for (let i = 0; i < numTears; i++) {
                const y = Math.random() * height;
                const h = 2 + Math.random() * 4;
                const shift = (Math.random() < 0.5 ? 1 : -1) * (2 + Math.random() * 4);
                
                ctx.drawImage(ctx.canvas, 0, y, width, h, shift, y, width, h);
                
                ctx.fillStyle = 'rgba(0,0,0,1)';
                if (shift > 0) {
                    ctx.fillRect(0, y, shift, h);
                } else {
                    ctx.fillRect(width + shift, y, -shift, h);
                }
            }

            // Static noise
            const staticDots = distance < 60 ? 140 : 45;
            for (let i = 0; i < staticDots; i++) {
                ctx.fillStyle = Math.random() < 0.5 ? 'white' : `hsl(${Math.random()*360}, 100%, 50%)`;
                ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
            }
        }

        if (distance < 60) {
            // Brief screen inversion flashes
            if (Math.random() < 0.01) {
                ctx.globalCompositeOperation = 'difference';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'source-over';
            }
        }
    }
}
