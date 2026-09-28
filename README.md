# ECHO — A Psychological Horror Experience

A browser-based psychological horror platformer built from scratch in vanilla JavaScript using HTML5 Canvas and the Web Audio API (zero external runtime dependencies).

[![Play Online on GitHub Pages](https://img.shields.io/badge/Play%20Online-GitHub%20Pages-10b981?style=for-the-badge&logo=github&logoColor=white)](https://hanzkii.github.io/horror-game/)

🎮 **Play directly in your browser:** **[https://hanzkii.github.io/horror-game/](https://hanzkii.github.io/horror-game/)**

---

## 👁️ Overview & Story

Trapped deep within an abyssal subterranean labyrinth, you awaken into suffocating darkness armed only with a flickering oil lantern. As you descend through **30 progressively harrowing depths across 5 distinct thematic strata**, you must solve multi-conduit mechanism puzzles, avoid lethal clockwork traps, and decipher the 30-entry journal of Althea—all while the relentless **Shadow Stalker** hunts you from the gloom.

```
+---------------------------------------------------------------------------------------------------+
|                                30-DEPTH SUBTERRANEAN STRATA                                       |
+---------------------------------------------------------------------------------------------------+
|  Depths B1 - B6   | STRATUM I   | The Upper Catacombs & Cold Awakening                            |
|                   |             | - Slate stone, ancient reliefs, solitary lurker, 2-conduit gates|
+-------------------+-------------+-----------------------------------------------------------------+
|  Depths B7 - B12  | STRATUM II  | The Sunken Aqueducts & Moldering Tombs                          |
|                   |             | - Slick mossy pavers, waterlogged crypts, crumbling platforms   |
+-------------------+-------------+-----------------------------------------------------------------+
|  Depths B13 - B18 | STRATUM III | The Clockwork Foundry & Iron Vaults                             |
|                   |             | - Riveted iron plates, steam pipes, pendulum blades, 3-conduits |
+-------------------+-------------+-----------------------------------------------------------------+
|  Depths B19 - B24 | STRATUM IV  | The Obsidian Necropolis & Cursed Sanctum                        |
|                   |             | - Glowing violet runes, doppelgangers, torch-snuffing stalkers  |
+-------------------+-------------+-----------------------------------------------------------------+
|  Depths B25 - B30 | STRATUM V   | The Abyssal Crucible & The Final Ascent                         |
|                   |             | - Eldritch void tiles, 5-conduit master networks, apex pursuers |
+-------------------+-------------+-----------------------------------------------------------------+
|      FINALE       | THE SURFACE | Breaking all 30 seals unlocks the glorious Dawn Escape Finale!  |
+---------------------------------------------------------------------------------------------------+
```

- **Genre**: 2D Psychological Survival Horror Platformer (30 Depths)
- **Engine**: Custom vanilla JavaScript engine (60 FPS fixed-timestep physics, dual-pass high-resolution vector HUD)
- **Audio**: Real-time procedural audio synthesis via Web Audio API (dynamic heartbeats, reactive drones, binaural whispers, hallucinated footsteps)
- **Atmosphere**: Dynamic radial lighting, lantern oil depletion, torch snuffing, sanity-driven visual corruption, and fullscreen jumpscares
- **Live Deployment**: Hosted on [GitHub Pages](https://hanzkii.github.io/horror-game/)

---

## 🎮 Controls

| Key | Action | Description |
| --- | --- | --- |
| `A` / `D` or `←` / `→` | **Walk / Balance** | Traverse uneven stone floors and narrow subterranean ledges. |
| `Space` / `W` / `↑` | **Jump & Wall-Slide** | Hold for variable jump height; press against vertical walls to wall-slide down shafts. |
| `S` / `↓` or `Down + Space` | **Drop Down Platform** | Drop down through one-way wooden platforms and crumbling stone bridges to lower levels. |
| `Shift` | **Sprint (High Risk)** | Run at rapid speed. Drains stamina quickly and generates heavy footsteps that alert the Stalker from across the level! |
| `C` or `Ctrl` | **Hold Breath / Sneak** | Crouch silently in shadows. Collapses Stalker sensory detection down to 36px so it glides past unaware. Beware: holding breath too long triggers an uncontrollable gasping fit. |
| `E` | **Interact** | Pull ancient mechanism levers, collect Lantern Oil Flasks, and read stone inscriptions. |
| `Escape` or **Click PAUSE** | **Pause & Settings** | Opens the in-game Pause Menu to adjust volume sliders, toggle fullscreen, or enter the Sound Test & Debug Suite. |

---

## 🕯️ Survival & Psychological Horror Mechanics

### 1. The Shadow Stalker
- **Lurking Predator**: Stalks the player from the shadows. Freezes when looked directly in the eyes; creeps closer and rushes when the player's back is turned.
- **Lantern Depletion Aggression**: If your lantern runs out of oil, the Stalker instantly awakens and relentlessly hunts you in the pitch darkness!
- **Zero-Sanity Relentless Pursuit**: If your sanity drops to 0%, the Stalker locks onto your soul and **cannot be shaken off by distance or timeout**. It will pursue you until you reach sanctuary in a lit wall torch or relight your lantern with oil!
- **Escape Tactics**:
  - *Holy Flame Sanctuary*: Step into the radius of lit torches or sacred flame sources to incinerate and banish the Stalker back into darkness.
  - *Relight Lantern*: Collect a Lantern Oil Flask (`E`) to restore light and escape frenzy pursuit.
  - *Sneak*: Hold breath (`C` / `Ctrl`) while stationary in shadows to collapse sensory detection down to 36px.
  - *Sprint*: Break line-of-sight and outdistance the entity by >280px for 3.5 seconds (only when sanity > 0 and lantern is lit).

### 2. Handheld Lantern & Darkness
- The player holds a visible, vintage brass lantern in their forward hand.
- **Lit (>0% Oil)**: Warm golden glow with an animated dancing flame pixel.
- **Extinguished (0% Empty)**: Cold, rusted dark iron cage with an unlit wick and rising smoke wisps.
- **Sanity Decay**: In total darkness without oil, sanity drains 3x faster (`7.5%/sec`). Gather **Lantern Oil Flasks** scattered throughout the ruins.

### 3. Vitals & Psychological Hallucinations
- **No Generic HP**: Survival depends on **Sanity**, **Stamina**, and **Lantern Oil** displayed via custom high-res vector glyphs and stylized meters.
- **Auditory Hallucinations**: When sanity drops below 75%, stopping suddenly plays a delayed footstep behind you, simulating being followed.
- **Heartbeat Sensor**: As sanity collapses or during adrenaline pursuit, a visceral biological heartbeat accelerates in your ears.
- **Visual Glitches**: Chromatic screen tears, CRT scanline instability, and screen trauma flashes intensify at low sanity.

---

## 🛠️ In-Game Sound Test & Debug Suite

Available **exclusively while playing inside the game** via the **Pause Menu** (`[ESC]` -> `SOUND TEST & DEBUG`):

- **16-Channel SFX Soundboard**: Interactive test triggers for footsteps (stone/water), visceral heartbeat, ragged breathing, bone fracture, flesh tear, stalker shrieks & lunges, phantom whispers, hallucinations, gate grinds, pendulum whooshes, horror stingers, and door mechanisms.
- **Atmosphere State Mixer**: Real-time auditioning of Exploration Ambience, Tension Soundscape, Pursuit/Chase Dread, Holy Torch Sanctuary, and Surface Sunrise.
- **Cheats & Diagnostics**:
  - `🛡️ GOD MODE: ON/OFF`: Absolute immortality (immune to spikes, falling traps, pendulum blades, void abyss pits, and shadow attacks; locks stamina, oil, and sanity to 100%).
  - `💧 REFILL OIL, STAMINA & SANITY`: Instantly restores all vitals.
  - `👻 SPAWN SHADOW STALKER`: Summons the Stalker directly behind the player for live chase testing.
- **Stratum Level Warps**: Fast-travel directly to major campaign milestones: `TUTORIAL`, `B1` (Upper Catacombs), `B7` (Sunken Aqueducts), `B13` (Clockwork Foundry), `B19` (Obsidian Necropolis), `B25` (Abyssal Crucible), `B30` (Final Gate), or the `SURFACE` escape finale.

---

## 🚀 How to Play & Run

### 🌐 Play Online in Browser (Instant)
The game is deployed and ready to play without installing anything:  
👉 **[https://hanzkii.github.io/horror-game/](https://hanzkii.github.io/horror-game/)**

### 💻 Run Locally
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
