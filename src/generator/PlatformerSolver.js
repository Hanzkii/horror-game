/**
 * Realistic 2D Platformer Reachability Solver
 * Simulates physical player movement: walking, dropping through platforms, falling, and jumping.
 */
export function solvePlatformerReachability(grid, startC, startR, levers = [], exitC = null, exitR = null) {
    const rows = grid.length;
    const cols = grid[0].length;

    const isSolid = (tile) => {
        return tile === 1 || tile === 2 || tile === 6 || tile === 7 || tile === 8 || tile === 9 || tile === 10 || tile === 11;
    };

    const isPlatform = (tile) => {
        return tile === 3 || tile === 5;
    };

    const isPassable = (tile) => {
        // Air, platform, backdrop, and decorative tiles are passable
        return tile === 0 || tile === 3 || tile === 4 || tile === 5 || tile === 12 || tile === 13 || tile === 14;
    };

    // Player needs 2 tiles of height clearance: (c, r) and (c, r - 1)
    const canStandAt = (c, r) => {
        if (c < 0 || c >= cols || r < 1 || r >= rows - 1) return false;
        // Body space must be passable
        if (!isPassable(grid[r][c]) || !isPassable(grid[r - 1][c])) return false;
        // Floor below feet must be solid or platform
        const below = grid[r + 1][c];
        return isSolid(below) || isPlatform(below);
    };

    // Find nearest valid standing position to start
    let realStartC = startC;
    let realStartR = startR;
    if (!canStandAt(realStartC, realStartR)) {
        // Search downwards or adjacent
        let found = false;
        for (let dr = 0; dr <= 4 && !found; dr++) {
            for (let dc = -2; dc <= 2 && !found; dc++) {
                if (canStandAt(startC + dc, startR + dr)) {
                    realStartC = startC + dc;
                    realStartR = startR + dr;
                    found = true;
                }
            }
        }
    }

    const standingVisited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [];

    if (canStandAt(realStartC, realStartR)) {
        standingVisited[realStartR][realStartC] = true;
        queue.push({ c: realStartC, r: realStartR });
    }

    // Helper: find landing row if falling straight down from (c, r)
    const findFallLanding = (c, r) => {
        for (let fallR = r + 1; fallR < rows - 1; fallR++) {
            if (!isPassable(grid[fallR][c]) && !isPlatform(grid[fallR][c])) {
                // Hit solid wall without landing space
                return null;
            }
            if (canStandAt(c, fallR)) {
                return fallR;
            }
        }
        return null;
    };

    while (queue.length > 0) {
        const { c, r } = queue.shift();

        const addStanding = (nc, nr) => {
            if (nc >= 0 && nc < cols && nr >= 1 && nr < rows && canStandAt(nc, nr)) {
                if (!standingVisited[nr][nc]) {
                    standingVisited[nr][nc] = true;
                    queue.push({ c: nc, r: nr });
                }
            }
        };

        // 1. Walk Left & Right
        for (const dir of [-1, 1]) {
            const nextC = c + dir;
            if (nextC < 0 || nextC >= cols) continue;

            // Same level walk
            if (canStandAt(nextC, r)) {
                addStanding(nextC, r);
            }
            // Step up 1 tile (stairs / small ledge)
            else if (r > 1 && canStandAt(nextC, r - 1) && isPassable(grid[r - 2][c])) {
                addStanding(nextC, r - 1);
            }
            // Walk off ledge and fall
            else if (isPassable(grid[r][nextC]) && isPassable(grid[r - 1][nextC])) {
                const landR = findFallLanding(nextC, r);
                if (landR !== null) {
                    addStanding(nextC, landR);
                }
            }
        }

        // 2. Drop Down through one-way platform
        if (isPlatform(grid[r + 1][c])) {
            const dropLanding = findFallLanding(c, r + 1);
            if (dropLanding !== null) {
                addStanding(c, dropLanding);
            }
        }

        // 3. Jump (up to 3 tiles high, reaching out up to 3 tiles horizontally)
        // Jump reach envelope:
        // dy = -3 -> dx = [-2, 2]
        // dy = -2 -> dx = [-3, 3]
        // dy = -1 -> dx = [-3, 3]
        // dy = 0  -> dx = [-4, 4] (gap leap)
        const jumpMoves = [
            // Up 3 tiles
            { dy: -3, dxs: [-2, -1, 0, 1, 2] },
            // Up 2 tiles
            { dy: -2, dxs: [-3, -2, -1, 0, 1, 2, 3] },
            // Up 1 tile
            { dy: -1, dxs: [-3, -2, -1, 0, 1, 2, 3] },
            // Flat leap across chasm
            { dy: 0, dxs: [-4, -3, -2, 2, 3, 4] },
            // Downward leap across gap
            { dy: 1, dxs: [-4, -3, -2, 2, 3, 4] },
            { dy: 2, dxs: [-4, -3, -2, 2, 3, 4] }
        ];

        for (const { dy, dxs } of jumpMoves) {
            const targetR = r + dy;
            if (targetR < 1 || targetR >= rows - 1) continue;

            for (const dx of dxs) {
                const targetC = c + dx;
                if (targetC < 0 || targetC >= cols) continue;

                // Check clearance: trajectory peak must be passable
                const peakR = Math.min(r - 1, targetR - 1);
                if (peakR >= 0 && !isPassable(grid[peakR][c])) continue;

                if (canStandAt(targetC, targetR)) {
                    addStanding(targetC, targetR);
                } else if (isPassable(grid[targetR][targetC]) && isPassable(grid[targetR - 1][targetC])) {
                    // Jumped over gap and landed lower
                    const landR = findFallLanding(targetC, targetR);
                    if (landR !== null) {
                        addStanding(targetC, landR);
                    }
                }
            }
        }
    }

    // Check interaction reach to targets (player can interact within 2 tiles of standing position)
    const isTargetReachable = (tc, tr) => {
        if (tc === null || tr === null) return true;
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const sc = tc + dc;
                const sr = tr + dr;
                if (sc >= 0 && sc < cols && sr >= 0 && sr < rows && standingVisited[sr][sc]) {
                    return true;
                }
            }
        }
        return false;
    };

    const reachedLevers = levers.map(l => ({ ...l, reachable: isTargetReachable(l.c, l.r) }));
    const allLeversReached = reachedLevers.every(l => l.reachable);
    const exitReached = isTargetReachable(exitC, exitR);

    let totalStandingReached = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (standingVisited[r][c]) totalStandingReached++;
        }
    }

    return {
        valid: allLeversReached && exitReached && totalStandingReached > 20,
        allLeversReached,
        exitReached,
        reachedLevers,
        totalStandingReached,
        standingVisited
    };
}
