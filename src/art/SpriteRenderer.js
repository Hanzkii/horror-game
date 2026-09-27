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

    static drawPlayer(renderer, x, y, state, frame, facingRight, breathTimer, isBlinking = false) {
        const hSkin = '#d4cec0';
        const hTorso = '#3a4a5c';
        const hLegs = '#2a2a3a';
        
        const w = 12;
        const h = 20;

        // Breath animation
        const breathScale = (state === 0) ? Math.sin(breathTimer * 2) * 0.5 : 0;
        
        // Legs (bottom 8px, 4px wide, 4px gap)
        let leftLegY = y + 12;
        let rightLegY = y + 12;
        let leftArmY = y + 5;
        let rightArmY = y + 5;
        
        if (state === 1) { // WALKING
            const legOffsets = [0, -2, 0, 2];
            leftLegY += legOffsets[frame];
            rightLegY += legOffsets[(frame + 2) % 4];
            leftArmY += legOffsets[(frame + 2) % 4]; // Arms opposite to legs
            rightArmY += legOffsets[frame];
        } else if (state === 2) { // JUMPING
            leftLegY -= 2;
            rightLegY -= 2;
            leftArmY -= 3;
            rightArmY -= 3;
        } else if (state === 3) { // FALLING
            leftLegY -= 1;
            rightLegY -= 1;
            leftArmY -= 1;
            rightArmY -= 1;
        } else if (state === 4) { // WALL_SLIDING
            leftLegY -= 1;
            rightLegY -= 1;
            leftArmY -= 2;
            rightArmY -= 4; // one arm up
        }

        // Draw left arm (behind)
        renderer.drawRect(x + 1, leftArmY - breathScale, 2, 6, '#2d3a48');

        // Draw legs
        renderer.drawRect(x + 2, leftLegY, 4, 8, hLegs);
        renderer.drawRect(x + 6, rightLegY, 4, 8, hLegs);

        // Draw torso
        renderer.drawRect(x + 2, y + 5 - breathScale, 8, 7 + breathScale, hTorso);
        
        // Draw right arm (front)
        renderer.drawRect(x + 9, rightArmY - breathScale, 2, 6, '#2d3a48');

        // Head
        renderer.drawRect(x + 3, y - breathScale, 6, 5, hSkin);
        
        // Hood part
        renderer.drawRect(x + 2, y - 1 - breathScale, 8, 5, hTorso);
        renderer.drawRect(x + 3, y - breathScale, 6, 2, hTorso); // hood peak
        
        // Face/Skin visible area
        renderer.drawRect(x + (facingRight ? 4 : 3), y + 1 - breathScale, 5, 4, hSkin);

        // Eyes
        if (!isBlinking) {
            const eyeX = facingRight ? x + 6 : x + 4;
            renderer.drawRect(eyeX, y + 2 - breathScale, 1, 1, '#ffffff');
            renderer.drawRect(eyeX + 2, y + 2 - breathScale, 1, 1, '#ffffff');
        }
    }

    static drawTorch(renderer, x, y, timer) {
        // Stone bracket
        renderer.drawRect(x + 6, y + 10, 4, 3, '#555566');
        
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

    static drawDoor(renderer, x, y, isLocked) {
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
            // Glowing rune
            const pulse = Math.abs(Math.sin(Date.now() / 500));
            if (pulse > 0.5) {
                renderer.drawRect(x + 7, y - 6, 2, 2, '#8844ff');
            }
        } else {
            // Slightly open crack
            renderer.drawRect(x + 2, y - 10, 2, 26, '#0d0d15');
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
