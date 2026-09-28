import { generateProceduralLevel, getStratumInfo, FLOOR_NAMES, STORY_INSCRIPTIONS } from './src/generator/LevelGenerator.js';
import { solvePlatformerReachability } from './src/generator/PlatformerSolver.js';

console.log("=================================================");
console.log("TESTING 30-FLOOR CAMPAIGN LEVEL GENERATION SUITE");
console.log("=================================================\n");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (let floor = 1; floor <= 30; floor++) {
    totalTests++;
    const seed = 1000 + floor * 37;
    const level = generateProceduralLevel({ floorIndex: floor, seed: seed });

    const stratum = getStratumInfo(floor);
    const hasName = Boolean(FLOOR_NAMES[floor]);
    const hasLore = Boolean(STORY_INSCRIPTIONS[floor]);
    
    // Check conduits
    const door = level.entities.find(e => e.type === 'interactable' && (e.interactType === 1 || e.properties?.requiresFlags));
    const reqFlags = door?.properties?.requiresFlags || [];
    const levers = level.entities.filter(e => e.type === 'interactable' && (e.interactType === 2 || e.properties?.flag));
    const torches = level.entities.filter(e => e.type === 'interactable' && (e.properties?.interactType === 3 || e.interactType === 3));
    const flasks = level.entities.filter(e => e.type === 'interactable' && e.interactType === 4);
    const shadows = level.entities.filter(e => e.type === 'shadow');

    // Run platformer reachability solver
    const solverLevers = levers.map(l => ({ c: Math.floor(l.x / 16), r: Math.floor(l.y / 16) }));
    const doorTile = door ? { c: Math.floor(door.x / 16), r: Math.floor(door.y / 16) } : { c: null, r: null };
    const spawnC = Math.floor(level.playerStart.x / 16);
    const spawnR = Math.floor(level.playerStart.y / 16);
    const reachability = solvePlatformerReachability(level.tiles, spawnC, spawnR, solverLevers, doorTile.c, doorTile.r);

    const isValid = level && 
                    level.tiles.length === level.height &&
                    level.tiles[0].length === level.width &&
                    hasName && 
                    hasLore && 
                    door && 
                    levers.length >= reqFlags.length &&
                    torches.length >= 2 &&
                    shadows.length >= 1 &&
                    reachability.valid;

    if (isValid) {
        passedTests++;
        console.log(`[PASS] Floor ${String(floor).padStart(2, ' ')}: ${level.name} | Stratum ${stratum.stratum} (${stratum.name}) | Size: ${level.width}x${level.height} | Conduits: ${reqFlags.length} | Solvable: YES (${reachability.totalStandingReached} surfaces)`);
    } else {
        failedTests++;
        console.error(`[FAIL] Floor ${floor} failed validation!`, {
            levelName: level?.name,
            dimensions: `${level?.width}x${level?.height}`,
            doorFound: Boolean(door),
            conduitsRequired: reqFlags.length,
            leversPlaced: levers.length,
            reachability: {
                allLeversReached: reachability.allLeversReached,
                exitReached: reachability.exitReached,
                surfaces: reachability.totalStandingReached
            }
        });
    }
}

console.log("\n=================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} FLOORS PASSED VALIDATION`);
console.log("=================================================");

if (failedTests > 0) {
    process.exit(1);
}
