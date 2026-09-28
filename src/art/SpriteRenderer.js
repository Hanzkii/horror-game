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
    }

    static drawSurfaceGrass(renderer, x, y, size, seed) {
        // Vibrant rolling hill grass
        renderer.drawRect(x, y, size, size, '#255428'); // deep rich undergrowth
        renderer.drawRect(x, y, size, 4, '#388e3c');     // mid grass band
        renderer.drawRect(x, y, size, 2, '#4caf50');     // lush sunlit top edge

        // Tiny grass blades
        const r1 = Math.floor(this.getRandom(seed) * 12);
        const r2 = Math.floor(this.getRandom(seed + 3) * 12);
        renderer.drawRect(x + r1, y - 2, 1, 3, '#81c784');
        renderer.drawRect(x + r2, y - 1, 1, 2, '#66bb6a');

        // Occasional wildflowers (buttercups, daisies, forget-me-nots)
        if (seed % 6 === 0) {
            const flowerColors = ['#fff59d', '#ffffff', '#90caf9', '#f48fb1'];
            const flowerColor = flowerColors[seed % flowerColors.length];
            renderer.drawRect(x + (seed % 11) + 2, y - 3, 2, 2, flowerColor);
            renderer.drawRect(x + (seed % 11) + 2, y - 1, 1, 2, '#388e3c'); // stem
        }
    }

    static drawSurfaceDirt(renderer, x, y, size, seed) {
        // Rich warm earth and pebbles
        renderer.drawRect(x, y, size, size, '#3e2723');
        renderer.drawRect(x, y, size, 2, '#4e342e');

        // Embedded stone fragments
        const px = Math.floor(this.getRandom(seed) * 11) + 2;
        const py = Math.floor(this.getRandom(seed + 1) * 10) + 3;
        renderer.drawRect(x + px, y + py, 2, 2, '#5d4037');
    }

    static drawBirchTree(renderer, x, y) {
        // 1. Birch trunk (cream white with dark grey horizontal notches)
        const trunkW = 8;
        const trunkH = 80;
        renderer.drawRect(x + 20, y - trunkH, trunkW, trunkH, '#ede8df');
        renderer.drawRect(x + 20, y - trunkH, 2, trunkH, '#cfc8be'); // left shadow
        // Bark notches
        for (let i = 8; i < trunkH - 8; i += 7) {
            const ny = y - trunkH + i;
            renderer.drawRect(x + 21, ny, 3, 1, '#37322d');
            renderer.drawRect(x + 24, ny + 3, 3, 1, '#37322d');
        }

        // 2. Voluminous Emerald Leaf Canopy
        const canopyX = x - 10;
        const canopyY = y - trunkH - 35;
        // Deep interior shade (where eyes will lurk)
        renderer.drawRect(canopyX + 6, canopyY + 12, 56, 36, '#133019');
        // Mid green foliage clumps
        renderer.drawRect(canopyX + 2, canopyY + 6, 64, 30, '#1b4d24');
        renderer.drawRect(canopyX + 8, canopyY, 52, 20, '#256b33');
        // Sunlit highlights
        renderer.drawRect(canopyX + 12, canopyY - 4, 38, 12, '#388e3c');
        renderer.drawRect(canopyX + 18, canopyY - 6, 24, 6, '#4caf50');
        // Leaf cluster dapples
        renderer.drawRect(canopyX + 4, canopyY + 18, 14, 14, '#2e7d32');
        renderer.drawRect(canopyX + 50, canopyY + 16, 16, 16, '#2e7d32');
    }

    static drawWatchingEyes(renderer, x, y, alpha = 1.0) {
        const a = Math.max(0, Math.min(1, alpha));
        // Sinister luminous white eyes with vertical pupils
        renderer.drawRect(x, y, 4, 2, `rgba(255, 255, 255, ${a})`);
        renderer.drawRect(x + 7, y, 4, 2, `rgba(255, 255, 255, ${a})`);
        // Pupils
        renderer.drawRect(x + 2, y, 1, 2, `rgba(20, 20, 20, ${a * 0.9})`);
        renderer.drawRect(x + 9, y, 1, 2, `rgba(20, 20, 20, ${a * 0.9})`);
        // Faint void miasma aura around the eyes
        renderer.drawRect(x - 2, y - 2, 15, 6, `rgba(15, 5, 25, ${a * 0.45})`);
    }

    static drawPlayer(renderer, x, y, state, frame, facingRight, breathTimer, isBlinking = false, options = {}) {
        // Vulnerable Human Survivor: Cold, pale, fragile, frightened
        const hSkin = '#e2d7c9';
        const hTorso = '#2c333f';
        const hLegs = '#1b1f27';
        const hBoots = '#12151b';
        
        const isScared = options?.isScared ?? false;
        const isLookingBack = options?.isLookingBack ?? false;
        const isCrouched = options?.isCrouched || options?.isHoldingBreath;

        // Fear Tremble / Shiver
        const shiverX = isScared ? (Math.sin(Date.now() * 0.05) * 0.6) : 0;
        const px = x + shiverX;

        // Breath animation: held breath is dead calm; otherwise rapid hyperventilation when scared, slow shallow breaths when calm
        const breathSpeed = isScared ? 8.0 : 2.2;
        const breathScale = isCrouched ? 0 : ((state === 0) ? Math.sin(breathTimer * breathSpeed) * (isScared ? 0.6 : 0.35) : 0);
        
        // Crouch height offset
        const crouchY = isCrouched ? 3 : 0;

        // Legs (bottom 7px: y + 10 to y + 17)
        let leftLegY = y + 10;
        let rightLegY = y + 10;
        let leftArmY = y + 4 + crouchY;
        let rightArmY = y + 4 + crouchY;
        
        if (isCrouched) {
            leftLegY += 2;
            rightLegY += 2;
        } else if (state === 1) { // WALKING
            const legOffsets = [0, -1, 0, 1];
            leftLegY += legOffsets[frame];
            rightLegY += legOffsets[(frame + 2) % 4];
            leftArmY += legOffsets[(frame + 2) % 4];
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
            rightArmY -= 3;
        }

        // Draw left arm (behind)
        renderer.drawRect(px + 1, leftArmY - breathScale, 2, isCrouched ? 4 : 5, '#1e232b');

        // Draw slender human legs & boots
        renderer.drawRect(px + 2, leftLegY, 3, isCrouched ? 3 : 5, hLegs);
        renderer.drawRect(px + 6, rightLegY, 3, isCrouched ? 3 : 5, hLegs);
        renderer.drawRect(px + 2, leftLegY + (isCrouched ? 3 : 5), 3, 2, hBoots);
        renderer.drawRect(px + 6, rightLegY + (isCrouched ? 3 : 5), 3, 2, hBoots);

        // Draw torso (slender tattered survivor jacket)
        renderer.drawRect(px + 2, y + 4 + crouchY - breathScale, 7, (isCrouched ? 5 : 6) + breathScale, hTorso);
        renderer.drawRect(px + 3, y + 5 + crouchY - breathScale, 5, isCrouched ? 3 : 4, '#384150'); // jacket inner highlight
        
        // Draw right arm (front) holding fragile lantern
        renderer.drawRect(px + 8, rightArmY - breathScale, 2, isCrouched ? 4 : 5, '#1e232b');
        // Small handheld lantern (held lower and closer to body when crouching)
        const lanternX = facingRight ? px + (isCrouched ? 7 : 9) : px + (isCrouched ? 1 : -1);
        const lanternY = rightArmY + (isCrouched ? 1 : 3) - breathScale;
        renderer.drawRect(lanternX, lanternY, 2, 3, '#475569'); // iron cage
        renderer.drawRect(lanternX + 0.5, lanternY + 1, 1, 1, isCrouched ? '#b45309' : '#f59e0b'); // amber wick flame

        // Fragile pale human head & tattered hood
        renderer.drawRect(px + 2, y - 1 + crouchY - breathScale, 7, 5, '#222731'); // hood back
        renderer.drawRect(px + 3, y - 2 + crouchY - breathScale, 5, 2, '#222731'); // hood top
        
        // Head / Skin
        const faceDir = isLookingBack ? !facingRight : facingRight;
        const faceX = faceDir ? px + 4 : px + 2;
        renderer.drawRect(faceX, y + 1 + crouchY - breathScale, 5, 3, hSkin);

        // Wide, terrified eyes with dilated pupils
        if (!isBlinking) {
            const eyeX = faceDir ? px + 5 : px + 3;
            // White sclera
            renderer.drawRect(eyeX, y + 1 + crouchY - breathScale, 3, 2, '#ffffff');
            // Dilated dark pupil darting around
            const pupilOffset = isScared ? (Math.floor(Date.now() / 250) % 2) : 0;
            renderer.drawRect(eyeX + pupilOffset, y + 1 + crouchY - breathScale, 1, 2, '#0f172a');
        }
    }

    /**
     * Towering, grotesque, nightmare Shadow Stalker (16x38px)
     */
    static drawShadow(renderer, x, y, width, height, alpha, tendrilTimer, eyeGlow, timer, history = []) {
        if (alpha <= 0.01) return;

        // 1. Afterimage ghost trails
        history.forEach((hist, i) => {
            const alphaMod = i === 0 ? 0.22 : (i === 1 ? 0.12 : 0.06);
            renderer.drawRect(
                hist.x, hist.y,
                width, height,
                `rgba(10, 6, 20, ${alpha * alphaMod})`
            );
        });

        // Wavering, twitching motion
        const twitch = (Math.sin(timer * 25) > 0.85) ? (Math.random() - 0.5) * 2.5 : 0;
        const waverX = Math.sin(tendrilTimer) * 1.5 + twitch;
        const waverY = Math.cos(tendrilTimer * 0.7) * 1.5;

        // 2. Towering Smoky Void Body (16x38px)
        // Outer miasma aura
        renderer.drawRect(
            x + waverX - 3, y + waverY - 3,
            width + 6, height + 6,
            `rgba(20, 10, 35, ${alpha * 0.4})`
        );
        // Core shadow body
        renderer.drawRect(
            x + waverX, y + waverY,
            width, height,
            `rgba(8, 4, 16, ${alpha})`
        );

        // 3. Glitching void static blocks
        for (let i = 0; i < 5; i++) {
            const gx = x + (Math.random() - 0.2) * width * 1.3;
            const gy = y + Math.random() * height;
            const gw = 2 + Math.random() * 3;
            const gh = 2 + Math.random() * 2;
            renderer.drawRect(gx, gy, gw, gh, `rgba(12, 6, 24, ${alpha * 0.85})`);
        }

        // 4. Elongated Twitching Claw Arms
        const armTwitchLeft = Math.sin(timer * 18) * 3;
        const armTwitchRight = Math.cos(timer * 15) * 3;
        // Left arm & needle claws
        renderer.drawRect(x + waverX - 4, y + 10 + waverY + armTwitchLeft, 4, 16, `rgba(10, 5, 20, ${alpha * 0.9})`);
        renderer.drawRect(x + waverX - 6, y + 24 + waverY + armTwitchLeft, 3, 1, `rgba(180, 180, 210, ${alpha * 0.75})`); // claw tips
        renderer.drawRect(x + waverX - 6, y + 26 + waverY + armTwitchLeft, 2, 1, `rgba(180, 180, 210, ${alpha * 0.75})`);
        // Right arm & needle claws
        renderer.drawRect(x + waverX + width, y + 10 + waverY + armTwitchRight, 4, 16, `rgba(10, 5, 20, ${alpha * 0.9})`);
        renderer.drawRect(x + waverX + width + 3, y + 24 + waverY + armTwitchRight, 3, 1, `rgba(180, 180, 210, ${alpha * 0.75})`); // claw tips
        renderer.drawRect(x + waverX + width + 3, y + 26 + waverY + armTwitchRight, 2, 1, `rgba(180, 180, 210, ${alpha * 0.75})`);

        // 5. Writhing Ground Tendrils
        for (let i = 0; i < 4; i++) {
            const tx = x + 2 + i * 4 + Math.sin(tendrilTimer * 1.8 + i) * 3;
            renderer.drawRect(tx, y + height - 3, 2, 14 + (i % 2) * 4, `rgba(12, 6, 24, ${alpha * 0.8})`);
        }

        // 6. Horrifying Nightmare Visage
        // Black hollow sockets
        const eyeY = y + 7 + waverY;
        renderer.drawRect(x + 2 + waverX, eyeY, 5, 5, `rgba(0, 0, 0, ${alpha})`);
        renderer.drawRect(x + 9 + waverX, eyeY, 5, 5, `rgba(0, 0, 0, ${alpha})`);

        // Piercing, unblinking white-hot pinprick pupils
        const pupilColor = `rgba(255, 255, 255, ${alpha * eyeGlow})`;
        renderer.drawRect(x + 4 + waverX, eyeY + 2, 2, 2, pupilColor);
        renderer.drawRect(x + 10 + waverX, eyeY + 2, 2, 2, pupilColor);

        // Eye aura / spectral bleed
        renderer.drawRect(x + 1 + waverX, eyeY - 1, 14, 7, `rgba(147, 51, 234, ${alpha * 0.28})`);

        // 7. Gaping Void Maw with Jagged Needle Teeth
        const mawY = y + 16 + waverY;
        renderer.drawRect(x + 4 + waverX, mawY, 8, 8, `rgba(2, 1, 5, ${alpha * 0.98})`);
        // Sharp needle teeth (top row)
        renderer.drawRect(x + 5 + waverX, mawY, 1, 2, `rgba(240, 240, 255, ${alpha * 0.9})`);
        renderer.drawRect(x + 7 + waverX, mawY, 1, 2, `rgba(240, 240, 255, ${alpha * 0.9})`);
        renderer.drawRect(x + 9 + waverX, mawY, 1, 2, `rgba(240, 240, 255, ${alpha * 0.9})`);
        renderer.drawRect(x + 11 + waverX, mawY, 1, 2, `rgba(240, 240, 255, ${alpha * 0.9})`);
        // Bottom teeth
        renderer.drawRect(x + 6 + waverX, mawY + 6, 1, 2, `rgba(240, 240, 255, ${alpha * 0.9})`);
        renderer.drawRect(x + 8 + waverX, mawY + 6, 1, 2, `rgba(240, 240, 255, ${alpha * 0.9})`);
        renderer.drawRect(x + 10 + waverX, mawY + 6, 1, 2, `rgba(240, 240, 255, ${alpha * 0.9})`);
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

    static drawOilFlask(renderer, x, y, timer) {
        const floatY = y + Math.sin(timer * 3) * 1.5;
        // Faint glowing aura
        const auraAlpha = 0.15 + (Math.sin(timer * 4) + 1) * 0.1;
        renderer.drawRect(x + 2, floatY + 6, 12, 11, `rgba(245, 158, 11, ${auraAlpha})`);
        
        // Cork stopper
        renderer.drawRect(x + 7, floatY + 3, 2, 2, '#8d6e63');
        // Glass neck & rim
        renderer.drawRect(x + 6, floatY + 5, 4, 1, '#94a3b8');
        renderer.drawRect(x + 7, floatY + 6, 2, 2, '#cbd5e1');
        // Flask bulb / body
        renderer.drawRect(x + 4, floatY + 8, 8, 7, '#64748b');
        renderer.drawRect(x + 5, floatY + 9, 6, 5, '#f59e0b'); // Amber oil
        renderer.drawRect(x + 5, floatY + 11, 6, 3, '#d97706'); // Deep warm oil base
        // Highlight glint
        renderer.drawRect(x + 5, floatY + 9, 1, 3, '#fef08a');
        // Iron base & bracket
        renderer.drawRect(x + 4, floatY + 14, 8, 1, '#334155');
        renderer.drawRect(x + 7, floatY + 9, 2, 5, '#475569');
    }

    static drawDoppelganger(renderer, x, y, facingRight, timer) {
        // Dark, distorted silhouette of the player with pinprick hollow white eyes
        const jitter = Math.sin(timer * 20) * 0.8;
        const px = x + jitter;
        
        // Faint void shroud
        renderer.drawRect(px - 1, y - 2, 12, 19, 'rgba(10, 8, 16, 0.45)');
        
        // Torso & legs (dark charcoal / void)
        renderer.drawRect(px + 2, y + 4, 7, 6, '#13141a');
        renderer.drawRect(px + 3, y + 5, 5, 4, '#1e2029');
        renderer.drawRect(px + 2, y + 10, 3, 7, '#0b0c10');
        renderer.drawRect(px + 6, y + 10, 3, 7, '#0b0c10');
        
        // Twitched arms
        const armWave = Math.sin(timer * 12) * 1.5;
        renderer.drawRect(px + 1, y + 4 + armWave, 2, 5, '#13141a');
        renderer.drawRect(px + 8, y + 4 - armWave, 2, 5, '#13141a');
        
        // Head & Hood
        renderer.drawRect(px + 2, y - 1, 7, 5, '#0b0c10');
        renderer.drawRect(px + 3, y - 2, 5, 2, '#0b0c10');
        
        // Hollow, unblinking eyes staring directly at player
        const eyeX = facingRight ? px + 5 : px + 3;
        renderer.drawRect(eyeX, y + 1, 2, 2, '#ffffff');
        renderer.drawRect(eyeX + 0.5, y + 1.5, 1, 1, '#38bdf8');
    }
}
