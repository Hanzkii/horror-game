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
        this.pauseSubmenu = 'main'; // 'main', 'settings', or 'sound_debug'
        this.settings = saveManager.loadSettings();
        this.audioScape = null;
        this.audio = null;
    }

    setAudioScape(audioScape) {
        this.audioScape = audioScape;
    }

    setAudio(audio) {
        this.audio = audio;
    }

    playSfx(id) {
        if (this.audio) {
            try { this.audio.play(id); } catch (e) {}
        }
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

            // Psychological glitch text on low sanity
            const isGlitched = sanNorm < 0.28 && Math.sin(Date.now() * 0.02) > 0.7;
            const sanityLabel = isGlitched ? 'L̶O̷S̸T̶' : 'SANITY';
            const vitalityLabel = isGlitched ? 'V̷I̸T̶A̸L̶I̷T̶Y̵' : 'VITALITY';

            Typography.drawText(ctx, vitalityLabel, barX + barW + 12, 33, {
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

            Typography.drawText(ctx, sanityLabel, barX + barW + 12, 50, {
                font: FONT_STACKS.CAPTION,
                color: '#38bdf8'
            });

            // Stamina Bar (Shift to Sprint)
            const stamNorm = player ? Math.max(0, Math.min(1, (player.stamina ?? 100) / (player.maxStamina || 100))) : 1.0;
            ctx.fillStyle = 'rgba(12, 16, 24, 0.85)';
            ctx.fillRect(barX, 57, barW, 6);
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, 57, barW, 6);
            ctx.fillStyle = stamNorm < 0.25 ? '#ef4444' : '#f59e0b';
            ctx.fillRect(barX + 1, 58, Math.round((barW - 2) * stamNorm), 4);

            Typography.drawText(ctx, 'STAMINA', barX + barW + 12, 63, {
                font: FONT_STACKS.CAPTION,
                color: '#f59e0b'
            });

            // Lantern Oil Bar (Picked up from oil flasks)
            if (!gameState.isTutorialLevel) {
                const oilNorm = player ? Math.max(0, Math.min(1, (player.lanternOil ?? 100) / (player.maxOil || 100))) : 1.0;
                ctx.fillStyle = 'rgba(12, 16, 24, 0.85)';
                ctx.fillRect(barX, 70, barW, 6);
                ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, 70, barW, 6);
                ctx.fillStyle = oilNorm < 0.20 ? ((Date.now() % 400 < 200) ? '#ef4444' : '#7f1d1d') : '#f97316';
                ctx.fillRect(barX + 1, 71, Math.round((barW - 2) * oilNorm), 4);

                const oilLabel = oilNorm <= 0 ? 'EMPTY (MATCHLIGHT)' : (oilNorm < 0.20 ? 'OIL CRITICAL' : 'LANTERN OIL');
                Typography.drawText(ctx, oilLabel, barX + barW + 12, 76, {
                    font: FONT_STACKS.CAPTION,
                    color: oilNorm < 0.20 ? '#ef4444' : '#f97316'
                });
            }
        }

        // Stealth Breath-Holding Indicator Banner
        if (player && player.isHoldingBreath) {
            const lungCapacity = Math.max(0, 1 - (player.breathHoldTimer / (player.maxBreathHold || 5.0)));
            const breathW = 200;
            const breathH = 26;
            const breathX = width / 2 - breathW / 2;
            const breathY = height - 50;

            ctx.fillStyle = 'rgba(5, 7, 13, 0.92)';
            ctx.fillRect(breathX, breathY, breathW, breathH);
            ctx.strokeStyle = lungCapacity < 0.25 ? '#ef4444' : '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(breathX, breathY, breathW, breathH);

            // Breath lung progress fill
            ctx.fillStyle = lungCapacity < 0.25 ? '#dc2626' : 'rgba(56, 189, 248, 0.4)';
            ctx.fillRect(breathX + 2, breathY + 2, Math.round((breathW - 4) * lungCapacity), breathH - 4);

            Typography.drawText(ctx, 'HOLDING BREATH — CONCEALED', width / 2, breathY + 17, {
                font: FONT_STACKS.BODY_BOLD,
                color: lungCapacity < 0.25 ? '#fca5a5' : '#e0f2fe',
                align: 'center'
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
                Typography.drawText(ctx, '[A/D] Walk  •  [SHIFT] Sprint  •  [SPACE] Jump  •  [C/CTRL] Hold Breath  •  [E] Interact', width / 2, 70, {
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

            // Header Subtitle Tag
            Typography.drawText(ctx, 'CHRONICLES OF THE ABYSS', modalX + 32, modalY + 32, {
                font: FONT_STACKS.CAPTION,
                color: '#94a3b8'
            });

            // Close button in top-right of parchment
            const closeBtnW = 96;
            const closeBtnH = 32;
            const closeBtnX = modalX + modalW - closeBtnW - 24;
            const closeBtnY = modalY + 22;
            const isHoverClose = mouse.x >= closeBtnX && mouse.x <= closeBtnX + closeBtnW && mouse.y >= closeBtnY && mouse.y <= closeBtnY + closeBtnH;

            // Keyboard dismissal check ([E], [ESC], or [SPACE])
            const isKeyClose = input && (input.isJustPressed('interact') || input.isJustPressed('pause'));

            if ((isHoverClose && isClick) || isKeyClose) {
                gameState.activeNote = null;
                gameState.activeNoteTimer = 0;
            }

            Typography.drawButton(ctx, 'CLOSE [E]', closeBtnX, closeBtnY, closeBtnW, closeBtnH, {
                isHovered: isHoverClose,
                borderColor: '#785f37',
                textColor: '#d4af37',
                font: FONT_STACKS.CAPTION
            });

            // Header Title (fits cleanly without colliding with CLOSE button)
            const modalTitle = gameState.activeNoteTitle || 'ANCIENT INSCRIPTION';
            Typography.drawText(ctx, modalTitle, modalX + 32, modalY + 56, {
                font: FONT_STACKS.HEADING,
                color: '#f59e0b'
            });

            // Horizontal decorative divider
            ctx.strokeStyle = 'rgba(120, 95, 55, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(modalX + 32, modalY + 68);
            ctx.lineTo(modalX + modalW - 32, modalY + 68);
            ctx.stroke();

            // Note Content with crisp typography & smooth multiline wrapping
            const noteTextY = modalY + 92;
            const maxTextW = modalW - 64;
            Typography.drawWrappedText(ctx, gameState.activeNote, modalX + 32, noteTextY, maxTextW, 24, {
                font: FONT_STACKS.PARCHMENT,
                color: '#e2e8f0'
            });

            // Footer hint
            Typography.drawText(ctx, 'PRESS [ E ] OR [ ESC ] TO CLOSE  •  [A / D] WALK  •  [SPACE] JUMP', width / 2, modalY + modalH - 24, {
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

            } else if (this.pauseSubmenu === 'sound_debug') {
                // SOUND TEST & DEBUG SUBMENU
                this.renderSoundDebug(ctx, width, height, gameState, mouse, isClick);

            } else {
                // MAIN PAUSE MENU
                Typography.drawText(ctx, 'PAUSED', width / 2, height * 0.30, {
                    font: FONT_STACKS.TITLE,
                    color: '#ffffff',
                    align: 'center',
                    shadowColor: 'rgba(255, 255, 255, 0.2)'
                });

                const btnW = 280;
                const btnH = 44;
                const btnX = width / 2 - btnW / 2;

                // 1. Resume
                const resumeY = height * 0.38;
                const isHoverResume = mouse.x >= btnX && mouse.x <= btnX + btnW && mouse.y >= resumeY && mouse.y <= resumeY + btnH;
                if (isHoverResume && isClick) {
                    this.pauseAction = 'resume';
                }
                Typography.drawButton(ctx, 'RESUME RUN', btnX, resumeY, btnW, btnH, {
                    isHovered: isHoverResume,
                    font: FONT_STACKS.BODY_BOLD
                });

                // 2. Settings
                const settingsY = height * 0.46;
                const isHoverSettings = mouse.x >= btnX && mouse.x <= btnX + btnW && mouse.y >= settingsY && mouse.y <= settingsY + btnH;
                if (isHoverSettings && isClick) {
                    this.pauseSubmenu = 'settings';
                    this.settings = saveManager.loadSettings();
                }
                Typography.drawButton(ctx, 'SETTINGS', btnX, settingsY, btnW, btnH, {
                    isHovered: isHoverSettings,
                    font: FONT_STACKS.BODY_BOLD
                });

                // 3. Sound Test & Debug
                const debugY = height * 0.54;
                const isHoverDebug = mouse.x >= btnX && mouse.x <= btnX + btnW && mouse.y >= debugY && mouse.y <= debugY + btnH;
                if (isHoverDebug && isClick) {
                    this.pauseSubmenu = 'sound_debug';
                    this.playSfx('click');
                }
                Typography.drawButton(ctx, 'SOUND TEST & DEBUG', btnX, debugY, btnW, btnH, {
                    isHovered: isHoverDebug,
                    font: FONT_STACKS.BODY_BOLD,
                    textColor: isHoverDebug ? '#38bdf8' : '#94a3b8',
                    borderColor: isHoverDebug ? '#38bdf8' : 'rgba(56, 189, 248, 0.25)'
                });

                // 4. Return to Main Menu
                const quitY = height * 0.62;
                const isHoverQuit = mouse.x >= btnX && mouse.x <= btnX + btnW && mouse.y >= quitY && mouse.y <= quitY + btnH;
                if (isHoverQuit && isClick) {
                    this.pauseAction = 'quit';
                }
                Typography.drawButton(ctx, 'RETURN TO MAIN MENU', btnX, quitY, btnW, btnH, {
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

    renderSoundDebug(ctx, width, height, gameState, mouse, isClick) {
        Typography.drawText(ctx, 'SOUND TEST & DEBUG SUITE', width / 2, Math.min(54, height * 0.08), {
            font: FONT_STACKS.TITLE,
            color: '#38bdf8',
            align: 'center',
            shadowColor: 'rgba(56, 189, 248, 0.4)',
            shadowBlur: 10
        });

        Typography.drawText(ctx, 'Procedural SFX Synthesizer  •  Atmosphere State Mixer  •  Cheats & Diagnostics', width / 2, Math.min(84, height * 0.12), {
            font: FONT_STACKS.CAPTION,
            color: '#94a3b8',
            align: 'center'
        });

        const panelW = Math.min(520, width * 0.46);
        const panelH = height - 150;
        const leftX = width / 2 - panelW - 14;
        const rightX = width / 2 + 14;
        const panelY = 96;

        // LEFT PANEL: SFX SOUNDBOARD
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(leftX, panelY, panelW, panelH);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(leftX, panelY, panelW, panelH);

        Typography.drawText(ctx, 'SFX SOUNDBOARD (CLICK TO TRIGGER)', leftX + panelW / 2, panelY + 22, {
            font: FONT_STACKS.BODY_BOLD,
            color: '#f8fafc',
            align: 'center'
        });

        const sfxList = [
            { label: '👟 Stone Step', id: 'footstep_stone_1' },
            { label: '💧 Wet Cavern Step', id: 'footstep_wet_1' },
            { label: '💓 Visceral Heartbeat', id: 'visceral_heartbeat' },
            { label: '🫁 Ragged Breathing', id: 'ragged_breath' },
            { label: '🦴 Bone Snap Fracture', id: 'bone_snap' },
            { label: '🩸 Flesh Wound Tear', id: 'flesh_wound' },
            { label: '😱 Stalker Shriek', id: 'stalker_shriek' },
            { label: '⚡ Stalker Lunge Ambush', id: 'stalker_lunge' },
            { label: '👁️ Phantom Whisper', id: 'phantom_whisper' },
            { label: '👣 Hallucination Step', id: 'hallucination_step' },
            { label: '🕯️ Torch Extinguish', id: 'torch_snuff' },
            { label: '🪨 Heavy Gate Grind', id: 'gate_grind' },
            { label: '⚔️ Pendulum Whoosh', id: 'pendulum_whoosh' },
            { label: '💥 Horror Stinger', id: 'stinger_sharp' },
            { label: '⚙️ Lever Mechanism', id: 'click' },
            { label: '🚪 Heavy Door Creak', id: 'door_creak' }
        ];

        const sfxCols = 2;
        const btnW = (panelW - 36) / sfxCols;
        const btnH = 32;
        const startSfxY = panelY + 40;

        for (let i = 0; i < sfxList.length; i++) {
            const col = i % sfxCols;
            const row = Math.floor(i / sfxCols);
            const bx = leftX + 14 + col * (btnW + 8);
            const by = startSfxY + row * (btnH + 6);
            const item = sfxList[i];

            const isHover = mouse.x >= bx && mouse.x <= bx + btnW && mouse.y >= by && mouse.y <= by + btnH;
            if (isHover && isClick) {
                this.playSfx(item.id);
            }

            Typography.drawButton(ctx, item.label, bx, by, btnW, btnH, {
                isHovered: isHover,
                font: FONT_STACKS.CAPTION,
                textColor: isHover ? '#38bdf8' : '#e2e8f0',
                borderColor: isHover ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'
            });
        }

        // RIGHT PANEL: ATMOSPHERE & CHEATS
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(rightX, panelY, panelW, panelH);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rightX, panelY, panelW, panelH);

        Typography.drawText(ctx, 'ATMOSPHERE & DEBUG SUITE', rightX + panelW / 2, panelY + 22, {
            font: FONT_STACKS.BODY_BOLD,
            color: '#f8fafc',
            align: 'center'
        });

        // 1. Atmosphere Selectors
        const atmoY = panelY + 40;
        const atmoList = [
            { label: '🌿 EXPLORATION AMBIENCE', state: 'exploration' },
            { label: '⚡ TENSION SOUNDSCAPE', state: 'tension' },
            { label: '🩸 PURSUIT / CHASE DREAD', state: 'chase' },
            { label: '🕯️ HOLY TORCH SANCTUARY', state: 'sanctuary' },
            { label: '☀️ SURFACE SUNRISE PEACEFUL', state: 'surface_peaceful' }
        ];

        const atmoBtnW = (panelW - 28);
        for (let i = 0; i < atmoList.length; i++) {
            const by = atmoY + i * 32;
            const item = atmoList[i];
            const isHover = mouse.x >= rightX + 14 && mouse.x <= rightX + 14 + atmoBtnW && mouse.y >= by && mouse.y <= by + 26;
            if (isHover && isClick) {
                if (this.audioScape && typeof this.audioScape.setState === 'function') {
                    this.audioScape.setState(item.state);
                }
                this.playSfx('click');
            }
            Typography.drawButton(ctx, item.label, rightX + 14, by, atmoBtnW, 26, {
                isHovered: isHover,
                font: FONT_STACKS.CAPTION,
                textColor: isHover ? '#fbbf24' : '#cbd5e1',
                borderColor: isHover ? '#fbbf24' : 'rgba(255, 255, 255, 0.15)'
            });
        }

        // 2. Debug Cheats & Diagnostics
        const cheatY = atmoY + atmoList.length * 32 + 8;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(rightX + 14, cheatY);
        ctx.lineTo(rightX + panelW - 14, cheatY);
        ctx.stroke();

        const cheats = [
            { label: `🛡️ GOD MODE: ${gameState && gameState.godMode ? 'ACTIVE [ON]' : 'DISABLED [OFF]'}`, action: 'toggle_god_mode', color: (gameState && gameState.godMode) ? '#10b981' : '#f87171' },
            { label: '💧 REFILL OIL, STAMINA & SANITY', action: 'refill_stats', color: '#38bdf8' },
            { label: '👻 SPAWN SHADOW STALKER', action: 'spawn_stalker', color: '#cbd5e1' },
            { label: '😱 TRIGGER FULLSCREEN JUMPSCARE', action: 'test_jumpscare', color: '#f87171' }
        ];

        for (let i = 0; i < cheats.length; i++) {
            const by = cheatY + 8 + i * 32;
            const c = cheats[i];
            const isHover = mouse.x >= rightX + 14 && mouse.x <= rightX + 14 + atmoBtnW && mouse.y >= by && mouse.y <= by + 26;
            if (isHover && isClick) {
                if (c.action === 'toggle_god_mode') {
                    if (gameState) {
                        gameState.godMode = !gameState.godMode;
                    }
                } else {
                    this.pauseAction = c.action;
                }
                this.playSfx('click');
            }
            Typography.drawButton(ctx, c.label, rightX + 14, by, atmoBtnW, 26, {
                isHovered: isHover,
                font: FONT_STACKS.CAPTION,
                textColor: c.color,
                borderColor: isHover ? c.color : 'rgba(255, 255, 255, 0.15)'
            });
        }

        // 3. Level Warps
        const warpY = cheatY + 8 + cheats.length * 32 + 6;
        Typography.drawText(ctx, 'WARP TO LEVEL:', rightX + 16, warpY + 8, {
            font: FONT_STACKS.CAPTION,
            color: '#94a3b8'
        });

        const warps = [
            { label: 'TUTORIAL', act: 'warp_tutorial' },
            { label: 'B1', act: 'warp_b1' },
            { label: 'B2', act: 'warp_b2' },
            { label: 'B3', act: 'warp_b3' },
            { label: 'SURFACE', act: 'warp_finale' }
        ];
        const warpBtnW = (panelW - 28 - (warps.length - 1) * 6) / warps.length;
        for (let i = 0; i < warps.length; i++) {
            const wx = rightX + 14 + i * (warpBtnW + 6);
            const w = warps[i];
            const isHover = mouse.x >= wx && mouse.x <= wx + warpBtnW && mouse.y >= warpY + 16 && mouse.y <= warpY + 16 + 26;
            if (isHover && isClick) {
                this.pauseAction = w.act;
                this.playSfx('click');
            }
            Typography.drawButton(ctx, w.label, wx, warpY + 16, warpBtnW, 26, {
                isHovered: isHover,
                font: FONT_STACKS.CAPTION,
                textColor: isHover ? '#38bdf8' : '#94a3b8',
                borderColor: isHover ? '#38bdf8' : 'rgba(56, 189, 248, 0.25)'
            });
        }

        // Back to Pause Menu Button
        const backW = 200;
        const backH = 38;
        const backX = width / 2 - backW / 2;
        const backY = height - 48;
        const isHoverBack = mouse.x >= backX && mouse.x <= backX + backW && mouse.y >= backY && mouse.y <= backY + backH;
        if (isHoverBack && isClick) {
            this.pauseSubmenu = 'main';
            this.playSfx('click');
        }
        Typography.drawButton(ctx, '< BACK TO PAUSE', backX, backY, backW, backH, {
            isHovered: isHoverBack,
            isSelected: true,
            font: FONT_STACKS.BODY_BOLD
        });
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
