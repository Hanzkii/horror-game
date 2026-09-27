/**
 * @file PostProcessing.js
 * @description Atmospheric horror post-processing: Multi-point dynamic light cutouts (torches & player lantern),
 * vignette, scanlines, camera trauma shake, and sanity distortions.
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
    }

    addTrauma(amount) {
        this.shakeTrauma = Math.min(this.shakeTrauma + amount, 1);
    }

    update(dt) {
        this.time += dt;
        if (this.shakeTrauma > 0) {
            this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 0.6); // decay
        }
    }

    applyScreenShake() {
        if (this.shakeTrauma <= 0) return { x: 0, y: 0 };
        const shake = this.shakeTrauma * this.shakeTrauma;
        const maxOffset = 18;
        const offsetX = maxOffset * shake * (Math.random() * 2 - 1);
        const offsetY = maxOffset * shake * (Math.random() * 2 - 1);
        return { x: offsetX, y: offsetY };
    }

    render(playerPos, sanityLevel, additionalLights = [], shadowDistance = Infinity) {
        // Darkness and dynamic multi-light sources
        this.renderDarkness(playerPos, sanityLevel, additionalLights, shadowDistance);

        // Sanity degradation visual noise and chromatic flashes
        if (sanityLevel < 0.75) {
            this.renderSanityEffects(sanityLevel);
        }

        if (shadowDistance < 200) {
            this.renderShadowProximity(shadowDistance);
        }

        // Vignette
        this.renderVignette();

        // Retro scanlines
        this.renderScanlines();
    }

    renderShadowProximity(distance) {
        const { ctx, width, height } = this;
        
        // Chromatic aberration
        const intensity = (200 - distance) / 200; 
        const offset = distance < 60 ? 3 + Math.random() : 1 + Math.random();

        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 5 + intensity * 15; i++) {
            const y = Math.random() * height;
            const h = 1 + Math.random() * 4;
            ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * intensity})`;
            ctx.fillRect(offset, y, width, h);
            ctx.fillStyle = `rgba(0, 0, 255, ${0.1 * intensity})`;
            ctx.fillRect(-offset, y, width, h);
        }
        ctx.globalCompositeOperation = 'source-over';

        if (distance < 120) {
            // Screen tear
            const numTears = distance < 60 ? 4 + Math.random() * 3 : 2 + Math.random();
            for (let i = 0; i < numTears; i++) {
                const y = Math.random() * height;
                const h = 3 + Math.random() * 5;
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
            const staticDots = distance < 60 ? 150 : 50;
            for (let i = 0; i < staticDots; i++) {
                ctx.fillStyle = Math.random() < 0.5 ? 'white' : `hsl(${Math.random()*360}, 100%, 50%)`;
                ctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.random(), 1 + Math.random());
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

    renderDarkness(playerPos, sanityLevel, additionalLights = [], shadowDistance = Infinity) {
        const dctx = this.darknessCtx;
        const { width, height } = this;

        // 1. Fill entire darkness canvas with deep black
        dctx.globalCompositeOperation = 'source-over';
        dctx.fillStyle = 'rgba(4, 4, 8, 0.98)';
        dctx.fillRect(0, 0, width, height);

        // 2. Punch out holes of light using destination-out
        dctx.globalCompositeOperation = 'destination-out';

        // Punch out Player's lantern cone
        const breathFlicker = Math.sin(this.time * 2.5) * 5;
        let playerRadius = 150 + breathFlicker;
        if (shadowDistance < 60) {
            playerRadius *= 0.7; // Shrink by 30%
        }
        const playerGrad = dctx.createRadialGradient(
            playerPos.x, playerPos.y, 8,
            playerPos.x, playerPos.y, playerRadius
        );
        playerGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        playerGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.75)');
        playerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        dctx.fillStyle = playerGrad;
        dctx.beginPath();
        dctx.arc(playerPos.x, playerPos.y, playerRadius, 0, Math.PI * 2);
        dctx.fill();

        // Punch out additional light sources (Torches, Lanterns, Runes)
        for (const light of additionalLights) {
            const rad = light.radius || 75;
            const lgrad = dctx.createRadialGradient(
                light.x, light.y, 4,
                light.x, light.y, rad
            );
            lgrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
            lgrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
            lgrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
            dctx.fillStyle = lgrad;
            dctx.beginPath();
            dctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
            dctx.fill();
        }

        // 3. Composite darkness buffer onto main buffer
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.drawImage(this.darknessCanvas, 0, 0);

        // 4. Subtle warm glow on torches
        for (const light of additionalLights) {
            const rad = (light.radius || 75) * 0.7;
            const warmGrad = this.ctx.createRadialGradient(
                light.x, light.y, 2,
                light.x, light.y, rad
            );
            warmGrad.addColorStop(0, 'rgba(255, 150, 50, 0.18)');
            warmGrad.addColorStop(1, 'rgba(255, 100, 20, 0.0)');
            this.ctx.fillStyle = warmGrad;
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderSanityEffects(sanityLevel) {
        const { ctx, width, height } = this;

        // Red border panic pulse
        if (sanityLevel < 0.45 && Math.random() < (0.04 * (1 - sanityLevel))) {
            ctx.fillStyle = 'rgba(180, 20, 20, 0.15)';
            ctx.fillRect(0, 0, width, height);
        }

        // Analog grain artifacts
        if (Math.random() > sanityLevel) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + (1 - sanityLevel) * 0.06})`;
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
            }
        }
    }

    renderVignette() {
        const { ctx, width, height } = this;
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.35,
            width / 2, height / 2, Math.min(width, height) * 0.75
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    renderScanlines() {
        const { ctx, width, height } = this;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let y = 0; y < height; y += 4) {
            ctx.fillRect(0, y, width, 1);
        }
    }
}
