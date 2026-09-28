import { generateProceduralLevel, getStratumInfo, FLOOR_NAMES, STORY_INSCRIPTIONS } from './src/generator/LevelGenerator.js';

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

    const isValid = level && 
                    level.tiles.length === level.height &&
                    level.tiles[0].length === level.width &&
                    hasName && 
                    hasLore && 
                    door && 
                    levers.length >= reqFlags.length &&
                    torches.length >= 2 &&
                    shadows.length >= 1;

    if (isValid) {
        passedTests++;
        console.log(`[PASS] Floor ${String(floor).padStart(2, ' ')}: ${level.name} | Stratum ${stratum.stratum} (${stratum.name}) | Size: ${level.width}x${level.height} | Conduits: ${reqFlags.length} | Shadows: ${shadows.length}`);
    } else {
        failedTests++;
        console.error(`[FAIL] Floor ${floor} failed validation!`, {
            levelName: level?.name,
            dimensions: `${level?.width}x${level?.height}`,
            doorFound: Boolean(door),
            conduitsRequired: reqFlags.length,
            leversPlaced: levers.length
        });
    }
}

console.log("\n=================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} FLOORS PASSED VALIDATION`);
console.log("=================================================");

if (failedTests > 0) {
    process.exit(1);
}
