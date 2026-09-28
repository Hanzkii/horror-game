/**
 * @file MainMenu.js
 * @description High-Resolution Vector Main Menu System.
 * Features: Continue, New Descent, Tutorial Chamber, Character Design, Achievements Gallery,
 * Settings & Audio Bus Mixers, and Design Studio [DEV].
 */

import { Typography, FONT_STACKS } from './Typography.js';
import { saveManager } from '../managers/SaveManager.js';
import { achievementManager, ACHIEVEMENTS } from '../managers/AchievementManager.js';
import SpriteRenderer from '../art/SpriteRenderer.js';

export default class MainMenu {
    constructor(ctx, width, height, audio = null, canvas = null) {
        this.ctx = ctx; // fallback context
        this.width = width;
        this.height = height;
        this.audio = audio;
        this.canvas = canvas;

        this.mode = 'main'; // 'main', 'achievements', 'settings', 'character', 'controls', 'dev'
        this.selectedIndex = 0;
        this.timer = 0;
        this.particles = [];

        // Main options
        this.hasSavedGame = false;
        this.saveSummary = '';
        this.checkSave();

        // Audio volumes
        this.settings = saveManager.loadSettings();

        // Character Customization Palettes
        this.palette = {
            hoodies: [
                { name: 'SHADOW BLUE', color: '#3a4a5c' },
                { name: 'CRIMSON ROBE', color: '#7a2222' },
                { name: 'ABYSS BLACK', color: '#1b1b22' },
                { name: 'FOREST MOSS', color: '#2d4c38' },
                { name: 'OCCULT GOLD', color: '#7a6020' },
                { name: 'SPECTRAL ASH', color: '#555866' },
                { name: 'GHOST WHITE', color: '#b0b8c8' }
            ],
            pants: [
                { name: 'CHARCOAL', color: '#2a2a3a' },
                { name: 'OBSIDIAN', color: '#15151a' },
                { name: 'BROWN LEATHER', color: '#4a3224' },
                { name: 'FADED DENIM', color: '#283548' },
                { name: 'BONE GREY', color: '#3c4048' }
            ],
            skins: [
                { name: 'PALE', color: '#d4cec0' },
                { name: 'ASHEN', color: '#a8b0be' },
                { name: 'WARM', color: '#cfa080' },
                { name: 'GHOSTLY CYAN', color: '#8ee2db' }
            ],
            eyes: [
                { name: 'WHITE', color: '#ffffff' },
                { name: 'CYAN GLOW', color: '#00e5ff' },
                { name: 'BLOOD RED', color: '#ff3333' },
                { name: 'AMBER', color: '#ffaa00' },
                { name: 'PURPLE', color: '#d055ff' },
                { name: 'EMERALD', color: '#22ff88' }
            ],
            lanterns: [
                { name: 'WARM AMBER', color: 'rgba(255, 200, 120, 1)' },
                { name: 'COLD CYAN', color: 'rgba(80, 230, 255, 1)' },
                { name: 'BLOOD GLOW', color: 'rgba(255, 70, 70, 1)' },
                { name: 'PHANTOM VIOLET', color: 'rgba(210, 100, 255, 1)' },
                { name: 'EMERALD FOG', color: 'rgba(80, 255, 160, 1)' }
            ]
        };

        this.customization = {
            hoodieIndex: 0,
            pantsIndex: 0,
            skinIndex: 0,
            eyesIndex: 0,
            lanternIndex: 0
        };

        this.charOptionIndex = 0;
        this.loadCustomization();

        // Ambient soul motes
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random() * 1920,
                y: Math.random() * 1080,
                vx: (Math.random() - 0.5) * 15,
                vy: -15 - Math.random() * 25,
                size: 1 + Math.random() * 2.5,
                alpha: 0.15 + Math.random() * 0.35,
                color: Math.random() < 0.6 ? 'rgba(120, 180, 255,' : 'rgba(240, 200, 140,'
            });
        }

        this.hitboxes = [];
        this.selectedAction = null;
    }

    checkSave() {
        this.hasSavedGame = saveManager.hasSave('auto');
        if (this.hasSavedGame) {
            const data = saveManager.load('auto');
            const floor = data?.player?.floorIndex || 1;
            this.saveSummary = `DEPTH B${floor}`;
        }
    }

    loadCustomization() {
        try {
            const saved = localStorage.getItem('echo_char_custom');
            if (saved) Object.assign(this.customization, JSON.parse(saved));
        } catch (e) {}
    }

    saveCustomization() {
        try {
            localStorage.setItem('echo_char_custom', JSON.stringify(this.customization));
        } catch (e) {}
    }

    playSfx(name = 'click') {
        if (this.audio && typeof this.audio.play === 'function') {
            try { this.audio.play(name, { volume: 0.35 }); } catch (e) {}
        }
    }

    getSelection() {
        const sel = this.selectedAction;
        this.selectedAction = null;
        return sel;
    }

    showDesignMenu() {
        this.mode = 'dev';
        this.selectedIndex = 0;
    }

    update(dt, input) {
        this.timer += dt;
        this.checkSave();

        // Update atmospheric motes
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.y < -10) {
                p.y = 1090;
                p.x = Math.random() * 1920;
            }
        }

        if (!input) return;

        // Escape handling across sub-menus
        if (input.isJustPressed('pause')) {
            if (this.mode !== 'main') {
                this.mode = 'main';
                this.playSfx('click');
                return;
            }
        }

        // Mouse hover and click hitboxes
        const m = input.getClientMousePos ? input.getClientMousePos() : { x: -999, y: -999 };
        const isClick = input.isMouseClicked ? input.isMouseClicked() : false;

        let mouseOverAny = false;
        for (let i = 0; i < this.hitboxes.length; i++) {
            const box = this.hitboxes[i];
            if (m.x >= box.x && m.x <= box.x + box.w && m.y >= box.y && m.y <= box.y + box.h) {
                mouseOverAny = true;
                this.selectedIndex = box.index !== undefined ? box.index : i;
                if (isClick && box.action) {
                    box.action();
                    return;
                }
            }
        }

        // Keyboard menu navigation
        const upPressed = input.isJustPressed('up');
        const downPressed = input.isJustPressed('down');
        const enterPressed = input.isJustPressed('confirm') || input.isJustPressed('jump');

        if (this.mode === 'main') {
            const maxOptions = this.hasSavedGame ? 7 : 6;
            if (upPressed) {
                this.selectedIndex = (this.selectedIndex - 1 + maxOptions) % maxOptions;
                this.playSfx('click');
            } else if (downPressed) {
                this.selectedIndex = (this.selectedIndex + 1) % maxOptions;
                this.playSfx('click');
            } else if (enterPressed) {
                this.executeMainSelection(this.selectedIndex);
            }
        } else if (this.mode === 'character') {
            if (upPressed) {
                this.charOptionIndex = (this.charOptionIndex - 1 + 6) % 6;
                this.playSfx('click');
            } else if (downPressed) {
                this.charOptionIndex = (this.charOptionIndex + 1) % 6;
                this.playSfx('click');
            } else if (input.isJustPressed('left')) {
                this.cycleCharOption(this.charOptionIndex, -1);
            } else if (input.isJustPressed('right')) {
                this.cycleCharOption(this.charOptionIndex, 1);
            } else if (enterPressed && this.charOptionIndex === 5) {
                this.mode = 'main';
                this.playSfx('click');
            }
        }
    }

    executeMainSelection(index) {
        if (this.hasSavedGame) {
            switch (index) {
                case 0: this.selectedAction = 'continue'; break;
                case 1: this.selectedAction = 'story'; break;
                case 2: this.selectedAction = 'tutorial'; break;
                case 3: this.mode = 'character'; break;
                case 4: this.mode = 'achievements'; break;
                case 5: this.mode = 'settings'; break;
                case 6: this.mode = 'dev'; break;
            }
        } else {
            switch (index) {
                case 0: this.selectedAction = 'story'; break;
                case 1: this.selectedAction = 'tutorial'; break;
                case 2: this.mode = 'character'; break;
                case 3: this.mode = 'achievements'; break;
                case 4: this.mode = 'settings'; break;
                case 5: this.mode = 'dev'; break;
            }
        }
        this.playSfx('click');
    }

    cycleCharOption(idx, delta) {
        if (idx === 0) {
            const len = this.palette.hoodies.length;
            this.customization.hoodieIndex = (this.customization.hoodieIndex + delta + len) % len;
        } else if (idx === 1) {
            const len = this.palette.pants.length;
            this.customization.pantsIndex = (this.customization.pantsIndex + delta + len) % len;
        } else if (idx === 2) {
            const len = this.palette.skins.length;
            this.customization.skinIndex = (this.customization.skinIndex + delta + len) % len;
        } else if (idx === 3) {
            const len = this.palette.eyes.length;
            this.customization.eyesIndex = (this.customization.eyesIndex + delta + len) % len;
        } else if (idx === 4) {
            const len = this.palette.lanterns.length;
            this.customization.lanternIndex = (this.customization.lanternIndex + delta + len) % len;
        }
        this.saveCustomization();
        this.playSfx('click');
    }

    adjustVolume(bus, delta) {
        const key = `${bus}Vol`;
        this.settings[key] = Math.max(0, Math.min(1.0, Math.round((this.settings[key] + delta) * 10) / 10));
        saveManager.saveSettings(this.settings);
        if (this.audio && this.audio.setVolume) {
            this.audio.setVolume(bus, this.settings[key]);
        }
        this.playSfx('click');
    }

    renderHighRes(ctx, width, height) {
        this.hitboxes = [];

        // 1. Deep Abyssal Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#040509');
        bgGrad.addColorStop(0.5, '#070b14');
        bgGrad.addColorStop(1, '#020306');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Vertical luminous light shaft
        const lightGrad = ctx.createRadialGradient(width / 2, 0, 10, width / 2, height * 0.55, width * 0.6);
        lightGrad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
        lightGrad.addColorStop(0.5, 'rgba(30, 58, 138, 0.05)');
        lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, width, height);

        // Soul Motes
        for (const p of this.particles) {
            const scaleX = width / 1920;
            const scaleY = height / 1080;
            ctx.fillStyle = `${p.color} ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x * scaleX, p.y * scaleY, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Subterranean Framing Columns
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, Math.max(40, width * 0.04), height);
        ctx.fillRect(width - Math.max(40, width * 0.04), 0, Math.max(40, width * 0.04), height);

        // 2. Render Screen based on Mode
        switch (this.mode) {
            case 'achievements':
                this.renderAchievements(ctx, width, height);
                break;
            case 'settings':
                this.renderSettings(ctx, width, height);
                break;
            case 'character':
                this.renderCharacterDesign(ctx, width, height);
                break;
            case 'controls':
                this.renderControlsGuide(ctx, width, height);
                break;
            case 'dev':
                this.renderDevStudio(ctx, width, height);
                break;
            case 'main':
            default:
                this.renderMainMenu(ctx, width, height);
                break;
        }
    }

    renderMainMenu(ctx, width, height) {
        // Title
        const pulse = Math.sin(this.timer * 2.2) * 0.06;
        Typography.drawText(ctx, 'E C H O', width / 2, height * 0.22, {
            font: '600 48px "Cinzel", Georgia, serif',
            color: '#f8fafc',
            align: 'center',
            shadowColor: `rgba(56, 189, 248, ${0.4 + pulse})`,
            shadowBlur: 14
        });

        Typography.drawText(ctx, 'A  P S Y C H O L O G I C A L  H O R R O R  E X P E R I E N C E', width / 2, height * 0.27, {
            font: FONT_STACKS.SUBTITLE,
            color: '#64748b',
            align: 'center'
        });

        const options = this.hasSavedGame
            ? [
                `CONTINUE  •  ${this.saveSummary}`,
                'NEW DESCENT',
                'TUTORIAL CHAMBER',
                'CHARACTER DESIGN',
                'ACHIEVEMENTS',
                'SETTINGS & AUDIO',
                'DESIGN STUDIO [DEV]'
            ]
            : [
                'DESCEND INTO ABYSS',
                'TUTORIAL CHAMBER',
                'CHARACTER DESIGN',
                'ACHIEVEMENTS',
                'SETTINGS & AUDIO',
                'DESIGN STUDIO [DEV]'
            ];

        const startY = height * 0.35;
        const btnW = 340;
        const btnH = 44;
        const spacing = 12;

        for (let i = 0; i < options.length; i++) {
            const y = startY + i * (btnH + spacing);
            const x = width / 2 - btnW / 2;
            const isSelected = this.selectedIndex === i;

            this.hitboxes.push({
                x, y, w: btnW, h: btnH,
                index: i,
                action: () => this.executeMainSelection(i)
            });

            Typography.drawButton(ctx, options[i], x, y, btnW, btnH, {
                isSelected,
                font: FONT_STACKS.BODY_BOLD,
                borderColor: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)'
            });
        }

        // Footer hint
        Typography.drawText(ctx, '[ W / S / ARROWS ] Navigate  •  [ ENTER / SPACE / CLICK ] Select', width / 2, height - 32, {
            font: FONT_STACKS.CAPTION,
            color: '#64748b',
            align: 'center'
        });
    }

    renderAchievements(ctx, width, height) {
        Typography.drawText(ctx, 'ACHIEVEMENTS & MILESTONES', width / 2, 70, {
            font: FONT_STACKS.TITLE,
            color: '#f59e0b',
            align: 'center'
        });

        const list = achievementManager.getAll();
        const startY = 120;
        const cardW = Math.min(780, width * 0.85);
        const cardH = 54;
        const startX = width / 2 - cardW / 2;

        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            const y = startY + i * (cardH + 10);

            ctx.fillStyle = a.unlocked ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.4)';
            ctx.fillRect(startX, y, cardW, cardH);
            ctx.strokeStyle = a.unlocked ? (a.color || '#f59e0b') : 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(startX, y, cardW, cardH);

            // Icon
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(a.unlocked ? a.icon : '🔒', startX + 32, y + cardH / 2);

            // Title & Description
            Typography.drawText(ctx, a.title.toUpperCase(), startX + 64, y + 16, {
                font: FONT_STACKS.BODY_BOLD,
                color: a.unlocked ? '#f8fafc' : '#64748b'
            });

            Typography.drawText(ctx, a.description, startX + 64, y + 36, {
                font: FONT_STACKS.CAPTION,
                color: a.unlocked ? '#94a3b8' : '#475569'
            });

            // Status Badge
            Typography.drawText(ctx, a.unlocked ? 'UNLOCKED' : 'LOCKED', startX + cardW - 24, y + 27, {
                font: FONT_STACKS.CAPTION,
                color: a.unlocked ? '#10b981' : '#64748b',
                align: 'right'
            });
        }

        // Back Button
        const backW = 160;
        const backH = 40;
        const backX = width / 2 - backW / 2;
        const backY = height - 70;
        this.hitboxes.push({
            x: backX, y: backY, w: backW, h: backH,
            action: () => { this.mode = 'main'; this.playSfx('click'); }
        });

        Typography.drawButton(ctx, '< BACK TO TITLE', backX, backY, backW, backH, {
            font: FONT_STACKS.BODY_BOLD
        });
    }

    renderSettings(ctx, width, height) {
        Typography.drawText(ctx, 'SETTINGS & AUDIO SCAPES', width / 2, 80, {
            font: FONT_STACKS.TITLE,
            color: '#f8fafc',
            align: 'center'
        });

        const startY = 160;
        const panelW = 540;
        const startX = width / 2 - panelW / 2;

        const sliders = [
            { label: 'MASTER VOLUME', bus: 'master', val: this.settings.masterVol },
            { label: 'MUSIC BUS', bus: 'music', val: this.settings.musicVol },
            { label: 'AMBIENT CAVERN & WIND', bus: 'ambient', val: this.settings.ambientVol },
            { label: 'SFX & HORROR STINGERS', bus: 'sfx', val: this.settings.sfxVol }
        ];

        for (let i = 0; i < sliders.length; i++) {
            const s = sliders[i];
            const y = startY + i * 64;

            Typography.drawText(ctx, s.label, startX, y + 24, {
                font: FONT_STACKS.BODY_BOLD,
                color: '#cbd5e1'
            });

            // Minus button
            const minusX = startX + 260;
            this.hitboxes.push({
                x: minusX, y: y, w: 36, h: 36,
                action: () => this.adjustVolume(s.bus, -0.1)
            });
            Typography.drawButton(ctx, '-', minusX, y, 36, 36);

            // Progress bar
            const barX = minusX + 46;
            const barW = 140;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.fillRect(barX, y + 10, barW, 16);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(barX + 2, y + 12, Math.round((barW - 4) * s.val), 12);

            // Plus button
            const plusX = barX + barW + 10;
            this.hitboxes.push({
                x: plusX, y: y, w: 36, h: 36,
                action: () => this.adjustVolume(s.bus, 0.1)
            });
            Typography.drawButton(ctx, '+', plusX, y, 36, 36);

            // Value text
            Typography.drawText(ctx, `${Math.round(s.val * 100)}%`, plusX + 50, y + 23, {
                font: FONT_STACKS.CAPTION,
                color: '#94a3b8'
            });
        }

        // Fullscreen toggle
        const fsY = startY + sliders.length * 64 + 10;
        const fsW = 240;
        const fsX = width / 2 - fsW / 2;
        this.hitboxes.push({
            x: fsX, y: fsY, w: fsW, h: 40,
            action: () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            }
        });
        Typography.drawButton(ctx, 'TOGGLE FULLSCREEN', fsX, fsY, fsW, 40, {
            font: FONT_STACKS.BODY_BOLD
        });

        // Back button
        const backW = 160;
        const backH = 40;
        const backX = width / 2 - backW / 2;
        const backY = height - 80;
        this.hitboxes.push({
            x: backX, y: backY, w: backW, h: backH,
            action: () => { this.mode = 'main'; this.playSfx('click'); }
        });
        Typography.drawButton(ctx, '< BACK TO TITLE', backX, backY, backW, backH, {
            font: FONT_STACKS.BODY_BOLD
        });
    }

    renderCharacterDesign(ctx, width, height) {
        Typography.drawText(ctx, 'CHARACTER DESIGN & WARDROBE', width / 2, 70, {
            font: FONT_STACKS.TITLE,
            color: '#f8fafc',
            align: 'center'
        });

        const options = [
            { label: 'HOODIE COAT', value: this.palette.hoodies[this.customization.hoodieIndex].name },
            { label: 'TROUSERS', value: this.palette.pants[this.customization.pantsIndex].name },
            { label: 'COMPLEXION', value: this.palette.skins[this.customization.skinIndex].name },
            { label: 'EYE GLOW', value: this.palette.eyes[this.customization.eyesIndex].name },
            { label: 'LANTERN FLAME', value: this.palette.lanterns[this.customization.lanternIndex].name }
        ];

        const startY = 160;
        const panelW = 480;
        const startX = width / 2 - panelW / 2;

        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const y = startY + i * 58;

            Typography.drawText(ctx, opt.label, startX, y + 22, {
                font: FONT_STACKS.BODY_BOLD,
                color: this.charOptionIndex === i ? '#38bdf8' : '#cbd5e1'
            });

            // Prev button
            const prevX = startX + 220;
            this.hitboxes.push({
                x: prevX, y, w: 34, h: 34,
                action: () => this.cycleCharOption(i, -1)
            });
            Typography.drawButton(ctx, '<', prevX, y, 34, 34);

            // Value badge
            Typography.drawText(ctx, opt.value, prevX + 90, y + 22, {
                font: FONT_STACKS.CAPTION,
                color: '#f8fafc',
                align: 'center'
            });

            // Next button
            const nextX = prevX + 150;
            this.hitboxes.push({
                x: nextX, y, w: 34, h: 34,
                action: () => this.cycleCharOption(i, 1)
            });
            Typography.drawButton(ctx, '>', nextX, y, 34, 34);
        }

        // Save & Return Button
        const backW = 200;
        const backH = 44;
        const backX = width / 2 - backW / 2;
        const backY = height - 80;
        this.hitboxes.push({
            x: backX, y: backY, w: backW, h: backH,
            action: () => { this.mode = 'main'; this.playSfx('click'); }
        });
        Typography.drawButton(ctx, 'SAVE & RETURN', backX, backY, backW, backH, {
            isSelected: true,
            font: FONT_STACKS.BODY_BOLD
        });
    }

    renderDevStudio(ctx, width, height) {
        Typography.drawText(ctx, 'DEVELOPER STUDIO', width / 2, height * 0.25, {
            font: FONT_STACKS.TITLE,
            color: '#f59e0b',
            align: 'center'
        });

        const devOptions = [
            { label: 'LEVEL ARCHITECT (EDITOR)', action: 'design_level' },
            { label: 'SOUND STUDIO (SYNTH)', action: 'design_sound' },
            { label: '< BACK TO TITLE', action: 'back' }
        ];

        const startY = height * 0.4;
        const btnW = 320;
        const btnH = 46;

        for (let i = 0; i < devOptions.length; i++) {
            const y = startY + i * (btnH + 16);
            const x = width / 2 - btnW / 2;
            const opt = devOptions[i];

            this.hitboxes.push({
                x, y, w: btnW, h: btnH,
                action: () => {
                    if (opt.action === 'back') {
                        this.mode = 'main';
                    } else {
                        this.selectedAction = opt.action;
                    }
                    this.playSfx('click');
                }
            });

            Typography.drawButton(ctx, opt.label, x, y, btnW, btnH, {
                font: FONT_STACKS.BODY_BOLD
            });
        }
    }

    render(ctx = null) {
        // Fallback buffer render if called without high-res context
        const targetCtx = ctx || this.ctx;
        targetCtx.fillStyle = '#05070e';
        targetCtx.fillRect(0, 0, this.width, this.height);
    }
}
