export default class HUD {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.fadeAlpha = 1;
        this.fadeTarget = 0;
        this.fadeSpeed = 1;
    }

    update(dt) {
        if (this.fadeAlpha !== this.fadeTarget) {
            const dir = Math.sign(this.fadeTarget - this.fadeAlpha);
            this.fadeAlpha += dir * this.fadeSpeed * dt;
            if ((dir > 0 && this.fadeAlpha > this.fadeTarget) || 
                (dir < 0 && this.fadeAlpha < this.fadeTarget)) {
                this.fadeAlpha = this.fadeTarget;
            }
        }
    }

    fadeToBlack(speed = 1) {
        this.fadeTarget = 1;
        this.fadeSpeed = speed;
    }

    fadeIn(speed = 1) {
        this.fadeTarget = 0;
        this.fadeSpeed = speed;
    }

    render(gameState) {
        const { ctx, width, height } = this;

        // Sanity indicator
        const sanityNorm = (gameState.sanity > 1) ? (gameState.sanity / (gameState.maxSanity || 100)) : gameState.sanity;
        if (sanityNorm < 1) {
            const intensity = 1 - sanityNorm;
            const gradient = ctx.createRadialGradient(
                width / 2, height / 2, height * 0.3,
                width / 2, height / 2, height * 0.7
            );
            gradient.addColorStop(0, 'rgba(100, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(150, 0, 0, ${intensity * 0.5})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }

        // Floor indicator
        if (gameState.currentLevel && gameState.floorIndex) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`FLOOR B${gameState.floorIndex}`, width - 10, 15);
        }

        // Interaction Prompt
        if (gameState.canInteract) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('[ E ] Interact', width / 2, height * 0.8);
        }

        // Note Reading Overlay
        if (gameState.activeNote) {
            ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
            ctx.fillStyle = '#ccc';
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            
            // Basic text wrapping simulation
            const lines = gameState.activeNote.split('\n');
            let y = height * 0.2;
            lines.forEach(line => {
                ctx.fillText(line, width * 0.15, y);
                y += 15;
            });
            
            ctx.textAlign = 'center';
            ctx.fillText('[ ESC ] Close', width / 2, height * 0.85);
        }

        // Pause Menu
        if (gameState.isPaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#fff';
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', width / 2, height * 0.4);
            ctx.font = '12px monospace';
            ctx.fillText('RESUME [ESC]', width / 2, height * 0.55);
            ctx.fillText('QUIT [Q]', width / 2, height * 0.65);
        }

        // Fade Overlay
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, width, height);
        }
    }
}
