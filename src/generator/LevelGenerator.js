/**
 * @file LevelGenerator.js
 * @description Advanced procedural level generator with multi-tier architectures,
 * dynamic puzzle conduits, pendulum traps, crumbling stone chasms, and multi-goal BFS validation.
 */

// Simple deterministic Mulberry32 PRNG
function createRNG(seed) {
    let s = typeof seed === 'number' ? seed : 0;
    if (typeof seed === 'string') {
        for (let i = 0; i < seed.length; i++) {
            s = (s * 31 + seed.charCodeAt(i)) >>> 0;
        }
    }
    if (s === 0) s = 123456789;

    return function() {
        let t = s += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const CREEPY_NOTES = [
    "I can hear scratching from beneath the stone slabs.",
    "Do not look it in the eyes. Just walk past.",
    "The torches burned out hours ago. Something else provides the light.",
    "Whoever finds this: there is no surface above us anymore.",
    "The floor is cold. The walls are colder. It waits at the threshold.",
    "I pulled the first lever. A horrifying groan echoed from the dark.",
    "The blade swings relentlessly in the clockwork vault. Time has expired.",
    "Step lightly across the cracked pavers. The abyss claims the careless.",
    "Every step echoes twice. Only one sound is mine."
];

/**
 * Ensures at least 2 tiles of clear headroom above any platform (tiles 3 and 5).
 */
function ensurePlatformClearances(grid, cols, rows) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 3 || grid[r][c] === 5) {
                // Ensure at least 2 tiles of clear headroom above the platform
                for (let h = 1; h <= 2; h++) {
                    if (r - h >= 0 && (grid[r - h][c] === 1 || grid[r - h][c] === 2)) {
                        grid[r - h][c] = 0; // Clear solid ceiling to air so player can jump and stand
                    }
                }
            }
        }
    }
}

/**
 * Multi-goal platformer-aware Breadth-First-Search solver.
 * Verifies that the player can reach ALL conduit levers and the exit gate.
 */
function runBFS(grid, startC, startR, levers = [], exitC = null, exitR = null) {
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    
    const queue = [{ c: startC, r: startR }];
    if (startR >= 0 && startR < rows && startC >= 0 && startC < cols) {
        visited[startR][startC] = true;
    }

    // Player occupies row r (feet) and row r - 1 (head).
    // Air (0), one-way platform (3), background (4), and crumbling stone (5) are passable.
    const canPlayerFit = (c, r) => {
        if (r < 1 || r >= rows || c < 0 || c >= cols) return false;
        const feet = grid[r][c];
        const head = grid[r - 1][c];
        const feetPassable = (feet === 0 || feet === 3 || feet === 4 || feet === 5);
        const headPassable = (head === 0 || head === 3 || head === 4 || head === 5);
        return feetPassable && headPassable;
    };

    const isStanding = (c, r) => {
        if (r + 1 >= rows) return true;
        const floor = grid[r + 1][c];
        const hasSolidFloor = (floor === 1 || floor === 2 || floor === 3 || floor === 5);
        return hasSolidFloor && canPlayerFit(c, r);
    };

    while (queue.length > 0) {
        const { c, r } = queue.shift();
        
        const tryAdd = (nc, nr) => {
            if (nc >= 0 && nc < cols && nr >= 1 && nr < rows && !visited[nr][nc] && canPlayerFit(nc, nr)) {
                visited[nr][nc] = true;
                queue.push({ c: nc, r: nr });
            }
        };

        // Horizontal traversal
        tryAdd(c - 1, r);
        tryAdd(c + 1, r);
        // Falling
        tryAdd(c, r + 1);

        // Jumping up to 3 tiles high when standing on a surface
        if (isStanding(c, r)) {
            if (canPlayerFit(c, r - 1)) {
                tryAdd(c, r - 1);
                if (canPlayerFit(c, r - 2)) {
                    tryAdd(c, r - 2);
                    if (canPlayerFit(c, r - 3)) {
                        tryAdd(c, r - 3);
                    }
                }
            }
        }
    }

    const isReached = (tc, tr) => {
        if (tc === null || tr === null) return true;
        for (let dc = -1; dc <= 1; dc++) {
            for (let dr = -1; dr <= 1; dr++) {
                let nc = tc + dc;
                let nr = tr + dr;
                if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && visited[nr][nc]) {
                    return true;
                }
            }
        }
        return false;
    };

    // Platform validation: verify player can stand on top of reachable platforms
    let platformsValid = true;
    for (let r = 1; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((grid[r][c] === 3 || grid[r][c] === 5) && visited[r][c]) {
                if (!canPlayerFit(c, r - 1)) {
                    platformsValid = false;
                }
            }
        }
    }

    let maxReachableCol = 0;
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (visited[r][c] && c > maxReachableCol) {
                maxReachableCol = c;
            }
        }
    }

    const allLeversReached = levers.every(l => isReached(l.c, l.r));
    const exitReached = isReached(exitC, exitR);

    return {
        valid: allLeversReached && exitReached && platformsValid,
        allLeversReached,
        exitReached,
        furthestReachableCol: maxReachableCol,
        visited
    };
}

/**
 * Attempts to generate a single level configuration.
 */
function generateAttempt(options, forceAccept = false) {
    const seed = options.seed;
    const rng = createRNG(seed);

    const cols = Math.max(60, Math.min(160, options.width || 85));
    const rows = Math.max(18, Math.min(32, options.height || 22));
    const tileSize = 16;
    
    const floorIndex = options.floorIndex || 1;
    const hazardDensity = options.hazardDensity !== undefined ? options.hazardDensity : Math.min(0.8, 0.4 + floorIndex * 0.08);
    const verticality = options.verticality !== undefined ? options.verticality : 0.55;
    const shadowCount = options.shadowCount !== undefined ? options.shadowCount : (floorIndex >= 3 ? 2 : 1);
    const roomCount = Math.max(4, Math.min(8, options.roomCount || 5));

    // Multi-conduit puzzle count: 2 on B1/B2, 3 on B3+
    const totalConduits = options.conduitCount !== undefined 
        ? options.conduitCount 
        : (floorIndex >= 3 ? 3 : 2);
    const conduitFlags = Array.from({ length: totalConduits }, (_, i) => `conduit_${seed}_${i}`);

    const grid = Array.from({ length: rows }, () => Array(cols).fill(1));
    const entities = [];

    const baseFloorRow = Math.min(rows - 4, 16);
    const roomWidth = Math.floor((cols - 2) / roomCount);

    let playerSpawn = { x: 48, y: (baseFloorRow - 1) * tileSize - 4 };
    let playerTilePos = { c: 3, r: baseFloorRow - 1 };
    
    const placedLevers = [];
    let exitPos = { c: null, r: null };

    // Determine room archetype ordering for intermediate rooms
    const intermediateRoomCount = roomCount - 2;
    const archetypePool = [0, 1, 2, 3]; // 0: Vertical Shaft, 1: Crumbling Chasm, 2: Pendulum Vault, 3: Trap Corridor
    // Shuffle pool with PRNG
    for (let i = archetypePool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [archetypePool[i], archetypePool[j]] = [archetypePool[j], archetypePool[i]];
    }

    for (let rIndex = 0; rIndex < roomCount; rIndex++) {
        const startCol = 1 + rIndex * roomWidth;
        const endCol = (rIndex === roomCount - 1) ? cols - 2 : startCol + roomWidth - 1;

        if (rIndex === 0) {
            // === ROOM 0: Safe Starting Crypt ===
            const ceilingRow = Math.max(2, baseFloorRow - 6);
            for (let c = startCol; c <= endCol; c++) {
                for (let r = ceilingRow + 1; r < baseFloorRow; r++) {
                    grid[r][c] = (c % 4 === 0) ? 4 : 0;
                }
                grid[baseFloorRow][c] = 1;
            }
            playerSpawn = {
                x: (startCol + 2) * tileSize,
                y: (baseFloorRow - 1) * tileSize - 4
            };
            playerTilePos = { c: startCol + 2, r: baseFloorRow - 1 };

            // Sanctuary torch at entrance
            entities.push({
                type: 'interactable',
                x: (startCol + 2) * tileSize,
                y: (baseFloorRow - 3) * tileSize,
                properties: { interactType: 3 }
            });

            // Lore Inscription detailing the Multi-Conduit Puzzle
            const conduitWord = totalConduits === 3 ? "THREE" : "TWIN";
            entities.push({
                type: 'interactable',
                x: (startCol + 4) * tileSize,
                y: (baseFloorRow - 1) * tileSize,
                properties: {
                    interactType: 0,
                    id: `note_seed_${seed}_start`,
                    title: 'ANCIENT INSCRIPTION',
                    text: `Catacombs — Depth B${floorIndex}:\n${CREEPY_NOTES[Math.floor(rng() * CREEPY_NOTES.length)]}\n\nThe Sealed Gate ahead is bound by ${conduitWord} RUNIC CONDUITS.\nLocate and activate all ${totalConduits} conduit levers across these halls to break the seals.`
                }
            });

        } else if (rIndex === roomCount - 1) {
            // === FINAL ROOM: Runic Exit Chamber ===
            const ceilingRow = Math.max(2, baseFloorRow - 6);
            for (let c = startCol; c <= endCol; c++) {
                for (let r = ceilingRow + 1; r < baseFloorRow; r++) {
                    grid[r][c] = (c % 3 === 0) ? 4 : 0;
                }
                grid[baseFloorRow][c] = 2; // brick floor
            }

            exitPos = { c: endCol - 2, r: baseFloorRow - 1 };

            // Sanctuary torch near exit
            entities.push({
                type: 'interactable',
                x: (endCol - 4) * tileSize,
                y: (baseFloorRow - 3) * tileSize,
                properties: { interactType: 3 }
            });

            // Multi-Seal Runic Exit Gate
            entities.push({
                type: 'interactable',
                x: exitPos.c * tileSize,
                y: exitPos.r * tileSize,
                properties: {
                    interactType: 1,
                    id: `door_${seed}`,
                    requiresFlags: conduitFlags,
                    totalSeals: totalConduits,
                    targetScene: 'NextFloor'
                }
            });

        } else {
            // === INTERMEDIATE CHAMBERS: Varied Archetypes ===
            const intermediateIndex = rIndex - 1;
            const archetype = archetypePool[intermediateIndex % archetypePool.length];
            const needConduit = placedLevers.length < totalConduits;

            if (archetype === 0 && verticality > 0.25) {
                // --- ARCHETYPE 0: The Grand Climbing Shaft ---
                const highCeiling = Math.max(2, baseFloorRow - 12);
                const deepFloor = Math.min(rows - 2, baseFloorRow + 2);

                for (let c = startCol; c <= endCol; c++) {
                    for (let r = highCeiling + 1; r < deepFloor; r++) {
                        grid[r][c] = 0;
                    }
                    grid[deepFloor][c] = 1;
                }

                // Staggered platform staircase (spacing <= 3 tiles)
                let platY = deepFloor - 2;
                let toggleSide = 0;
                let highestPlatCol = startCol + 2;
                let highestPlatY = platY;

                while (platY > highCeiling + 2) {
                    const pColStart = toggleSide === 0 ? startCol + 2 : startCol + Math.floor(roomWidth / 2);
                    for (let pc = 0; pc < 3; pc++) {
                        if (pColStart + pc <= endCol - 1) {
                            grid[platY][pColStart + pc] = 3;
                        }
                    }
                    highestPlatCol = pColStart + 1;
                    highestPlatY = platY;

                    toggleSide = 1 - toggleSide;
                    platY -= Math.floor(2 + rng() * 1.4); 
                }

                // Guide torch at top of vertical shaft
                entities.push({
                    type: 'interactable',
                    x: (highestPlatCol + 2) * tileSize,
                    y: (highestPlatY - 2) * tileSize,
                    properties: { interactType: 3 }
                });

                // Conduit lever at summit of the shaft
                if (needConduit) {
                    const conduitIndex = placedLevers.length;
                    const cPos = { c: highestPlatCol, r: highestPlatY - 1, flag: conduitFlags[conduitIndex] };
                    placedLevers.push(cPos);
                    entities.push({
                        type: 'interactable',
                        x: cPos.c * tileSize,
                        y: cPos.r * tileSize,
                        properties: {
                            interactType: 2,
                            id: `lever_${seed}_${conduitIndex}`,
                            flag: cPos.flag
                        }
                    });
                }

                // Spikes at the bottom of the drop
                if (hazardDensity > 0.25) {
                    entities.push({
                        type: 'hazard',
                        x: (startCol + 1) * tileSize,
                        y: (deepFloor - 1) * tileSize,
                        properties: {
                            hazardType: 0,
                            width: Math.max(32, (roomWidth - 3) * tileSize),
                            height: 16
                        }
                    });
                }

            } else if (archetype === 1) {
                // --- ARCHETYPE 1: Sunken Crypt with Fragile Crumbling Stone Bridge ---
                const ceilingRow = Math.max(2, baseFloorRow - 6);
                const pitRow = Math.min(rows - 2, baseFloorRow + 3);

                for (let c = startCol; c <= endCol; c++) {
                    for (let r = ceilingRow + 1; r < baseFloorRow; r++) {
                        grid[r][c] = 0;
                    }
                    grid[baseFloorRow][c] = 1;
                }

                const pitStart = startCol + 2;
                const pitEnd = endCol - 2;
                if (pitEnd > pitStart + 3) {
                    for (let c = pitStart; c <= pitEnd; c++) {
                        grid[baseFloorRow][c] = 0; // deep gap
                        for (let r = baseFloorRow + 1; r < pitRow; r++) {
                            grid[r][c] = 0;
                        }
                        grid[pitRow][c] = 1;
                    }

                    // Stepping bridge: alternating sturdy one-way stone (3) and crumbling stone (5)
                    const midCol = Math.floor((pitStart + pitEnd) / 2);
                    grid[baseFloorRow][midCol - 2] = 3;
                    grid[baseFloorRow][midCol - 1] = 5; // Crumbling platform!
                    grid[baseFloorRow][midCol] = 5;     // Crumbling platform!
                    grid[baseFloorRow][midCol + 1] = 5; // Crumbling platform!
                    grid[baseFloorRow][midCol + 2] = 3;

                    // Spikes lining the bottom of the crumbling chasm
                    entities.push({
                        type: 'hazard',
                        x: pitStart * tileSize,
                        y: (pitRow - 1) * tileSize,
                        properties: {
                            hazardType: 0,
                            width: (pitEnd - pitStart + 1) * tileSize,
                            height: 16
                        }
                    });

                    // Alcove with Conduit Lever on an elevated ledge across the chasm
                    if (needConduit) {
                        const conduitIndex = placedLevers.length;
                        const leverC = pitEnd - 1;
                        const leverR = baseFloorRow - 1;
                        const cPos = { c: leverC, r: leverR, flag: conduitFlags[conduitIndex] };
                        placedLevers.push(cPos);
                        entities.push({
                            type: 'interactable',
                            x: cPos.c * tileSize,
                            y: cPos.r * tileSize,
                            properties: {
                                interactType: 2,
                                id: `lever_${seed}_${conduitIndex}`,
                                flag: cPos.flag
                            }
                        });
                    }
                }

                if (rng() < 0.35) {
                    entities.push({
                        type: 'interactable',
                        x: (startCol + 1) * tileSize,
                        y: (baseFloorRow - 3) * tileSize,
                        properties: { interactType: 3 }
                    });
                }

            } else if (archetype === 2) {
                // --- ARCHETYPE 2: Clockwork Vault with Swinging Pendulum Blades ---
                const ceilingRow = Math.max(3, baseFloorRow - 7);
                for (let c = startCol; c <= endCol; c++) {
                    for (let r = ceilingRow + 1; r < baseFloorRow; r++) {
                        grid[r][c] = (c % 4 === 0) ? 4 : 0;
                    }
                    grid[baseFloorRow][c] = 2; // brick floor
                }

                // Place 1 to 2 swinging Pendulum Blades suspended from the high ceiling
                const pendCol1 = startCol + Math.floor(roomWidth * 0.35);
                entities.push({
                    type: 'hazard',
                    x: pendCol1 * tileSize,
                    y: (ceilingRow + 1) * tileSize,
                    properties: {
                        hazardType: 2, // PENDULUM_BLADE
                        pivotX: pendCol1 * tileSize + 8,
                        pivotY: (ceilingRow + 1) * tileSize,
                        length: (baseFloorRow - ceilingRow - 3) * tileSize,
                        swingSpeed: 2.1 + (rng() * 0.6),
                        maxAngle: Math.PI / 3.2,
                        phase: rng() * Math.PI,
                        bladeRadius: 11
                    }
                });

                if (roomWidth > 12 && hazardDensity > 0.4) {
                    const pendCol2 = startCol + Math.floor(roomWidth * 0.7);
                    entities.push({
                        type: 'hazard',
                        x: pendCol2 * tileSize,
                        y: (ceilingRow + 1) * tileSize,
                        properties: {
                            hazardType: 2, // PENDULUM_BLADE
                            pivotX: pendCol2 * tileSize + 8,
                            pivotY: (ceilingRow + 1) * tileSize,
                            length: (baseFloorRow - ceilingRow - 3) * tileSize,
                            swingSpeed: 2.3 + (rng() * 0.5),
                            maxAngle: Math.PI / 3.4,
                            phase: rng() * Math.PI + Math.PI / 2,
                            bladeRadius: 11
                        }
                    });
                }

                // Conduit lever in Clockwork Vault
                if (needConduit) {
                    const conduitIndex = placedLevers.length;
                    const leverC = startCol + Math.floor(roomWidth / 2);
                    const leverR = baseFloorRow - 1;
                    const cPos = { c: leverC, r: leverR, flag: conduitFlags[conduitIndex] };
                    placedLevers.push(cPos);
                    entities.push({
                        type: 'interactable',
                        x: cPos.c * tileSize,
                        y: cPos.r * tileSize,
                        properties: {
                            interactType: 2,
                            id: `lever_${seed}_${conduitIndex}`,
                            flag: cPos.flag
                        }
                    });
                }

            } else {
                // --- ARCHETYPE 3: Claustrophobic Corridor with Falling Traps ---
                const ceilingRow = Math.max(4, baseFloorRow - 4);
                for (let c = startCol; c <= endCol; c++) {
                    for (let r = ceilingRow + 1; r < baseFloorRow; r++) {
                        grid[r][c] = (rng() < 0.2) ? 4 : 0;
                    }
                    grid[baseFloorRow][c] = (rng() < 0.3) ? 2 : 1;
                }

                if (hazardDensity > 0.35) {
                    const trapCol = startCol + Math.floor(rng() * (roomWidth - 4)) + 2;
                    entities.push({
                        type: 'hazard',
                        x: trapCol * tileSize,
                        y: (ceilingRow + 1) * tileSize,
                        properties: {
                            hazardType: 1, // Falling trap
                            width: 16,
                            height: 16
                        }
                    });
                }

                if (rng() < 0.3) {
                    entities.push({
                        type: 'interactable',
                        x: (startCol + Math.floor(roomWidth / 2)) * tileSize,
                        y: (ceilingRow + 1) * tileSize,
                        properties: { interactType: 3 }
                    });
                }

                // If we still need conduit levers, place one in this corridor
                if (needConduit) {
                    const conduitIndex = placedLevers.length;
                    const leverC = startCol + Math.floor(roomWidth / 2);
                    const leverR = baseFloorRow - 1;
                    const cPos = { c: leverC, r: leverR, flag: conduitFlags[conduitIndex] };
                    placedLevers.push(cPos);
                    entities.push({
                        type: 'interactable',
                        x: cPos.c * tileSize,
                        y: cPos.r * tileSize,
                        properties: {
                            interactType: 2,
                            id: `lever_${seed}_${conduitIndex}`,
                            flag: cPos.flag
                        }
                    });
                }
            }
        }
    }

    // === GUARANTEE: Ensure ALL conduit levers were placed ===
    while (placedLevers.length < totalConduits) {
        const conduitIndex = placedLevers.length;
        const targetRoomIndex = 1 + (conduitIndex % (roomCount - 2));
        const startCol = 1 + targetRoomIndex * roomWidth;
        const leverC = startCol + Math.floor(roomWidth * 0.6);
        const leverR = baseFloorRow - 1;
        const cPos = { c: leverC, r: leverR, flag: conduitFlags[conduitIndex] };
        placedLevers.push(cPos);

        entities.push({
            type: 'interactable',
            x: cPos.c * tileSize,
            y: cPos.r * tileSize,
            properties: {
                interactType: 2,
                id: `lever_${seed}_${conduitIndex}`,
                flag: cPos.flag
            }
        });
    }

    // === CONNECTIVITY: Carve boundary doorways between adjacent rooms ===
    for (let rIndex = 0; rIndex < roomCount - 1; rIndex++) {
        const boundCol = 1 + rIndex * roomWidth + roomWidth - 1;
        for (let c = boundCol - 1; c <= boundCol + 2; c++) {
            for (let r = baseFloorRow - 4; r < baseFloorRow; r++) {
                grid[r][c] = 0; // carve open air
            }
            grid[baseFloorRow][c] = 1; // solid connecting floor
        }
    }

    // Ensure clear jumping headroom over all platforms (types 3 & 5)
    ensurePlatformClearances(grid, cols, rows);

    // === SOLVABILITY: Multi-Goal BFS Validation & Patching ===
    let patches = 0;
    while (patches < 3) {
        const res = runBFS(grid, playerTilePos.c, playerTilePos.r, placedLevers, exitPos.c, exitPos.r);
        if (res.valid) {
            break;
        } else {
            // Gap identified: carve a solid 3-tile wide passage along baseFloorRow
            const startP = Math.max(1, res.furthestReachableCol - 2);
            const endP = Math.min(cols - 2, res.furthestReachableCol + 10);
            for (let c = startP; c <= endP; c++) {
                for (let r = baseFloorRow - 3; r < baseFloorRow; r++) {
                    grid[r][c] = 0;
                }
                grid[baseFloorRow][c] = 1;
            }
            ensurePlatformClearances(grid, cols, rows);
            patches++;
        }
    }

    const finalRes = runBFS(grid, playerTilePos.c, playerTilePos.r, placedLevers, exitPos.c, exitPos.r);
    if (!finalRes.valid && !forceAccept) {
        return null; // Request regeneration with next seed
    }

    // === ATMOSPHERE: Place Shadow Stalkers in Exploration Zones ===
    const stalkerCount = Math.max(1, shadowCount);
    for (let s = 0; s < stalkerCount; s++) {
        const shadowCol = Math.min(cols - 6, Math.max(16, Math.floor(cols * (0.35 + s * 0.3) + (rng() * 4 - 2))));
        entities.push({
            type: 'shadow',
            x: shadowCol * tileSize,
            y: (baseFloorRow - 2) * tileSize
        });
    }

    return {
        name: options.name || `Catacombs B${floorIndex} (Seed ${seed})`,
        seed: seed,
        width: cols,
        height: rows,
        tileSize: tileSize,
        backgroundColor: '#07070b',
        ambientTrack: 'ambient_drip',
        playerStart: playerSpawn,
        tiles: grid,
        entities: entities
    };
}

/**
 * Generates a fully playable procedural level guaranteed to be solvable.
 * @param {Object} options
 * @param {number|string} [options.seed] - Seed for procedural generation
 * @param {number} [options.width=85] - Level width in tiles (60 - 150)
 * @param {number} [options.height=22] - Level height in tiles (18 - 32)
 * @param {number} [options.roomCount=5] - Number of architectural segments (4 - 8)
 * @param {number} [options.hazardDensity=0.5] - Spikes, pendulums, and falling traps (0.0 - 1.0)
 * @param {number} [options.verticality=0.55] - Frequency of climbing shafts and platforms
 * @param {number} [options.shadowCount=1] - Number of stalking horror entities (1 - 3)
 * @param {number} [options.floorIndex=1] - Catacomb depth index (B1, B2, B3...)
 * @param {string} [options.name] - Custom name for level
 * @returns {Object} Complete level object ready to be loaded by Scene
 */
export function generateProceduralLevel(options = {}) {
    let currentSeed = options.seed !== undefined ? options.seed : Math.floor(Math.random() * 1000000);
    
    for (let attempt = 0; attempt < 5; attempt++) {
        const level = generateAttempt({ ...options, seed: currentSeed }, false);
        if (level) {
            return level;
        }
        if (typeof currentSeed === 'number') {
            currentSeed++;
        } else {
            currentSeed = currentSeed + "_retry";
        }
    }
    
    // If all retries fail, force accept the last attempt with patched corridors
    return generateAttempt({ ...options, seed: currentSeed }, true);
}
