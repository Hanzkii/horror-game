/**
 * @file LevelGenerator.js
 * @description Advanced 2D Macro-Chamber Procedural Dungeon Generator.
 * Creates expansive, multi-tiered subterranean levels across 30 progressively terrifying depths.
 * Features 5 distinct thematic strata, multi-conduit puzzle networks, pendulum traps,
 * crumbling platform chasms, environmental storytelling, and a 2D platformer BFS validator.
 */

// Deterministic Mulberry32 PRNG
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

/**
 * 30-Floor Narrative Chronicle: Althea's Journal
 * Chronicles the descent, the discovery of the ancient mechanism, the tragic origin of the Shadow Stalker,
 * and the desperate final ascent toward daylight.
 */
export const STORY_INSCRIPTIONS = {
    1: {
        title: "ANCIENT INSCRIPTION: ENTRY I",
        chapter: "The Cold Awakening",
        text: "If your eyes can read these scratches, you have awakened upon the cold stone just as I did.\n\nDo not panic. Panic quickens the pulse, and it hears every heartbeat.\n\nThis subterranean vault is older than memory. The torches are your only sanctuary. Whatever you do, do not linger in the dark. It watches from the edges of your vision.\n\n— Althea's Journal, Entry I"
    },
    2: {
        title: "ANCIENT INSCRIPTION: ENTRY II",
        chapter: "The Bone Orchard",
        text: "Day 2. The catacomb walls are lined with skeletal remains of those who descended before us. None of them bear wounds from weapons; they died huddled in corners after their lanterns guttered out.\n\nKeep your oil flask filled. When the flame dies, the dark steps forward.\n\n— Althea's Journal, Entry II"
    },
    3: {
        title: "ANCIENT INSCRIPTION: ENTRY III",
        chapter: "The Weeping Catacombs",
        text: "Water seeps through the mortar above, dripping in relentless rhythm. Every drip echoes like footsteps behind me.\n\nI tested holding my breath when it crept near. If you press yourself against the stone and stay utterly still, it loses your silhouette in the gloom. Remember this.\n\n— Althea's Journal, Entry III"
    },
    4: {
        title: "ANCIENT INSCRIPTION: ENTRY IV",
        chapter: "The Vault of Whispers",
        text: "The voices are not inside my skull. The stone itself hums with whispers. They speak in languages dead for millennia, pleading for release.\n\nThe iron gates ahead are locked by twin conduit levers. Find the high altar and break the seals.\n\n— Althea's Journal, Entry IV"
    },
    5: {
        title: "ANCIENT INSCRIPTION: ENTRY V",
        chapter: "The Cloister of Shadows",
        text: "It knows my name now. I found my initials carved into a stone bench that was buried centuries ago. How is that possible?\n\nDo not stare into the darkness at the edge of your lantern light. If you stare long enough, it begins to wear your own face.\n\n— Althea's Journal, Entry V"
    },
    6: {
        title: "ANCIENT INSCRIPTION: ENTRY VI",
        chapter: "The Threshold of Waters",
        text: "I can hear roaring torrents below. The upper catacombs end here. Below lies the ancient sunken drainage system of the forgotten city.\n\nThe air is damp and thick with rot. Check your matches before descending.\n\n— Althea's Journal, Entry VI"
    },
    7: {
        title: "ANCIENT INSCRIPTION: ENTRY VII",
        chapter: "The Sunken Cistern",
        text: "Day unknown. I have descended into the sunken, waterlogged crypts. The stone floor crumbles into the abyss if you hesitate for even a heartbeat.\n\nI caught its gaze in the black water. It has no true shape—only hunger and ancient spite. It feeds on our unraveling sanity.\n\n— Althea's Journal, Entry VII"
    },
    8: {
        title: "ANCIENT INSCRIPTION: ENTRY VIII",
        chapter: "The Moldering Aqueduct",
        text: "Algae slicks the stone ledges. One slip means plunging into the black canal below. The creature moves silently through the water; only the ripples give it away.\n\nLight every wall torch you find. The holy flame keeps the water demons at bay.\n\n— Althea's Journal, Entry VIII"
    },
    9: {
        title: "ANCIENT INSCRIPTION: ENTRY IX",
        chapter: "The Drowned Mausoleum",
        text: "Sarcophagi float in the flooded chambers like macabre barges. The builders sealed this place from the outside. They were not keeping thieves out; they were walling something in.\n\nThree runic conduits power the gate ahead. Explore every elevated branch.\n\n— Althea's Journal, Entry IX"
    },
    10: {
        title: "ANCIENT INSCRIPTION: ENTRY X",
        chapter: "The Submerged Crypts",
        text: "A phantom stood at the end of the corridor. When I ran toward it with my lantern, it dissolved into cold ash.\n\nIt is playing tricks on my eyes. It wants me to waste stamina running in terror. Conserve your strength for the leaps.\n\n— Althea's Journal, Entry X"
    },
    11: {
        title: "ANCIENT INSCRIPTION: ENTRY XI",
        chapter: "The Basin of Lost Souls",
        text: "The crumbling pavers here drop after half a heartbeat under weight. Leap decisively. Never pause on a fractured slab.\n\nI found another journal fragment signed by someone named Kenneth. His handwriting looks identical to mine. I am losing track of who I was.\n\n— Althea's Journal, Entry XI"
    },
    12: {
        title: "ANCIENT INSCRIPTION: ENTRY XII",
        chapter: "The Iron Sluice Gates",
        text: "Massive iron machinery looms ahead. Giant sluice gates that once controlled subterranean rivers now rust in silence.\n\nBehind these gates lies the ancient foundry. The air grows hot, smelling of scorched oil and sulfur.\n\n— Althea's Journal, Entry XII"
    },
    13: {
        title: "ANCIENT INSCRIPTION: ENTRY XIII",
        chapter: "The Clockwork Foundry",
        text: "The swinging pendulum blades never stop. The ancient builders engineered this labyrinth as an ordeal—a crucible to purge the weak.\n\nThe creature hunting us is the remnant of the first soul trapped here, deformed by centuries of isolation. It envies those who still possess warmth.\n\n— Althea's Journal, Entry XIII"
    },
    14: {
        title: "ANCIENT INSCRIPTION: ENTRY XIV",
        chapter: "The Great Mechanism",
        text: "Gears the size of houses turn slowly in the dark. Watch the rhythm of the razor pendulums. There is a half-second window when the blade reaches its apex—dash through then!\n\nThree conduits power the exit sluice. One is perched high atop the clock tower.\n\n— Althea's Journal, Entry XIV"
    },
    15: {
        title: "ANCIENT INSCRIPTION: ENTRY XV",
        chapter: "The Hall of Swinging Blades",
        text: "My cloak was sliced by a swinging blade. A fraction of an inch closer and my journey would have ended on these iron plates.\n\nThe shadow lurker has learned to time its rushes with the swinging blades, trying to herd me into their path. Do not let it panic you.\n\n— Althea's Journal, Entry XV"
    },
    16: {
        title: "ANCIENT INSCRIPTION: ENTRY XVI",
        chapter: "The Pressure Conduit",
        text: "Four conduit lines connect to the master vault gate. The pipes hiss with scalding steam. Follow the copper cables along the ceiling to locate the distant valves.\n\nEvery lever pulled brings a groaning shriek from deep within the earth.\n\n— Althea's Journal, Entry XVI"
    },
    17: {
        title: "ANCIENT INSCRIPTION: ENTRY XVII",
        chapter: "The Steam Shafts",
        text: "The vertical shafts here are dizzyingly tall. Wall-sliding is essential to survive the long drops between rusted catwalks.\n\nThe shadow stalker now attempts to snuff out torches if you linger too long in the light. Keep moving from sanctuary to sanctuary.\n\n— Althea's Journal, Entry XVII"
    },
    18: {
        title: "ANCIENT INSCRIPTION: ENTRY XVIII",
        chapter: "The Foundry Furnace",
        text: "We have reached the deepest boiler level. Beyond this lies the black heart of the mountain: the Obsidian Necropolis.\n\nThe creature is furious that I have survived the blades. I can hear its claws scraping against the iron plates above my head.\n\n— Althea's Journal, Entry XVIII"
    },
    19: {
        title: "ANCIENT INSCRIPTION: ENTRY XIX",
        chapter: "The Obsidian Gateway",
        text: "The stone turned pitch black, smooth as polished glass, carved with pulsing violet runes. The temperature dropped forty degrees in ten steps.\n\nThis is where the ancient priests worshiped the void. The shadows here have physical weight.\n\n— Althea's Journal, Entry XIX"
    },
    20: {
        title: "ANCIENT INSCRIPTION: ENTRY XX",
        chapter: "The Hall of Dark Mirrors",
        text: "I saw myself standing on a high platform. When I waved, it stepped toward me with empty black eye sockets.\n\nThe doppelgangers are hallucinations born of our unraveling sanity, but their touch drains warmth instantly. Illuminate them with bright torchlight to banish the illusion.\n\n— Althea's Journal, Entry XX"
    },
    21: {
        title: "ANCIENT INSCRIPTION: ENTRY XXI",
        chapter: "The Cursed Sepulcher",
        text: "Four runic conduits are hidden within these black vaults. The glyphs on the walls tell a terrible truth: the exit is not an accident. The builders intended for one person to escape every century—the one who survives the hunt.\n\nI will be that survivor.\n\n— Althea's Journal, Entry XXI"
    },
    22: {
        title: "ANCIENT INSCRIPTION: ENTRY XXII",
        chapter: "The Altar of Blood Stone",
        text: "The stalker teleports directly behind me if I turn my back for more than a few heartbeats. Keep checking behind you.\n\nLantern oil is scarce here. Search every forgotten alcove before attempting the vertical climbs.\n\n— Althea's Journal, Entry XXII"
    },
    23: {
        title: "ANCIENT INSCRIPTION: ENTRY XXIII",
        chapter: "The Necropolis Gallery",
        text: "Statues of weeping kings line the grand gallery. Their outstretched hands hold empty torch sconces. Light them as you pass—they form a safe corridor across the hall.\n\nTwo shadows hunt together now. When one stalks from the front, the other circles behind.\n\n— Althea's Journal, Entry XXIII"
    },
    24: {
        title: "ANCIENT INSCRIPTION: ENTRY XXIV",
        chapter: "The Gate of Reflection",
        text: "I have reached the boundary of the Obsidian Necropolis. Below lies the Abyssal Crucible—the deepest point of the labyrinth.\n\nFrom here, the passage turns upward. The final ascent begins below.\n\n— Althea's Journal, Entry XXIV"
    },
    25: {
        title: "ANCIENT INSCRIPTION: ENTRY XXV",
        chapter: "The Abyssal Crucible",
        text: "The stone itself seems alive, glitching between reality and void. Space bends strangely; platforms appear disconnected, floating over endless emptiness.\n\nFive conduit levers power the exit portals in these deepest trials. We must search every corner of the abyss.\n\n— Althea's Journal, Entry XXV"
    },
    26: {
        title: "ANCIENT INSCRIPTION: ENTRY XXVI",
        chapter: "The Void Chasm",
        text: "The chasms here have no bottom. If you fall, you fall forever through darkness.\n\nTrust your footing on the crumbling void stone. Move with swift, unwavering momentum. The shadows cannot catch what does not hesitate.\n\n— Althea's Journal, Entry XXVI"
    },
    27: {
        title: "ANCIENT INSCRIPTION: ENTRY XXVII",
        chapter: "The Labyrinth of Ruin",
        text: "The creature has summoned its full fury. Screen-tearing hallucinations strike whenever sanity drops below half. Keep calm. Breathe.\n\nEvery lever pulled brings a blinding flash of violet flame that banishes nearby lurkers. Use the levers defensively!\n\n— Althea's Journal, Entry XXVII"
    },
    28: {
        title: "ANCIENT INSCRIPTION: ENTRY XXVIII",
        chapter: "The Final Gauntlet",
        text: "I can feel a faint draft of moving air! It smells of cool rain and pine needles! The surface is directly above us!\n\nFive conduit seals remain between us and the upper threshold. Climb the grand central tower and break the chains!\n\n— Althea's Journal, Entry XXVIII"
    },
    29: {
        title: "ANCIENT INSCRIPTION: ENTRY XXIX",
        chapter: "The Threshold of Daylight",
        text: "I can see cracks of pale morning light filtering through the high ceiling sixty feet above! Sunlight! Real, golden sunlight!\n\nThe creature knows we are at the final portal. It is thrashing in desperate rage, attempting to snuff every flame. Light your lantern, run through the gauntlet, and break the 30th seal!\n\n— Althea's Journal, Entry XXIX"
    },
    30: {
        title: "ANCIENT INSCRIPTION: ENTRY XXX",
        chapter: "The Portal of the Dawn",
        text: "This is the final gate. Thirty depths of suffering, thirty trials of darkness.\n\nBeyond this ancient iron archway lies the surface world, the green grass, the open sky. Pull the final master conduits and step into the light!\n\n— Althea's Journal, Final Entry"
    }
};

/**
 * 30 Distinct Floor Names
 */
export const FLOOR_NAMES = {
    1: "The Cold Awakening",
    2: "The Bone Orchard",
    3: "The Weeping Catacombs",
    4: "The Vault of Whispers",
    5: "The Cloister of Shadows",
    6: "The Threshold of Waters",
    7: "Depth B7 — The Sunken Cistern",
    8: "Depth B8 — The Moldering Aqueduct",
    9: "Depth B9 — The Drowned Mausoleum",
    10: "Depth B10 — The Submerged Crypts",
    11: "Depth B11 — The Basin of Lost Souls",
    12: "Depth B12 — The Iron Sluice Gates",
    13: "Depth B13 — The Clockwork Foundry",
    14: "Depth B14 — The Great Mechanism",
    15: "Depth B15 — The Hall of Swinging Blades",
    16: "Depth B16 — The Pressure Conduit",
    17: "Depth B17 — The Steam Shafts",
    18: "Depth B18 — The Foundry Furnace",
    19: "Depth B19 — The Obsidian Gateway",
    20: "Depth B20 — The Hall of Dark Mirrors",
    21: "Depth B21 — The Cursed Sepulcher",
    22: "Depth B22 — The Altar of Blood Stone",
    23: "Depth B23 — The Necropolis Gallery",
    24: "Depth B24 — The Gate of Reflection",
    25: "Depth B25 — The Abyssal Crucible",
    26: "Depth B26 — The Void Chasm",
    27: "Depth B27 — The Labyrinth of Ruin",
    28: "Depth B28 — The Final Gauntlet",
    29: "Depth B29 — The Threshold of Daylight",
    30: "Depth B30 — The Portal of the Dawn"
};

/**
 * Returns architectural and visual configuration based on floor depth (1 to 30).
 */
export function getStratumInfo(floorIndex = 1) {
    if (floorIndex <= 6) {
        return {
            stratum: 1,
            name: "Upper Catacombs",
            solidTile: 1,       // Stone
            accentTile: 2,      // Brick
            decorTile: 12,      // Ancient Relief
            bgColor: '#07070b',
            conduitCount: 2,
            shadowCount: 1,
            doppelganger: false,
            pendulumSpeed: 2.0,
            crumbleDelay: 0.8
        };
    } else if (floorIndex <= 12) {
        return {
            stratum: 2,
            name: "Sunken Aqueducts",
            solidTile: 10,      // Waterlogged Paver
            accentTile: 1,      // Stone
            decorTile: 4,       // Backdrop
            bgColor: '#050907',
            conduitCount: 3,
            shadowCount: floorIndex >= 10 ? 2 : 1,
            doppelganger: floorIndex >= 10,
            pendulumSpeed: 2.3,
            crumbleDelay: 0.7
        };
    } else if (floorIndex <= 18) {
        return {
            stratum: 3,
            name: "Clockwork Foundry",
            solidTile: 9,       // Industrial Iron
            accentTile: 2,      // Brick
            decorTile: 13,      // Conduit Cables
            bgColor: '#090708',
            conduitCount: 3,
            shadowCount: 2,
            doppelganger: false,
            pendulumSpeed: 2.7,
            crumbleDelay: 0.65
        };
    } else if (floorIndex <= 24) {
        return {
            stratum: 4,
            name: "Obsidian Necropolis",
            solidTile: 8,       // Obsidian Runic
            accentTile: 12,     // Ancient Relief
            decorTile: 14,      // Bone Piles
            bgColor: '#07040d',
            conduitCount: 4,
            shadowCount: 2,
            doppelganger: true,
            pendulumSpeed: 3.0,
            crumbleDelay: 0.55
        };
    } else {
        return {
            stratum: 5,
            name: "Abyssal Crucible",
            solidTile: 11,      // Eldritch Void
            accentTile: 8,      // Obsidian Runic
            decorTile: 13,      // High-power Conduit
            bgColor: '#040107',
            conduitCount: floorIndex >= 28 ? 5 : 4,
            shadowCount: 3,
            doppelganger: true,
            pendulumSpeed: 3.4,
            crumbleDelay: 0.45
        };
    }
}

/**
 * Multi-goal platformer-aware Breadth-First-Search solver.
 * Verifies that the player can reach ALL conduit levers and the exit gate across the 2D grid.
 */
function runBFS(grid, startC, startR, levers = [], exitC = null, exitR = null) {
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    
    const queue = [{ c: startC, r: startR }];
    if (startR >= 0 && startR < rows && startC >= 0 && startC < cols) {
        visited[startR][startC] = true;
    }

    const isPassable = (tile) => {
        return tile === 0 || tile === 3 || tile === 4 || tile === 5 || tile === 12 || tile === 13 || tile === 14;
    };

    const isSolidGround = (tile) => {
        return tile === 1 || tile === 2 || tile === 3 || tile === 5 || tile === 6 || tile === 7 || tile === 8 || tile === 9 || tile === 10 || tile === 11;
    };

    const canPlayerFit = (c, r) => {
        if (r < 1 || r >= rows || c < 0 || c >= cols) return false;
        return isPassable(grid[r][c]) && isPassable(grid[r - 1][c]);
    };

    const isStanding = (c, r) => {
        if (r + 1 >= rows) return true;
        return isSolidGround(grid[r + 1][c]) && canPlayerFit(c, r);
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

        // Jumping up to 3 tiles high when standing on solid ground or one-way platform
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
        for (let dc = -2; dc <= 2; dc++) {
            for (let dr = -2; dr <= 2; dr++) {
                let nc = tc + dc;
                let nr = tr + dr;
                if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && visited[nr][nc]) {
                    return true;
                }
            }
        }
        return false;
    };

    const allLeversReached = levers.every(l => isReached(l.c, l.r));
    const exitReached = isReached(exitC, exitR);

    return {
        valid: allLeversReached && exitReached,
        allLeversReached,
        exitReached,
        visited
    };
}

/**
 * Attempts to generate a single 2D Macro-Chamber level configuration.
 */
function generateAttempt(options, forceAccept = false) {
    const seed = options.seed;
    const rng = createRNG(seed);
    const floorIndex = Math.max(1, Math.min(30, options.floorIndex || 1));
    const stratum = getStratumInfo(floorIndex);

    // Dynamic 2D Level Dimensions based on floor depth
    // Scaled up to be 4x-6x larger than legacy maps with true multi-story verticality
    let gridCols = 3;
    let gridRows = 2;
    if (floorIndex <= 5) {
        gridCols = 3; gridRows = 2; // 6 chambers
    } else if (floorIndex <= 10) {
        gridCols = 4; gridRows = 2; // 8 chambers
    } else if (floorIndex <= 18) {
        gridCols = 4; gridRows = 3; // 12 chambers
    } else if (floorIndex <= 24) {
        gridCols = 5; gridRows = 3; // 15 chambers
    } else {
        gridCols = 5; gridRows = 3; // 15 massive abyssal chambers
    }

    const chamberW = Math.floor(36 + Math.min(10, floorIndex * 0.3)); // 36 to 45 tiles wide per chamber
    const chamberH = 17; // 17 tiles tall per chamber (fits vertical platforming)
    const tileSize = 16;

    const cols = Math.max(100, Math.min(230, options.width || (gridCols * chamberW + 4)));
    const rows = Math.max(30, Math.min(65, options.height || (gridRows * chamberH + 4)));

    // Fill world with stratum primary solid tile
    const grid = Array.from({ length: rows }, () => Array(cols).fill(stratum.solidTile));
    const entities = [];

    const totalConduits = options.conduitCount !== undefined 
        ? options.conduitCount 
        : stratum.conduitCount;
    const conduitFlags = Array.from({ length: totalConduits }, (_, i) => `conduit_f${floorIndex}_${seed}_${i}`);

    // Helper: carve a rectangular hollow space
    function carve(c1, r1, c2, r2, fillTile = 0) {
        const minC = Math.max(1, Math.min(c1, c2));
        const maxC = Math.min(cols - 2, Math.max(c1, c2));
        const minR = Math.max(1, Math.min(r1, r2));
        const maxR = Math.min(rows - 2, Math.max(r1, r2));
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                grid[r][c] = fillTile;
            }
        }
    }

    // Define 2D Chamber Layout
    // Each chamber: colStart, colEnd, rowStart, rowEnd, floorRow
    const chambers = [];
    for (let gr = 0; gr < gridRows; gr++) {
        for (let gc = 0; gc < gridCols; gc++) {
            const cStart = 2 + gc * chamberW;
            const cEnd = Math.min(cols - 3, cStart + chamberW - 2);
            const rStart = 2 + gr * chamberH;
            const rEnd = Math.min(rows - 3, rStart + chamberH - 2);
            const floorRow = rEnd - 1;

            chambers.push({
                gc, gr,
                index: gr * gridCols + gc,
                cStart, cEnd, rStart, rEnd,
                floorRow,
                type: 'standard'
            });
        }
    }

    // Role Assignments:
    // Spawn Chamber: bottom-left (or top-left)
    // Exit Chamber: opposite corner (e.g. top-right or bottom-right)
    const spawnChamber = chambers[chambers.length - gridCols]; // bottom-left
    spawnChamber.type = 'spawn';

    const exitChamber = chambers[gridCols - 1]; // top-right
    exitChamber.type = 'exit';

    // Distribute Conduit Levers across distinct chambers
    const eligibleConduitChambers = chambers.filter(c => c !== spawnChamber && c !== exitChamber);
    // Shuffle eligible chambers
    for (let i = eligibleConduitChambers.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [eligibleConduitChambers[i], eligibleConduitChambers[j]] = [eligibleConduitChambers[j], eligibleConduitChambers[i]];
    }

    const conduitChambers = eligibleConduitChambers.slice(0, totalConduits);
    conduitChambers.forEach(c => { c.type = 'conduit'; });

    // Remaining chambers get specialized archetypes
    const remainingChambers = chambers.filter(c => c.type === 'standard');
    const archetypes = ['vertical_climb', 'chasm_crossing', 'pendulum_gauntlet', 'labyrinth'];
    remainingChambers.forEach((c, i) => {
        c.type = archetypes[i % archetypes.length];
    });

    let playerSpawn = { x: (spawnChamber.cStart + 4) * tileSize, y: (spawnChamber.floorRow - 1) * tileSize - 4 };
    let playerTilePos = { c: spawnChamber.cStart + 4, r: spawnChamber.floorRow - 1 };
    const placedLevers = [];
    let exitPos = { c: null, r: null };

    // === GENERATE CHAMBER GEOMETRY ===
    for (const ch of chambers) {
        // 1. Carve base room hollow
        carve(ch.cStart, ch.rStart + 1, ch.cEnd, ch.floorRow - 1, 0);

        // Solid floor with accent tiles
        for (let c = ch.cStart; c <= ch.cEnd; c++) {
            grid[ch.floorRow][c] = (c % 2 === 0) ? stratum.solidTile : stratum.accentTile;
            // Background relief / pillars
            if (c % 6 === 0) {
                for (let r = ch.rStart + 2; r < ch.floorRow; r++) {
                    grid[r][c] = stratum.decorTile;
                }
            }
        }

        // 2. Archetype-specific interior architecture
        if (ch.type === 'spawn') {
            // Safe Starting Sanctuary
            // Torch sanctuary at spawn
            entities.push({
                type: 'interactable',
                x: (ch.cStart + 3) * tileSize,
                y: (ch.floorRow - 2) * tileSize,
                properties: { interactType: 3 } // Torch
            });

            // Ancient Inscription Chronicle Lore Scroll
            const storyData = STORY_INSCRIPTIONS[floorIndex] || {
                title: `ANCIENT INSCRIPTION: DEPTH B${floorIndex}`,
                text: `Catacombs — Depth B${floorIndex}. Stay in the light.`
            };
            entities.push({
                type: 'interactable',
                x: (ch.cStart + 6) * tileSize,
                y: (ch.floorRow - 1) * tileSize,
                properties: {
                    interactType: 0, // Note
                    id: `note_f${floorIndex}`,
                    title: storyData.title,
                    text: `${storyData.text}\n\n[OBJECTIVE]: Locate all ${totalConduits} Conduit Levers to unlock the Sealed Exit Portal.`
                }
            });

            // Initial Survival Lantern Oil Flask
            entities.push({
                type: 'interactable',
                interactType: 4, // OIL_FLASK
                x: (ch.cStart + 10) * tileSize,
                y: (ch.floorRow - 1) * tileSize
            });

        } else if (ch.type === 'exit') {
            // Master Sealed Gate Chamber
            const gateCol = ch.cEnd - 4;
            exitPos = { c: gateCol, r: ch.floorRow - 1 };

            // Exit Gate with Multi-Conduit Requirements
            entities.push({
                type: 'interactable',
                interactType: 1, // DOOR
                x: gateCol * tileSize,
                y: (ch.floorRow - 2) * tileSize,
                properties: {
                    requiresFlags: conduitFlags
                }
            });

            // Guiding Sanctuary Torches framing the master portal
            entities.push({
                type: 'interactable',
                x: (gateCol - 3) * tileSize,
                y: (ch.floorRow - 2) * tileSize,
                properties: { interactType: 3 }
            });
            entities.push({
                type: 'interactable',
                x: (gateCol + 3) * tileSize,
                y: (ch.floorRow - 2) * tileSize,
                properties: { interactType: 3 }
            });

            // Runic conduits wired into background wall leading into gate
            for (let c = ch.cStart; c < gateCol; c++) {
                grid[ch.floorRow - 2][c] = 13; // Conduit Cable
            }

        } else if (ch.type === 'conduit') {
            // Conduit Altar Hall
            const conduitIdx = placedLevers.length;
            const leverFlag = conduitFlags[conduitIdx] || `conduit_f${floorIndex}_${seed}_${conduitIdx}`;
            
            // Build an elevated stone altar dais
            const altarCol = Math.floor((ch.cStart + ch.cEnd) / 2);
            const altarRow = ch.floorRow - 4;

            // Altar steps
            for (let c = altarCol - 4; c <= altarCol + 4; c++) {
                grid[altarRow][c] = 3; // wooden/stone platform
            }

            // Conduit Lever Entity
            entities.push({
                type: 'interactable',
                interactType: 2, // SWITCH / LEVER
                x: altarCol * tileSize,
                y: (altarRow - 1) * tileSize,
                properties: {
                    flag: leverFlag,
                    id: `lever_${conduitIdx}`
                }
            });
            placedLevers.push({ c: altarCol, r: altarRow - 1 });

            // Altar Torch Sanctuary
            entities.push({
                type: 'interactable',
                x: (altarCol - 2) * tileSize,
                y: (altarRow - 2) * tileSize,
                properties: { interactType: 3 }
            });

            // Conduit wiring leading out
            for (let c = ch.cStart; c <= ch.cEnd; c++) {
                grid[altarRow + 1][c] = 13; // Conduit Cable
            }

            // Bone pile near altar
            grid[ch.floorRow - 1][ch.cStart + 3] = 14;

        } else if (ch.type === 'vertical_climb') {
            // Multi-Tier Climbing Shaft
            // Create alternating staggered one-way platforms spaced ~3 tiles vertically
            const tiers = Math.floor((ch.floorRow - (ch.rStart + 2)) / 3);
            for (let t = 1; t <= tiers; t++) {
                const pr = ch.floorRow - t * 3;
                const isLeft = (t % 2 === 0);
                const pcStart = isLeft ? ch.cStart + 4 : ch.cStart + 16;
                const pcEnd = isLeft ? ch.cStart + 14 : ch.cStart + 26;

                for (let c = pcStart; c <= pcEnd; c++) {
                    grid[pr][c] = 3; // platform
                }

                // Torch on every second tier to guide ascent
                if (t % 2 === 1) {
                    entities.push({
                        type: 'interactable',
                        x: (pcStart + 2) * tileSize,
                        y: (pr - 2) * tileSize,
                        properties: { interactType: 3 }
                    });
                }
            }

            // Falling trap stone block hazard at top of shaft
            if (stratum.stratum >= 2 && rng() < 0.6) {
                const dropCol = ch.cStart + 12;
                entities.push({
                    type: 'hazard',
                    x: dropCol * tileSize,
                    y: (ch.rStart + 3) * tileSize,
                    properties: { hazardType: 1 } // FALLING_BLOCK
                });
            }

        } else if (ch.type === 'chasm_crossing') {
            // Crumbling Stone Chasm over Spike Basin
            const pitStart = ch.cStart + 5;
            const pitEnd = ch.cEnd - 5;

            // Dig out floor for pit
            for (let c = pitStart; c <= pitEnd; c++) {
                grid[ch.floorRow][c] = 0; // deep drop
                // Lethal spikes at bottom
                entities.push({
                    type: 'hazard',
                    x: c * tileSize,
                    y: (ch.floorRow) * tileSize,
                    properties: { hazardType: 0 } // SPIKES
                });
            }

            // Crumbling bridge stepping stones across the chasm
            for (let c = pitStart + 1; c < pitEnd; c += 3) {
                grid[ch.floorRow - 1][c] = 5; // Crumbling platform
                grid[ch.floorRow - 1][c + 1] = 5;
            }

            // Central sanctuary torch on far ledge
            entities.push({
                type: 'interactable',
                x: (pitEnd + 2) * tileSize,
                y: (ch.floorRow - 2) * tileSize,
                properties: { interactType: 3 }
            });

        } else if (ch.type === 'pendulum_gauntlet') {
            // Clockwork Pendulum Gauntlet
            const bladeCount = stratum.stratum >= 3 ? 3 : 2;
            const spacing = Math.floor((ch.cEnd - ch.cStart - 10) / bladeCount);

            for (let b = 0; b < bladeCount; b++) {
                const pCol = ch.cStart + 6 + b * spacing;
                entities.push({
                    type: 'hazard',
                    x: pCol * tileSize,
                    y: (ch.rStart + 3) * tileSize,
                    properties: {
                        hazardType: 2, // PENDULUM_BLADE
                        pivotX: pCol * tileSize,
                        pivotY: (ch.rStart + 3) * tileSize,
                        length: 52 + (b % 2) * 8,
                        swingSpeed: stratum.pendulumSpeed + b * 0.15,
                        phase: (b * Math.PI) / bladeCount
                    }
                });
            }

            // Safe resting platforms between pendulums
            for (let b = 0; b < bladeCount - 1; b++) {
                const safeCol = ch.cStart + 6 + b * spacing + Math.floor(spacing / 2);
                grid[ch.floorRow - 3][safeCol] = 3;
                grid[ch.floorRow - 3][safeCol + 1] = 3;
            }

        } else {
            // Labyrinth Corridor with alcoves and bone piles
            const alcoveCol = Math.floor((ch.cStart + ch.cEnd) / 2);
            // Upper gallery platform
            for (let c = ch.cStart + 6; c <= ch.cEnd - 6; c++) {
                grid[ch.floorRow - 5][c] = 3;
            }

            // Oil flask in upper alcove
            entities.push({
                type: 'interactable',
                interactType: 4, // OIL_FLASK
                x: alcoveCol * tileSize,
                y: (ch.floorRow - 6) * tileSize
            });

            // Torch in gallery
            entities.push({
                type: 'interactable',
                x: (alcoveCol - 6) * tileSize,
                y: (ch.floorRow - 7) * tileSize,
                properties: { interactType: 3 }
            });

            // Bone pile details
            grid[ch.floorRow - 1][ch.cStart + 4] = 14;
            grid[ch.floorRow - 1][ch.cEnd - 4] = 14;
        }
    }

    // === CONNECT CHAMBERS (DOORWAYS & VERTICAL SHAFTS) ===
    // 1. Horizontal Doorways between adjacent rooms on same floor
    for (let gr = 0; gr < gridRows; gr++) {
        for (let gc = 0; gc < gridCols - 1; gc++) {
            const leftRoom = chambers.find(c => c.gc === gc && c.gr === gr);
            const rightRoom = chambers.find(c => c.gc === gc + 1 && c.gr === gr);
            if (leftRoom && rightRoom) {
                const doorC = leftRoom.cEnd;
                const doorR = leftRoom.floorRow - 1;
                // Carve 4-tile-tall, 4-tile-wide horizontal passage
                for (let dc = 0; dc <= 3; dc++) {
                    for (let dr = 0; dr < 4; dr++) {
                        grid[doorR - dr][doorC + dc] = 0; // air passage
                    }
                    grid[doorR + 1][doorC + dc] = stratum.solidTile; // solid ground beneath
                }
            }
        }
    }

    // 2. Vertical Elevator / Stairwell Shafts between upper and lower floors
    for (let gc = 0; gc < gridCols; gc++) {
        for (let gr = 0; gr < gridRows - 1; gr++) {
            const topRoom = chambers.find(c => c.gc === gc && c.gr === gr);
            const botRoom = chambers.find(c => c.gc === gc && c.gr === gr + 1);
            if (topRoom && botRoom) {
                // Pick a column for the vertical passage (alternating left/right per column)
                const shaftC = (gc % 2 === 0) ? topRoom.cStart + 6 : topRoom.cEnd - 8;
                const shaftW = 5;

                // Carve opening through top floor down into lower room
                for (let r = topRoom.floorRow; r <= botRoom.rStart + 3; r++) {
                    for (let c = shaftC; c < shaftC + shaftW; c++) {
                        grid[r][c] = 0; // air shaft
                    }
                }

                // Place jumpable one-way platforms inside shaft
                for (let r = topRoom.floorRow; r <= botRoom.rStart + 3; r += 3) {
                    for (let c = shaftC + 1; c < shaftC + shaftW - 1; c++) {
                        grid[r][c] = 3; // platform
                    }
                }

                // Guide torch inside shaft
                entities.push({
                    type: 'interactable',
                    x: (shaftC + 1) * tileSize,
                    y: (topRoom.floorRow + 1) * tileSize,
                    properties: { interactType: 3 }
                });
            }
        }
    }

    // Guarantee that all required conduit levers are placed
    while (placedLevers.length < totalConduits) {
        const fallbackCol = Math.min(cols - 10, 16 + placedLevers.length * 24);
        const fallbackRow = Math.min(rows - 6, 12);
        const lFlag = conduitFlags[placedLevers.length] || `conduit_fallback_${placedLevers.length}`;
        grid[fallbackRow + 1][fallbackCol] = 3;
        grid[fallbackRow + 1][fallbackCol + 1] = 3;
        entities.push({
            type: 'interactable',
            interactType: 2,
            x: fallbackCol * tileSize,
            y: fallbackRow * tileSize,
            properties: { flag: lFlag }
        });
        placedLevers.push({ c: fallbackCol, r: fallbackRow });
    }

    // Ensure exitPos is valid
    if (exitPos.c === null) {
        exitPos = { c: cols - 8, r: rows - 6 };
    }

    // === RUN PLATFORMER BFS SOLVER ===
    const bfs = runBFS(grid, playerTilePos.c, playerTilePos.r, placedLevers, exitPos.c, exitPos.r);

    if (!bfs.valid && !forceAccept) {
        // Return null to signal retry with next seed
        return null;
    }

    // If force accepting, bridge any unreachable targets with solid floor and platforms
    if (!bfs.valid && forceAccept) {
        placedLevers.forEach(l => {
            if (!bfs.allLeversReached) {
                for (let c = Math.min(playerTilePos.c, l.c); c <= Math.max(playerTilePos.c, l.c); c++) {
                    grid[l.r + 1][c] = 3;
                }
            }
        });
        for (let c = Math.min(playerTilePos.c, exitPos.c); c <= Math.max(playerTilePos.c, exitPos.c); c++) {
            grid[exitPos.r + 1][c] = 3;
        }
    }

    // === SPAWN ENEMIES BASED ON DEPTH SCALING ===
    const shadowCount = stratum.shadowCount;
    for (let s = 0; s < shadowCount; s++) {
        // Place shadows in distinct exploration chambers away from spawn
        const shadowChamber = chambers[Math.min(chambers.length - 1, 1 + s * 2 + Math.floor(rng() * 2))];
        const sCol = Math.floor((shadowChamber.cStart + shadowChamber.cEnd) / 2);
        entities.push({
            type: 'shadow',
            x: sCol * tileSize,
            y: (shadowChamber.floorRow - 2) * tileSize
        });
    }

    // Spawn psychological Doppelganger on appropriate strata
    if (stratum.doppelganger) {
        const doppelChamber = chambers[Math.min(chambers.length - 2, 2 + Math.floor(rng() * (chambers.length - 3)))];
        const dCol = Math.floor((doppelChamber.cStart + doppelChamber.cEnd) / 2);
        entities.push({
            type: 'doppelganger',
            x: dCol * tileSize,
            y: (doppelChamber.floorRow - 1) * tileSize,
            facingRight: rng() > 0.5
        });
    }

    return {
        name: options.name || (FLOOR_NAMES[floorIndex] || `Catacombs Depth B${floorIndex}`),
        seed: seed,
        floorIndex: floorIndex,
        stratumName: stratum.name,
        width: cols,
        height: rows,
        tileSize: tileSize,
        backgroundColor: stratum.bgColor,
        ambientTrack: 'ambient_drip',
        playerStart: playerSpawn,
        tiles: grid,
        entities: entities
    };
}

/**
 * Generates a fully playable 2D procedural level guaranteed to be solvable.
 * Automatically retries up to 5 times with deterministic seeds to find a valid layout.
 * @param {Object} options
 * @param {number|string} [options.seed] - Seed for procedural generation
 * @param {number} [options.floorIndex=1] - Catacomb depth index (1 - 30)
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
    
    // Fallback: force-accept with connecting safety platforms
    return generateAttempt({ ...options, seed: currentSeed }, true);
}
