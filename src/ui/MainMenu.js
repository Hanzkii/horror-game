/**
 * @file MainMenu.js
 * @description Full-screen canvas Main Menu with drifting fog particles, horror typography,
 * WASD/Arrow navigation, Enter/Space selection, full mouse click & hover interactions,
 * and a dedicated Settings sub-menu.
 */

export default class MainMenu {
    constructor(ctx, width, height, audio = null, canvas = null) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.audio = audio;
        this.canvas = canvas;
        
        this.mode = 'main'; // 'main', 'designSubMenu', 'settings', 'controls'
        
        this.options = ['DESCEND', 'DESIGN STUDIO', 'SETTINGS', 'CONTROLS'];
        this.designOptions = ['LEVEL ARCHITECT', 'SOUND STUDIO', '< BACK'];
        this.settingsOptions = ['MASTER VOL', 'MUSIC VOL', 'SFX VOL', 'FULLSCREEN', '< BACK'];
        
        this.volumes = {
            master: 0.8,
            music: 0.7,
            sfx: 0.85
        };

        this.selectedIndex = 0;
        this.particles = [];
        this.timer = 0;
        this.lastHoveredIndex = -1;
        this.selection = null;

        // Interactive button bounding boxes for mouse interaction
        this.hitboxes = [];
        
        // Ambient fog particles
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
        
        // Update particles
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
        
        // Check mouse hover over registered hitboxes
        let hoveredIndex = -1;
        let isOverHitbox = false;

        for (let i = 0; i < this.hitboxes.length; i++) {
            const hb = this.hitboxes[i];
            if (mouse.x >= hb.x && mouse.x <= hb.x + hb.w && mouse.y >= hb.y && mouse.y <= hb.y + hb.h) {
                hoveredIndex = hb.index;
                isOverHitbox = true;
                break;
            }
        }

        // Set cursor style on canvas
        if (this.canvas) {
            this.canvas.style.cursor = isOverHitbox ? 'pointer' : 'default';
        }

        if (hoveredIndex !== -1 && hoveredIndex !== this.selectedIndex) {
            this.selectedIndex = hoveredIndex;
            this.playSfx('click');
        }

        // --- MODE 1: MAIN MENU ---
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
                } else if (this.selectedIndex === 2) {
                    this.mode = 'settings';
                    this.selectedIndex = 0;
                } else if (this.selectedIndex === 3) {
                    this.mode = 'controls';
                    this.selectedIndex = 0;
                }
            }
        }
        // --- MODE 2: DESIGN SUB-MENU ---
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
                if (this.selectedIndex === 0) {
                    this.selection = 'design_level';
                } else if (this.selectedIndex === 1) {
                    this.selection = 'design_sound';
                } else if (this.selectedIndex === 2) {
                    this.mode = 'main';
                    this.selectedIndex = 1;
                }
            }

            if (input.isJustPressed('pause')) {
                this.playSfx('click');
                this.mode = 'main';
                this.selectedIndex = 1;
            }
        }
        // --- MODE 3: SETTINGS ---
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

            // Adjust values with A/D or Left/Right
            if (this.selectedIndex === 0) { // Master Volume
                if (input.isJustPressed('left')) this.adjustVolume('master', -0.1);
                if (input.isJustPressed('right')) this.adjustVolume('master', +0.1);
            } else if (this.selectedIndex === 1) { // Music Volume
                if (input.isJustPressed('left')) this.adjustVolume('music', -0.1);
                if (input.isJustPressed('right')) this.adjustVolume('music', +0.1);
            } else if (this.selectedIndex === 2) { // SFX Volume
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
                } else if (this.selectedIndex === 3) { // Fullscreen
                    this.playSfx('click');
                    this.toggleFullscreen();
                } else if (this.selectedIndex === 4) { // Back
                    this.playSfx('click');
                    this.mode = 'main';
                    this.selectedIndex = 2;
                }
            }

            if (input.isJustPressed('pause')) {
                this.playSfx('click');
                this.mode = 'main';
                this.selectedIndex = 2;
            }
        }
        // --- MODE 4: CONTROLS ---
        else if (this.mode === 'controls') {
            const backClicked = (isClicked && isOverHitbox) || input.isJustPressed('pause') || input.isJustPressed('confirm') || input.isJustPressed('interact');
            if (backClicked) {
                this.playSfx('click');
                this.mode = 'main';
                this.selectedIndex = 3;
            }
        }
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
        
        // Particles
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

        // Reset hitboxes each render
        this.hitboxes = [];
        
        // --- 1. MAIN MENU SCREEN ---
        if (this.mode === 'main') {
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(240, 240, 255, ${this.titleAlpha})`;
            ctx.font = '36px monospace';
            ctx.fillText('ECHO', width / 2, height / 3);
            
            ctx.fillStyle = 'rgba(200, 210, 230, 0.4)';
            ctx.font = '11px monospace';
            ctx.fillText('A Psychological Horror Experience', width / 2, height / 3 + 18);
            
            ctx.font = '13px monospace';
            const startY = height / 2 + 10;
            const itemH = 22;

            this.options.forEach((opt, i) => {
                const y = startY + i * itemH;
                const isSelected = (i === this.selectedIndex);

                // Register hitbox for mouse
                const boxW = 160;
                const boxH = 18;
                this.hitboxes.push({
                    index: i,
                    x: width / 2 - boxW / 2,
                    y: y - 13,
                    w: boxW,
                    h: boxH
                });

                if (isSelected) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.fillRect(width / 2 - boxW / 2, y - 13, boxW, boxH);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`>  ${opt}  <`, width / 2, y);
                } else {
                    ctx.fillStyle = '#777788';
                    ctx.fillText(opt, width / 2, y);
                }
            });

            // Footer hint
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = '9px monospace';
            ctx.fillText('[W/S] or [MOUSE] Select • [ENTER/SPACE/CLICK] Confirm', width / 2, height - 12);
        }
        // --- 2. DESIGN STUDIO SUB-MENU ---
        else if (this.mode === 'designSubMenu') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px monospace';
            ctx.fillText('DESIGN STUDIO', width / 2, height / 3);
            
            ctx.font = '13px monospace';
            const startY = height / 2 + 10;
            const itemH = 22;

            this.designOptions.forEach((opt, i) => {
                const y = startY + i * itemH;
                const isSelected = (i === this.selectedIndex);

                const boxW = 180;
                const boxH = 18;
                this.hitboxes.push({
                    index: i,
                    x: width / 2 - boxW / 2,
                    y: y - 13,
                    w: boxW,
                    h: boxH
                });

                if (isSelected) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.fillRect(width / 2 - boxW / 2, y - 13, boxW, boxH);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`>  ${opt}  <`, width / 2, y);
                } else {
                    ctx.fillStyle = (i === 2) ? '#996666' : '#777788';
                    ctx.fillText(opt, width / 2, y);
                }
            });

            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = '9px monospace';
            ctx.fillText('[ESC] or Click [< BACK] to Return', width / 2, height - 12);
        }
        // --- 3. SETTINGS MENU ---
        else if (this.mode === 'settings') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px monospace';
            ctx.fillText('SETTINGS', width / 2, height / 3 - 10);

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
        // --- 4. CONTROLS SCREEN ---
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
                ['MOUSE CLICK',     'Menu Navigation & Editor Tools'],
                ['ESC',             'Pause Game / Return to Menu'],
                ['Q (in Pause)',    'Quit to Main Menu']
            ];

            controlsList.forEach((item, idx) => {
                const py = boxY + 50 + idx * 16;
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
