# ECHO — 2D Psychological Horror Platformer

A browser-based psychological horror platformer built from scratch with a custom HTML5 Canvas & Web Audio API engine.

## Overview

- **Genre**: Psychological horror platformer
- **Engine**: Custom vanilla JavaScript engine (zero dependencies)
- **Art Style**: Dark, claustrophobic pixel aesthetic with dynamic lighting
- **Atmosphere**: Procedural Web Audio API soundscape (drones, footsteps, echoes, dissonance) & dynamic sanity distortion

## Controls

| Key | Action |
| --- | --- |
| `A` / `D` or `Left` / `Right` | Move Left / Right |
| `Space` / `W` / `Up` | Jump (hold for higher jump) |
| `E` | Interact (read notes, inspect doors) |
| `Escape` | Pause / Dismiss note |

## Play the Prototype

Because the engine uses ES6 modules, it needs to be served via any local HTTP server:

```bash
# Using Python:
python -m http.server 8000
```

Then open `http://localhost:8000` in your web browser. Click or press any key on the title overlay to awaken and start audio playback.

## Architecture

```
horror-game/
├── index.html                   # HTML shell, title overlay, responsive pixel canvas
├── README.md
└── src/
    ├── main.js                  # Engine bootstrap, main loop, procedural audio generator
    ├── effects/
    │   └── PostProcessing.js    # Radial player lighting, vignette, scanlines, sanity distortion
    ├── engine/
    │   ├── AudioManager.js      # Web Audio bus system (master, music, SFX) & spatial audio
    │   ├── Entity.js            # Base game entity with AABB collision and physics
    │   ├── Game.js              # Fixed-timestep loop (60 FPS) and state machine
    │   ├── Input.js             # Rebindable keyboard handler with frame-state tracking
    │   ├── Renderer.js          # Offscreen buffer, pixel scaling, lerping camera, screen shake
    │   └── Scene.js             # Tilemap collisions, entity lifecycle, depth rendering
    ├── entities/
    │   ├── Hazard.js            # Spikes and triggered falling blocks
    │   ├── Interactable.js      # Notes, doors, switches
    │   ├── Player.js            # Smooth platformer physics, wall sliding, breathing light
    │   └── Shadow.js            # Dynamic horror entity that stalks and vanishes
    ├── game/
    │   └── GameState.js         # Health, sanity tracking, note log, localStorage persistence
    ├── levels/
    │   └── Level1.js            # "The Awakening" (60x17 tilemap, corridors, shafts, hazards)
    └── ui/
        └── HUD.js               # Sanity vignette warning, interaction prompts, note overlay
```

## Level 1 Features
- **Exploration**: Narrow claustrophobic corridors, a climbing shaft, and a hazardous spike room.
- **Dynamic Sanity**: Being stalked by the Shadow drains your sanity, introducing visual noise and bloody vignetting.
- **Procedural Sound**: Real-time synthesized footsteps, low ambient breathing drones, heavy impacts, and minor-second dissonances.
- **Notes & Lore**: Find scraps of paper left behind in the darkness.
