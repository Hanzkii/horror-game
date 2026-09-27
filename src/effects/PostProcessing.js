export default class PostProcessing {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.shakeTrauma = 0;
        this.time = 0;
    }

    addTrauma(amount) {
        this.shakeTrauma = Math.min(this.shakeTrauma + amount, 1);
    }

    update(dt) {
        this.time += dt;
        if (this.shakeTrauma > 0) {
            this.shakeTrauma -= dt * 0.5; // decay
            if (this.shakeTrauma < 0) this.shakeTrauma = 0;
        }
    }

    applyScreenShake() {
        if (this.shakeTrauma <= 0) return { x: 0, y: 0 };
        const shake = this.shakeTrauma * this.shakeTrauma;
        const maxOffset = 20; // max pixel offset
        const offsetX = maxOffset * shake * (Math.random() * 2 - 1);
        const offsetY = maxOffset * shake * (Math.random() * 2 - 1);
        return { x: offsetX, y: offsetY };
    }

    render(playerPos, sanityLevel) {
        // Darkness and player light
        this.renderDarkness(playerPos, sanityLevel);
        
        // Sanity effects
        if (sanityLevel < 0.7) {
            this.renderSanityEffects(sanityLevel);
        }

        // Vignette
        this.renderVignette();

        // Scanlines
        this.renderScanlines();
    }

    renderDarkness(playerPos, sanityLevel) {
        const { ctx, width, height } = this;
        
        ctx.globalCompositeOperation = 'source-over';
        
        // Base darkness overlay
        const gradient = ctx.createRadialGradient(
            playerPos.x, playerPos.y, 10,
            playerPos.x, playerPos.y, 150 + Math.sin(this.time * 2) * 5 // breathing light
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    renderSanityEffects(sanityLevel) {
        const { ctx, width, height } = this;
        
        // Occasional flicker
        if (sanityLevel < 0.5 && Math.random() < 0.02 * (1 - sanityLevel)) {
            ctx.fillStyle = `rgba(200, 0, 0, 0.1)`;
            ctx.fillRect(0, 0, width, height);
        }

        // Noise grain overlay (simplified approach)
        if (Math.random() > sanityLevel) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.02 + (1 - sanityLevel) * 0.05})`;
            ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
            ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
        }
    }

    renderVignette() {
        const { ctx, width, height } = this;
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.3,
            width / 2, height / 2, Math.min(width, height) * 0.7
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    renderScanlines() {
        const { ctx, width, height } = this;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let y = 0; y < height; y += 4) {
            ctx.fillRect(0, y, width, 1);
        }
    }
}
