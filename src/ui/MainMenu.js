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

        this.mode = 'main'; // 'main', 'achievements', 'settings', 'controls'
        this.selectedIndex = 0;
        this.timer = 0;
        this.particles = [];

        // Main options
        this.hasSavedGame = false;
        this.saveSummary = '';
        this.checkSave();

        // Audio volumes
        this.settings = saveManager.loadSettings();
        this.audioScape = null;

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
        this.inputCooldown = 0.65; // Prevent accidental selection on awakening
    }

    resetInputCooldown(duration = 0.65) {
        this.inputCooldown = Math.max(this.inputCooldown, duration);
    }

    checkSave() {
        this.hasSavedGame = saveManager.hasSave('auto');
        if (this.hasSavedGame) {
            const data = saveManager.load('auto');
            const floor = data?.player?.floorIndex || 1;
            this.saveSummary = `DEPTH B${floor}`;
        }
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
        this.mode = 'main';
        this.selectedIndex = 0;
        this.inputCooldown = 0.25;
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

        // Input cooldown: prevents awakening click/keypress bleed-through
        if (this.inputCooldown > 0) {
            this.inputCooldown -= dt;
            return;
        }

        // Escape handling across sub-menus
        if (input.isJustPressed('pause')) {
            if (this.mode !== 'main') {
                this.mode = 'main';
                this.inputCooldown = 0.2;
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
            const maxOptions = this.hasSavedGame ? 6 : 5;
            if (upPressed) {
                this.selectedIndex = (this.selectedIndex - 1 + maxOptions) % maxOptions;
                this.playSfx('click');
            } else if (downPressed) {
                this.selectedIndex = (this.selectedIndex + 1) % maxOptions;
                this.playSfx('click');
            } else if (enterPressed) {
                this.executeMainSelection(this.selectedIndex);
            }
        }
    }

    executeMainSelection(index) {
        if (this.hasSavedGame) {
            switch (index) {
                case 0: this.selectedAction = 'continue'; break;
                case 1: this.selectedAction = 'story'; break;
                case 2: this.selectedAction = 'tutorial'; break;
                case 3: this.mode = 'achievements'; break;
                case 4: this.mode = 'settings'; break;
                case 5: this.mode = 'controls'; break;
            }
        } else {
            switch (index) {
                case 0: this.selectedAction = 'story'; break;
                case 1: this.selectedAction = 'tutorial'; break;
                case 2: this.mode = 'achievements'; break;
                case 3: this.mode = 'settings'; break;
                case 4: this.mode = 'controls'; break;
            }
        }
        this.inputCooldown = 0.25;
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
            case 'controls':
                this.renderControlsGuide(ctx, width, height);
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
                'ACHIEVEMENTS',
                'SETTINGS & AUDIO',
                'CONTROLS'
            ]
            : [
                'DESCEND INTO ABYSS',
                'TUTORIAL CHAMBER',
                'ACHIEVEMENTS',
                'SETTINGS & AUDIO',
                'CONTROLS'
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
        Typography.drawText(ctx, 'Navigate with mouse or keyboard  •  Click to select', width / 2, height - 32, {
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

    renderControlsGuide(ctx, width, height) {
        Typography.drawText(ctx, 'SURVIVAL CONTROLS & MECHANICS', width / 2, 60, {
            font: FONT_STACKS.TITLE,
            color: '#f8fafc',
            align: 'center',
            shadowColor: 'rgba(56, 189, 248, 0.4)',
            shadowBlur: 10
        });

        Typography.drawText(ctx, 'Master movement, stealth, and light conservation to survive the catacombs', width / 2, 88, {
            font: FONT_STACKS.CAPTION,
            color: '#94a3b8',
            align: 'center'
        });

        const panelW = Math.min(680, width * 0.88);
        const panelH = height - 170;
        const panelX = width / 2 - panelW / 2;
        const panelY = 104;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        const controls = [
            { key: '[ A / D ] or [ ← / → ]', name: 'WALK / BALANCE', desc: 'Navigate corridors and narrow stone ledges.' },
            { key: '[ SPACE ] or [ W / ↑ ]', name: 'JUMP & WALL-SLIDE', desc: 'Hold for higher leap; press against shafts to wall-slide.' },
            { key: '[ SHIFT ]', name: 'SPRINT (DANGER)', desc: 'Sprint at high speed, but drains stamina and alerts the Stalker!' },
            { key: '[ C ] or [ CTRL ]', name: 'HOLD BREATH / CROUCH', desc: 'Conceals you in shadows. Stalker glides past silently, but lungs give out quickly.' },
            { key: '[ E ]', name: 'INTERACT', desc: 'Pull ancient levers, read inscriptions, and gather Lantern Oil Flasks.' },
            { key: '[ ESC ] or CLICK PAUSE', name: 'PAUSE & SETTINGS', desc: 'Fine-tune master/ambient audio, or test diagnostic soundboards.' }
        ];

        const rowH = (panelH - 24) / controls.length;
        for (let i = 0; i < controls.length; i++) {
            const c = controls[i];
            const y = panelY + 14 + i * rowH;

            // Key badge
            const badgeW = 160;
            ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
            ctx.fillRect(panelX + 16, y + 2, badgeW, rowH - 8);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.strokeRect(panelX + 16, y + 2, badgeW, rowH - 8);

            Typography.drawText(ctx, c.key, panelX + 16 + badgeW / 2, y + rowH / 2 + 1, {
                font: FONT_STACKS.BODY_BOLD,
                color: '#38bdf8',
                align: 'center'
            });

            // Action name
            Typography.drawText(ctx, c.name, panelX + badgeW + 30, y + rowH / 2 - 4, {
                font: FONT_STACKS.BODY_BOLD,
                color: '#f8fafc'
            });

            // Description
            Typography.drawText(ctx, c.desc, panelX + badgeW + 30, y + rowH / 2 + 10, {
                font: FONT_STACKS.CAPTION,
                color: '#94a3b8'
            });
        }

        // Back button
        const backW = 160;
        const backH = 40;
        const backX = width / 2 - backW / 2;
        const backY = height - 55;
        this.hitboxes.push({
            x: backX, y: backY, w: backW, h: backH,
            action: () => { this.mode = 'main'; this.playSfx('click'); }
        });
        Typography.drawButton(ctx, '< BACK TO TITLE', backX, backY, backW, backH, {
            font: FONT_STACKS.BODY_BOLD
        });
    }

    render(ctx = null) {
        // Fallback buffer render if called without high-res context
        const targetCtx = ctx || this.ctx;
        targetCtx.fillStyle = '#05070e';
        targetCtx.fillRect(0, 0, this.width, this.height);
    }
}
