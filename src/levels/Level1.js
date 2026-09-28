/**
 * @file Level1.js
 * @description Non-linear, multi-tier horror level: "The Awakening"
 * Features branching vertical exploration:
 * - Low path leads to a locked Iron Sealed Gate.
 * - High climbing path (guided by glowing wall torches) leads to the Upper Sanctum where the Ancient Lever is hidden.
 * - Pulling the lever unlocks the Iron Sealed Gate!
 */

export const Level1 = {
    name: 'The Awakening',
    width: 80,
    height: 22,
    tileSize: 16,
    backgroundColor: '#07070b',
    ambientTrack: 'ambient_drip',
    
    playerStart: { x: 48, y: 236 },
    
    get tiles() {
        const rows = 22;
        const cols = 80;
        const grid = Array.from({ length: rows }, () => Array(cols).fill(1)); // fill with solid rock by default
        
        // Helper to carve a rectangular air box
        function carve(c1, r1, c2, r2, tile = 0) {
            for (let c = c1; c <= c2; c++) {
                for (let r = r1; r <= r2; r++) {
                    if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) {
                        grid[r][c] = tile;
                    }
                }
            }
        }

        // 1. Chamber 1: Starting Crypt (c: 1 to 15, r: 10 to 16)
        carve(1, 10, 15, 15, 0); // air
        for (let c = 1; c <= 15; c += 4) {
            for (let r = 11; r <= 15; r++) grid[r][c] = 4; // background pillars
        }

        // 2. Chamber 2: The Crossroads & Grand Vertical Shaft (c: 16 to 34)
        // Lower path (r: 13 to 15) leads to the locked gate
        carve(16, 12, 34, 15, 0);
        
        // Upper climbing shaft (opens high up from r: 2 to 15)
        carve(22, 2, 34, 15, 0);
        
        // One-way platforms to climb the vertical shaft
        grid[13][24] = 3; grid[13][25] = 3; grid[13][26] = 3;
        grid[10][27] = 3; grid[10][28] = 3; grid[10][29] = 3;
        grid[7][23] = 3;  grid[7][24] = 3;  grid[7][25] = 3;
        grid[4][28] = 3;  grid[4][29] = 3;  grid[4][30] = 3;

        // 3. Chamber 3: The Upper Sanctum (c: 35 to 52, r: 2 to 7)
        // High exploration branch where the Ancient Lever and secret note hide!
        carve(35, 2, 52, 6, 0);
        for (let c = 35; c <= 52; c++) {
            grid[7][c] = 2; // ancient brick floor
        }
        grid[5][42] = 3; grid[5][43] = 3; grid[5][44] = 3; // altar shelf

        // 4. Chamber 4: The Spike Pit Trench (Lower level, c: 35 to 55, r: 9 to 18)
        carve(35, 9, 55, 17, 0);
        for (let c = 38; c <= 50; c++) {
            grid[16][c] = 0; // deep pit hole
            grid[18][c] = 1; // pit bottom where spikes rest
        }
        // Floating stepping stones across pit with ample headroom (rows 9-13 are open air)
        grid[14][40] = 3; grid[14][41] = 3; grid[14][42] = 3;
        grid[14][44] = 3; grid[14][45] = 3; grid[14][46] = 3;
        grid[14][48] = 3; grid[14][49] = 3; grid[14][50] = 3;

        // 5. Chamber 5: The Stalker's Dark Hall (c: 56 to 78, r: 10 to 16)
        carve(56, 11, 78, 15, 0);
        for (let c = 56; c <= 78; c += 5) {
            for (let r = 12; r <= 15; r++) grid[r][c] = 4; // background pillars
        }

        return grid;
    },
    
    entities: [
        // --- CHAMBER 1: Starting Crypt ---
        {
            type: 'interactable',
            x: 96,
            y: 240,
            properties: {
                interactType: 3 // Torch
            }
        },
        {
            type: 'interactable',
            x: 160,
            y: 240,
            properties: {
                interactType: 0, // Note
                id: 'note_start',
                title: 'ANCIENT INSCRIPTION',
                text: "The main gate is locked.\nFollow the torches upward into the shaft.\nThe ancient lever rests in the sanctum above."
            }
        },

        // --- CHAMBER 2: The Vertical Shaft (Guided by torches) ---
        {
            type: 'interactable',
            x: 384, // col 24
            y: 192, // row 12
            properties: { interactType: 3 } // Torch near platform 1
        },
        {
            type: 'interactable',
            x: 448, // col 28
            y: 144, // row 9
            properties: { interactType: 3 } // Torch near platform 2
        },
        {
            type: 'interactable',
            x: 384, // col 24
            y: 96,  // row 6
            properties: { interactType: 3 } // Torch near platform 3
        },

        // --- CHAMBER 3: The Upper Sanctum (The Goal of the Vertical Route) ---
        {
            type: 'interactable',
            x: 688, // col 43
            y: 64,  // row 4 (on altar)
            properties: {
                interactType: 2, // Ancient Lever / Switch!
                id: 'lever_sanctum',
                flag: 'lever_shaft_pulled'
            }
        },
        {
            type: 'interactable',
            x: 752,
            y: 96,
            properties: {
                interactType: 0, // Note
                id: 'note_sanctum',
                title: "ARCHITECT'S JOURNAL",
                text: "ARCHITECT'S JOURNAL:\n'The gate has been secured.\nNo creature from the depths shall pass upward.'"
            }
        },
        {
            type: 'interactable',
            x: 640,
            y: 96,
            properties: { interactType: 3 } // Torch in sanctum
        },

        // --- CHAMBER 4: The Hazard Pit ---
        {
            type: 'hazard',
            x: 608,
            y: 272,
            properties: {
                hazardType: 0, // Spikes
                width: 192,
                height: 16
            }
        },
        {
            type: 'hazard',
            x: 520,
            y: 176,
            properties: {
                hazardType: 1, // Falling trap
                width: 16,
                height: 16
            }
        },

        // --- CHAMBER 5: The Stalker's Hall ---
        {
            type: 'shadow',
            x: 1020,
            y: 224
        },
        {
            type: 'interactable',
            x: 960,
            y: 240,
            properties: { interactType: 3 } // Torch illuminating entrance to dark hall
        },

        // --- FINAL CHAMBER: The Sealed Gate ---
        {
            type: 'interactable',
            x: 1200,
            y: 240,
            properties: {
                interactType: 1, // Exit Door / Gate
                id: 'exit_gate',
                requiresFlag: 'lever_shaft_pulled', // MUST PULL THE LEVER IN THE HIGH SANCTUM!
                targetScene: 'ProceduralLevel'
            }
        }
    ]
};
