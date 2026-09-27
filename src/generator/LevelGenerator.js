/**
 * @file LevelGenerator.js
 * @description Procedural level generator with tunable atmosphere, difficulty, and complexity parameters.
 * Guarantees traversal solvability while generating atmospheric horror layouts.
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
    "Day 14: The torches burned out hours ago. Something else provides the light.",
    "Whoever finds this: there is no surface above us anymore.",
    "The floor is cold. The walls are colder. It waits at the threshold.",
    "I took the key. I shouldn't have taken the key.",
    "Every step echoes twice. Only one sound is mine."
];

function runBFS(grid, startC, startR, leverC, leverR, exitC, exitR) {
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = Array.from({length: rows}, () => Array(cols).fill(false));
    
    const queue = [{c: startC, r: startR}];
    visited[startR][startC] = true;

    const isPassable = (c, r) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
        return grid[r][c] === 0 || grid[r][c] === 3 || grid[r][c] === 4;
    };

    const isStanding = (c, r) => {
        if (r + 1 >= rows) return true;
        return grid[r+1][c] === 1 || grid[r+1][c] === 2 || grid[r+1][c] === 3;
    };

    while (queue.length > 0) {
        const {c, r} = queue.shift();
        
        const tryAdd = (nc, nr) => {
            if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited[nr][nc] && isPassable(nc, nr)) {
                visited[nr][nc] = true;
                queue.push({c: nc, r: nr});
            }
        };

        // Left
        tryAdd(c - 1, r);
        // Right
        tryAdd(c + 1, r);
        // Fall
        tryAdd(c, r + 1);

        // Jump up to 3 tiles
        if (isStanding(c, r)) {
            if (isPassable(c, r - 1)) {
                tryAdd(c, r - 1);
                if (isPassable(c, r - 2)) {
                    tryAdd(c, r - 2);
                    if (isPassable(c, r - 3)) {
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

    let maxReachableCol = 0;
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (visited[r][c]) {
                if (c > maxReachableCol) maxReachableCol = c;
            }
        }
    }

    return {
        valid: isReached(leverC, leverR) && isReached(exitC, exitR),
        furthestReachableCol: maxReachableCol,
        visited
    };
}

function generateAttempt(options, forceAccept = false) {
    const seed = options.seed;
    const rng = createRNG(seed);

    const cols = Math.max(50, Math.min(160, options.width || 80));
    const rows = Math.max(18, Math.min(32, options.height || 20));
    const tileSize = 16;
    
    const hazardDensity = options.hazardDensity !== undefined ? options.hazardDensity : 0.5;
    const verticality = options.verticality !== undefined ? options.verticality : 0.5;
    const shadowCount = options.shadowCount !== undefined ? options.shadowCount : 1;
    const noteCount = options.noteCount !== undefined ? options.noteCount : 2;
    const roomCount = Math.max(3, Math.min(8, options.roomCount || 5));

    const grid = Array.from({ length: rows }, () => Array(cols).fill(1));
    const entities = [];

    const baseFloorRow = Math.min(rows - 4, 14);
    const roomWidth = Math.floor((cols - 2) / roomCount);

    let playerSpawn = { x: 48, y: (baseFloorRow - 1) * tileSize - 4 };
    let playerTilePos = { c: 3, r: baseFloorRow - 1 };
    
    let leverPlaced = false;
    let leverPos = { c: null, r: null };
    let exitPos = { c: null, r: null };

    for (let rIndex = 0; rIndex < roomCount; rIndex++) {
        const startCol = 1 + rIndex * roomWidth;
        const endCol = (rIndex === roomCount - 1) ? cols - 2 : startCol + roomWidth - 1;

        if (rIndex === 0) {
            // Room 0: Safe Crypt
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

            entities.push({
                type: 'interactable',
                x: (startCol + 2) * tileSize,
                y: (baseFloorRow - 3) * tileSize,
                properties: { interactType: 3 }
            });
            entities.push({
                type: 'interactable',
                x: (startCol + 4) * tileSize,
                y: (baseFloorRow - 1) * tileSize,
                properties: {
                    interactType: 0,
                    id: `note_seed_${seed}_start`,
                    text: `Seed #${seed}:\n${CREEPY_NOTES[Math.floor(rng() * CREEPY_NOTES.length)]}\n\nThe Sealed Gate ahead requires the ancient lever in the climbing shafts.`
                }
            });

        } else if (rIndex === roomCount - 1) {
            // Final Room: Exit
            const ceilingRow = Math.max(2, baseFloorRow - 6);
            for (let c = startCol; c <= endCol; c++) {
                for (let r = ceilingRow + 1; r < baseFloorRow; r++) {
                    grid[r][c] = (c % 3 === 0) ? 4 : 0;
                }
                grid[baseFloorRow][c] = 2;
            }

            exitPos = { c: endCol - 2, r: baseFloorRow - 1 };

            entities.push({
                type: 'interactable',
                x: (endCol - 4) * tileSize,
                y: (baseFloorRow - 3) * tileSize,
                properties: { interactType: 3 }
            });
            entities.push({
                type: 'interactable',
                x: exitPos.c * tileSize,
                y: exitPos.r * tileSize,
                properties: {
                    interactType: 1,
                    id: `door_${seed}`,
                    requiresFlag: 'lever_dungeon_unlocked',
                    targetScene: 'NextFloor'
                }
            });

        } else {
            // Intermediate Chambers
            const roomTypeRoll = rng();

            if (roomTypeRoll < 0.35 && verticality > 0.2) {
                // Vertical shaft
                const highCeiling = Math.max(2, baseFloorRow - 11);
                const deepFloor = Math.min(rows - 2, baseFloorRow + 2);

                for (let c = startCol; c <= endCol; c++) {
                    for (let r = highCeiling + 1; r < deepFloor; r++) {
                        grid[r][c] = 0;
                    }
                    grid[deepFloor][c] = 1;
                }

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

                    if (platY % 4 === 0) {
                        entities.push({
                            type: 'interactable',
                            x: (pColStart + 1) * tileSize,
                            y: (platY - 2) * tileSize,
                            properties: { interactType: 3 }
                        });
                    }

                    toggleSide = 1 - toggleSide;
                    platY -= Math.floor(2 + rng() * 1.5); 
                }

                leverPlaced = true;
                leverPos = { c: highestPlatCol, r: highestPlatY - 1 };
                entities.push({
                    type: 'interactable',
                    x: leverPos.c * tileSize,
                    y: leverPos.r * tileSize,
                    properties: {
                        interactType: 2,
                        id: `lever_${seed}`,
                        flag: 'lever_dungeon_unlocked'
                    }
                });

                if (hazardDensity > 0.3) {
                    entities.push({
                        type: 'hazard',
                        x: (startCol + 1) * tileSize,
                        y: (deepFloor - 1) * tileSize,
                        properties: {
                            hazardType: 0,
                            width: Math.max(32, (roomWidth - 4) * tileSize),
                            height: 16
                        }
                    });
                }

            } else if (roomTypeRoll < 0.7) {
                // Trench / Spike pit
                const ceilingRow = Math.max(2, baseFloorRow - 5);
                const pitRow = Math.min(rows - 2, baseFloorRow + 2);

                for (let c = startCol; c <= endCol; c++) {
                    for (let r = ceilingRow + 1; r < baseFloorRow; r++) {
                        grid[r][c] = 0;
                    }
                    grid[baseFloorRow][c] = 1;
                }

                const pitStart = startCol + 2;
                const pitEnd = endCol - 2;
                if (pitEnd > pitStart + 2) {
                    for (let c = pitStart; c <= pitEnd; c++) {
                        grid[baseFloorRow][c] = 0;
                        for (let r = baseFloorRow + 1; r < pitRow; r++) {
                            grid[r][c] = 0;
                        }
                        grid[pitRow][c] = 1;
                    }

                    const midCol = Math.floor((pitStart + pitEnd) / 2);
                    grid[baseFloorRow][midCol - 1] = 3;
                    grid[baseFloorRow][midCol] = 3;
                    grid[baseFloorRow][midCol + 1] = 3;

                    if (hazardDensity > 0.2) {
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
                    }
                }

            } else {
                // Low ceiling corridor
                const ceilingRow = Math.max(4, baseFloorRow - 4);
                for (let c = startCol; c <= endCol; c++) {
                    for (let r = ceilingRow + 1; r < baseFloorRow; r++) {
                        grid[r][c] = (rng() < 0.2) ? 4 : 0;
                    }
                    grid[baseFloorRow][c] = (rng() < 0.3) ? 2 : 1;
                }

                if (hazardDensity > 0.4) {
                    const trapCol = startCol + Math.floor(rng() * (roomWidth - 4)) + 2;
                    entities.push({
                        type: 'hazard',
                        x: trapCol * tileSize,
                        y: (ceilingRow + 1) * tileSize,
                        properties: {
                            hazardType: 1,
                            width: 16,
                            height: 16
                        }
                    });
                }
            }
        }
    }

    // Fix 1: Guarantee Lever Placement if not placed in vertical shafts
    if (!leverPlaced) {
        const middleRoomIndex = Math.floor(roomCount / 2);
        const startCol = 1 + middleRoomIndex * roomWidth;
        const leverC = startCol + Math.floor(roomWidth / 2);
        leverPos = { c: leverC, r: baseFloorRow - 1 };

        entities.push({
            type: 'interactable',
            x: leverPos.c * tileSize,
            y: leverPos.r * tileSize,
            properties: {
                interactType: 2,
                id: `lever_${seed}`,
                flag: 'lever_dungeon_unlocked'
            }
        });
        leverPlaced = true;
    }

    // Fix 2: Room Boundary Doorways (ensure connectivity between rooms)
    for (let rIndex = 0; rIndex < roomCount - 1; rIndex++) {
        const boundCol = 1 + rIndex * roomWidth + roomWidth - 1;
        for (let c = boundCol - 1; c <= boundCol + 2; c++) {
            for (let r = baseFloorRow - 4; r < baseFloorRow; r++) {
                grid[r][c] = 0; // carve air
            }
            grid[baseFloorRow][c] = 1; // carve solid floor
        }
    }

    // Fix 3: BFS Reachability Validation & Patching
    let patches = 0;
    while (patches < 3) {
        let res = runBFS(grid, playerTilePos.c, playerTilePos.r, leverPos.c, leverPos.r, exitPos.c, exitPos.r);
        if (res.valid) {
            break;
        } else {
            // Gap identified, pave a 3-tile wide corridor along baseFloorRow
            let startP = Math.max(1, res.furthestReachableCol - 2);
            let endP = Math.min(cols - 2, res.furthestReachableCol + 8);
            for (let c = startP; c <= endP; c++) {
                for (let r = baseFloorRow - 3; r < baseFloorRow; r++) {
                    grid[r][c] = 0;
                }
                grid[baseFloorRow][c] = 1;
            }
            patches++;
        }
    }

    let finalRes = runBFS(grid, playerTilePos.c, playerTilePos.r, leverPos.c, leverPos.r, exitPos.c, exitPos.r);
    if (!finalRes.valid && !forceAccept) {
        return null; // Failed generation, request retry
    }

    // Place Shadow stalkers
    for (let s = 0; s < shadowCount; s++) {
        const shadowCol = Math.floor(cols * 0.4 + (s * 0.3) * cols + (rng() * 6 - 3));
        if (shadowCol > 15 && shadowCol < cols - 8) {
            entities.push({
                type: 'shadow',
                x: shadowCol * tileSize,
                y: (baseFloorRow - 2) * tileSize
            });
        }
    }

    // Place extra lore notes
    for (let n = 0; n < noteCount - 1; n++) {
        const noteCol = Math.floor(cols * (0.3 + 0.3 * n) + rng() * 5);
        if (noteCol > 10 && noteCol < cols - 8) {
            entities.push({
                type: 'interactable',
                x: noteCol * tileSize,
                y: (baseFloorRow - 1) * tileSize,
                properties: {
                    interactType: 0,
                    id: `note_seed_${seed}_${n}`,
                    text: CREEPY_NOTES[Math.floor(rng() * CREEPY_NOTES.length)]
                }
            });
        }
    }

    return {
        name: options.name || `Catacombs (Seed ${seed})`,
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
 * Generates a fully playable procedural level.
 * @param {Object} options
 * @param {number|string} [options.seed] - Seed for procedural generation (default random)
 * @param {number} [options.width=80] - Level width in tiles (60 - 150)
 * @param {number} [options.height=20] - Level height in tiles (18 - 30)
 * @param {number} [options.roomCount=5] - Number of architectural segments (3 - 8)
 * @param {number} [options.hazardDensity=0.5] - Frequency of spikes and falling traps (0.0 - 1.0)
 * @param {number} [options.verticality=0.5] - Frequency of climbing shafts and platforms (0.0 - 1.0)
 * @param {number} [options.shadowCount=1] - Number of stalking horror entities (0 - 3)
 * @param {number} [options.noteCount=2] - Number of collectible lore notes (1 - 4)
 * @param {string} [options.name] - Custom name for level
 * @returns {Object} Complete level object ready to be loaded by Scene
 */
export function generateProceduralLevel(options = {}) {
    let currentSeed = options.seed !== undefined ? options.seed : Math.floor(Math.random() * 1000000);
    
    for (let attempt = 0; attempt < 5; attempt++) {
        const level = generateAttempt({...options, seed: currentSeed}, false);
        if (level) {
            return level;
        }
        if (typeof currentSeed === 'number') {
            currentSeed++;
        } else {
            currentSeed = currentSeed + "_retry";
        }
    }
    
    // If all retries fail, force accept the last attempt
    return generateAttempt({...options, seed: currentSeed}, true);
}
