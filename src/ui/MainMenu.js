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
        
        // Main menu has only DESCEND and the DESIGN STUDIO sub-menu!
        this.options = ['DESCEND', 'DESIGN STUDIO'];
        
        // Everything lives inside DESIGN STUDIO
        this.designOptions = [
            'LEVEL DESIGN',
            'SOUND DESIGN',
            'CHARACTER DESIGN',
            'SETTINGS & AUDIO',
            'CONTROLS',
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
        
        // Fog particles
        for (let i = 0; i < 60; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 2 + 1,
                alpha: Math.random() * 0.4 + 0.1
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
                    this.mode = 'designSubMenu';
                    this.selectedIndex = 0;
                }
            }
        }
        // --- 2. DESIGN STUDIO (Everything lives here) ---
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
                    case 0: // LEVEL DESIGN
                        this.selection = 'design_level';
                        break;
                    case 1: // SOUND DESIGN
                        this.selection = 'design_sound';
                        break;
                    case 2: // CHARACTER DESIGN
                        this.mode = 'characterDesign';
                        this.selectedIndex = 0;
                        break;
                    case 3: // SETTINGS & AUDIO
                        this.mode = 'settings';
                        this.selectedIndex = 0;
                        break;
                    case 4: // CONTROLS
                        this.mode = 'controls';
                        this.selectedIndex = 0;
                        break;
                    case 5: // BACK
                        this.mode = 'main';
                        this.selectedIndex = 1;
                        break;
                }
            }

            if (input.isJustPressed('pause')) {
                this.playSfx('click');
                this.mode = 'main';
                this.selectedIndex = 1;
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
                    this.mode = 'designSubMenu';
                    this.selectedIndex = 2;
                } else {
                    this.selectedIndex = clickedHitbox.index;
                }
            }

            if (input.isJustPressed('confirm') || input.isJustPressed('interact')) {
                if (this.selectedIndex === 5) { // BACK
                    this.playSfx('click');
                    this.mode = 'designSubMenu';
                    this.selectedIndex = 2;
                } else {
                    this.cycleCharacterOption(this.selectedIndex, 1);
                }
            }

            if (input.isJustPressed('pause')) {
                this.playSfx('click');
                this.mode = 'designSubMenu';
                this.selectedIndex = 2;
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
                    this.mode = 'designSubMenu';
                    this.selectedIndex = 3;
                }
            }

            if (input.isJustPressed('pause')) {
                this.playSfx('click');
                this.mode = 'designSubMenu';
                this.selectedIndex = 3;
            }
        }
        // --- 5. CONTROLS GUIDE ---
        else if (this.mode === 'controls') {
            const backClicked = (isClicked && isOverHitbox) || input.isJustPressed('pause') || input.isJustPressed('confirm') || input.isJustPressed('interact');
            if (backClicked) {
                this.playSfx('click');
                this.mode = 'designSubMenu';
                this.selectedIndex = 4;
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
        
        // Background
        ctx.fillStyle = '#06060a';
        ctx.fillRect(0, 0, width, height);
        
        // Fog particles
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(180, 190, 210, ${p.alpha})`;
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        });

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
        
        // --- 1. MAIN MENU SCREEN ---
        if (this.mode === 'main') {
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(240, 240, 255, ${this.titleAlpha})`;
            ctx.font = '38px monospace';
            ctx.fillText('ECHO', width / 2, height / 3);
            
            ctx.fillStyle = 'rgba(200, 210, 230, 0.4)';
            ctx.font = '11px monospace';
            ctx.fillText('A Psychological Horror Experience', width / 2, height / 3 + 20);
            
            ctx.font = '14px monospace';
            const startY = height / 2 + 18;
            const itemH = 30;

            this.options.forEach((opt, i) => {
                const y = startY + i * itemH;
                const isSelected = (i === this.selectedIndex);

                const boxW = 200;
                const boxH = 24;
                this.hitboxes.push({
                    index: i,
                    x: width / 2 - boxW / 2,
                    y: y - 16,
                    w: boxW,
                    h: boxH
                });

                if (isSelected) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.fillRect(width / 2 - boxW / 2, y - 16, boxW, boxH);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`>  ${opt}  <`, width / 2, y);
                } else {
                    ctx.fillStyle = '#777788';
                    ctx.fillText(opt, width / 2, y);
                }
            });

            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = '9px monospace';
            ctx.fillText('[W/S] or [MOUSE] Select • [ENTER/SPACE/CLICK] Confirm', width / 2, height - 12);
        }
        // --- 2. DESIGN STUDIO SUB-MENU ---
        else if (this.mode === 'designSubMenu') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = '22px monospace';
            ctx.fillText('DESIGN STUDIO', width / 2, height / 4);

            ctx.fillStyle = 'rgba(180, 190, 210, 0.4)';
            ctx.font = '10px monospace';
            ctx.fillText('Architectural, Acoustic & Entity Forge', width / 2, height / 4 + 16);
            
            ctx.font = '12px monospace';
            const startY = height / 2 - 20;
            const itemH = 22;

            this.designOptions.forEach((opt, i) => {
                const y = startY + i * itemH;
                const isSelected = (i === this.selectedIndex);

                const boxW = 220;
                const boxH = 18;
                this.hitboxes.push({
                    index: i,
                    x: width / 2 - boxW / 2,
                    y: y - 13,
                    w: boxW,
                    h: boxH
                });

                if (isSelected) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.fillRect(width / 2 - boxW / 2, y - 13, boxW, boxH);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`>  ${opt}  <`, width / 2, y);
                } else {
                    ctx.fillStyle = (i === 5) ? '#996666' : '#888899';
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
        // --- 5. CONTROLS GUIDE ---
        else if (this.mode === 'controls') {
            const boxX = width * 0.15;
            const boxY = height * 0.15;
            const boxW = width * 0.7;
            const boxH = height * 0.7;

            ctx.fillStyle = 'rgba(12, 14, 20, 0.94)';
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeStyle = '#282c37';
            ctx.strokeRect(boxX, boxY, boxW, boxH);
            
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px monospace';
            ctx.fillText('CONTROLS GUIDE', width / 2, boxY + 25);
            
            ctx.textAlign = 'left';
            ctx.fillStyle = '#b0b8c8';
            ctx.font = '11px monospace';

            const controlsList = [
                ['A / D  or  ← / →', 'Move Character'],
                ['SPACE or W or ↑', 'Jump / Variable Lift'],
                ['E  or  ENTER',     'Interact / Read / Pull Lever'],
                ['TAB',             'Open / Close Level Architect'],
                ['MOUSE CLICK',     'Menu Navigation & Editor Tools'],
                ['ESC',             'Pause Game / Return to Menu'],
                ['Q (in Pause)',    'Quit to Main Menu']
            ];

            controlsList.forEach((item, idx) => {
                const py = boxY + 48 + idx * 15;
                ctx.fillStyle = '#7ee787';
                ctx.fillText(item[0], boxX + 20, py);
                ctx.fillStyle = '#9999aa';
                ctx.fillText(item[1], boxX + 175, py);
            });
            
            // Back button
            const backY = boxY + boxH - 16;
            this.hitboxes.push({
                index: 0,
                x: width / 2 - 50,
                y: backY - 12,
                w: 100,
                h: 18
            });

            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(width / 2 - 50, backY - 12, 100, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.fillText('[ < BACK ]', width / 2, backY);
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
