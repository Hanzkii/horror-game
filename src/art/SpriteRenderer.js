export default class SpriteRenderer {
    static getRandom(seed) {
        return ((seed * 9301 + 49297) % 233280) / 233280;
    }

    static drawStone(renderer, x, y, size, seed) {
        // Dark blue-grey base
        renderer.drawRect(x, y, size, size, '#1a1a2e');
        
        // 1px mortar/grout lines creating 8x8 block pattern
        renderer.drawRect(x + 7, y, 1, size, '#0d0d15');
        renderer.drawRect(x, y + 7, size, 1, '#0d0d15');
        renderer.drawRect(x + 15, y, 1, size, '#0d0d15');
        renderer.drawRect(x, y + 15, size, 1, '#0d0d15');

        // Random darker pixels for cracks
        const crackSeed = (seed * 7 + (x / size) * 13 + (y / size) * 17) % 100;
        const numCracks = Math.floor((crackSeed / 100) * 5) + 2;
        for (let i = 0; i < numCracks; i++) {
            const cx = Math.floor(this.getRandom(seed + i * 3) * size);
            const cy = Math.floor(this.getRandom(seed + i * 5) * size);
            renderer.drawRect(x + cx, y + cy, 1, 1, '#0f0f18');
        }
    }

    static drawBrick(renderer, x, y, size, seed) {
        // Dark reddish base
        renderer.drawRect(x, y, size, size, '#2a1a1a');

        // Alternating offset brick rows (8x4 bricks with 1px mortar)
        for (let row = 0; row < 4; row++) {
            const yOffset = y + row * 4;
            renderer.drawRect(x, yOffset + 3, size, 1, '#1a0d0d'); // Horizontal mortar
            
            const xOffset = (row % 2 === 0) ? 0 : 4;
            for (let col = 0; col < 2; col++) {
                renderer.drawRect(x + xOffset + col * 8, yOffset, 1, 3, '#1a0d0d'); // Vertical mortar
            }
        }

        // Cracks and moss
        for (let i = 0; i < 3; i++) {
            const cx = Math.floor(this.getRandom(seed + i * 2) * size);
            const cy = Math.floor(this.getRandom(seed + i * 4) * size);
            renderer.drawRect(x + cx, y + cy, 1, 1, '#1a0d0d');
            
            if (this.getRandom(seed + i * 7) > 0.5 && cy > size - 4) {
                renderer.drawRect(x + cx, y + cy, 1, 1, '#2d4c2d'); // tiny green moss
            }
        }
    }

    static drawPlatform(renderer, x, y, size, seed) {
        renderer.drawRect(x, y, size, size, '#382518');
        
        // Horizontal grain
        for (let i = 0; i < size; i += 3) {
            renderer.drawRect(x, y + i, size, 1, '#2c1c11');
        }
        
        // Lighter top edge
        renderer.drawRect(x, y, size, 1, '#4a3220');
        
        // Knots
        const knotX = Math.floor(this.getRandom(seed) * (size - 2)) + 1;
        const knotY = Math.floor(this.getRandom(seed + 1) * (size - 2)) + 1;
        renderer.drawRect(x + knotX, y + knotY, 2, 2, '#21140b');
    }

    static drawBackdrop(renderer, x, y, size, seed) {
        renderer.drawRect(x, y, size, size, '#0d0d15');
        
        // Faded stone suggestion
        if (this.getRandom(seed) > 0.7) {
            renderer.drawRect(x + 2, y + 2, size - 4, size - 4, '#101018');
        }
        
        if (this.getRandom(seed + 1) > 0.8) {
            renderer.drawRect(x, y, 1, size, '#09090d');
            renderer.drawRect(x, y, size, 1, '#09090d');
        }
    }

    static drawPlayer(renderer, x, y, state, frame, facingRight, breathTimer, isBlinking = false, custom = null) {
        const hSkin = custom?.skin || '#d4cec0';
        const hTorso = custom?.hoodie || '#3a4a5c';
        const hLegs = custom?.pants || '#2a2a3a';
        const hEyes = custom?.eyes || '#ffffff';
        
        const w = 12;
        const h = 17;

        // Breath animation
        const breathScale = (state === 0) ? Math.sin(breathTimer * 2) * 0.4 : 0;
        
        // Legs (bottom 7px: y + 10 to y + 17)
        let leftLegY = y + 10;
        let rightLegY = y + 10;
        let leftArmY = y + 4;
        let rightArmY = y + 4;
        
        if (state === 1) { // WALKING
            const legOffsets = [0, -1, 0, 1];
            leftLegY += legOffsets[frame];
            rightLegY += legOffsets[(frame + 2) % 4];
            leftArmY += legOffsets[(frame + 2) % 4]; // Arms opposite to legs
            rightArmY += legOffsets[frame];
        } else if (state === 2) { // JUMPING
            leftLegY -= 2;
            rightLegY -= 2;
            leftArmY -= 2;
            rightArmY -= 2;
        } else if (state === 3) { // FALLING
            leftLegY -= 1;
            rightLegY -= 1;
            leftArmY -= 1;
            rightArmY -= 1;
        } else if (state === 4) { // WALL_SLIDING
            leftLegY -= 1;
            rightLegY -= 1;
            leftArmY -= 1;
            rightArmY -= 3; // one arm up
        }

        // Draw left arm (behind)
        renderer.drawRect(x + 1, leftArmY - breathScale, 2, 5, '#222830');

        // Draw legs
        renderer.drawRect(x + 2, leftLegY, 4, 7, hLegs);
        renderer.drawRect(x + 6, rightLegY, 4, 7, hLegs);

        // Draw torso
        renderer.drawRect(x + 2, y + 4 - breathScale, 8, 6 + breathScale, hTorso);
        
        // Draw right arm (front)
        renderer.drawRect(x + 9, rightArmY - breathScale, 2, 5, '#222830');

        // Head
        renderer.drawRect(x + 3, y - breathScale, 6, 4, hSkin);
        
        // Hood part
        renderer.drawRect(x + 2, y - 1 - breathScale, 8, 4, hTorso);
        renderer.drawRect(x + 3, y - breathScale, 6, 2, hTorso); // hood peak
        
        // Face/Skin visible area
        renderer.drawRect(x + (facingRight ? 4 : 3), y + 1 - breathScale, 5, 3, hSkin);

        // Eyes
        if (!isBlinking) {
            const eyeX = facingRight ? x + 6 : x + 4;
            renderer.drawRect(eyeX, y + 2 - breathScale, 1, 1, hEyes);
            renderer.drawRect(eyeX + 2, y + 2 - breathScale, 1, 1, hEyes);
        }
    }

    static drawTorch(renderer, x, y, timer, isExtinguished = false) {
        // Stone bracket
        renderer.drawRect(x + 6, y + 10, 4, 3, '#555566');
        
        if (isExtinguished) {
            // Extinguished torch: burnt dark wick with faint grey smoke puff
            renderer.drawRect(x + 7, y + 8, 2, 2, '#22222a');
            const smokeCycle = (timer * 2.5) % 1;
            const smokeY = y + 7 - Math.floor(smokeCycle * 5);
            renderer.drawRect(x + 7 + Math.sin(timer * 4) * 1.5, smokeY, 1, 1, 'rgba(130, 130, 145, 0.45)');
            return;
        }

        // Flame body
        const frame = Math.floor(timer * 10) % 3;
        const hOffsets = [0, 1, 0];
        const height = 6 + hOffsets[frame];
        
        // Base red
        renderer.drawRect(x + 6, y + 10 - height, 4, height, '#d43011');
        // Core orange
        renderer.drawRect(x + 7, y + 10 - height + 1, 2, height - 2, '#f27818');
        // Tips yellow
        renderer.drawRect(x + 7, y + 10 - height, 2, 2, '#fcd626');

        // Sparks
        const sparkSeed = Math.floor(timer * 5);
        if (this.getRandom(sparkSeed) > 0.5) {
            const sx = x + 5 + Math.floor(this.getRandom(sparkSeed + 1) * 6);
            const sy = y + 6 - Math.floor(this.getRandom(sparkSeed + 2) * 8);
            renderer.drawRect(sx, sy, 1, 1, '#fcd626');
        }
    }

    static drawLever(renderer, x, y, isActivated) {
        // Base
        renderer.drawRect(x + 4, y + 12, 8, 4, '#444455');
        
        // Pivot
        renderer.drawRect(x + 7, y + 10, 2, 2, '#777788');
        
        // Lever arm
        if (isActivated) {
            // Tilted right
            renderer.drawRect(x + 8, y + 3, 2, 8, '#7b838c');
            renderer.drawRect(x + 9, y + 2, 2, 3, '#2db83d'); // green tip
        } else {
            // Tilted left
            renderer.drawRect(x + 6, y + 3, 2, 8, '#7b838c');
            renderer.drawRect(x + 5, y + 2, 2, 3, '#c22929'); // red tip
        }
    }

    static drawDoor(renderer, x, y, isLocked, totalSeals = 1, brokenSeals = 0) {
        // Doorframe
        renderer.drawRect(x, y - 12, 16, 28, '#555566'); // grey border
        renderer.drawRect(x + 2, y - 10, 12, 26, '#382518'); // internal base

        // Wooden planks
        renderer.drawRect(x + 2, y - 8, 12, 1, '#2c1c11');
        renderer.drawRect(x + 2, y - 4, 12, 1, '#2c1c11');
        renderer.drawRect(x + 2, y, 12, 1, '#2c1c11');
        renderer.drawRect(x + 2, y + 4, 12, 1, '#2c1c11');
        renderer.drawRect(x + 2, y + 8, 12, 1, '#2c1c11');
        
        // Iron bands
        renderer.drawRect(x + 2, y - 2, 12, 2, '#444455');
        renderer.drawRect(x + 2, y + 6, 12, 2, '#444455');
        
        // Keyhole
        renderer.drawRect(x + 10, y + 1, 2, 3, '#0d0d15');

        if (isLocked) {
            if (totalSeals > 1) {
                // Multi-Seal Runic Glyph Display above archway
                const glyphSpacing = 5;
                const totalWidth = totalSeals * glyphSpacing - 1;
                const startX = Math.floor(x + 8 - totalWidth / 2);
                const runeY = y - 16;
                const now = Date.now();

                // Stone lintel plaque for runes
                renderer.drawRect(startX - 2, runeY - 2, totalWidth + 4, 6, '#282b33');
                renderer.drawRect(startX - 1, runeY - 1, totalWidth + 2, 4, '#1b1d22');

                for (let i = 0; i < totalSeals; i++) {
                    const rx = startX + i * glyphSpacing;
                    const isBroken = i < brokenSeals;
                    if (isBroken) {
                        // Broken conduit: Radiant glowing cyan rune
                        renderer.drawRect(rx, runeY, 2, 2, '#22ffcc');
                        renderer.drawRect(rx, runeY - 1, 2, 1, '#77ffdd');
                    } else {
                        // Locked conduit: Menacing pulsing violet/crimson rune
                        const pulse = Math.sin((now / 350) + i * 1.5);
                        const runeColor = pulse > 0 ? '#ff2255' : '#881133';
                        renderer.drawRect(rx, runeY, 2, 2, runeColor);
                    }
                }
            } else {
                // Classic single glowing rune
                const pulse = Math.abs(Math.sin(Date.now() / 500));
                if (pulse > 0.5) {
                    renderer.drawRect(x + 7, y - 6, 2, 2, '#8844ff');
                }
            }
        } else {
            // Slightly open crack when unlocked
            renderer.drawRect(x + 2, y - 10, 2, 26, '#0d0d15');
            // If it had multiple seals, display them all deactivated / pale cyan
            if (totalSeals > 1) {
                const glyphSpacing = 5;
                const totalWidth = totalSeals * glyphSpacing - 1;
                const startX = Math.floor(x + 8 - totalWidth / 2);
                const runeY = y - 16;
                renderer.drawRect(startX - 2, runeY - 2, totalWidth + 4, 6, '#282b33');
                for (let i = 0; i < totalSeals; i++) {
                    const rx = startX + i * glyphSpacing;
                    renderer.drawRect(rx, runeY, 2, 2, '#336655');
                }
            }
        }
    }

    static drawCrumblingPlatform(renderer, x, y, size, seed, shakeOffset = 0, isBreaking = false) {
        const ox = Math.round(shakeOffset);
        const bx = x + ox;

        // Base crumbling stone (warm shale)
        renderer.drawRect(bx, y, size, size, '#332c25');
        
        // Jagged eroded top edge
        renderer.drawRect(bx, y, size, 2, '#4d4338');
        renderer.drawRect(bx + 3, y, 4, 1, '#635649'); // highlight chunk
        
        // Deep fissure cracks
        renderer.drawRect(bx + 4, y + 2, 1, 6, '#191512');
        renderer.drawRect(bx + 5, y + 5, 3, 1, '#191512');
        renderer.drawRect(bx + 10, y + 3, 1, 9, '#191512');
        renderer.drawRect(bx + 9, y + 8, 2, 1, '#191512');
        renderer.drawRect(bx + 2, y + 10, 5, 1, '#191512');

        // Eroded bottom edge
        renderer.drawRect(bx, y + size - 2, size, 2, '#211c18');
        renderer.drawRect(bx + 6, y + size - 3, 3, 1, '#191512');

        // Falling dust and pebbles when shaking
        if (Math.abs(shakeOffset) > 0.05 || isBreaking) {
            const p1 = (seed * 7) % (size - 2);
            const p2 = (seed * 13) % (size - 3);
            renderer.drawRect(bx + p1, y + size + 1, 1, 2, '#635649');
            renderer.drawRect(bx + p2, y + size + 3, 1, 1, '#4d4338');
            renderer.drawRect(bx + (seed % 10) + 2, y - 2, 1, 1, '#332c25');
        }
    }

    static drawPendulum(renderer, pivotX, pivotY, bladeX, bladeY, angle) {
        // 1. Pivot Wall Mount
        renderer.drawRect(pivotX - 3, pivotY - 3, 6, 6, '#3a3f47');
        renderer.drawRect(pivotX - 2, pivotY - 2, 4, 4, '#535b66');
        renderer.drawRect(pivotX - 1, pivotY - 1, 2, 2, '#1e2126'); // pivot axle

        // 2. Heavy iron chain links
        const dx = bladeX - pivotX;
        const dy = bladeY - pivotY;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(3, Math.floor(dist / 4));

        for (let s = 1; s < steps; s++) {
            const t = s / steps;
            const lx = pivotX + dx * t;
            const ly = pivotY + dy * t;
            const linkColor = (s % 2 === 0) ? '#687382' : '#3d444d';
            renderer.drawRect(Math.round(lx - 1), Math.round(ly - 1), 2, 2, linkColor);
        }

        // 3. Central Blade Collar & Axis Weight
        const bx = Math.round(bladeX);
        const by = Math.round(bladeY);
        renderer.drawRect(bx - 3, by - 3, 6, 6, '#2e333b');
        renderer.drawRect(bx - 2, by - 2, 4, 4, '#48505c');
        renderer.drawRect(bx - 1, by - 1, 2, 2, '#181b1f');

        // 4. Crescent Executioner's Blade (curved along tangent)
        // Tangent vector perpendicular to the pendulum arm
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        // Tangent unit direction
        const tx = cosA;
        const ty = -sinA;

        // Draw curved crescent blade along the tangent
        const halfSpan = 12;
        for (let offset = -halfSpan; offset <= halfSpan; offset++) {
            // Blade thickness and curve curvature
            const curve = (1 - (offset * offset) / (halfSpan * halfSpan)) * 5;
            const px = Math.round(bx + tx * offset + sinA * curve);
            const py = Math.round(by + ty * offset + cosA * curve);

            // Steel blade body
            renderer.drawRect(px - 1, py - 1, 2, 2, '#697482');
            
            // Razor edge gleam
            renderer.drawRect(px, py, 1, 1, '#d8e1eb');

            // Blood stains on outer blade tips
            if (Math.abs(offset) > 7) {
                renderer.drawRect(px, py + 1, 1, 1, '#8f1717');
            }
        }
    }

    static drawNote(renderer, x, y) {
        // Paper base
        renderer.drawRect(x + 3, y + 3, 10, 10, '#e5d3ab');
        
        // Curled edges
        renderer.drawRect(x + 3, y + 2, 10, 1, '#c2a878');
        renderer.drawRect(x + 3, y + 13, 10, 1, '#c2a878');
        
        // Text lines
        renderer.drawRect(x + 5, y + 5, 6, 1, '#4a3b22');
        renderer.drawRect(x + 5, y + 7, 5, 1, '#4a3b22');
        renderer.drawRect(x + 5, y + 9, 6, 1, '#4a3b22');
        
        // Wax seal
        renderer.drawRect(x + 8, y + 10, 3, 3, '#ad1e1e');
    }

    static drawSpikes(renderer, x, y, width, height) {
        for (let i = 0; i < width; i += 8) {
            const sx = x + i;
            // Base
            renderer.drawRect(sx, y + height - 4, 8, 4, '#3b4249');
            
            // Spike 1 (taller)
            renderer.drawRect(sx + 1, y + height - 12, 2, 8, '#596570');
            renderer.drawRect(sx + 1, y + height - 12, 1, 1, '#8fa0b0'); // shine
            if (i % 16 === 0) {
                renderer.drawRect(sx + 1, y + height - 9, 1, 2, '#8a0f0f'); // blood
            }

            // Spike 2 (shorter)
            renderer.drawRect(sx + 5, y + height - 8, 2, 4, '#4a535c');
            renderer.drawRect(sx + 5, y + height - 8, 1, 1, '#8fa0b0'); // shine
        }
    }

    static drawFallingBlock(renderer, x, y, w, h, isShaking) {
        let dx = 0;
        if (isShaking) {
            dx = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 2);
        }
        
        // Base block
        renderer.drawRect(x + dx, y, w, h, '#2c3036');
        
        // Rounded edges / shading
        renderer.drawRect(x + dx, y, w, 1, '#3b4249');
        renderer.drawRect(x + dx, y + h - 1, w, 1, '#1b1d22');
        
        // Fractures
        renderer.drawRect(x + dx + 4, y + 2, 1, 6, '#15171a');
        renderer.drawRect(x + dx + 5, y + 5, 3, 1, '#15171a');
        renderer.drawRect(x + dx + 10, y + 8, 1, 7, '#15171a');
        renderer.drawRect(x + dx + 8, y + 12, 2, 1, '#15171a');
        
        // Dust
        if (isShaking && Math.random() > 0.5) {
            renderer.drawRect(x + Math.random() * w, y - Math.random() * 5, 1, 1, '#555566');
            renderer.drawRect(x + Math.random() * w, y + h + Math.random() * 5, 1, 1, '#555566');
        }
    }
}
