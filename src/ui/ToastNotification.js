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
     * Add a simple message toast or custom toast.
     * @param {string|Object} messageOrToast
     * @param {number|string} [durationOrType]
     * @param {string} [icon]
     * @param {string} [color]
     */
    add(messageOrToast, durationOrType = 4.0, icon = '🕯️', color = '#38bdf8') {
        if (typeof messageOrToast === 'object' && messageOrToast !== null) {
            this.show(messageOrToast);
            return;
        }

        const duration = typeof durationOrType === 'number' ? durationOrType : 4.0;
        this.show({
            title: 'SURVIVAL DISCOVERY',
            description: String(messageOrToast || ''),
            icon: icon,
            color: color,
            duration: duration
        });
    }

    /**
     * Show a new toast notification.
     * Supports both object ({ title, description, icon, color, duration })
     * and string signatures (show(message, type)).
     * @param {Object|string} toast - Toast object or message string
     * @param {string} [typeOrColor] - Optional type ('success', 'warning', 'error', 'info') or hex color
     */
    show(toast, typeOrColor = null) {
        let toastObj;
        if (typeof toast === 'string') {
            let color = '#38bdf8';
            let icon = 'ℹ️';
            let title = 'SYSTEM';

            if (typeOrColor === 'success') {
                color = '#10b981';
                icon = '✨';
                title = 'SUCCESS';
            } else if (typeOrColor === 'warning') {
                color = '#f59e0b';
                icon = '⚠️';
                title = 'WARNING';
            } else if (typeOrColor === 'error') {
                color = '#ef4444';
                icon = '💀';
                title = 'DANGER';
            } else if (typeof typeOrColor === 'string' && typeOrColor.startsWith('#')) {
                color = typeOrColor;
            }

            toastObj = {
                title: title,
                description: toast,
                icon: icon,
                color: color,
                duration: 3.5
            };
        } else if (typeof toast === 'object' && toast !== null) {
            toastObj = {
                title: toast.title || 'NOTIFICATION',
                description: toast.description || '',
                icon: toast.icon || '🏆',
                color: toast.color || '#f59e0b',
                duration: toast.duration || this.duration
            };
        } else {
            return;
        }

        this.queue.push(toastObj);

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
        const currentDuration = this.currentToast.duration || this.duration;
        if (this.timer >= currentDuration) {
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
        const currentDuration = this.currentToast.duration || this.duration;
        if (this.timer < this.slideTime) {
            progress = this.timer / this.slideTime; // 0 -> 1
        } else if (this.timer > currentDuration - this.slideTime) {
            progress = (currentDuration - this.timer) / this.slideTime; // 1 -> 0
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
