export default class MainMenu {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.mode = 'main'; // 'main', 'controls', 'designSubMenu'
        
        this.options = ['DESCEND', 'DESIGN STUDIO', 'CONTROLS'];
        this.designOptions = ['LEVEL ARCHITECT', 'SOUND STUDIO'];
        
        this.selectedIndex = 0;
        this.particles = [];
        this.timer = 0;
        
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 5,
                alpha: Math.random() * 0.5 + 0.1
            });
        }
        
        this.titleAlpha = 1;
        this.selection = null;
    }
    
    update(dt, input) {
        this.timer += dt;
        this.titleAlpha = 0.7 + Math.random() * 0.3;
        
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < 0) p.x += this.width;
            if (p.x > this.width) p.x -= this.width;
            if (p.y < 0) p.y += this.height;
            if (p.y > this.height) p.y -= this.height;
        });

        this.selection = null;
        
        if (this.mode === 'main') {
            if (input.isJustPressed('up')) {
                this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
            }
            if (input.isJustPressed('down')) {
                this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
            }
            if (input.isJustPressed('jump') || input.isJustPressed('interact')) {
                if (this.selectedIndex === 0) this.selection = 'story';
                else if (this.selectedIndex === 1) {
                    this.mode = 'designSubMenu';
                    this.selectedIndex = 0;
                }
                else if (this.selectedIndex === 2) this.mode = 'controls';
            }
        } else if (this.mode === 'designSubMenu') {
            if (input.isJustPressed('up')) {
                this.selectedIndex = (this.selectedIndex - 1 + this.designOptions.length) % this.designOptions.length;
            }
            if (input.isJustPressed('down')) {
                this.selectedIndex = (this.selectedIndex + 1) % this.designOptions.length;
            }
            if (input.isJustPressed('jump') || input.isJustPressed('interact')) {
                if (this.selectedIndex === 0) this.selection = 'design_level';
                else if (this.selectedIndex === 1) this.selection = 'design_sound';
            }
            if (input.isJustPressed('pause')) {
                this.mode = 'main';
                this.selectedIndex = 1;
            }
        } else if (this.mode === 'controls') {
            if (input.isJustPressed('pause') || input.isJustPressed('jump') || input.isJustPressed('interact')) {
                this.mode = 'main';
            }
        }
    }
    
    render() {
        const { ctx, width, height } = this;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#fff';
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(p.x, p.y, 1, 1);
        });
        ctx.globalAlpha = 1;

        if (Math.random() < 0.01) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            const ex = width/2 + (Math.random()-0.5)*100;
            const ey = height/2 - 40;
            ctx.fillRect(ex, ey, 2, 2);
            ctx.fillRect(ex+10, ey, 2, 2);
        }
        
        if (this.mode === 'main') {
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(255, 255, 255, ${this.titleAlpha})`;
            ctx.font = '36px monospace';
            ctx.fillText('ECHO', width/2, height/3);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '12px monospace';
            ctx.fillText('A Horror Experience', width/2, height/3 + 20);
            
            ctx.font = '14px monospace';
            const startY = height/2 + 20;
            this.options.forEach((opt, i) => {
                const y = startY + i * 25;
                if (i === this.selectedIndex) {
                    ctx.fillStyle = '#fff';
                    const pulse = Math.sin(this.timer * 5) * 2 + 2;
                    ctx.fillText(`> ${opt} <`, width/2, y);
                } else {
                    ctx.fillStyle = '#666';
                    ctx.fillText(opt, width/2, y);
                }
            });
        } else if (this.mode === 'designSubMenu') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = '18px monospace';
            ctx.fillText('DESIGN STUDIO', width/2, height/3);
            
            ctx.font = '14px monospace';
            const startY = height/2 + 20;
            this.designOptions.forEach((opt, i) => {
                const y = startY + i * 25;
                if (i === this.selectedIndex) {
                    ctx.fillStyle = '#fff';
                    ctx.fillText(`> ${opt} <`, width/2, y);
                } else {
                    ctx.fillStyle = '#666';
                    ctx.fillText(opt, width/2, y);
                }
            });
            
            ctx.fillStyle = '#444';
            ctx.font = '10px monospace';
            ctx.fillText('[ESC] BACK', width/2, height - 20);
        } else if (this.mode === 'controls') {
            ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(width*0.2, height*0.2, width*0.6, height*0.6);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(width*0.2, height*0.2, width*0.6, height*0.6);
            
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = '14px monospace';
            ctx.fillText('CONTROLS', width/2, height*0.3);
            
            ctx.fillStyle = '#aaa';
            ctx.font = '12px monospace';
            ctx.fillText('[A / D] Move', width/2, height*0.45);
            ctx.fillText('[SPACE] Jump', width/2, height*0.55);
            ctx.fillText('[E] Interact', width/2, height*0.65);
            ctx.fillText('[ESC] Pause', width/2, height*0.75);
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
