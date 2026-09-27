/**
 * @file MainMenu.js
 * @description Clean Main Menu with a single sub-menu (DESIGN STUDIO) containing:
 * Level Design, Sound Design, Character Design, Settings & Audio, and Controls.
 * Supports WASD/Arrow navigation, mouse hovering & clicking, and Enter/Space selection.
 */

import SpriteRenderer from '../art/SpriteRenderer.js';

export default class MainMenu {
    constructor(ctx, width, height, audio = null, canvas = null) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.audio = audio;
        this.canvas = canvas;
        
        this.mode = 'main'; // 'main', 'designSubMenu', 'characterDesign', 'settings', 'controls'
        
        // Redesigned menu with dedicated Tutorial Level and separate Controls guide
        this.options = ['DESCEND', 'TUTORIAL LEVEL', 'CHARACTER DESIGN', 'CONTROLS', 'SETTINGS', 'DESIGN STUDIO [DEV]'];
        this.controlsReturnMode = 'main';
        this.settingsReturnMode = 'main';
        this.charReturnMode = 'main';
        
        // Developer tools inside DESIGN STUDIO
        this.designOptions = [
            'LEVEL ARCHITECT',
            'SOUND STUDIO',
            'CONTROLS GUIDE',
            '< BACK TO TITLE'
        ];

        this.settingsOptions = ['MASTER VOL', 'MUSIC VOL', 'SFX VOL', 'FULLSCREEN', '< BACK'];
        this.charOptions = ['HOODIE', 'PANTS', 'SKIN', 'EYES', 'LANTERN', '< SAVE & RETURN'];

        this.volumes = {
            master: 0.8,
            music: 0.7,
            sfx: 0.85
        };

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

        // Load saved character customization
        try {
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem('echo_char_custom');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    Object.assign(this.customization, parsed);
                }
            }
        } catch (e) {}

        this.saveCustomization();

        this.selectedIndex = 0;
        this.particles = [];
        this.timer = 0;
        this.previewWalkTimer = 0;
        this.previewWalkFrame = 0;
        this.selection = null;

        // Interactive bounding boxes for mouse hover/click
        this.hitboxes = [];
        
        // Atmospheric embers and floating subterranean soul motes
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 8 - 2, // gentle upward drift
                size: Math.random() > 0.8 ? 2 : 1,
                alpha: Math.random() * 0.5 + 0.2,
                color: Math.random() > 0.35 ? 'rgba(160, 210, 255,' : 'rgba(255, 200, 130,'
            });
        }
        
        this.titleAlpha = 1;
    }

    getActiveCustomization() {
        return {
            hoodie: this.palette.hoodies[this.customization.hoodieIndex].color,
            pants: this.palette.pants[this.customization.pantsIndex].color,
            skin: this.palette.skins[this.customization.skinIndex].color,
            eyes: this.palette.eyes[this.customization.eyesIndex].color,
            lantern: this.palette.lanterns[this.customization.lanternIndex].color
        };
    }

    saveCustomization() {
        if (typeof window !== 'undefined') {
            window.gameCustomization = this.getActiveCustomization();
        }
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('echo_char_custom', JSON.stringify(this.customization));
            }
        } catch (e) {}
    }
    
    playSfx(name = 'click') {
        if (this.audio && this.audio.buffers && this.audio.buffers.has(name)) {
            try {
                this.audio.play(name);
            } catch (e) {}
        }
    }

    update(dt, input) {
        this.timer += dt;
        this.titleAlpha = 0.75 + Math.sin(this.timer * 3) * 0.15 + (Math.random() * 0.1);

        // Advance character preview walk cycle
        this.previewWalkTimer += dt;
        if (this.previewWalkTimer >= 0.16) {
            this.previewWalkTimer = 0;
            this.previewWalkFrame = (this.previewWalkFrame + 1) % 4;
        }
        
        // Particles
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < 0) p.x += this.width;
            if (p.x > this.width) p.x -= this.width;
            if (p.y < 0) p.y += this.height;
            if (p.y > this.height) p.y -= this.height;
        });

        this.selection = null;

        const mouse = input ? input.getMousePos() : { x: -999, y: -999 };
        const isClicked = input ? input.isMouseClicked() : false;
        
        let hoveredIndex = -1;
        let isOverHitbox = false;
        let clickedHitbox = null;

        for (let i = 0; i < this.hitboxes.length; i++) {
            const hb = this.hitboxes[i];
            if (mouse.x >= hb.x && mouse.x <= hb.x + hb.w && mouse.y >= hb.y && mouse.y <= hb.y + hb.h) {
                hoveredIndex = hb.index;
                isOverHitbox = true;
                if (isClicked) {
                    clickedHitbox = hb;
                }
                break;
            }
        }

        if (this.canvas) {
            this.canvas.style.cursor = isOverHitbox ? 'pointer' : 'default';
        }

        if (hoveredIndex !== -1 && hoveredIndex !== this.selectedIndex && this.mode !== 'characterDesign') {
            this.selectedIndex = hoveredIndex;
            this.playSfx('click');
        }

        // --- 1. MAIN MENU SCREEN (Only 2 options: DESCEND and DESIGN STUDIO) ---
        if (this.mode === 'main') {
            const count = this.options.length;

            if (input.isJustPressed('up')) {
                this.selectedIndex = (this.selectedIndex - 1 + count) % count;
                this.playSfx('click');
            }
            if (input.isJustPressed('down')) {
                this.selectedIndex = (this.selectedIndex + 1) % count;
                this.playSfx('click');
            }

            const confirmPressed = input.isJustPressed('confirm') || input.isJustPressed('interact') || (isClicked && isOverHitbox);

            if (confirmPressed) {
                this.playSfx('click');
                if (this.selectedIndex === 0) {
                    this.selection = 'story';
                } else if (this.selectedIndex === 1) {
                    this.selection = 'tutorial';
                } else if (this.selectedIndex === 2) {
                    this.mode = 'characterDesign';
                    this.charReturnMode = 'main';
                    this.selectedIndex = 0;
                } else if (this.selectedIndex === 3) {
                    this.mode = 'controls';
                    this.controlsReturnMode = 'main';
                    this.selectedIndex = 0;
                } else if (this.selectedIndex === 4) {
                    this.mode = 'settings';
                    this.settingsReturnMode = 'main';
                    this.selectedIndex = 0;
                } else if (this.selectedIndex === 5) {
                    this.mode = 'designSubMenu';
                    this.selectedIndex = 0;
                }
            }
        }
        // --- 2. DESIGN STUDIO [DEV] ---
        else if (this.mode === 'designSubMenu') {
            const count = this.designOptions.length;

            if (input.isJustPressed('up')) {
                this.selectedIndex = (this.selectedIndex - 1 + count) % count;
                this.playSfx('click');
            }
            if (input.isJustPressed('down')) {
                this.selectedIndex = (this.selectedIndex + 1) % count;
                this.playSfx('click');
            }

            const confirmPressed = input.isJustPressed('confirm') || input.isJustPressed('interact') || (isClicked && isOverHitbox);

            if (confirmPressed) {
                this.playSfx('click');
                switch (this.selectedIndex) {
                    case 0: // LEVEL ARCHITECT
                        this.selection = 'design_level';
                        break;
                    case 1: // SOUND STUDIO
                        this.selection = 'design_sound';
                        break;
                    case 2: // CONTROLS GUIDE
                        this.mode = 'controls';
                        this.controlsReturnMode = 'designSubMenu';
                        this.selectedIndex = 0;
                        break;
                    case 3: // BACK TO TITLE
                        this.mode = 'main';
                        this.selectedIndex = 5;
                        break;
                }
            }

            if (input.isJustPressed('pause')) {
                this.playSfx('click');
                this.mode = 'main';
                this.selectedIndex = 5;
            }
        }
        // --- 3. CHARACTER DESIGN STUDIO ---
        else if (this.mode === 'characterDesign') {
            const count = this.charOptions.length;

            if (input.isJustPressed('up')) {
                this.selectedIndex = (this.selectedIndex - 1 + count) % count;
                this.playSfx('click');
            }
            if (input.isJustPressed('down')) {
                this.selectedIndex = (this.selectedIndex + 1) % count;
                this.playSfx('click');
            }

            // Arrow keys / A/D to cycle colors
            if (input.isJustPressed('left')) {
                this.cycleCharacterOption(this.selectedIndex, -1);
            }
            if (input.isJustPressed('right')) {
                this.cycleCharacterOption(this.selectedIndex, 1);
            }

            // Mouse click on arrows or options
            if (clickedHitbox) {
                if (clickedHitbox.action === 'prev') {
                    this.cycleCharacterOption(clickedHitbox.targetIndex, -1);
                } else if (clickedHitbox.action === 'next') {
                    this.cycleCharacterOption(clickedHitbox.targetIndex, 1);
                } else if (clickedHitbox.action === 'back') {
                    this.playSfx('click');
                    this.mode = this.charReturnMode || 'main';
                    this.selectedIndex = (this.charReturnMode === 'main') ? 2 : 2;
                } else {
                    this.selectedIndex = clickedHitbox.index;
                }
            }

            if (input.isJustPressed('confirm') || input.isJustPressed('interact')) {
                if (this.selectedIndex === 5) { // BACK
                    this.playSfx('click');
                    this.mode = this.charReturnMode || 'main';
                    this.selectedIndex = (this.charReturnMode === 'main') ? 2 : 2;
                } else {
                    this.cycleCharacterOption(this.selectedIndex, 1);
                }
            }

            if (input.isJustPressed('pause')) {
                this.playSfx('click');
                this.mode = this.charReturnMode || 'main';
                this.selectedIndex = (this.charReturnMode === 'main') ? 2 : 2;
            }
        }
        // --- 4. SETTINGS & AUDIO ---
        else if (this.mode === 'settings') {
            const count = this.settingsOptions.length;

            if (input.isJustPressed('up')) {
                this.selectedIndex = (this.selectedIndex - 1 + count) % count;
                this.playSfx('click');
            }
            if (input.isJustPressed('down')) {
                this.selectedIndex = (this.selectedIndex + 1) % count;
                this.playSfx('click');
            }

            if (this.selectedIndex === 0) {
                if (input.isJustPressed('left')) this.adjustVolume('master', -0.1);
                if (input.isJustPressed('right')) this.adjustVolume('master', +0.1);
            } else if (this.selectedIndex === 1) {
                if (input.isJustPressed('left')) this.adjustVolume('music', -0.1);
                if (input.isJustPressed('right')) this.adjustVolume('music', +0.1);
            } else if (this.selectedIndex === 2) {
                if (input.isJustPressed('left')) this.adjustVolume('sfx', -0.1);
                if (input.isJustPressed('right')) this.adjustVolume('sfx', +0.1);
            }

            const confirmPressed = input.isJustPressed('confirm') || input.isJustPressed('interact') || (isClicked && isOverHitbox);

            if (confirmPressed) {
                if (this.selectedIndex === 0) {
                    this.adjustVolume('master', this.volumes.master >= 1.0 ? -1.0 : 0.2);
                } else if (this.selectedIndex === 1) {
                    this.adjustVolume('music', this.volumes.music >= 1.0 ? -1.0 : 0.2);
                } else if (this.selectedIndex === 2) {
                    this.adjustVolume('sfx', this.volumes.sfx >= 1.0 ? -1.0 : 0.2);
                } else if (this.selectedIndex === 3) {
                    this.playSfx('click');
                    this.toggleFullscreen();
                } else if (this.selectedIndex === 4) {
                    this.playSfx('click');
                    this.mode = this.settingsReturnMode || 'main';
                    this.selectedIndex = (this.settingsReturnMode === 'main') ? 4 : 3;
                }
            }

            if (input.isJustPressed('pause')) {
                this.playSfx('click');
                this.mode = this.settingsReturnMode || 'main';
                this.selectedIndex = (this.settingsReturnMode === 'main') ? 4 : 3;
            }
        }
        // --- 5. CONTROLS GUIDE ---
        else if (this.mode === 'controls' || this.mode === 'tutorial') {
            const backClicked = (isClicked && isOverHitbox) || input.isJustPressed('pause') || input.isJustPressed('confirm') || input.isJustPressed('interact') || input.isJustPressed('jump');
            if (backClicked) {
                this.playSfx('click');
                const returnTarget = this.controlsReturnMode || 'main';
                this.mode = returnTarget;
                this.selectedIndex = (returnTarget === 'main') ? 3 : 2;
            }
        }
    }

    cycleCharacterOption(index, delta) {
        if (index === 0) { // Hoodie
            const len = this.palette.hoodies.length;
            this.customization.hoodieIndex = (this.customization.hoodieIndex + delta + len) % len;
        } else if (index === 1) { // Pants
            const len = this.palette.pants.length;
            this.customization.pantsIndex = (this.customization.pantsIndex + delta + len) % len;
        } else if (index === 2) { // Skin
            const len = this.palette.skins.length;
            this.customization.skinIndex = (this.customization.skinIndex + delta + len) % len;
        } else if (index === 3) { // Eyes
            const len = this.palette.eyes.length;
            this.customization.eyesIndex = (this.customization.eyesIndex + delta + len) % len;
        } else if (index === 4) { // Lantern
            const len = this.palette.lanterns.length;
            this.customization.lanternIndex = (this.customization.lanternIndex + delta + len) % len;
        }
        this.saveCustomization();
        this.playSfx('click');
    }

    adjustVolume(bus, delta) {
        this.volumes[bus] = Math.max(0, Math.min(1.0, Math.round((this.volumes[bus] + delta) * 10) / 10));
        if (this.audio) {
            this.audio.setVolume(bus, this.volumes[bus]);
        }
        this.playSfx('click');
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    }
    
    render() {
        const { ctx, width, height } = this;
        
        // --- 1. ATMOSPHERIC CAVERN BACKGROUND (Hollow Knight / Limbo style) ---
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#06070e');
        bgGrad.addColorStop(0.5, '#0b101c');
        bgGrad.addColorStop(1, '#040508');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Soft vertical abyssal light shaft from top center
        const lightGrad = ctx.createRadialGradient(width / 2, -10, 10, width / 2, height * 0.45, width * 0.55);
        lightGrad.addColorStop(0, 'rgba(80, 140, 225, 0.16)');
        lightGrad.addColorStop(0.45, 'rgba(40, 80, 160, 0.07)');
        lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, width, height);

        // Subterranean Silhouette Arches framing the left and right sides
        ctx.fillStyle = '#070a12';
        // Left pillar & arch silhouette
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(44, 0);
        ctx.quadraticCurveTo(24, height * 0.45, 38, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#152033';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Right pillar & arch silhouette
        ctx.beginPath();
        ctx.moveTo(width, 0);
        ctx.lineTo(width - 44, 0);
        ctx.quadraticCurveTo(width - 24, height * 0.45, width - 38, height);
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Luminous floating soul motes & embers drifting upward
        this.particles.forEach(p => {
            const flicker = Math.sin(this.timer * 4 + p.x) * 0.15;
            ctx.fillStyle = `${p.color} ${Math.max(0.08, p.alpha + flicker)})`;
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        });

        // Soft floor mist bank across bottom
        const mistGrad = ctx.createLinearGradient(0, height - 35, 0, height);
        mistGrad.addColorStop(0, 'rgba(10, 16, 28, 0)');
        mistGrad.addColorStop(1, 'rgba(14, 22, 38, 0.65)');
        ctx.fillStyle = mistGrad;
        ctx.fillRect(0, height - 35, width, 35);

        // Distant red specter eyes flickering in darkness
        if (Math.random() < 0.015) {
            const ex = width * 0.5 + (Math.random() - 0.5) * 160;
            const ey = height * 0.32 + (Math.random() - 0.5) * 10;
            ctx.fillStyle = 'rgba(255, 30, 30, 0.4)';
            ctx.fillRect(ex, ey, 2, 2);
            ctx.fillRect(ex + 8, ey, 2, 2);
        }

        // Reset hitboxes each frame
        this.hitboxes = [];
        
        // --- 2. MAIN MENU SCREEN (Minimalist, elegant, high contrast) ---
        if (this.mode === 'main') {
            ctx.textAlign = 'center';

            // Ethereal Title Glow
            const pulse = Math.sin(this.timer * 2.5) * 0.08;
            ctx.fillStyle = `rgba(160, 205, 255, ${0.14 + pulse})`;
            ctx.font = 'bold 36px monospace';
            ctx.fillText('E  C  H  O', width / 2, 45);

            // Crisp Title
            ctx.fillStyle = `rgba(240, 246, 255, ${this.titleAlpha})`;
            ctx.font = 'bold 34px monospace';
            ctx.fillText('E  C  H  O', width / 2, 44);

            // Subtitle & Rune Divider
            ctx.fillStyle = 'rgba(150, 180, 220, 0.65)';
            ctx.font = '8px monospace';
            ctx.fillText('A  S U B T E R R A N E A N  H O R R O R', width / 2, 57);

            ctx.fillStyle = 'rgba(100, 170, 255, 0.45)';
            ctx.fillText('─────  ◆  ─────', width / 2, 67);

            // Sleek, high-contrast, uncluttered menu list
            const startY = 86;
            const itemH = 24;

            this.options.forEach((opt, i) => {
                const y = startY + i * itemH;
                const isSelected = (i === this.selectedIndex);

                const boxW = 240;
                const boxH = 20;
                const bx = width / 2 - boxW / 2;
                const by = y - 14;

                this.hitboxes.push({
                    index: i,
                    x: bx,
                    y: by,
                    w: boxW,
                    h: boxH
                });

                const isDevBtn = opt.includes('[DEV]');

                if (isSelected) {
                    // Radiant pill backdrop highlight
                    const glowBg = isDevBtn 
                        ? 'rgba(150, 80, 240, 0.16)' 
                        : 'rgba(80, 160, 255, 0.13)';
                    ctx.fillStyle = glowBg;
                    ctx.fillRect(bx + 10, by, boxW - 20, boxH);

                    // Delicate accent line on bottom
                    ctx.fillStyle = isDevBtn ? '#c29bf0' : '#70b8ff';
                    ctx.fillRect(bx + 15, by + boxH - 1, boxW - 30, 1);

                    // High contrast selected text
                    ctx.font = 'bold 12px monospace';
                    ctx.fillStyle = isDevBtn ? '#eeddff' : '#ffffff';
                    ctx.fillText(`◆   ${opt}   ◆`, width / 2, y);
                } else {
                    // Clean, readable soft silver
                    ctx.font = '11px monospace';
                    ctx.fillStyle = isDevBtn ? '#9f78db' : '#94a7c5';
                    ctx.fillText(opt, width / 2, y);
                }
            });

            // Clean, minimalist footer
            ctx.fillStyle = 'rgba(140, 160, 195, 0.55)';
            ctx.font = '9px monospace';
            ctx.fillText('[ W / S ] Navigate   •   [ ENTER / CLICK ] Confirm', width / 2, height - 12);
        }
        // --- 2. DESIGN STUDIO [DEV] SUB-MENU ---
        else if (this.mode === 'designSubMenu') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#d2a8ff';
            ctx.font = '20px monospace';
            ctx.fillText('DEVELOPER STUDIO', width / 2, height / 4 - 4);

            ctx.fillStyle = 'rgba(180, 190, 210, 0.5)';
            ctx.font = '10px monospace';
            ctx.fillText('Level Architect, Procedural Synthesis & Audio Forge', width / 2, height / 4 + 14);
            
            ctx.font = '12px monospace';
            const startY = height / 2 - 16;
            const itemH = 24;

            this.designOptions.forEach((opt, i) => {
                const y = startY + i * itemH;
                const isSelected = (i === this.selectedIndex);

                const boxW = 210;
                const boxH = 20;
                const bx = width / 2 - boxW / 2;
                const by = y - 14;
                this.hitboxes.push({
                    index: i,
                    x: bx,
                    y: by,
                    w: boxW,
                    h: boxH
                });

                if (isSelected) {
                    ctx.fillStyle = 'rgba(110, 64, 201, 0.25)';
                    ctx.fillRect(bx, by, boxW, boxH);
                    ctx.strokeStyle = '#ab7df8';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, boxW, boxH);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`>  ${opt}  <`, width / 2, y);
                } else {
                    ctx.fillStyle = 'rgba(20, 22, 30, 0.6)';
                    ctx.fillRect(bx, by, boxW, boxH);
                    ctx.strokeStyle = '#303444';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, boxW, boxH);
                    ctx.fillStyle = (i === this.designOptions.length - 1) ? '#ff7777' : '#c9d1d9';
                    ctx.fillText(opt, width / 2, y);
                }
            });

            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = '9px monospace';
            ctx.fillText('[ESC] Return to Main Menu', width / 2, height - 10);
        }
        // --- 3. CHARACTER DESIGN STUDIO ---
        else if (this.mode === 'characterDesign') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = '18px monospace';
            ctx.fillText('CHARACTER STUDIO', width / 2, 28);

            // Left side: Animated Character Preview Stage
            const stageX = width * 0.15;
            const stageY = 55;
            const stageW = 120;
            const stageH = 175;

            ctx.fillStyle = 'rgba(12, 14, 20, 0.85)';
            ctx.fillRect(stageX, stageY, stageW, stageH);
            ctx.strokeStyle = '#282c37';
            ctx.strokeRect(stageX, stageY, stageW, stageH);

            // Lantern aura glow behind preview character
            const activeCustom = this.getActiveCustomization();
            const charCenterX = stageX + stageW / 2;
            const charCenterY = stageY + stageH / 2 - 5;

            const glowGrad = ctx.createRadialGradient(
                charCenterX, charCenterY, 5,
                charCenterX, charCenterY, 55
            );
            glowGrad.addColorStop(0, activeCustom.lantern);
            glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(charCenterX, charCenterY, 55, 0, Math.PI * 2);
            ctx.fill();

            // Render Scaled Character in Preview Stage (4x scale)
            ctx.save();
            ctx.translate(charCenterX - 24, charCenterY - 34);
            ctx.scale(4, 4);

            // Mini fake renderer to pipe drawRect calls to canvas ctx
            const mockRenderer = {
                drawRect: (rx, ry, rw, rh, color) => {
                    ctx.fillStyle = color;
                    ctx.fillRect(rx, ry, rw, rh);
                }
            };
            SpriteRenderer.drawPlayer(
                mockRenderer,
                0,
                0,
                1, // walking
                this.previewWalkFrame,
                true,
                this.timer,
                false,
                activeCustom
            );
            ctx.restore();

            // Preview labels
            ctx.fillStyle = '#666677';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('LIVE PREVIEW', charCenterX, stageY + stageH - 12);

            // Right side: Customization Options
            const optX = width * 0.58;
            const startY = 65;
            const itemH = 26;

            const values = [
                this.palette.hoodies[this.customization.hoodieIndex].name,
                this.palette.pants[this.customization.pantsIndex].name,
                this.palette.skins[this.customization.skinIndex].name,
                this.palette.eyes[this.customization.eyesIndex].name,
                this.palette.lanterns[this.customization.lanternIndex].name,
                '< SAVE & RETURN'
            ];

            this.charOptions.forEach((label, i) => {
                const y = startY + i * itemH;
                const isSelected = (i === this.selectedIndex);

                if (i < 5) {
                    ctx.textAlign = 'left';
                    ctx.fillStyle = isSelected ? '#ffffff' : '#888899';
                    ctx.font = '10px monospace';
                    ctx.fillText(label, optX - 45, y);

                    // Left arrow button <
                    const arrowLY = y - 10;
                    ctx.fillStyle = isSelected ? '#7ee787' : '#555566';
                    ctx.fillText('<', optX + 35, y);
                    this.hitboxes.push({
                        index: i,
                        targetIndex: i,
                        action: 'prev',
                        x: optX + 30,
                        y: arrowLY,
                        w: 16,
                        h: 14
                    });

                    // Value name
                    ctx.textAlign = 'center';
                    ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
                    ctx.font = '9px monospace';
                    ctx.fillText(values[i], optX + 90, y);

                    // Right arrow button >
                    ctx.textAlign = 'left';
                    ctx.fillStyle = isSelected ? '#7ee787' : '#555566';
                    ctx.font = '10px monospace';
                    ctx.fillText('>', optX + 145, y);
                    this.hitboxes.push({
                        index: i,
                        targetIndex: i,
                        action: 'next',
                        x: optX + 140,
                        y: arrowLY,
                        w: 16,
                        h: 14
                    });

                    // Entire row hitbox
                    this.hitboxes.push({
                        index: i,
                        action: 'select',
                        x: optX - 50,
                        y: arrowLY,
                        w: 210,
                        h: 16
                    });
                } else {
                    // Back button
                    ctx.textAlign = 'center';
                    const boxW = 160;
                    const boxH = 18;
                    const bx = optX + 45 - boxW / 2;
                    const by = y - 12;

                    this.hitboxes.push({
                        index: i,
                        action: 'back',
                        x: bx,
                        y: by,
                        w: boxW,
                        h: boxH
                    });

                    if (isSelected) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                        ctx.fillRect(bx, by, boxW, boxH);
                        ctx.fillStyle = '#ffffff';
                        ctx.fillText(`>  ${label}  <`, optX + 45, y);
                    } else {
                        ctx.fillStyle = '#996666';
                        ctx.fillText(label, optX + 45, y);
                    }
                }
            });

            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = '9px monospace';
            ctx.fillText('[A/D] or [CLICK < >] Change • [W/S] Navigate • [ESC] Return', width / 2, height - 10);
        }
        // --- 4. SETTINGS & AUDIO ---
        else if (this.mode === 'settings') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px monospace';
            ctx.fillText('SETTINGS & AUDIO', width / 2, height / 3 - 10);

            const startY = height / 2 - 5;
            const itemH = 20;

            const formatBar = (val) => {
                const bars = Math.round(val * 10);
                return '[' + '='.repeat(bars) + '-'.repeat(10 - bars) + '] ' + Math.round(val * 100) + '%';
            };

            const labels = [
                `MASTER: ${formatBar(this.volumes.master)}`,
                `MUSIC:  ${formatBar(this.volumes.music)}`,
                `SFX:    ${formatBar(this.volumes.sfx)}`,
                `FULLSCREEN: ${document.fullscreenElement ? '[ ON ]' : '[ OFF ]'}`,
                '< BACK'
            ];

            ctx.font = '11px monospace';
            labels.forEach((label, i) => {
                const y = startY + i * itemH;
                const isSelected = (i === this.selectedIndex);

                const boxW = 240;
                const boxH = 16;
                this.hitboxes.push({
                    index: i,
                    x: width / 2 - boxW / 2,
                    y: y - 12,
                    w: boxW,
                    h: boxH
                });

                if (isSelected) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.fillRect(width / 2 - boxW / 2, y - 12, boxW, boxH);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`>  ${label}  <`, width / 2, y);
                } else {
                    ctx.fillStyle = (i === 4) ? '#996666' : '#777788';
                    ctx.fillText(label, width / 2, y);
                }
            });

            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = '9px monospace';
            ctx.fillText('[A/D] or [CLICK] Adjust • [ESC] Return', width / 2, height - 12);
        }
        // --- 5. CONTROLS & SURVIVAL PROTOCOLS ---
        else if (this.mode === 'controls' || this.mode === 'tutorial') {
            const boxX = 22;
            const boxY = 12;
            const boxW = width - 44;
            const boxH = height - 24;

            // Deep slate card background
            ctx.fillStyle = 'rgba(8, 12, 20, 0.96)';
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeStyle = '#283852';
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, boxW, boxH);
            ctx.strokeStyle = '#121826';
            ctx.strokeRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4);

            // Header
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('C O N T R O L S', width / 2, boxY + 19);

            ctx.fillStyle = 'rgba(130, 180, 255, 0.7)';
            ctx.font = '8px monospace';
            ctx.fillText('— Master the ancient mechanics to survive the abyss —', width / 2, boxY + 30);

            // Two Columns
            const col1X = boxX + 16;
            const colW = Math.floor((boxW - 42) / 2);
            const col2X = col1X + colW + 12;
            const contentStartY = boxY + 44;

            // Left: KEYBOARD BINDINGS
            ctx.textAlign = 'left';
            ctx.fillStyle = '#7ee787';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('KEYBOARD BINDINGS', col1X, contentStartY);

            ctx.strokeStyle = 'rgba(126, 231, 135, 0.35)';
            ctx.beginPath();
            ctx.moveTo(col1X, contentStartY + 3);
            ctx.lineTo(col1X + colW - 6, contentStartY + 3);
            ctx.stroke();

            const bindings = [
                ['A / D  or  ← / →', 'Move Character'],
                ['SPACE or W',       'Jump / Vault'],
                ['E',                 'Interact (at objects)'],
                ['E / SPACE / ESC',  'Dismiss Lore Notes'],
                ['ESC',              'Pause / Options']
            ];

            bindings.forEach((item, idx) => {
                const py = contentStartY + 17 + idx * 15;
                ctx.fillStyle = '#7ee787';
                ctx.font = '9px monospace';
                ctx.fillText(item[0], col1X, py);
                ctx.fillStyle = '#c5d0e2';
                ctx.fillText(item[1], col1X + 105, py);
            });

            // Notice Box
            const noteY = contentStartY + 96;
            ctx.fillStyle = 'rgba(80, 160, 255, 0.1)';
            ctx.fillRect(col1X, noteY, colW - 6, 38);
            ctx.strokeStyle = 'rgba(80, 160, 255, 0.35)';
            ctx.strokeRect(col1X, noteY, colW - 6, 38);

            ctx.fillStyle = '#9fd2ff';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('IMMERSION NOTICE:', col1X + 6, noteY + 11);
            ctx.fillStyle = '#b8c6dc';
            ctx.font = '8px monospace';
            ctx.fillText('• Mouse is hidden in gameplay.', col1X + 6, noteY + 22);
            ctx.fillText('• Walk to objects & press E to interact.', col1X + 6, noteY + 32);

            // Right: SURVIVAL PROTOCOLS
            ctx.textAlign = 'left';
            ctx.fillStyle = '#f0883e';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('SURVIVAL RULES', col2X, contentStartY);

            ctx.strokeStyle = 'rgba(240, 136, 62, 0.35)';
            ctx.beginPath();
            ctx.moveTo(col2X, contentStartY + 3);
            ctx.lineTo(col2X + colW, contentStartY + 3);
            ctx.stroke();

            const rules = [
                { t: '◆ SANITY & VOID', d: 'Darkness drains sanity. Panic distorts senses.' },
                { t: '◆ TORCH SANCTUARIES', d: 'Lit torches calm your mind and keep you alive.' },
                { t: '◆ SHADOW STALKERS', d: 'Awoken by puzzle triggers. Hunt from behind!' },
                { t: '◆ FLAME BANISHMENT', d: 'Lure shadows into torch flames to destroy them.' },
                { t: '◆ DEATH RESETS', d: 'Dying resets levers and traps in that chamber.' }
            ];

            rules.forEach((rule, idx) => {
                const py = contentStartY + 15 + idx * 23;
                ctx.fillStyle = '#ffb27d';
                ctx.font = 'bold 8px monospace';
                ctx.fillText(rule.t, col2X, py);
                ctx.fillStyle = '#9fb0c8';
                ctx.font = '8px monospace';
                ctx.fillText(rule.d, col2X, py + 10);
            });

            // Back button at bottom
            const backY = boxY + boxH - 22;
            const btnW = 140;
            const btnH = 17;
            const btnX = Math.round(width / 2 - btnW / 2);

            this.hitboxes.push({
                index: 0,
                x: btnX,
                y: backY - 3,
                w: btnW,
                h: btnH,
                action: 'back'
            });

            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.fillRect(btnX, backY - 3, btnW, btnH);
            ctx.strokeStyle = '#5a78a2';
            ctx.lineWidth = 1;
            ctx.strokeRect(btnX, backY - 3, btnW, btnH);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('< BACK TO TITLE', width / 2, backY + 9);

            ctx.fillStyle = 'rgba(160, 185, 220, 0.4)';
            ctx.font = '8px monospace';
            ctx.fillText('[ CLICK OR PRESS ESC / SPACE / ENTER TO RETURN ]', width / 2, boxY + boxH - 3);
        }
    }
    
    getSelection() {
        return this.selection;
    }
    
    showDesignMenu() {
        this.mode = 'designSubMenu';
        this.selectedIndex = 0;
    }
}
