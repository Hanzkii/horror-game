/**
 * @file HUD.js
 * @description High-resolution vector HUD and modal overlay system.
 * Renders anti-aliased, razor-sharp text and interfaces at display resolution.
 */

import { Typography, FONT_STACKS } from './Typography.js';
import { saveManager } from '../managers/SaveManager.js';

export default class HUD {
    constructor(ctx, width, height) {
        this.ctx = ctx; // fallback buffer context
        this.width = width;
        this.height = height;
        this.fadeAlpha = 1;
        this.fadeTarget = 0;
        this.fadeSpeed = 1;
        this.pauseAction = null;
        this.requestedPause = false;
        this.pauseSubmenu = 'main'; // 'main' or 'settings'
        this.settings = saveManager.loadSettings();
        this.audioScape = null;
    }

    setAudioScape(audioScape) {
        this.audioScape = audioScape;
    }

    adjustVolume(bus, delta) {
        const key = `${bus}Vol`;
        this.settings[key] = Math.max(0, Math.min(1.0, Math.round(((this.settings[key] ?? 0.8) + delta) * 10) / 10));
        saveManager.saveSettings(this.settings);
        if (this.audioScape && typeof this.audioScape.setVolumes === 'function') {
            this.audioScape.setVolumes({ [bus]: this.settings[key] });
        }
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

    /**
     * Renders vector UI elements at high resolution directly on the display canvas.
     * @param {CanvasRenderingContext2D} ctx - High-resolution display context
     * @param {number} width - Display canvas width
     * @param {number} height - Display canvas height
     * @param {GameState} gameState 
     * @param {Input} input 
     * @param {Player} player 
     */
    renderHighRes(ctx, width, height, gameState, input = null, player = null) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;

        // 1. Sanity edge tint vignette
        const sanityNorm = (gameState.sanity > 1) ? (gameState.sanity / (gameState.maxSanity || 100)) : gameState.sanity;
        if (sanityNorm < 1) {
            const intensity = 1 - sanityNorm;
            const gradient = ctx.createRadialGradient(
                width / 2, height / 2, height * 0.35,
                width / 2, height / 2, height * 0.75
            );
            gradient.addColorStop(0, 'rgba(100, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(160, 10, 10, ${intensity * 0.6})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }

        // 2. Health & Sanity Status Indicators (Top-Left)
        if (gameState.health !== undefined) {
            const maxHp = gameState.maxHealth || 100;
            const hpNorm = Math.max(0, Math.min(1, gameState.health / maxHp));
            const maxSanity = gameState.maxSanity || 100;
            const sanNorm = Math.max(0, Math.min(1, gameState.sanity / maxSanity));

            const barX = 28;
            const barW = 160;

            // Health Bar
            ctx.fillStyle = 'rgba(12, 16, 24, 0.85)';
            ctx.fillRect(barX, 24, barW, 10);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, 24, barW, 10);
            ctx.fillStyle = hpNorm < 0.35 ? '#ef4444' : '#e11d48';
            ctx.fillRect(barX + 1, 25, Math.round((barW - 2) * hpNorm), 8);

            Typography.drawText(ctx, 'VITALITY', barX + barW + 12, 33, {
                font: FONT_STACKS.CAPTION,
                color: '#f87171'
            });

            // Sanity Bar
            ctx.fillStyle = 'rgba(12, 16, 24, 0.85)';
            ctx.fillRect(barX, 42, barW, 8);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, 42, barW, 8);
            ctx.fillStyle = sanNorm < 0.3 ? '#818cf8' : '#38bdf8';
            ctx.fillRect(barX + 1, 43, Math.round((barW - 2) * sanNorm), 6);

            Typography.drawText(ctx, 'SANITY', barX + barW + 12, 50, {
                font: FONT_STACKS.CAPTION,
                color: '#38bdf8'
            });
        }

        // 3. Top-Right Badges & Pause Button
        const mouse = input && input.getClientMousePos ? input.getClientMousePos() : { x: -999, y: -999 };
        const isClick = input && input.isMouseClicked ? input.isMouseClicked() : false;

        const pauseW = 90;
        const pauseH = 32;
        const pauseX = width - pauseW - 28;
        const pauseY = 24;
        const isHoverPause = mouse.x >= pauseX && mouse.x <= pauseX + pauseW && mouse.y >= pauseY && mouse.y <= pauseY + pauseH;

        if (isHoverPause && isClick) {
            this.requestedPause = true;
        }

        Typography.drawButton(ctx, 'PAUSE', pauseX, pauseY, pauseW, pauseH, {
            isHovered: isHoverPause,
            font: FONT_STACKS.CAPTION
        });

        // Floor / Mode Badge
        let badgeText = '';
        let badgeColor = '#94a3b8';
        if (gameState.isTestLevel) {
            badgeText = 'TEST LEVEL MODE';
            badgeColor = '#fbbf24';
        } else if (gameState.isTutorialLevel) {
            badgeText = 'TUTORIAL TRIAL';
            badgeColor = '#34d399';
        } else if (gameState.currentLevel && gameState.floorIndex) {
            badgeText = gameState.isPublishedMap ? `DEPTH B${gameState.floorIndex} [COMMUNITY]` : `DEPTH B${gameState.floorIndex}`;
            badgeColor = gameState.isPublishedMap ? '#38bdf8' : '#cbd5e1';
        }

        if (badgeText) {
            Typography.drawText(ctx, badgeText, pauseX - 16, pauseY + 21, {
                font: FONT_STACKS.BODY_BOLD,
                color: badgeColor,
                align: 'right'
            });
        }

        // 4. Sanctuary Prompt Banner
        if (gameState.sanctuaryPromptTimer && gameState.sanctuaryPromptTimer > 0) {
            gameState.sanctuaryPromptTimer = Math.max(0, gameState.sanctuaryPromptTimer - 0.016);
            const bannerAlpha = Math.min(1.0, gameState.sanctuaryPromptTimer);
            ctx.save();
            ctx.globalAlpha = bannerAlpha;
            Typography.drawText(ctx, 'SANCTUARY — Holy flame banished the shadow', width / 2, 70, {
                font: FONT_STACKS.HEADING,
                color: '#fbbf24',
                align: 'center',
                shadowColor: 'rgba(251, 191, 36, 0.4)'
            });
            ctx.restore();
        }

        // 5. Tutorial In-Game Dynamic Guidance Banner
        if (gameState.isTutorialLevel && player) {
            let guideMsg = '';
            if (player.x < 220) {
                guideMsg = '[ A / D ] or Arrow Keys to walk across the chamber';
            } else if (player.x < 460) {
                guideMsg = '[ SPACE ] or [ W ] to leap across the chasm';
            } else if (player.x < 740) {
                const flag = gameState.getFlag('tutorial_gate');
                guideMsg = flag 
                    ? 'Gate Unlocked! Proceed through the ancient doorway'
                    : 'Climb the steps and press [ E ] near the Lever';
            } else if (player.x < 980) {
                guideMsg = 'Darkness drains Sanity! Stand in Torchlight to stay calm';
            } else {
                guideMsg = 'A Lurker stirs! Do NOT fight — lure it into the Torch flame!';
            }

            if (guideMsg) {
                const bannerY = 64;
                ctx.save();
                ctx.font = FONT_STACKS.BODY_BOLD;
                const tw = ctx.measureText(guideMsg).width;
                const bw = tw + 40;
                const bx = width / 2 - bw / 2;

                ctx.fillStyle = 'rgba(8, 14, 26, 0.9)';
                ctx.fillRect(bx, bannerY - 14, bw, 32);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(bx, bannerY - 14, bw, 32);

                Typography.drawText(ctx, guideMsg, width / 2, bannerY + 6, {
                    font: FONT_STACKS.BODY_BOLD,
                    color: '#e0f2fe',
                    align: 'center'
                });
                ctx.restore();
            }
        }

        // 6. Floor 1 Controls Intro Tip
        if (gameState.floorIndex === 1 && !gameState.isTutorialLevel) {
            if (gameState.introTipTimer === undefined) gameState.introTipTimer = 7.0;
            if (gameState.introTipTimer > 0) {
                gameState.introTipTimer -= 0.016;
                const tipAlpha = Math.min(1.0, gameState.introTipTimer);
                ctx.save();
                ctx.globalAlpha = tipAlpha;
                Typography.drawText(ctx, '[A/D] Walk  •  [SPACE] Jump  •  [E] Interact near objects', width / 2, 70, {
                    font: FONT_STACKS.BODY_BOLD,
                    color: '#cbd5e1',
                    align: 'center'
                });
                ctx.restore();
            }
        }

        // 7. Lore Note Reading Modal Overlay
        if (gameState.activeNote) {
            const modalW = Math.min(680, width * 0.85);
            const modalH = Math.min(460, height * 0.82);
            const modalX = width / 2 - modalW / 2;
            const modalY = height / 2 - modalH / 2;

            // Dim backdrop
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, width, height);

            // Modal Parchment Body
            ctx.fillStyle = 'rgba(15, 17, 23, 0.96)';
            ctx.fillRect(modalX, modalY, modalW, modalH);

            // Double antique gold / bronze border
            ctx.strokeStyle = '#785f37';
            ctx.lineWidth = 2;
            ctx.strokeRect(modalX, modalY, modalW, modalH);

            ctx.strokeStyle = '#382f1f';
            ctx.lineWidth = 1;
            ctx.strokeRect(modalX + 6, modalY + 6, modalW - 12, modalH - 12);

            // Header Title
            Typography.drawText(ctx, 'ANCIENT INSCRIPTION', modalX + 32, modalY + 44, {
                font: FONT_STACKS.TITLE,
                color: '#f59e0b'
            });

            // Close button in top-right of parchment
            const closeBtnW = 90;
            const closeBtnH = 30;
            const closeBtnX = modalX + modalW - closeBtnW - 24;
            const closeBtnY = modalY + 24;
            const isHoverClose = mouse.x >= closeBtnX && mouse.x <= closeBtnX + closeBtnW && mouse.y >= closeBtnY && mouse.y <= closeBtnY + closeBtnH;

            if (isHoverClose && isClick) {
                gameState.activeNote = null;
                gameState.activeNoteTimer = 0;
            }

            Typography.drawButton(ctx, 'CLOSE', closeBtnX, closeBtnY, closeBtnW, closeBtnH, {
                isHovered: isHoverClose,
                borderColor: '#785f37',
                textColor: '#d4af37'
            });

            // Note Content with crisp typography & smooth multiline wrapping
            const noteTextY = modalY + 85;
            const maxTextW = modalW - 64;
            Typography.drawWrappedText(ctx, gameState.activeNote, modalX + 32, noteTextY, maxTextW, 24, {
                font: FONT_STACKS.PARCHMENT,
                color: '#e2e8f0'
            });

            // Footer hint
            Typography.drawText(ctx, 'MOVE [A / D]  •  JUMP [SPACE]  •  CLICK CLOSE TO RESUME', width / 2, modalY + modalH - 24, {
                font: FONT_STACKS.CAPTION,
                color: '#a1a1aa',
                align: 'center'
            });
        }

        // 8. In-Game Pause Menu
        if (gameState.isPaused) {
            ctx.fillStyle = 'rgba(3, 7, 18, 0.90)';
            ctx.fillRect(0, 0, width, height);

            if (this.pauseSubmenu === 'settings') {
                // SETTINGS SUBMENU
                Typography.drawText(ctx, 'SETTINGS & AUDIO', width / 2, height * 0.20, {
                    font: FONT_STACKS.TITLE,
                    color: '#ffffff',
                    align: 'center',
                    shadowColor: 'rgba(255, 255, 255, 0.2)'
                });

                const startY = height * 0.28;
                const panelW = Math.min(540, width * 0.85);
                const startX = width / 2 - panelW / 2;

                const sliders = [
                    { label: 'MASTER VOLUME', bus: 'master', val: this.settings.masterVol ?? 0.8 },
                    { label: 'MUSIC BUS', bus: 'music', val: this.settings.musicVol ?? 0.7 },
                    { label: 'AMBIENT CAVERN & WIND', bus: 'ambient', val: this.settings.ambientVol ?? 0.85 },
                    { label: 'SFX & HORROR STINGERS', bus: 'sfx', val: this.settings.sfxVol ?? 0.85 }
                ];

                for (let i = 0; i < sliders.length; i++) {
                    const s = sliders[i];
                    const y = startY + i * 56;

                    Typography.drawText(ctx, s.label, startX, y + 24, {
                        font: FONT_STACKS.BODY_BOLD,
                        color: '#cbd5e1'
                    });

                    // Minus button
                    const minusW = 36;
                    const minusH = 36;
                    const minusX = startX + panelW - 240;
                    const isHoverMinus = mouse.x >= minusX && mouse.x <= minusX + minusW && mouse.y >= y + 4 && mouse.y <= y + 4 + minusH;
                    if (isHoverMinus && isClick) {
                        this.adjustVolume(s.bus, -0.1);
                    }
                    Typography.drawButton(ctx, '-', minusX, y + 4, minusW, minusH, {
                        isHovered: isHoverMinus,
                        font: FONT_STACKS.BODY_BOLD
                    });

                    // Progress bar
                    const barX = minusX + minusW + 10;
                    const barW = 120;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
                    ctx.fillRect(barX, y + 14, barW, 16);
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(barX + 2, y + 16, Math.max(0, Math.round((barW - 4) * s.val)), 12);

                    // Plus button
                    const plusX = barX + barW + 10;
                    const plusW = 36;
                    const plusH = 36;
                    const isHoverPlus = mouse.x >= plusX && mouse.x <= plusX + plusW && mouse.y >= y + 4 && mouse.y <= y + 4 + plusH;
                    if (isHoverPlus && isClick) {
                        this.adjustVolume(s.bus, 0.1);
                    }
                    Typography.drawButton(ctx, '+', plusX, y + 4, plusW, plusH, {
                        isHovered: isHoverPlus,
                        font: FONT_STACKS.BODY_BOLD
                    });

                    // Percentage
                    Typography.drawText(ctx, `${Math.round(s.val * 100)}%`, plusX + plusW + 14, y + 24, {
                        font: FONT_STACKS.CAPTION,
                        color: '#94a3b8'
                    });
                }

                // Fullscreen toggle
                const fsY = startY + sliders.length * 56 + 14;
                const fsW = 240;
                const fsH = 40;
                const fsX = width / 2 - fsW / 2;
                const isHoverFs = mouse.x >= fsX && mouse.x <= fsX + fsW && mouse.y >= fsY && mouse.y <= fsY + fsH;
                if (isHoverFs && isClick) {
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => {});
                    } else {
                        document.exitFullscreen().catch(() => {});
                    }
                }
                Typography.drawButton(ctx, 'TOGGLE FULLSCREEN', fsX, fsY, fsW, fsH, {
                    isHovered: isHoverFs,
                    font: FONT_STACKS.BODY_BOLD
                });

                // Back to Pause Menu
                const backY = fsY + 54;
                const backW = 200;
                const backH = 42;
                const backX = width / 2 - backW / 2;
                const isHoverBack = mouse.x >= backX && mouse.x <= backX + backW && mouse.y >= backY && mouse.y <= backY + backH;
                if (isHoverBack && isClick) {
                    this.pauseSubmenu = 'main';
                }
                Typography.drawButton(ctx, '< BACK TO PAUSE', backX, backY, backW, backH, {
                    isHovered: isHoverBack,
                    isSelected: true,
                    font: FONT_STACKS.BODY_BOLD
                });

            } else {
                // MAIN PAUSE MENU
                Typography.drawText(ctx, 'PAUSED', width / 2, height * 0.30, {
                    font: FONT_STACKS.TITLE,
                    color: '#ffffff',
                    align: 'center',
                    shadowColor: 'rgba(255, 255, 255, 0.2)'
                });

                const btnW = 280;
                const btnH = 46;
                const btnX = width / 2 - btnW / 2;

                // 1. Resume
                const resumeY = height * 0.40;
                const isHoverResume = mouse.x >= btnX && mouse.x <= btnX + btnW && mouse.y >= resumeY && mouse.y <= resumeY + btnH;
                if (isHoverResume && isClick) {
                    this.pauseAction = 'resume';
                }
                Typography.drawButton(ctx, 'RESUME RUN', btnX, resumeY, btnW, btnH, {
                    isHovered: isHoverResume,
                    font: FONT_STACKS.BODY_BOLD
                });

                // 2. Settings
                const settingsY = height * 0.50;
                const isHoverSettings = mouse.x >= btnX && mouse.x <= btnX + btnW && mouse.y >= settingsY && mouse.y <= settingsY + btnH;
                if (isHoverSettings && isClick) {
                    this.pauseSubmenu = 'settings';
                    this.settings = saveManager.loadSettings();
                }
                Typography.drawButton(ctx, 'SETTINGS', btnX, settingsY, btnW, btnH, {
                    isHovered: isHoverSettings,
                    font: FONT_STACKS.BODY_BOLD
                });

                // 3. Return to Main Menu / Exit to Editor
                const quitY = height * 0.60;
                const isHoverQuit = mouse.x >= btnX && mouse.x <= btnX + btnW && mouse.y >= quitY && mouse.y <= quitY + btnH;
                if (isHoverQuit && isClick) {
                    this.pauseAction = 'quit';
                }
                const quitLabel = gameState.isTestLevel ? 'EXIT TO EDITOR' : 'RETURN TO MAIN MENU';
                Typography.drawButton(ctx, quitLabel, btnX, quitY, btnW, btnH, {
                    isHovered: isHoverQuit,
                    font: FONT_STACKS.BODY_BOLD,
                    borderColor: isHoverQuit ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                    textColor: isHoverQuit ? '#f87171' : '#cbd5e1'
                });
            }
        }

        // 9. Full Screen Fade Transition
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, width, height);
        }

        ctx.restore();
    }

    /**
     * Backwards-compatible buffer renderer.
     */
    render(gameState, input = null, player = null) {
        // Fallback: minimal buffer indicator
        if (this.fadeAlpha > 0) {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}
