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

        // Interaction Prompt - hidden when reading notes or paused
        if (gameState.canInteract && !gameState.activeNote && !gameState.isPaused) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('[ E ] Interact', width / 2, height * 0.82);
        }

        // Note Reading Overlay with responsive word-wrapping
        if (gameState.activeNote) {
            const boxX = Math.round(width * 0.08);
            const boxY = Math.round(height * 0.08);
            const boxW = Math.round(width * 0.84);
            const boxH = Math.round(height * 0.84);
            
            // Dark parchment box background
            ctx.fillStyle = 'rgba(12, 12, 16, 0.95)';
            ctx.fillRect(boxX, boxY, boxW, boxH);
            
            // Double decorative border
            ctx.strokeStyle = '#4a443a';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, boxW, boxH);
            
            ctx.strokeStyle = '#2d2922';
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX + 3, boxY + 3, boxW - 6, boxH - 6);

            // Corner ornamental accents
            ctx.fillStyle = '#6a5e4d';
            ctx.fillRect(boxX + 2, boxY + 2, 4, 4);
            ctx.fillRect(boxX + boxW - 6, boxY + 2, 4, 4);
            ctx.fillRect(boxX + 2, boxY + boxH - 6, 4, 4);
            ctx.fillRect(boxX + boxW - 6, boxY + boxH - 6, 4, 4);

            // Note Text styling
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            
            const paddingX = 18;
            const startX = boxX + paddingX;
            const maxLineWidth = boxW - paddingX * 2;
            let currentY = boxY + 24;
            const lineHeight = 14;

            // Full paragraph and word-wrapping algorithm
            const paragraphs = gameState.activeNote.split('\n');
            for (let p = 0; p < paragraphs.length; p++) {
                const paragraph = paragraphs[p];
                if (paragraph.trim() === '') {
                    currentY += lineHeight * 0.6;
                    continue;
                }

                // Give header/title lines subtle warm accent
                const isHeader = paragraph.startsWith('Seed #') || paragraph.includes('JOURNAL') || paragraph.includes('SEALED');
                ctx.fillStyle = isHeader ? '#e8d8b8' : '#c8c2b5';

                const words = paragraph.split(' ');
                let currentLine = '';

                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    const testLine = currentLine.length === 0 ? word : currentLine + ' ' + word;
                    const testWidth = ctx.measureText(testLine).width;

                    if (testWidth > maxLineWidth && currentLine.length > 0) {
                        ctx.fillText(currentLine, startX, currentY);
                        currentY += lineHeight;
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }

                if (currentLine.length > 0) {
                    ctx.fillText(currentLine, startX, currentY);
                    currentY += lineHeight;
                }
            }
            
            // Footer close hint
            ctx.fillStyle = '#7a7065';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('[ E / ESC / SPACE ] Close', width / 2, boxY + boxH - 10);
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
