/**
 * @file TutorialLevel.js
 * @description Comprehensive, interactive onboarding chamber: "The Crypt of Trials"
 * Guides the player through movement, platform drop-down (S / Down / Down+Jump),
 * sprinting & stamina, stealth breath-holding, lantern oil & darkness sanity dynamics,
 * ancient lever mechanisms, and surviving/banishing the Shadow Stalker with torchlight.
 */

export const TutorialLevel = {
    name: 'The Crypt of Trials [TUTORIAL]',
    width: 120,
    height: 20,
    tileSize: 16,
    backgroundColor: '#050609',
    ambientTrack: 'ambient_drip',
    
    playerStart: { x: 48, y: 220 },
    
    get tiles() {
        const rows = 20;
        const cols = 120;
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

        // ==========================================
        // ZONE 1: Movement, Jump & Platform Drop-Down (c: 1 to 26, r: 8 to 15)
        // ==========================================
        carve(1, 8, 26, 15, 0);
        for (let c = 2; c <= 26; c += 4) {
            for (let r = 9; r <= 15; r++) grid[r][c] = 4; // background pillars
        }
        // Stepping stone ledge
        grid[13][12] = 2;
        grid[13][13] = 2;
        // Elevated wooden one-way terrace spanning across to demonstrate drop-down
        for (let c = 14; c <= 22; c++) {
            grid[11][c] = 3; // wooden one-way platform
        }
        // Small raised step to leap onto the terrace
        grid[12][13] = 3;

        // Solid floor continues below at r: 16
        for (let c = 1; c <= 26; c++) {
            grid[16][c] = 1;
        }

        // ==========================================
        // ZONE 2: Sprinting, Stamina & Lantern Oil (c: 27 to 48, r: 9 to 15)
        // ==========================================
        carve(27, 9, 48, 15, 0);
        for (let c = 29; c <= 47; c += 4) {
            for (let r = 10; r <= 15; r++) grid[r][c] = 4;
        }
        for (let c = 27; c <= 48; c++) {
            grid[16][c] = 1;
        }

        // ==========================================
        // ZONE 3: Low Creepway & Stealth / Breath Holding (c: 49 to 68, r: 11 to 15)
        // ==========================================
        // Low ceiling corridor requiring crouching / sneaking
        carve(49, 11, 68, 15, 0);
        // Hanging stalactites / low stone arch
        for (let c = 53; c <= 65; c += 3) {
            grid[11][c] = 1;
        }
        for (let c = 49; c <= 68; c++) {
            grid[16][c] = 1;
        }

        // ==========================================
        // ZONE 4: Ancient Conduit Lever Altar (c: 69 to 90, r: 6 to 15)
        // ==========================================
        carve(69, 6, 90, 15, 0);
        for (let c = 71; c <= 89; c += 4) {
            for (let r = 7; r <= 15; r++) grid[r][c] = 4;
        }
        for (let c = 69; c <= 90; c++) {
            grid[16][c] = 1;
        }

        // Elevated stone altar dais holding the Conduit Lever
        const altarCol = 79;
        const altarRow = 12;
        // Steps on both sides
        grid[14][altarCol - 6] = 3;
        grid[14][altarCol - 5] = 3;
        grid[14][altarCol + 5] = 3;
        grid[14][altarCol + 6] = 3;
        // Central altar platform
        for (let c = altarCol - 4; c <= altarCol + 4; c++) {
            grid[altarRow][c] = 3;
        }
        // Conduit wiring along ceiling
        for (let c = 69; c <= 90; c++) {
            grid[7][c] = 13;
        }

        // ==========================================
        // ZONE 5: Shadow Stalker Warning, Torch Sanctuary & Exit (c: 91 to 118, r: 7 to 15)
        // ==========================================
        carve(91, 7, 118, 15, 0);
        for (let c = 93; c <= 117; c += 4) {
            for (let r = 8; r <= 15; r++) grid[r][c] = 4;
        }
        for (let c = 91; c <= 118; c++) {
            grid[16][c] = 1;
        }

        // Reinforced doorway boundary frame at exit
        for (let r = 7; r <= 15; r++) {
            grid[r][118] = 1;
        }

        return grid;
    },
    
    entities: [
        // --- ZONE 1: Movement & Drop-Through Platform ---
        {
            type: 'interactable',
            x: 64,
            y: 224, // Starting Torch
            properties: { interactType: 3 }
        },
        {
            type: 'interactable',
            x: 128,
            y: 240,
            properties: {
                interactType: 0,
                id: 'tut_movement',
                title: 'TUTORIAL: MOVEMENT & PLATFORMS',
                text: "SURVIVAL PROTOCOL: MOVEMENT\n\nTraverse the catacombs using [A / D] or [← / →]. Leap with [SPACE] or [W].\n\nAhead lies a wooden terrace. When standing on wooden platforms, press [S] or [↓] (or Down + Jump) to DROP DOWN directly through the floor."
            }
        },

        // --- ZONE 2: Sprinting, Stamina & Lantern Oil ---
        {
            type: 'interactable',
            x: 448,
            y: 224, // Torch
            properties: { interactType: 3 }
        },
        {
            type: 'interactable',
            x: 512,
            y: 240,
            properties: {
                interactType: 0,
                id: 'tut_sprint',
                title: 'TUTORIAL: SPRINTING & LANTERN OIL',
                text: "SURVIVAL PROTOCOL: STAMINA & LANTERN OIL\n\nHold [SHIFT] to sprint at rapid speed. Sprinting consumes your STAMINA gauge and generates loud, heavy footsteps that alert lurking horrors.\n\nAhead lies an OIL FLASK. Press [E] to collect it. Oil fuels your handheld lantern. If oil runs out, the lantern extinguishes, darkness drains sanity rapidly, and the Shadow Lurker will awaken to hunt you!"
            }
        },
        {
            type: 'interactable',
            interactType: 4, // Lantern Oil Flask
            x: 608,
            y: 240
        },

        // --- ZONE 3: Stealth & Breath-Holding ---
        {
            type: 'interactable',
            x: 800,
            y: 240,
            properties: {
                interactType: 0,
                id: 'tut_stealth',
                title: 'TUTORIAL: STEALTH & SNEAKING',
                text: "SURVIVAL PROTOCOL: HOLDING BREATH\n\nHold [C] or [CTRL] to crouch low in the shadows and hold your breath.\n\nWhile holding breath, your sensory presence collapses to nearly zero, allowing you to slip past predators unnoticed. Beware: if your lungs burn out, an uncontrollable gasping fit will instantly alert enemies!"
            }
        },

        // --- ZONE 4: Conduit Mechanism Altar ---
        {
            type: 'interactable',
            x: 1104,
            y: 224, // Altar Torch
            properties: { interactType: 3 }
        },
        {
            type: 'interactable',
            x: 1264,
            y: 176, // Lever on the elevated altar (altarRow = 12 * 16 = 192px)
            properties: {
                interactType: 2, // Switch / Lever
                flag: 'tutorial_gate',
                id: 'tut_lever'
            }
        },
        {
            type: 'interactable',
            x: 1344,
            y: 240,
            properties: {
                interactType: 0,
                id: 'tut_mechanisms',
                title: 'TUTORIAL: RUNIC MECHANISMS',
                text: "ANCIENT MECHANISMS & EXIT PORTALS\n\nDeep catacomb exit gates are sealed by ancient runic conduits. Pull the Conduit Lever on the stone altar with [E] to break the seal and unlock the exit archway."
            }
        },

        // --- ZONE 5: Shadow Lurker Warning, Torch Sanctuary & Exit ---
        {
            type: 'interactable',
            x: 1472,
            y: 240,
            properties: {
                interactType: 0,
                id: 'tut_shadow_warning',
                title: 'CRITICAL WARNING: THE SHADOW STALKER',
                text: "CRITICAL WARNING: THE SHADOW STALKER\n\nA terrifying entity lurks in the dark ahead. It FREEZES under your direct gaze, but CREEPS closer whenever your back is turned.\n\nRULES OF SURVIVAL:\n1. If your LANTERN OIL dies, the stalker awakens immediately and rushes you.\n2. Darkness erodes your SANITY. At 0% sanity, the stalker enters a relentless frenzy and CANNOT be escaped by distance!\n3. The ONLY salvation against a pursuing stalker is the HOLY FLAME OF LIT TORCHES or relighting your lantern with oil. Step into torchlight to incinerate and banish it!"
            }
        },
        {
            type: 'shadow',
            x: 1632,
            y: 220 // Lurker waiting in the darkness
        },
        {
            type: 'interactable',
            x: 1760,
            y: 224, // Sacred Torch Sanctuary framing exit
            properties: { interactType: 3 }
        },
        {
            type: 'interactable',
            x: 1840,
            y: 232, // Master Exit Archway Door
            properties: {
                interactType: 1, // Door
                requiresFlag: 'tutorial_gate'
            }
        }
    ]
};
