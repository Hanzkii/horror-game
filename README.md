# ECHO — A Psychological Horror Experience

A browser-based psychological horror platformer built from scratch in vanilla JavaScript using HTML5 Canvas and the Web Audio API (zero external runtime dependencies).

---

## 👁️ Overview & Story

Trapped deep within an abyssal subterranean labyrinth, you awaken into suffocating darkness armed only with a flickering oil lantern. As you descend deeper through ancient catacombs (Depth B1 to B3) seeking a way to the surface, an eldritch entity—the **Shadow Stalker**—watches your every move from the periphery of vision.

- **Genre**: 2D Psychological Survival Horror Platformer
- **Engine**: Custom vanilla JavaScript engine (60 FPS fixed-timestep physics, dual-pass high-resolution vector HUD)
- **Audio**: Real-time procedural audio synthesis via Web Audio API (dynamic heartbeats, reactive drones, binaural whispers, hallucinated footsteps)
- **Atmosphere**: Dynamic radial lighting, lantern oil depletion, torch snuffing, sanity-driven visual corruption, and fullscreen jumpscares

---

## 🎮 Controls

| Key | Action | Description |
| --- | --- | --- |
| `A` / `D` or `←` / `→` | **Walk / Balance** | Traverse uneven stone floors and narrow subterranean ledges. |
| `Space` / `W` / `↑` | **Jump & Wall-Slide** | Hold for variable jump height; press against vertical walls to wall-slide down shafts. |
| `Shift` | **Sprint (High Risk)** | Run at rapid speed. Drains stamina quickly and generates heavy footsteps that alert the Stalker from across the level! |
| `C` or `Ctrl` | **Hold Breath / Sneak** | Crouch silently in shadows. Collapses Stalker sensory detection down to 36px so it glides past unaware. Beware: holding breath too long triggers an uncontrollable gasping fit. |
| `E` | **Interact** | Pull ancient mechanism levers, collect Lantern Oil Flasks, and read stone inscriptions. |
| `Escape` or **Click PAUSE** | **Pause & Settings** | Opens the in-game Pause Menu to adjust volume sliders, toggle fullscreen, or enter the Sound Test & Debug Suite. |

---

## 🕯️ Survival & Psychological Horror Mechanics

### 1. The Shadow Stalker
- **Lurking Predator**: Stalks the player from the shadows. Freezes when looked directly in the eyes; creeps closer and rushes when the player's back is turned.
- **Auditory & Light Interference**: As the Stalker draws near, wall torches flicker or snuff out, the air grows icy cold, and chromatic aberration tears across reality.
- **Escape Tactics**:
  - *Holy Flame*: Step into the radius of lit torches or light sources to incinerate and banish the Stalker back into darkness.
  - *Sneak*: Hold breath (`C` / `Ctrl`) while stationary in shadows to avoid detection.
  - *Sprint*: Break line-of-sight and outdistance the entity by >280px for 3.5 seconds.

### 2. Lantern Oil & Darkness
- Your oil lantern constantly consumes fuel.
- **>50% Oil**: Warm, bright sanctuary radius (150px).
- **20%–50% Oil**: Dimmable radius (110px).
- **0%–20% Oil**: Sputtering, violent flickers (65px); sanity slowly erodes.
- **0% Empty**: Lantern dies, leaving only a sputtering match (26px). In total darkness, sanity drains rapidly. Gather **Lantern Oil Flasks** scattered throughout the ruins.

### 3. Sanity & Psychological Hallucinations
- Sanity decreases in darkness and near the Stalker.
- **Auditory Hallucinations**: When sanity drops below 75%, stopping suddenly will play a delayed footstep behind you, simulating being followed.
- **Heartbeat Sensor**: As sanity collapses or during adrenaline pursuit, a visceral biological heartbeat accelerates and rings in your ears.
- **Visual Glitches**: Chromatic screen tears, CRT scanline instability, and screen trauma flashes intensify at low sanity.

---

## 🛠️ In-Game Sound Test & Debug Suite

Available **exclusively while playing inside the game** via the **Pause Menu** (`[ESC]` -> `SOUND TEST & DEBUG`):

- **16-Channel SFX Soundboard**: Interactive test triggers for footsteps (stone/water), visceral heartbeat, ragged breathing, bone fracture, flesh tear, stalker shrieks & lunges, phantom whispers, hallucinations, gate grinds, pendulum whooshes, horror stingers, and door mechanisms.
- **Atmosphere State Mixer**: Real-time auditioning of Exploration Ambience, Tension Soundscape, Pursuit/Chase Dread, Holy Torch Sanctuary, and Surface Sunrise.
- **Cheats & Diagnostics**:
  - `🛡️ GOD MODE: ON/OFF`: Absolute immortality (immune to spikes, falling traps, pendulum blades, void abyss pits, and shadow attacks; locks stamina, oil, health, and sanity to 100%).
  - `💧 REFILL OIL, STAMINA & SANITY`: Instantly restores all vitals.
  - `👻 SPAWN SHADOW STALKER`: Summons the Stalker directly behind the player for live chase testing.
  - `😱 TRIGGER FULLSCREEN JUMPSCARE`: Previews the traumatic nightmare void and eldritch maw confrontation.
- **Level Warps**: Fast-travel directly to `TUTORIAL`, `B1`, `B2`, `B3`, or the `SURFACE` finale.

---

## 🚀 How to Run

Because the project utilizes native ES6 JavaScript modules, serve the directory with any local HTTP server:

```bash
# Python 3
python -m http.server 8000

# or Node.js (npx serve)
npx serve .
```

Open `http://localhost:8000` in Google Chrome, Microsoft Edge, or Firefox. Click anywhere on the awakening screen to begin your descent.

---

## 📁 Project Architecture

```
horror-game/
├── index.html                   # High-res canvas shell, font declarations, awakened loading screen
├── README.md                    # Project documentation & player manual
└── src/
    ├── main.js                  # Engine bootstrap, state machine, procedural audio synthesis, surface director
    ├── art/
    │   └── SpriteRenderer.js    # Canvas-rendered procedural pixel art (player, tiles, stalker, torches, levers)
    ├── audio/
    │   └── AudioScapeManager.js # Dynamic music manager, multi-bus mixer, tension crossfader
    ├── core/
    │   └── EventBus.js          # Decoupled event emitter for achievements, alerts, and milestones
    ├── effects/
    │   └── PostProcessing.js    # Radial lantern lighting, screen trauma shake, chromatic aberration, static tears
    ├── engine/
    │   ├── AudioManager.js      # Web Audio API context, buffers, and spatial panning
    │   ├── Entity.js            # Base game entity with bounding-box collision
    │   ├── Input.js             # Keyboard and mouse coordinate tracker with client-space scaling
    │   ├── Renderer.js          # Low-res pixel buffer (480x270) & display resolution UI overlay
    │   └── Scene.js             # Tile collisions, entity updates, and player respawn handling
    ├── entities/
    │   ├── Hazard.js            # Wall spikes, falling stone blocks, pendulum blades
    │   ├── Interactable.js      # Lever mechanisms, iron doors, ancient inscriptions, oil flasks
    │   ├── Player.js            # Character physics, sprinting, breath-holding sneak, lantern oil dynamics
    │   └── Shadow.js            # Stalker AI, sensory awareness, torch flickering, jump scare triggers
    ├── game/
    │   └── GameState.js         # Health, sanity, floor index, flags, save/load persistence, god mode
    ├── generator/
    │   └── LevelGenerator.js    # Procedural dungeon generator with BFS reachability solver
    ├── levels/
    │   ├── Level1.js            # Handcrafted Awakening level
    │   ├── TutorialLevel.js     # Sanctuary chamber teaching mechanics and holy torch light
    │   └── SurfaceFinale.js     # Serene meadow, birch tree canopy, and sequel epilogue
    ├── managers/
    │   ├── AchievementManager.js# Persistent achievements tracked in localStorage
    │   └── SaveManager.js       # Checkpoints, settings persistence, and profile management
    └── ui/
        ├── HUD.js               # In-game pause menu, high-res lore modals, Sound Test & Debug suite
        ├── MainMenu.js          # Title screen, continue run, tutorial trial, achievements, audio settings
        ├── ToastNotification.js # Non-intrusive bottom-right milestone toast cards
        └── Typography.js        # Crisp typography renderer with automatic multiline parchment wrapping
```
