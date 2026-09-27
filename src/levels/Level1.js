/**
 * @file Level1.js
 * @description Handcrafted first level: "The Awakening"
 * Tile IDs:
 * 0 = Empty Air
 * 1 = Solid Stone Block (border walls, floors)
 * 2 = Ancient Brick (dark accents / ruins)
 * 3 = Semi-solid One-way Platform (jump through, land on top)
 * 4 = Background Wall Detail (ambient dungeon pillars/recesses)
 */

export const Level1 = {
    name: 'The Awakening',
    width: 75,
    height: 20,
    tileSize: 16,
    backgroundColor: '#0a0a0f',
    ambientTrack: 'ambient_drip',
    
    // Player spawn: cleanly situated on top of the floor at row 14 (floor y=224, player top y=204)
    playerStart: { x: 48, y: 204 },
    
    get tiles() {
        const rows = 20;
        const cols = 75;
        const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
        
        // 1. Outer perimeter boundaries
        for (let r = 0; r < rows; r++) {
            grid[r][0] = 1;
            grid[r][cols - 1] = 1;
        }
        for (let c = 0; c < cols; c++) {
            grid[0][c] = 1;
            grid[rows - 1][c] = 1;
        }
        
        // 2. Solid bedrock below the main floor (row 15 to 19)
        for (let r = 15; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                grid[r][c] = 1;
            }
        }
        
        // 3. Section 1: Starting Crypt (c: 1 to 14)
        // Ceiling at row 8, Floor at row 14
        for (let c = 1; c <= 14; c++) {
            grid[8][c] = 1;  // ceiling
            grid[14][c] = 1; // solid stone floor
            // Background stone pillars
            for (let r = 9; r < 14; r++) {
                if (c % 4 === 0) grid[r][c] = 4;
            }
        }
        
        // 4. Section 2: Narrow Low-Ceiling Corridor (c: 15 to 24)
        // Ceiling at row 10, Floor at row 14
        for (let c = 15; c <= 24; c++) {
            for (let r = 1; r <= 10; r++) {
                grid[r][c] = 1; // filled overhead ceiling rock
            }
            grid[14][c] = 1; // floor
        }
        
        // 5. Section 3: The Vertical Shaft (c: 25 to 33)
        // Opens upward to row 3! Deep pit floor at row 16
        for (let c = 25; c <= 33; c++) {
            grid[1][c] = 1;  // high ceiling
            grid[14][c] = 0; // open up the normal floor
            grid[16][c] = 1; // deep floor
        }
        // Left barrier of upper room
        for (let r = 2; r <= 9; r++) {
            grid[r][24] = 1;
        }
        // One-way climbing platforms in the shaft
        grid[14][27] = 3;
        grid[14][28] = 3;
        grid[14][29] = 3;
        
        grid[11][28] = 3;
        grid[11][29] = 3;
        grid[11][30] = 3;
        
        grid[8][26] = 3;
        grid[8][27] = 3;
        grid[8][28] = 3;
        
        grid[5][29] = 3;
        grid[5][30] = 3;
        grid[5][31] = 3;
        
        // 6. Section 4: High Catacomb Gallery (c: 34 to 45)
        // Floor at row 6, Ceiling at row 1
        for (let c = 34; c <= 45; c++) {
            grid[1][c] = 1;
            grid[6][c] = 2; // ancient brick ledge
            for (let r = 7; r < 16; r++) {
                grid[r][c] = 1; // solid rock underneath
            }
        }
        
        // 7. Section 5: The Spike Chamber (c: 46 to 58)
        // Descent back to lower level with floating platforms over spike pits
        for (let c = 46; c <= 58; c++) {
            grid[1][c] = 1;  // ceiling
            grid[16][c] = 1; // pit floor where spikes rest
        }
        // Step-down ledges
        grid[8][46] = 3;
        grid[8][47] = 3;
        
        grid[11][49] = 3;
        grid[11][50] = 3;
        grid[11][51] = 3;
        
        grid[12][54] = 3;
        grid[12][55] = 3;
        
        // 8. Section 6: The Long Dark Hall (c: 59 to 73)
        // Normal floor at row 14, ceiling at row 8
        for (let c = 59; c < cols - 1; c++) {
            for (let r = 1; r <= 8; r++) {
                grid[r][c] = 1; // ceiling rock
            }
            grid[14][c] = 1; // solid stone floor
            // Occasional background pillar
            for (let r = 9; r < 14; r++) {
                if (c % 5 === 0) grid[r][c] = 4;
            }
        }
        
        return grid;
    },
    
    entities: [
        // Note 1: In starting crypt
        {
            type: 'interactable',
            x: 120,
            y: 208,
            properties: {
                interactType: 0,
                id: 'note_crypt',
                text: "The shadows here have eyes.\n\nKeep moving. The air grows cold when it approaches..."
            }
        },
        
        // Falling hazard in the narrow corridor
        {
            type: 'hazard',
            x: 320,
            y: 176,
            properties: {
                hazardType: 1, // falling block
                width: 16,
                height: 16
            }
        },
        
        // Note 2: In the high catacomb gallery
        {
            type: 'interactable',
            x: 600,
            y: 80,
            properties: {
                interactType: 0,
                id: 'note_gallery',
                text: "Entry 47:\nI heard breathing behind the brick wall.\nI didn't turn around."
            }
        },
        
        // Spikes across the pit floor in section 5
        {
            type: 'hazard',
            x: 752,
            y: 240,
            properties: {
                hazardType: 0, // spikes
                width: 96,
                height: 16
            }
        },
        
        // The Shadow entity waiting in the long dark hall
        {
            type: 'shadow',
            x: 1040,
            y: 192
        },
        
        // Exit Door at the far end of the dungeon
        {
            type: 'interactable',
            x: 1120,
            y: 208,
            properties: {
                interactType: 1, // door
                id: 'exit_door',
                targetScene: 'ProceduralLevel'
            }
        }
    ]
};
