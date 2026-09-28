/**
 * @file SurfaceFinale.js
 * @description The peaceful surface world and finale environment: "A New Dawn"
 * Features rolling green hills, open morning sky, a tranquil birch tree overlook,
 * and the threshold for the climactic sequel twist.
 */

export const SurfaceFinale = {
    name: "The Surface — A New Dawn",
    width: 72,
    height: 18,
    tileSize: 16,
    backgroundColor: '#6ba5d6', // Morning sky blue
    ambientTrack: null,
    
    playerStart: { x: 48, y: 196 }, // Emerging from cave entrance at col 3, row 12

    get tiles() {
        const rows = 18;
        const cols = 72;
        const grid = Array.from({ length: rows }, () => Array(cols).fill(0)); // Start with open air

        // 1. Cave mouth opening on the far left (cols 0 to 6)
        // Solid rock ceiling over the tunnel exit
        for (let c = 0; c <= 6; c++) {
            for (let r = 0; r <= 10; r++) {
                grid[r][c] = 1; // Solid cavern rock
            }
            grid[14][c] = 1; // Stone floor
            grid[15][c] = 1;
            grid[16][c] = 1;
            grid[17][c] = 1;
        }
        // Tunnel portal opening (rows 11-13 air)

        // 2. Rolling Grassy Surface (cols 7 to 71)
        for (let c = 7; c < cols; c++) {
            // Gentle hill slope: rises slightly between col 25 and 45
            let surfaceRow = 14;
            if (c >= 28 && c <= 48) {
                surfaceRow = 13; // Hillcrest plateau
            } else if (c > 48) {
                surfaceRow = 13; // Overlook bluff
            }

            // Grass surface layer
            grid[surfaceRow][c] = 6; // SURFACE_GRASS

            // Deep dirt layers beneath
            for (let r = surfaceRow + 1; r < rows; r++) {
                grid[r][c] = 7; // SURFACE_DIRT
            }
        }

        return grid;
    },

    entities: [
        // Solitary birch tree near the overlook cliff edge (col 56)
        {
            type: 'interactable',
            x: 56 * 16,
            y: 13 * 16,
            properties: {
                interactType: -1, // Scenic landmark (custom render)
                isBirchTree: true
            }
        }
    ]
};

export default SurfaceFinale;
