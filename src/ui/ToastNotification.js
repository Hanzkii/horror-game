/**
 * @file ToastNotification.js
 * @description High-resolution vector notification toasts for achievements, checkpoints, and lore milestones.
 */

import { Typography, FONT_STACKS } from './Typography.js';

export class ToastNotification {
    constructor(audio = null) {
        this.audio = audio;
        this.queue = [];
        this.currentToast = null;
        this.timer = 0;
        this.duration = 4.0; // seconds
        this.slideTime = 0.4;
    }

    /**
     * Show a new toast notification.
     * @param {Object} toast - { title, description, icon, color }
     */
    show(toast) {
        this.queue.push({
            title: toast.title || 'NOTIFICATION',
            description: toast.description || '',
            icon: toast.icon || '🏆',
            color: toast.color || '#f59e0b'
        });

        if (!this.currentToast) {
            this.next();
        }
    }

    next() {
        if (this.queue.length > 0) {
            this.currentToast = this.queue.shift();
            this.timer = 0;
            if (this.audio && this.audio.play) {
                try {
                    this.audio.play('stinger_sharp', { volume: 0.35 });
                } catch (e) {}
            }
        } else {
            this.currentToast = null;
        }
    }

    update(dt) {
        if (!this.currentToast) return;

        this.timer += dt;
        if (this.timer >= this.duration) {
            this.next();
        }
    }

    /**
     * Render the active toast at the top-right of the screen.
     * @param {CanvasRenderingContext2D} ctx - High-resolution display context
     * @param {number} width - Screen width in display pixels
     * @param {number} height - Screen height in display pixels
     */
    render(ctx, width, height) {
        if (!this.currentToast) return;

        // Slide animation: slide down from top, hold, slide up
        let progress = 0;
        if (this.timer < this.slideTime) {
            progress = this.timer / this.slideTime; // 0 -> 1
        } else if (this.timer > this.duration - this.slideTime) {
            progress = (this.duration - this.timer) / this.slideTime; // 1 -> 0
        } else {
            progress = 1.0;
        }

        // Ease out quad
        const ease = 1 - Math.pow(1 - progress, 2);

        const toastW = 320;
        const toastH = 64;
        const marginX = 24;
        const targetY = height - toastH - 24;
        const startY = height + 10;
        const currentY = startY + (targetY - startY) * ease;
        const currentX = width - toastW - marginX;

        ctx.save();
        ctx.globalAlpha = Math.min(1.0, progress * 1.5);

        // Toast container
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(currentX, currentY, toastW, toastH, 6);
        } else {
            ctx.rect(currentX, currentY, toastW, toastH);
        }
        ctx.fillStyle = 'rgba(8, 12, 20, 0.94)';
        ctx.fill();

        // Accent border
        ctx.strokeStyle = this.currentToast.color || '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Icon badge
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.currentToast.icon, currentX + 32, currentY + toastH / 2);

        // Title
        Typography.drawText(ctx, this.currentToast.title.toUpperCase(), currentX + 60, currentY + 22, {
            font: FONT_STACKS.BODY_BOLD,
            color: this.currentToast.color || '#f59e0b'
        });

        // Description
        Typography.drawText(ctx, this.currentToast.description, currentX + 60, currentY + 42, {
            font: FONT_STACKS.CAPTION,
            color: '#cbd5e1'
        });

        ctx.restore();
    }
}

export default ToastNotification;
