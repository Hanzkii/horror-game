export const Level1 = {
    name: 'The Awakening',
    width: 60,
    height: 17,
    tileSize: 16,
    backgroundColor: '#0a0a0f',
    ambientTrack: 'ambient_drip',
    
    playerStart: { x: 32, y: 160 }, // Will be positioned in the small room
    
    // 60x17 tiles array
    // 0 = air, 1 = solid_stone, 2 = solid_brick, 3 = platform, 4 = background
    get tiles() {
        const t = [];
        for (let r = 0; r < 17; r++) {
            const row = [];
            for (let c = 0; c < 60; c++) {
                // Default border walls
                if (r === 0 || r === 16 || c === 0 || c === 59) {
                    row.push(1);
                    continue;
                }
                
                // Starting room (c: 1 to 10, r: 8 to 15)
                if (c < 10) {
                    if (r === 11) row.push(1); // floor
                    else if (r > 11) row.push(1); // solid ground
                    else if (r < 7) row.push(1); // low ceiling
                    else row.push(4); // bg detail
                }
                // Narrow corridor (c: 10 to 20, r: 8 to 11)
                else if (c < 20) {
                    if (r === 11) row.push(1);
                    else if (r > 11) row.push(1);
                    else if (r < 8) row.push(1); // lower ceiling
                    else row.push(4);
                }
                // Vertical shaft (c: 20 to 25)
                else if (c < 25) {
                    if (c === 20 && r > 5 && r < 11) row.push(1); // left wall of shaft
                    else if (r === 15) row.push(1); // deep floor
                    else if (r > 15) row.push(1);
                    else if (c === 22 && r % 3 === 0 && r > 5) row.push(3); // platforms to climb
                    else row.push(0); // open air
                }
                // Upper corridor after shaft (c: 25 to 35, r: 5 to 10)
                else if (c < 35) {
                    if (r === 9) row.push(1);
                    else if (r > 9) row.push(1);
                    else if (r < 4) row.push(1);
                    else row.push(4);
                }
                // Spike room (c: 35 to 45)
                else if (c < 45) {
                    if (r === 13) row.push(1); // low floor
                    else if (r > 13) row.push(1);
                    else if (r < 4) row.push(1);
                    else if (c > 37 && c < 42 && r === 9) row.push(3); // floating platforms over spikes
                    else row.push(0);
                }
                // Long dark corridor (c: 45 to 58)
                else {
                    if (r === 13) row.push(2); // brick floor
                    else if (r > 13) row.push(1);
                    else if (r < 8) row.push(1); // ceiling
                    else row.push(0);
                }
            }
            t.push(row);
        }
        return t;
    },
    
    entities: [
        { type: 'interactable', x: 80, y: 160, properties: { interactType: 0, text: "I can't remember how I got here...", id: "note_1" } },
        { type: 'hazard', x: 600, y: 192, properties: { hazardType: 0, width: 64, height: 16 } }, // Spikes in the spike room
        { type: 'hazard', x: 280, y: 80, properties: { hazardType: 1, width: 16, height: 16 } }, // Falling block in upper corridor
        { type: 'shadow', x: 850, y: 176 }, // Shadow figure in the long dark corridor
        { type: 'interactable', x: 910, y: 208, properties: { interactType: 1, targetScene: 'Level2' } } // End door
    ]
};
