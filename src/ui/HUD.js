export default class HUD {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.fadeAlpha = 1;
        this.fadeTarget = 0;
        this.fadeSpeed = 1;
        this.pauseAction = null;
        this.requestedPause = false;
    }

    getPauseAction() {
        const action = this.pauseAction;
        this.pauseAction = null;
        return action;
    }

    getRequestedPause() {
        const req = this.requestedPause;
        this.requestedPause = false;
        return req;
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

    render(gameState, input = null) {
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

        // Survival HUD (Health & Sanity indicators)
        if (gameState.health !== undefined) {
            const maxHp = gameState.maxHealth || 100;
            const hpNorm = Math.max(0, Math.min(1, gameState.health / maxHp));
            
            // Health bar container
            ctx.fillStyle = 'rgba(10, 10, 15, 0.7)';
            ctx.fillRect(10, 8, 62, 6);
            ctx.strokeStyle = '#442222';
            ctx.lineWidth = 1;
            ctx.strokeRect(10, 8, 62, 6);
            
            // Health fill
            ctx.fillStyle = hpNorm < 0.35 ? '#ff2222' : '#cc3344';
            ctx.fillRect(11, 9, Math.round(hpNorm * 60), 4);

            // Sanity bar container
            const maxSanity = gameState.maxSanity || 100;
            const sanNorm = Math.max(0, Math.min(1, gameState.sanity / maxSanity));
            ctx.fillStyle = 'rgba(10, 10, 15, 0.7)';
            ctx.fillRect(10, 17, 62, 5);
            ctx.strokeStyle = '#223344';
            ctx.lineWidth = 1;
            ctx.strokeRect(10, 17, 62, 5);

            // Sanity fill
            ctx.fillStyle = '#6688cc';
            ctx.fillRect(11, 18, Math.round(sanNorm * 60), 3);
        }

        // Sanctuary Banner
        if (gameState.sanctuaryPromptTimer && gameState.sanctuaryPromptTimer > 0) {
            gameState.sanctuaryPromptTimer = Math.max(0, gameState.sanctuaryPromptTimer - 0.016);
            const bannerAlpha = Math.min(1.0, gameState.sanctuaryPromptTimer);
            ctx.fillStyle = `rgba(255, 215, 110, ${bannerAlpha * 0.95})`;
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SANCTUARY — The holy flame banished the shadow', width / 2, 28);
        }

        // Floor indicator & Clickable Pause Button in top right
        if (gameState.isTestLevel) {
            ctx.fillStyle = '#ffaa44';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('[TEST LEVEL MODE]', width - 62, 16);
        } else if (gameState.currentLevel && gameState.floorIndex) {
            ctx.fillStyle = gameState.isPublishedMap ? '#58a6ff' : 'rgba(255, 255, 255, 0.6)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(gameState.isPublishedMap ? `B${gameState.floorIndex} [COMMUNITY]` : `FLOOR B${gameState.floorIndex}`, width - 62, 16);
        }

        // Clickable Pause Button in top right
        const pauseBtnX = width - 54;
        const pauseBtnY = 6;
        const pauseBtnW = 44;
        const pauseBtnH = 15;
        let isHoverPause = false;
        if (input) {
            const m = input.getMousePos();
            if (m.x >= pauseBtnX && m.x <= pauseBtnX + pauseBtnW && m.y >= pauseBtnY && m.y <= pauseBtnY + pauseBtnH) {
                isHoverPause = true;
                if (input.isMouseClicked && input.isMouseClicked()) {
                    this.requestedPause = true;
                }
            }
        }
        ctx.fillStyle = isHoverPause ? 'rgba(255, 255, 255, 0.2)' : 'rgba(20, 20, 30, 0.6)';
        ctx.fillRect(pauseBtnX, pauseBtnY, pauseBtnW, pauseBtnH);
        ctx.strokeStyle = isHoverPause ? '#ffffff' : '#444455';
        ctx.lineWidth = 1;
        ctx.strokeRect(pauseBtnX, pauseBtnY, pauseBtnW, pauseBtnH);
        ctx.fillStyle = isHoverPause ? '#ffffff' : '#888899';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', pauseBtnX + pauseBtnW / 2, pauseBtnY + 11);

        // Interaction Prompt - hidden when reading notes or paused
        if (gameState.canInteract && !gameState.activeNote && !gameState.isPaused) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('[ CLICK ] or [ E ] Interact', width / 2, height * 0.82);
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
            
            // Top-right Close Button
            const closeBtnW = 54;
            const closeBtnH = 16;
            const closeBtnX = boxX + boxW - closeBtnW - 8;
            const closeBtnY = boxY + 8;
            let isHoverClose = false;
            if (input) {
                const m = input.getMousePos();
                if (m.x >= closeBtnX && m.x <= closeBtnX + closeBtnW && m.y >= closeBtnY && m.y <= closeBtnY + closeBtnH) {
                    isHoverClose = true;
                    if (input.isMouseClicked && input.isMouseClicked()) {
                        gameState.activeNote = null;
                    }
                }
            }
            ctx.fillStyle = isHoverClose ? 'rgba(200, 50, 50, 0.45)' : 'rgba(30, 30, 40, 0.65)';
            ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
            ctx.strokeStyle = isHoverClose ? '#ff7777' : '#554433';
            ctx.lineWidth = 1;
            ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
            ctx.fillStyle = isHoverClose ? '#ffffff' : '#c0b090';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('✖ CLOSE', closeBtnX + closeBtnW / 2, closeBtnY + 11);

            // Footer close hint
            ctx.fillStyle = '#8a8075';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('[ CLICK ANYWHERE / SPACE / E / ESC ] TO CLOSE', width / 2, boxY + boxH - 10);
        }

        // Pause Menu with full mouse interaction
        if (gameState.isPaused) {
            ctx.fillStyle = 'rgba(6, 6, 10, 0.85)';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#ffffff';
            ctx.font = '22px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', width / 2, height * 0.35);

            const m = input ? input.getMousePos() : { x: -999, y: -999 };
            const isClick = input && input.isMouseClicked ? input.isMouseClicked() : false;

            const btnW = 170;
            const btnH = 22;
            const btnX = width / 2 - btnW / 2;

            // 1. Resume Button
            const resumeY = height * 0.48;
            const isHoverResume = m.x >= btnX && m.x <= btnX + btnW && m.y >= resumeY && m.y <= resumeY + btnH;
            if (isHoverResume && isClick) {
                this.pauseAction = 'resume';
            }

            ctx.fillStyle = isHoverResume ? 'rgba(255, 255, 255, 0.15)' : 'rgba(20, 24, 32, 0.7)';
            ctx.fillRect(btnX, resumeY, btnW, btnH);
            ctx.strokeStyle = isHoverResume ? '#ffffff' : '#444c66';
            ctx.lineWidth = 1;
            ctx.strokeRect(btnX, resumeY, btnW, btnH);
            ctx.fillStyle = isHoverResume ? '#ffffff' : '#99aacc';
            ctx.font = '11px monospace';
            ctx.fillText('RESUME [CLICK/ESC]', width / 2, resumeY + 15);

            // 2. Quit Button
            const quitY = height * 0.62;
            const isHoverQuit = m.x >= btnX && m.x <= btnX + btnW && m.y >= quitY && m.y <= quitY + btnH;
            if (isHoverQuit && isClick) {
                this.pauseAction = 'quit';
            }

            const quitLabel = gameState.isTestLevel ? 'EXIT TO EDITOR [CLICK/Q]' : 'QUIT TO MENU [CLICK/Q]';
            ctx.fillStyle = isHoverQuit ? 'rgba(180, 40, 40, 0.25)' : 'rgba(20, 24, 32, 0.7)';
            ctx.fillRect(btnX, quitY, btnW, btnH);
            ctx.strokeStyle = isHoverQuit ? '#ff5555' : '#444c66';
            ctx.lineWidth = 1;
            ctx.strokeRect(btnX, quitY, btnW, btnH);
            ctx.fillStyle = isHoverQuit ? '#ff7777' : '#99aacc';
            ctx.font = '11px monospace';
            ctx.fillText(quitLabel, width / 2, quitY + 15);
        }

        // Fade Overlay
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, width, height);
        }
    }
}
