/**
 * @file TutorialLevel.js
 * @description Dedicated, interactive onboarding chamber: "The Crypt of Trials"
 * Guides the player through movement, jumping, lever mechanisms, torch sanctuaries,
 * and flame-banishing shadow lurkers with in-world environmental guidance.
 */

export const TutorialLevel = {
    name: 'The Crypt of Trials [TUTORIAL]',
    width: 80,
    height: 18,
    tileSize: 16,
    backgroundColor: '#050609',
    ambientTrack: 'ambient_drip',
    
    playerStart: { x: 48, y: 192 },
    
    get tiles() {
        const rows = 18;
        const cols = 80;
        const grid = Array.from({ length: rows }, () => Array(cols).fill(1)); // solid stone base
        
        function carve(c1, r1, c2, r2, tile = 0) {
            for (let c = c1; c <= c2; c++) {
                for (let r = r1; r <= r2; r++) {
                    if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) {
                        grid[r][c] = tile;
                    }
                }
            }
        }

        // Zone 1: Movement Corridor (c: 1 to 14, r: 8 to 13)
        carve(1, 8, 14, 13, 0);
        for (let c = 2; c <= 14; c += 4) {
            for (let r = 9; r <= 13; r++) grid[r][c] = 4; // background pillars
        }

        // Zone 2: Jump & Chasm Trial (c: 15 to 28, r: 6 to 13)
        carve(15, 6, 28, 13, 0);
        // Small chasm pit with safe stepping floor
        grid[14][19] = 0;
        grid[14][20] = 0;
        grid[15][19] = 1;
        grid[15][20] = 1;
        // Elevated ledge to leap onto
        grid[12][25] = 2;
        grid[12][26] = 2;
        grid[12][27] = 2;

        // Zone 3: Lever Platform & Gate (c: 29 to 46, r: 4 to 13)
        carve(29, 4, 46, 13, 0);
        // Elevated platform holding the lever
        grid[9][36] = 3;
        grid[9][37] = 3;
        grid[9][38] = 3;
        grid[9][39] = 3;
        // Step platforms to reach lever
        grid[11][32] = 3;
        grid[11][33] = 3;

        // Zone 4: Dark Sanctuary Corridor (c: 47 to 60, r: 7 to 13)
        carve(47, 7, 60, 13, 0);
        for (let c = 49; c <= 59; c += 4) {
            for (let r = 8; r <= 13; r++) grid[r][c] = 4;
        }

        // Zone 5: The Lurker Trial & Exit Gate (c: 61 to 78, r: 6 to 13)
        carve(61, 6, 78, 13, 0);
        for (let c = 63; c <= 77; c += 4) {
            for (let r = 7; r <= 13; r++) grid[r][c] = 4;
        }

        return grid;
    },
    
    entities: [
        // --- ZONE 1: Starting Chamber ---
        {
            type: 'interactable',
            x: 80,
            y: 192,
            properties: {
                interactType: 3 // Torch
            }
        },
        {
            type: 'interactable',
            x: 144,
            y: 208,
            properties: {
                interactType: 0,
                id: 'tut_move',
                text: "TRIAL I: MOVEMENT\n\nUse [A] and [D] to move across the catacombs.\nTake steady steps into the unknown."
            }
        },

        // --- ZONE 2: Jump Trial ---
        {
            type: 'interactable',
            x: 272,
            y: 208,
            properties: {
                interactType: 0,
                id: 'tut_jump',
                text: "TRIAL II: LEAP OF FAITH\n\nPress [SPACE] or [W] to leap.\nHold the key longer for greater height and distance."
            }
        },

        // --- ZONE 3: Mechanism Trial ---
        {
            type: 'interactable',
            x: 592,
            y: 128, // on the elevated platform (row 9 = 144px)
            properties: {
                interactType: 2, // Switch / Lever
                flag: 'tutorial_gate'
            }
        },
        {
            type: 'interactable',
            x: 520,
            y: 208,
            properties: {
                interactType: 0,
                id: 'tut_lever',
                text: "TRIAL III: ANCIENT MECHANISMS\n\nLevers operate locked doors throughout the dungeon.\nClimb the wooden steps and press [E] to activate the switch."
            }
        },

        // --- ZONE 4: Torch & Sanity Sanctuary ---
        {
            type: 'interactable',
            x: 864,
            y: 192, // Torch
            properties: {
                interactType: 3
            }
        },
        {
            type: 'interactable',
            x: 800,
            y: 208,
            properties: {
                interactType: 0,
                id: 'tut_sanity',
                text: "TRIAL IV: SANCTUARY & SANITY\n\nThe abyssal dark drains your sanity.\nStand near lit torches to calm your trembling mind."
            }
        },

        // --- ZONE 5: Lurker Confrontation & Exit ---
        {
            type: 'interactable',
            x: 1040,
            y: 208,
            properties: {
                interactType: 0,
                id: 'tut_stalker',
                text: "TRIAL V: THE SHADOW LURKER\n\nBeware! Interacting with ancient puzzles awakens stalkers.\nThey hunt when your back is turned.\n\nDo NOT fight with your fists.\nLure the creature into the TORCH FLAME ahead to incinerate it!"
            }
        },
        {
            type: 'interactable',
            x: 1136,
            y: 192, // Flame Banishment Torch
            properties: {
                interactType: 3
            }
        },
        {
            type: 'interactable',
            x: 1216,
            y: 200, // Exit Archway Door
            properties: {
                interactType: 1, // Door
                requiresFlag: 'tutorial_gate'
            }
        }
    ]
};
