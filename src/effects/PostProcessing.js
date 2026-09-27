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

    render(playerPos, sanityLevel, additionalLights = []) {
        // Darkness and dynamic multi-light sources
        this.renderDarkness(playerPos, sanityLevel, additionalLights);

        // Sanity degradation visual noise and chromatic flashes
        if (sanityLevel < 0.75) {
            this.renderSanityEffects(sanityLevel);
        }

        // Vignette
        this.renderVignette();

        // Retro scanlines
        this.renderScanlines();
    }

    renderDarkness(playerPos, sanityLevel, additionalLights = []) {
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
        const playerRadius = 150 + breathFlicker;
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
