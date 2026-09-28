/**
 * @file Typography.js
 * @description High-resolution typography and vector drawing utilities for crisp UI rendering.
 */

export const FONT_STACKS = {
    TITLE: '600 36px "Cinzel", "Times New Roman", Georgia, serif',
    SUBTITLE: '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    HEADING: '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    BODY: '400 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    BODY_BOLD: '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    CAPTION: '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    KEY_HINT: '600 12px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    PARCHMENT: '500 15px Georgia, "Palatino Linotype", "Book Antiqua", serif'
};

export class Typography {
    /**
     * Draws crisp anti-aliased text with optional shadow or glow.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {number} x 
     * @param {number} y 
     * @param {Object} options 
     */
    static drawText(ctx, text, x, y, options = {}) {
        ctx.save();
        ctx.font = options.font || FONT_STACKS.BODY;
        ctx.fillStyle = options.color || '#ffffff';
        ctx.textAlign = options.align || 'left';
        ctx.textBaseline = options.baseline || 'alphabetic';

        if (options.shadowColor) {
            ctx.shadowColor = options.shadowColor;
            ctx.shadowBlur = options.shadowBlur || 4;
            ctx.shadowOffsetX = options.shadowOffsetX || 0;
            ctx.shadowOffsetY = options.shadowOffsetY || 1;
        }

        ctx.fillText(text, Math.round(x), Math.round(y));
        ctx.restore();
    }

    /**
     * Draws wrapped multiline text.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {number} x 
     * @param {number} y 
     * @param {number} maxWidth 
     * @param {number} lineHeight 
     * @param {Object} options 
     * @returns {number} Total height of rendered text
     */
    static drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
        // Safety: coerce to string, bail gracefully on null/undefined/empty
        if (text === null || text === undefined) return 0;
        const safeText = typeof text === 'string' ? text : (text.text || String(text));
        if (!safeText) return 0;

        try {
            ctx.save();
            ctx.font = options.font || FONT_STACKS.BODY;
            ctx.fillStyle = options.color || '#ffffff';
            ctx.textAlign = options.align || 'left';
            ctx.textBaseline = options.baseline || 'top';

            const paragraphs = safeText.split('\n');
            let currentY = y;

            for (const paragraph of paragraphs) {
                if (paragraph.trim() === '') {
                    currentY += lineHeight * 0.7;
                    continue;
                }

                const words = paragraph.split(' ');
                let line = '';

                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    const testWidth = metrics.width;
                    if (testWidth > maxWidth && n > 0) {
                        ctx.fillText(line, Math.round(x), Math.round(currentY));
                        line = words[n] + ' ';
                        currentY += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, Math.round(x), Math.round(currentY));
                currentY += lineHeight;
            }

            ctx.restore();
            return currentY - y;
        } catch (err) {
            console.error('Typography.drawWrappedText error:', err);
            try { ctx.restore(); } catch (_) {}
            return 0;
        }
    }

    /**
     * Draws a styled interactive button with rounded corners.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} label 
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @param {number} height 
     * @param {Object} options 
     */
    static drawButton(ctx, label, x, y, width, height, options = {}) {
        const isHovered = options.isHovered || false;
        const isSelected = options.isSelected || false;
        const radius = options.radius || 4;

        ctx.save();
        
        // Background
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, width, height, radius);
        } else {
            ctx.rect(x, y, width, height);
        }
        
        ctx.fillStyle = isSelected
            ? 'rgba(56, 189, 248, 0.25)'
            : (isHovered ? 'rgba(255, 255, 255, 0.12)' : (options.bgColor || 'rgba(15, 23, 42, 0.6)'));
        ctx.fill();

        // Border
        ctx.strokeStyle = isSelected
            ? '#38bdf8'
            : (isHovered ? 'rgba(255, 255, 255, 0.4)' : (options.borderColor || 'rgba(255, 255, 255, 0.15)'));
        ctx.lineWidth = isSelected ? 1.5 : 1;
        ctx.stroke();

        // Text
        ctx.font = options.font || FONT_STACKS.BODY_BOLD;
        ctx.fillStyle = isSelected
            ? '#ffffff'
            : (isHovered ? '#ffffff' : (options.textColor || '#94a3b8'));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, Math.round(x + width / 2), Math.round(y + height / 2));

        ctx.restore();
    }
}

export default Typography;
