# ECHO — 2D Psychological Horror Platformer

A browser-based psychological horror platformer built from scratch with a custom HTML5 Canvas & Web Audio API engine.

## Overview

- **Genre**: Psychological horror platformer
- **Engine**: Custom vanilla JavaScript engine (zero dependencies)
- **Art Style**: Dark, claustrophobic pixel aesthetic with dynamic lighting
- **Atmosphere**: Procedural Web Audio API soundscape (drones, footsteps, echoes, dissonance) & dynamic sanity distortion
- **Level Generation**: Integrated procedural dungeon architect and live visual tile/entity editor

## Controls

| Key | Action |
| --- | --- |
| `A` / `D` or `Left` / `Right` | Move Left / Right |
| `Space` / `W` / `Up` | Jump (hold for variable height) |
| `E` | Interact (read notes, unlock doors) |
| `Escape` | Pause / Dismiss note |
| `Tab` or Top-Right Button | **Toggle Level Architect / Editor** |

## Play the Game

Because the engine uses ES6 modules, start any local HTTP server:

```bash
# Using Python:
python -m http.server 8000
```

Then open `http://localhost:8000` in your web browser. Click or press any key to awaken into the dungeon.

---

## 🛠️ Level Architect: Procedural Generator & Editor

Press **`Tab`** or click **`🛠️ LEVEL ARCHITECT`** in the top-right corner to open the in-game editor:

### 1. Procedural Level Generator
- **Deterministic Seeds**: Enter any numeric seed or click `🎲 Randomize` to produce identical or unique labyrinth layouts.
- **Tunable Parameters**:
  - **Chambers**: 3 to 8 interconnected architectural chambers.
  - **Hazard Danger**: Control the density of spikes and falling ceiling stones (0% - 100%).
  - **Verticality**: Adjust the frequency of vertical climbing shafts and one-way platforms (0% - 100%).
  - **Shadow Stalkers**: Set the number of stalking horror entities (0 - 3).
- **Guaranteed Solvability**: The generator ensures step heights never exceed jump limits and places one-way platforms to climb vertical gaps.

### 2. Live Canvas Painting & Editing
- **Tile Palette**: Paint Stone (1), Ancient Brick (2), One-way Platforms (3), and Background Pillars (4) with the mouse.
- **Entity Placement**: Position Player Spawns, Spikes, Falling Traps, Lore Notes, Shadows, and Exit Doors.
- **Controls**:
  - **Left-Click**: Paint selected tile / place entity.
  - **Right-Click & Drag** (or **Alt+Click**): Pan the editor camera across the map.
  - **[▶ TEST LEVEL]**: Instantly jump straight into gameplay testing your level!
- **Presets**: Quick-load "The Awakening" (handcrafted map), "The Crypt" (procedural), or "The Gauntlet" (high hazard).

---

## Architecture

```
horror-game/
├── index.html                   # HTML shell, title overlay, responsive pixel canvas
├── README.md
└── src/
    ├── main.js                  # Engine bootstrap, main loop, procedural audio synthesizer
    ├── editor/
    │   └── LevelEditor.js       # Visual level editor, tile palette, entity spawner, live testing
    ├── generator/
    │   └── LevelGenerator.js    # Procedural dungeon generator with PRNG and reachability validation
    ├── effects/
    │   └── PostProcessing.js    # Radial player lighting, vignette, scanlines, sanity distortion
    ├── engine/
    │   ├── AudioManager.js      # Web Audio bus system (master, music, SFX) & spatial audio
    │   ├── Entity.js            # Base game entity with AABB collision and physics
    │   ├── Game.js              # Fixed-timestep loop (60 FPS) and state machine
    │   ├── Input.js             # Rebindable keyboard handler with frame-state tracking
    │   ├── Renderer.js          # Offscreen buffer, world bounds camera clamping, screen shake
    │   └── Scene.js             # Tilemap collisions, entity lifecycle, depth rendering
    ├── entities/
    │   ├── Hazard.js            # Spikes and triggered falling blocks
    │   ├── Interactable.js      # Notes, doors, switches
    │   ├── Player.js            # Smooth platformer physics, separated-axis collision, coyote time
    │   └── Shadow.js            # Dynamic horror entity that stalks and vanishes
    ├── game/
    │   └── GameState.js         # Health, sanity tracking, note log, localStorage persistence
    ├── levels/
    │   └── Level1.js            # "The Awakening" (handcrafted 75x20 stone/brick dungeon)
    └── ui/
        └── HUD.js               # Sanity vignette warning, interaction prompts, note overlay
```
