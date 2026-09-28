/**
 * @file LevelEditor.js
 * @description Interactive visual level editor with high-contrast UI, Undo/Redo history, tooltips, procedural generation controls, and live playtesting.
 */

import { generateProceduralLevel } from '../generator/LevelGenerator.js';
import { Level1 } from '../levels/Level1.js';

export default class LevelEditor {
    constructor(canvas, scene, renderer, onPlayLevel) {
        this.canvas = canvas;
        this.scene = scene;
        this.renderer = renderer;
        this.onPlayLevel = onPlayLevel;

        this.isOpen = false;
        this.currentTool = 'tile_1'; // default stone
        this.currentLevelData = null;

        // Undo / Redo history stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 35;

        // Editor camera pan
        this.cameraX = 0;
        this.cameraY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.isPainting = false;
        this.hasPaintedInStroke = false;

        // Generator parameters
        this.genParams = {
            seed: Math.floor(Math.random() * 99999),
            width: 75,
            height: 20,
            roomCount: 5,
            hazardDensity: 40,
            verticality: 50,
            shadowCount: 1,
            noteCount: 1
        };

        this.initUI();
        this.setupEvents();
    }

    /**
     * Initializes the editor DOM overlay with clean typography and high contrast.
     */
    initUI() {
        const overlay = document.createElement('div');
        overlay.id = 'level-editor-panel';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            display: none;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            color: #f0f6fc;
            z-index: 9000;
            user-select: none;
        `;

        overlay.innerHTML = `
            <!-- Top Navigation Bar -->
            <div style="pointer-events: auto; background: rgba(13, 17, 23, 0.98); border-bottom: 1px solid #30363d; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 6px 20px rgba(0,0,0,0.6);">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-weight: 800; font-size: 16px; letter-spacing: 0.08rem; color: #ff6b6b; display: flex; align-items: center; gap: 8px;">
                        <span style="background: #ff4444; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
                        ECHO ARCHITECT
                    </span>
                    <span style="color: #6e7681; font-size: 13px;">|</span>
                    <span id="editor-level-name" style="color: #8b949e; font-size: 13px; font-weight: 500;">Level: The Awakening</span>
                </div>

                <!-- Center: Undo / Redo Controls -->
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button id="btn-undo" data-tooltip="Undo last action (Ctrl+Z)" style="background: #21262d; border: 1px solid #363b42; color: #c9d1d9; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.15s;">
                        <span>↩</span> Undo <span style="font-size: 10px; color: #8b949e;">[Ctrl+Z]</span>
                    </button>
                    <button id="btn-redo" data-tooltip="Redo last reverted action (Ctrl+Y)" style="background: #21262d; border: 1px solid #363b42; color: #c9d1d9; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.15s;">
                        <span>↪</span> Redo <span style="font-size: 10px; color: #8b949e;">[Ctrl+Y]</span>
                    </button>
                </div>

                <!-- Right: Action Buttons -->
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button id="btn-editor-open-sound" data-tooltip="Open Sound Design Studio & Audio Synthesizer" style="background: #6e40c9; border: 1px solid #8957e5; color: #ffffff; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(110,64,201,0.4); transition: all 0.15s;">
                        <span>🎵</span> SOUND STUDIO
                    </button>
                    <button id="btn-publish-level" data-tooltip="Publish this level into the main game descent pool for players to encounter" style="background: #1f6feb; border: 1px solid #388bfd; color: #ffffff; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(31,111,235,0.4); transition: all 0.15s;">
                        <span>🚀</span> PUBLISH TO GAME
                    </button>
                    <button id="btn-play-level" data-tooltip="Playtest this dungeon layout immediately" style="background: #238636; border: 1px solid #2ea043; color: #ffffff; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(35,134,54,0.4); transition: all 0.15s;">
                        <span>▶</span> TEST LEVEL
                    </button>
                    <button id="btn-close-editor" data-tooltip="Exit editor back to game (TAB)" style="background: #30363d; border: 1px solid #444c56; color: #c9d1d9; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;">
                        CLOSE [TAB]
                    </button>
                </div>
            </div>

            <!-- Left Tool Palette -->
            <div style="pointer-events: auto; position: absolute; left: 18px; top: 72px; width: 195px; background: rgba(13, 17, 23, 0.96); border: 1px solid #30363d; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 12px; max-height: calc(100vh - 100px); overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
                <div>
                    <div style="font-size: 12px; font-weight: 700; color: #8b949e; letter-spacing: 0.06rem; margin-bottom: 8px; text-transform: uppercase;">Tile Palette</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px;" id="tile-buttons">
                        <button class="tool-btn" data-tool="tile_0" data-tooltip="Air (0) — Erases solid blocks to create open space" style="padding: 7px; font-size: 12px; font-weight: 500; background: #161b22; border: 1px solid #30363d; color: #c9d1d9; cursor: pointer; border-radius: 5px;">Air (0)</button>
                        <button class="tool-btn active" data-tool="tile_1" data-tooltip="Stone (1) — Indestructible solid wall and floor stone" style="padding: 7px; font-size: 12px; font-weight: 600; background: #202035; border: 2px solid #58a6ff; color: #ffffff; cursor: pointer; border-radius: 5px;">Stone (1)</button>
                        <button class="tool-btn" data-tool="tile_2" data-tooltip="Brick (2) — Ancient ruin stone blocks" style="padding: 7px; font-size: 12px; font-weight: 500; background: #382020; border: 1px solid #30363d; color: #ffaaaa; cursor: pointer; border-radius: 5px;">Brick (2)</button>
                        <button class="tool-btn" data-tool="tile_3" data-tooltip="Platform (3) — Jump-through semi-solid shelf; land on top" style="padding: 7px; font-size: 12px; font-weight: 500; background: #334455; border: 1px solid #30363d; color: #aaddff; cursor: pointer; border-radius: 5px;">Platform (3)</button>
                        <button class="tool-btn" data-tool="tile_4" data-tooltip="Backdrop (4) — Non-solid background pillars for visual depth" style="padding: 7px; font-size: 12px; font-weight: 500; background: #12121c; border: 1px solid #30363d; color: #8b949e; cursor: pointer; border-radius: 5px; grid-column: span 2;">Backdrop (4)</button>
                    </div>
                </div>

                <div>
                    <div style="font-size: 12px; font-weight: 700; color: #8b949e; letter-spacing: 0.06rem; margin-bottom: 8px; text-transform: uppercase;">Entity Spawners</div>
                    <div style="display: flex; flex-direction: column; gap: 6px;" id="entity-buttons">
                        <button class="tool-btn" data-tool="ent_player" data-tooltip="Player Spawn — Place where the player awakens" style="padding: 7px 10px; font-size: 12px; font-weight: 600; background: #161b22; border: 1px solid #30363d; color: #7ee787; cursor: pointer; border-radius: 5px; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <span>👤</span> Player Start
                        </button>
                        <button class="tool-btn" data-tool="ent_torch" data-tooltip="Wall Torch — Dynamic warm light source that illuminates jumping paths" style="padding: 7px 10px; font-size: 12px; font-weight: 600; background: #161b22; border: 1px solid #30363d; color: #ffaa44; cursor: pointer; border-radius: 5px; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <span>🕯️</span> Wall Torch (Light)
                        </button>
                        <button class="tool-btn" data-tool="ent_switch" data-tooltip="Ancient Lever — Mechanical switch that opens locked gates" style="padding: 7px 10px; font-size: 12px; font-weight: 600; background: #161b22; border: 1px solid #30363d; color: #f0883e; cursor: pointer; border-radius: 5px; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <span>⚙️</span> Ancient Lever
                        </button>
                        <button class="tool-btn" data-tool="ent_door" data-tooltip="Exit Door / Gate — Requires Ancient Lever to unlock" style="padding: 7px 10px; font-size: 12px; font-weight: 600; background: #161b22; border: 1px solid #30363d; color: #d2a8ff; cursor: pointer; border-radius: 5px; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <span>🚪</span> Sealed Door / Gate
                        </button>
                        <button class="tool-btn" data-tool="ent_note" data-tooltip="Lore Note — Discoverable parchment with cryptic messages" style="padding: 7px 10px; font-size: 12px; font-weight: 600; background: #161b22; border: 1px solid #30363d; color: #f2cc60; cursor: pointer; border-radius: 5px; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <span>📜</span> Lore Note
                        </button>
                        <button class="tool-btn" data-tool="ent_spikes" data-tooltip="Spikes Hazard — Deadly pit spikes; kills on touch" style="padding: 7px 10px; font-size: 12px; font-weight: 600; background: #161b22; border: 1px solid #30363d; color: #ff7b72; cursor: pointer; border-radius: 5px; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <span>⚠️</span> Spikes Hazard
                        </button>
                        <button class="tool-btn" data-tool="ent_falling" data-tooltip="Falling Trap — Ceiling block that shivers and drops" style="padding: 7px 10px; font-size: 12px; font-weight: 600; background: #161b22; border: 1px solid #30363d; color: #ffa657; cursor: pointer; border-radius: 5px; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <span>⬇️</span> Falling Trap
                        </button>
                        <button class="tool-btn" data-tool="ent_shadow" data-tooltip="Shadow Stalker — Eerie entity with spectral eyes that stalks and drains sanity" style="padding: 7px 10px; font-size: 12px; font-weight: 600; background: #161b22; border: 1px solid #30363d; color: #a5d6ff; cursor: pointer; border-radius: 5px; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <span>👻</span> Shadow Stalker
                        </button>
                        <button class="tool-btn" data-tool="ent_erase" data-tooltip="Erase Entity — Click near an entity to remove it" style="padding: 7px 10px; font-size: 12px; font-weight: 600; background: #2d1818; border: 1px solid #6e2020; color: #ffaaaa; cursor: pointer; border-radius: 5px; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <span>❌</span> Erase Entity
                        </button>
                    </div>
                </div>

                <div style="font-size: 11px; color: #8b949e; line-height: 1.4; border-top: 1px solid #30363d; padding-top: 10px;">
                    <b style="color: #c9d1d9;">Shortcuts:</b><br>
                    Left-Click: Paint<br>
                    Right-Click/Drag: Pan<br>
                    Ctrl+Z / Ctrl+Y: Undo/Redo<br>
                    TAB: Toggle Editor
                </div>
            </div>

            <!-- Right Procedural Generator Panel -->
            <div style="pointer-events: auto; position: absolute; right: 18px; top: 72px; width: 280px; background: rgba(13, 17, 23, 0.96); border: 1px solid #30363d; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
                <div style="font-size: 13px; font-weight: 800; color: #f0883e; letter-spacing: 0.05rem; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
                    <span>Procedural Generator</span>
                    <span style="font-size: 11px; font-weight: 600; color: #58a6ff; background: rgba(88,166,255,0.15); padding: 2px 6px; border-radius: 4px;">v2.0</span>
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px; font-weight: 500;">
                        <span>Dungeon Seed:</span>
                        <button id="btn-random-seed" data-tooltip="Generate a completely new random numeric seed" style="background: none; border: none; color: #58a6ff; cursor: pointer; font-size: 12px; font-weight: 600;">🎲 Randomize</button>
                    </div>
                    <input type="number" id="gen-seed" style="width: 100%; box-sizing: border-box; background: #0d1117; border: 1px solid #30363d; color: #f0f6fc; padding: 6px 10px; border-radius: 5px; font-size: 13px; font-family: monospace;">
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px; font-weight: 500;">
                        <span>Chambers & Length:</span>
                        <span id="lbl-rooms" style="font-weight: 700; color: #58a6ff;">5</span>
                    </div>
                    <input type="range" id="gen-rooms" min="3" max="8" value="5" data-tooltip="Number of interconnected architectural rooms and halls" style="width: 100%; accent-color: #58a6ff; cursor: pointer;">
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px; font-weight: 500;">
                        <span>Hazard Danger:</span>
                        <span id="lbl-hazards" style="font-weight: 700; color: #ff7b72;">40%</span>
                    </div>
                    <input type="range" id="gen-hazards" min="0" max="100" value="40" data-tooltip="Density of deadly floor spikes and falling ceiling stones" style="width: 100%; accent-color: #ff7b72; cursor: pointer;">
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px; font-weight: 500;">
                        <span>Verticality / Platforms:</span>
                        <span id="lbl-vert" style="font-weight: 700; color: #a5d6ff;">50%</span>
                    </div>
                    <input type="range" id="gen-vert" min="0" max="100" value="50" data-tooltip="Frequency of high-ceiling climbing shafts and jump-through shelves" style="width: 100%; accent-color: #a5d6ff; cursor: pointer;">
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px; font-weight: 500;">
                        <span>Shadow Stalkers:</span>
                        <span id="lbl-shadows" style="font-weight: 700; color: #d2a8ff;">1</span>
                    </div>
                    <input type="range" id="gen-shadows" min="0" max="3" value="1" data-tooltip="Number of horror entities stalking the dark halls" style="width: 100%; accent-color: #d2a8ff; cursor: pointer;">
                </div>

                <button id="btn-generate-now" data-tooltip="Generate a brand new dungeon layout using current slider settings" style="background: #8957e5; border: 1px solid #ab7df8; color: #ffffff; padding: 10px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(137,87,229,0.35); transition: all 0.15s; white-space: nowrap;">
                    <span>✨</span> GENERATE PROCEDURAL LEVEL
                </button>

                <div style="border-top: 1px solid #30363d; padding-top: 10px;">
                    <div style="font-size: 12px; font-weight: 700; color: #8b949e; margin-bottom: 8px; text-transform: uppercase;">Dungeon Presets</div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <button class="preset-btn" data-preset="level1" data-tooltip="Handcrafted intro map with crypt, shaft, and spike room" style="padding: 6px 10px; font-size: 12px; background: #161b22; border: 1px solid #30363d; color: #c9d1d9; cursor: pointer; text-align: left; border-radius: 5px; font-weight: 500;">The Awakening (Original)</button>
                        <button class="preset-btn" data-preset="catacombs" data-tooltip="Moderate labyrinth with climbing towers and lore notes" style="padding: 6px 10px; font-size: 12px; background: #161b22; border: 1px solid #30363d; color: #c9d1d9; cursor: pointer; text-align: left; border-radius: 5px; font-weight: 500;">The Catacombs (Balanced)</button>
                        <button class="preset-btn" data-preset="gauntlet" data-tooltip="High-danger nightmare filled with spikes and multiple shadows" style="padding: 6px 10px; font-size: 12px; background: #161b22; border: 1px solid #30363d; color: #ffaaaa; cursor: pointer; text-align: left; border-radius: 5px; font-weight: 500;">The Gauntlet (Extreme)</button>
                    </div>
                </div>

                <div style="border-top: 1px solid #30363d; padding-top: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: 700; color: #58a6ff; text-transform: uppercase;">Published In Game</span>
                        <span id="published-count-badge" style="background: #1f6feb; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px;">0 POOL</span>
                    </div>
                    <div id="published-levels-list" style="display: flex; flex-direction: column; gap: 5px; max-height: 120px; overflow-y: auto;">
                        <span style="font-size: 11px; color: #6e7681; font-style: italic;">No levels published yet</span>
                    </div>
                </div>
            </div>

            <!-- Bottom Floating Status & Dynamic Tooltip Bar -->
            <div style="pointer-events: auto; position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; align-items: center;">
                <!-- Live Tooltip Message -->
                <div id="editor-tooltip-msg" style="background: rgba(13, 17, 23, 0.95); border: 1px solid #30363d; padding: 6px 16px; border-radius: 6px; font-size: 12px; color: #e6edf3; box-shadow: 0 4px 12px rgba(0,0,0,0.5); max-width: 500px; text-align: center; white-space: nowrap;">
                    Hover over elements to see tooltips & shortcuts
                </div>
                <!-- Coordinates -->
                <div id="editor-tile-info" style="background: rgba(13, 17, 23, 0.95); border: 1px solid #30363d; padding: 6px 14px; border-radius: 6px; font-size: 12px; color: #8b949e; font-family: monospace; box-shadow: 0 4px 12px rgba(0,0,0,0.5); white-space: nowrap;">
                    Tile [Col: 0, Row: 0]
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.dom = overlay;

        // Floating trigger button on top-right during gameplay
        const triggerBtn = document.createElement('button');
        triggerBtn.id = 'btn-open-editor';
        triggerBtn.innerHTML = '🛠️ <span style="font-weight: 700;">LEVEL ARCHITECT</span>';
        triggerBtn.style.cssText = `
            position: fixed;
            top: 14px;
            right: 14px;
            background: rgba(22, 27, 34, 0.9);
            border: 1px solid #30363d;
            color: #f0f6fc;
            padding: 8px 14px;
            border-radius: 6px;
            font-size: 12px;
            font-family: system-ui, sans-serif;
            cursor: pointer;
            z-index: 8000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            transition: all 0.2s ease;
        `;
        triggerBtn.addEventListener('mouseenter', () => {
            triggerBtn.style.background = '#30363d';
            triggerBtn.style.borderColor = '#58a6ff';
        });
        triggerBtn.addEventListener('mouseleave', () => {
            triggerBtn.style.background = 'rgba(22, 27, 34, 0.9)';
            triggerBtn.style.borderColor = '#30363d';
        });
        triggerBtn.addEventListener('click', () => this.toggle());
        document.body.appendChild(triggerBtn);
    }

    /**
     * Captures a snapshot of current level state for Undo history.
     */
    saveSnapshot() {
        if (!this.currentLevelData) return;

        const snapshot = {
            name: this.currentLevelData.name,
            seed: this.currentLevelData.seed,
            width: this.currentLevelData.width,
            height: this.currentLevelData.height,
            tileSize: this.currentLevelData.tileSize || 16,
            playerStart: { ...this.currentLevelData.playerStart },
            backgroundColor: this.currentLevelData.backgroundColor,
            ambientTrack: this.currentLevelData.ambientTrack,
            tiles: this.currentLevelData.tiles.map(row => [...row]),
            entities: this.currentLevelData.entities.map(ent => ({
                ...ent,
                properties: { ...(ent.properties || {}) }
            }))
        };

        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        // New edit clears redo stack
        this.redoStack = [];
        this.updateUndoRedoButtons();
    }

    /**
     * Undoes the last action.
     */
    undo() {
        if (this.undoStack.length === 0) return;

        // Push current state to redo
        const currentSnapshot = {
            name: this.currentLevelData.name,
            seed: this.currentLevelData.seed,
            width: this.currentLevelData.width,
            height: this.currentLevelData.height,
            tileSize: this.currentLevelData.tileSize || 16,
            playerStart: { ...this.currentLevelData.playerStart },
            backgroundColor: this.currentLevelData.backgroundColor,
            ambientTrack: this.currentLevelData.ambientTrack,
            tiles: this.currentLevelData.tiles.map(row => [...row]),
            entities: this.currentLevelData.entities.map(ent => ({
                ...ent,
                properties: { ...(ent.properties || {}) }
            }))
        };
        this.redoStack.push(currentSnapshot);

        const previousState = this.undoStack.pop();
        this.loadSnapshot(previousState);
        this.updateUndoRedoButtons();
        this.showTooltipMsg('↩ Undid last change');
    }

    /**
     * Redoes the last undone action.
     */
    redo() {
        if (this.redoStack.length === 0) return;

        const currentSnapshot = {
            name: this.currentLevelData.name,
            seed: this.currentLevelData.seed,
            width: this.currentLevelData.width,
            height: this.currentLevelData.height,
            tileSize: this.currentLevelData.tileSize || 16,
            playerStart: { ...this.currentLevelData.playerStart },
            backgroundColor: this.currentLevelData.backgroundColor,
            ambientTrack: this.currentLevelData.ambientTrack,
            tiles: this.currentLevelData.tiles.map(row => [...row]),
            entities: this.currentLevelData.entities.map(ent => ({
                ...ent,
                properties: { ...(ent.properties || {}) }
            }))
        };
        this.undoStack.push(currentSnapshot);

        const nextState = this.redoStack.pop();
        this.loadSnapshot(nextState);
        this.updateUndoRedoButtons();
        this.showTooltipMsg('↪ Redid change');
    }

    loadSnapshot(state) {
        this.currentLevelData = {
            name: state.name,
            seed: state.seed,
            width: state.width,
            height: state.height,
            tileSize: state.tileSize,
            playerStart: { ...state.playerStart },
            backgroundColor: state.backgroundColor,
            ambientTrack: state.ambientTrack,
            tiles: state.tiles.map(row => [...row]),
            entities: state.entities.map(ent => ({
                ...ent,
                properties: { ...(ent.properties || {}) }
            }))
        };
        this.dom.querySelector('#editor-level-name').innerText = `Level: ${this.currentLevelData.name}`;
    }

    updateUndoRedoButtons() {
        const btnUndo = this.dom.querySelector('#btn-undo');
        const btnRedo = this.dom.querySelector('#btn-redo');

        if (this.undoStack.length === 0) {
            btnUndo.style.opacity = '0.4';
            btnUndo.style.cursor = 'default';
        } else {
            btnUndo.style.opacity = '1';
            btnUndo.style.cursor = 'pointer';
        }

        if (this.redoStack.length === 0) {
            btnRedo.style.opacity = '0.4';
            btnRedo.style.cursor = 'default';
        } else {
            btnRedo.style.opacity = '1';
            btnRedo.style.cursor = 'pointer';
        }
    }

    showTooltipMsg(text) {
        const el = this.dom.querySelector('#editor-tooltip-msg');
        if (el) el.innerText = text;
    }

    /**
     * Binds all DOM and Canvas events.
     */
    setupEvents() {
        // Toggle editor on TAB
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggle();
            }

            // Undo / Redo keyboard shortcuts
            if (this.isOpen && (e.ctrlKey || e.metaKey)) {
                if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                } else if (e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    this.redo();
                }
            }
        });

        // Close button
        this.dom.querySelector('#btn-close-editor').addEventListener('click', () => this.toggle(false));

        // Open Sound Studio from Editor
        const btnOpenSound = this.dom.querySelector('#btn-editor-open-sound');
        if (btnOpenSound) {
            btnOpenSound.addEventListener('click', () => {
                if (this.onOpenSoundStudio) this.onOpenSoundStudio();
            });
        }

        // Undo & Redo buttons
        this.dom.querySelector('#btn-undo').addEventListener('click', () => this.undo());
        this.dom.querySelector('#btn-redo').addEventListener('click', () => this.redo());

        // Publish level button
        const btnPublish = this.dom.querySelector('#btn-publish-level');
        if (btnPublish) {
            btnPublish.addEventListener('click', () => this.publishCurrentLevel());
        }

        // Play level button
        this.dom.querySelector('#btn-play-level').addEventListener('click', () => {
            if (this.currentLevelData && this.onPlayLevel) {
                this.isOpen = false;
                this.dom.style.display = 'none';
                this.onPlayLevel(this.currentLevelData);
            }
        });

        // Dynamic Tooltip binding on all interactive elements
        this.dom.querySelectorAll('[data-tooltip]').forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.showTooltipMsg(el.dataset.tooltip);
            });
            el.addEventListener('mouseleave', () => {
                this.showTooltipMsg('Hover over elements to see tooltips & shortcuts');
            });
        });

        // Tool buttons selection
        const toolBtns = this.dom.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.borderWidth = '1px';
                    b.style.borderColor = '#30363d';
                });
                btn.classList.add('active');
                btn.style.borderWidth = '2px';
                btn.style.borderColor = '#58a6ff';
                this.currentTool = btn.dataset.tool;
            });
        });

        // Generator UI Bindings
        const seedInput = this.dom.querySelector('#gen-seed');
        seedInput.value = this.genParams.seed;
        seedInput.addEventListener('change', (e) => {
            this.genParams.seed = parseInt(e.target.value, 10) || 12345;
        });

        this.dom.querySelector('#btn-random-seed').addEventListener('click', () => {
            this.genParams.seed = Math.floor(Math.random() * 999999);
            seedInput.value = this.genParams.seed;
        });

        const bindSlider = (id, labelId, key, formatter = (v) => v) => {
            const slider = this.dom.querySelector(id);
            const label = this.dom.querySelector(labelId);
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.genParams[key] = val;
                label.innerText = formatter(val);
            });
        };

        bindSlider('#gen-rooms', '#lbl-rooms', 'roomCount');
        bindSlider('#gen-hazards', '#lbl-hazards', 'hazardDensity', (v) => `${v}%`);
        bindSlider('#gen-vert', '#lbl-vert', 'verticality', (v) => `${v}%`);
        bindSlider('#gen-shadows', '#lbl-shadows', 'shadowCount');

        // Generate Now Button
        this.dom.querySelector('#btn-generate-now').addEventListener('click', () => {
            this.saveSnapshot();
            this.generateNewLevel();
            this.showTooltipMsg('✨ Generated new procedural dungeon');
        });

        // Presets
        this.dom.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.saveSnapshot();
                const preset = btn.dataset.preset;
                if (preset === 'level1') {
                    this.loadLevel(Level1);
                } else if (preset === 'catacombs') {
                    this.genParams.hazardDensity = 30;
                    this.genParams.verticality = 60;
                    this.generateNewLevel('The Catacombs');
                } else if (preset === 'gauntlet') {
                    this.genParams.hazardDensity = 85;
                    this.genParams.verticality = 80;
                    this.genParams.shadowCount = 3;
                    this.generateNewLevel('The Gauntlet (Extreme)');
                }
            });
        });

        // Canvas interactions for painting & panning
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.isOpen) return;

            if (e.button === 2 || e.altKey) {
                // Right click or Alt+click: pan
                this.isPanning = true;
                this.panStartX = e.clientX;
                this.panStartY = e.clientY;
                e.preventDefault();
            } else if (e.button === 0) {
                // Left click: paint
                this.saveSnapshot();
                this.isPainting = true;
                this.applyToolAtMouse(e);
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isOpen) return;

            if (this.isPanning) {
                const dx = e.clientX - this.panStartX;
                const dy = e.clientY - this.panStartY;
                this.cameraX -= dx;
                this.cameraY -= dy;
                this.panStartX = e.clientX;
                this.panStartY = e.clientY;
            } else if (this.isPainting) {
                this.applyToolAtMouse(e);
            }

            // Update hovered coordinate indicator
            const pos = this.getGridCoordFromMouse(e);
            if (pos && this.currentLevelData) {
                this.dom.querySelector('#editor-tile-info').innerText = 
                    `Tile [Col: ${pos.col}, Row: ${pos.row}] | Pos [${pos.col * 16}px, ${pos.row * 16}px]`;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.isPainting = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.isOpen) e.preventDefault();
        });

        this.updateUndoRedoButtons();
    }

    /**
     * Translates client mouse coordinates into tilemap row and column.
     */
    getGridCoordFromMouse(e) {
        if (!this.currentLevelData) return null;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.renderer.width / rect.width;
        const scaleY = this.renderer.height / rect.height;

        const screenX = (e.clientX - rect.left) * scaleX;
        const screenY = (e.clientY - rect.top) * scaleY;

        const worldX = screenX + this.cameraX;
        const worldY = screenY + this.cameraY;

        const tileSize = this.currentLevelData.tileSize || 16;
        const col = Math.floor(worldX / tileSize);
        const row = Math.floor(worldY / tileSize);

        return { col, row, worldX, worldY };
    }

    /**
     * Applies the current tool to the tile or entity under the cursor.
     */
    applyToolAtMouse(e) {
        const coord = this.getGridCoordFromMouse(e);
        if (!coord || !this.currentLevelData) return;

        const { col, row } = coord;
        const rows = this.currentLevelData.height;
        const cols = this.currentLevelData.width;

        if (row < 0 || row >= rows || col < 0 || col >= cols) return;

        // Tile placement
        if (this.currentTool.startsWith('tile_')) {
            const tileId = parseInt(this.currentTool.replace('tile_', ''), 10);
            this.currentLevelData.tiles[row][col] = tileId;
        }

        // Entity placement
        else if (this.currentTool === 'ent_player') {
            this.currentLevelData.playerStart = { x: col * 16, y: row * 16 - 4 };
        } else if (this.currentTool === 'ent_spikes') {
            this.currentLevelData.entities.push({
                type: 'hazard',
                x: col * 16,
                y: row * 16,
                properties: { hazardType: 0, width: 32, height: 16 }
            });
        } else if (this.currentTool === 'ent_falling') {
            this.currentLevelData.entities.push({
                type: 'hazard',
                x: col * 16,
                y: row * 16,
                properties: { hazardType: 1, width: 16, height: 16 }
            });
        } else if (this.currentTool === 'ent_note') {
            this.currentLevelData.entities.push({
                type: 'interactable',
                x: col * 16,
                y: row * 16,
                properties: {
                    interactType: 0,
                    id: `note_${Date.now()}`,
                    text: 'A strange mark is etched into the stone.'
                }
            });
        } else if (this.currentTool === 'ent_door') {
            this.currentLevelData.entities.push({
                type: 'interactable',
                x: col * 16,
                y: row * 16,
                properties: { interactType: 1, id: 'exit_door' }
            });
        } else if (this.currentTool === 'ent_switch') {
            this.currentLevelData.entities.push({
                type: 'interactable',
                x: col * 16,
                y: row * 16,
                properties: {
                    interactType: 2,
                    id: `lever_${Date.now()}`,
                    flag: 'gate_unlocked'
                }
            });
        } else if (this.currentTool === 'ent_torch') {
            this.currentLevelData.entities.push({
                type: 'interactable',
                x: col * 16,
                y: row * 16,
                properties: {
                    interactType: 3 // Torch
                }
            });
        } else if (this.currentTool === 'ent_shadow') {
            this.currentLevelData.entities.push({
                type: 'shadow',
                x: col * 16,
                y: row * 16
            });
        } else if (this.currentTool === 'ent_erase') {
            // Erase entities near this tile
            const clickX = col * 16 + 8;
            const clickY = row * 16 + 8;
            this.currentLevelData.entities = this.currentLevelData.entities.filter(ent => {
                const dist = Math.hypot(ent.x + 8 - clickX, ent.y + 8 - clickY);
                return dist > 24;
            });
        }
    }

    /**
     * Generates a brand new procedural level with current slider parameters.
     */
    generateNewLevel(customName) {
        const level = generateProceduralLevel({
            seed: this.genParams.seed,
            width: this.genParams.width,
            height: this.genParams.height,
            roomCount: this.genParams.roomCount,
            hazardDensity: this.genParams.hazardDensity / 100,
            verticality: this.genParams.verticality / 100,
            shadowCount: this.genParams.shadowCount,
            noteCount: this.genParams.noteCount,
            name: customName || `Catacombs (Seed ${this.genParams.seed})`
        });

        this.loadLevel(level);
    }

    /**
     * Loads level data into editor state.
     */
    loadLevel(levelData) {
        const tilesCopy = typeof levelData.tiles === 'function' ? levelData.tiles() : levelData.tiles;
        this.currentLevelData = {
            name: levelData.name,
            seed: levelData.seed || 12345,
            width: levelData.width,
            height: levelData.height,
            tileSize: levelData.tileSize || 16,
            playerStart: { ...levelData.playerStart },
            backgroundColor: levelData.backgroundColor || '#0a0a0f',
            ambientTrack: levelData.ambientTrack || 'ambient_drip',
            tiles: tilesCopy.map(row => [...row]),
            entities: (levelData.entities || []).map(ent => ({
                ...ent,
                properties: { ...(ent.properties || {}) }
            }))
        };

        this.dom.querySelector('#editor-level-name').innerText = `Level: ${this.currentLevelData.name}`;

        // Reset editor camera to player start
        this.cameraX = Math.max(0, this.currentLevelData.playerStart.x - this.renderer.width / 2);
        this.cameraY = Math.max(0, this.currentLevelData.playerStart.y - this.renderer.height / 2);

        this.updateUndoRedoButtons();
    }

    /**
     * Publishes current level to the main game loop descent pool.
     */
    publishCurrentLevel() {
        if (!this.currentLevelData) return;
        const defaultName = this.currentLevelData.name || 'Custom Crypt';
        const name = prompt('Publish Level to Main Game Loop — Enter dungeon name:', defaultName);
        if (!name || name.trim() === '') return;

        this.currentLevelData.name = name.trim();
        this.dom.querySelector('#editor-level-name').innerText = `Level: ${this.currentLevelData.name}`;

        try {
            const stored = localStorage.getItem('echo_published_levels');
            let publishedList = stored ? JSON.parse(stored) : [];

            const levelPayload = {
                id: 'pub_' + Date.now(),
                name: this.currentLevelData.name,
                seed: this.currentLevelData.seed || Date.now(),
                width: this.currentLevelData.width,
                height: this.currentLevelData.height,
                tileSize: this.currentLevelData.tileSize || 16,
                playerStart: { ...this.currentLevelData.playerStart },
                backgroundColor: this.currentLevelData.backgroundColor || '#0a0a0f',
                ambientTrack: this.currentLevelData.ambientTrack || 'ambient_drip',
                tiles: this.currentLevelData.tiles.map(row => [...row]),
                entities: this.currentLevelData.entities.map(ent => ({
                    ...ent,
                    properties: { ...(ent.properties || {}) }
                })),
                publishedAt: new Date().toISOString()
            };

            const existingIdx = publishedList.findIndex(p => p.name.toLowerCase() === this.currentLevelData.name.toLowerCase());
            if (existingIdx !== -1) {
                publishedList[existingIdx] = levelPayload;
            } else {
                publishedList.push(levelPayload);
            }

            localStorage.setItem('echo_published_levels', JSON.stringify(publishedList));
            this.showTooltipMsg(`🚀 "${this.currentLevelData.name}" Published! Added to Main Game Descent Pool.`);
            this.renderPublishedListUI();
        } catch (e) {
            console.error('Failed to publish level:', e);
            this.showTooltipMsg('❌ Failed to publish level to localStorage');
        }
    }

    /**
     * Refreshes the published levels list in the editor sidebar.
     */
    renderPublishedListUI() {
        const listEl = this.dom.querySelector('#published-levels-list');
        const badgeEl = this.dom.querySelector('#published-count-badge');
        if (!listEl) return;

        let publishedList = [];
        try {
            const raw = localStorage.getItem('echo_published_levels');
            if (raw) publishedList = JSON.parse(raw);
        } catch (e) {}

        if (badgeEl) {
            badgeEl.innerText = `${publishedList.length} IN POOL`;
        }

        listEl.innerHTML = '';
        if (publishedList.length === 0) {
            listEl.innerHTML = '<span style="font-size: 11px; color: #6e7681; font-style: italic;">No levels published yet</span>';
            return;
        }

        publishedList.forEach((lvl, idx) => {
            const itemRow = document.createElement('div');
            itemRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #161b22; border: 1px solid #30363d; border-radius: 4px; padding: 4px 8px; font-size: 11px; gap: 4px;';

            const nameBtn = document.createElement('button');
            nameBtn.style.cssText = 'background: transparent; border: none; color: #58a6ff; font-size: 11px; font-weight: 600; text-align: left; cursor: pointer; padding: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;';
            nameBtn.innerText = `${idx + 1}. ${lvl.name}`;
            nameBtn.title = 'Click to load & edit this published level';
            nameBtn.addEventListener('click', () => {
                this.saveSnapshot();
                this.loadLevel(lvl);
                this.showTooltipMsg(`Loaded published level: "${lvl.name}"`);
            });

            const delBtn = document.createElement('button');
            delBtn.style.cssText = 'background: transparent; border: none; color: #f85149; font-size: 12px; cursor: pointer; padding: 0 4px; opacity: 0.7;';
            delBtn.innerText = '✖';
            delBtn.title = 'Unpublish (remove from game pool)';
            delBtn.addEventListener('mouseenter', () => delBtn.style.opacity = '1');
            delBtn.addEventListener('mouseleave', () => delBtn.style.opacity = '0.7');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Remove "${lvl.name}" from the Main Game Descent Pool?`)) {
                    this.deletePublishedLevel(lvl.name);
                }
            });

            itemRow.appendChild(nameBtn);
            itemRow.appendChild(delBtn);
            listEl.appendChild(itemRow);
        });
    }

    /**
     * Removes a level from published game pool.
     */
    deletePublishedLevel(name) {
        try {
            const raw = localStorage.getItem('echo_published_levels');
            let publishedList = raw ? JSON.parse(raw) : [];
            publishedList = publishedList.filter(p => p.name !== name);
            localStorage.setItem('echo_published_levels', JSON.stringify(publishedList));
            this.showTooltipMsg(`Removed "${name}" from descent pool.`);
            this.renderPublishedListUI();
        } catch (e) {
            console.error('Failed to delete published level:', e);
        }
    }

    /**
     * Toggles editor open/closed state.
     */
    toggle(forceState) {
        this.isOpen = (forceState !== undefined) ? forceState : !this.isOpen;
        this.dom.style.display = this.isOpen ? 'block' : 'none';

        if (this.isOpen) {
            if (!this.currentLevelData) {
                this.loadLevel(Level1);
            }
            this.renderPublishedListUI();
        } else if (this.onClose) {
            this.onClose();
        }
    }

    /**
     * Renders the editor view (tiles, grid lines, and high-contrast graphical glyph badges).
     */
    render() {
        if (!this.isOpen || !this.currentLevelData) return;

        const ctx = this.renderer.bctx;
        const width = this.renderer.width;
        const height = this.renderer.height;
        const tileSize = this.currentLevelData.tileSize || 16;
        const rows = this.currentLevelData.height;
        const cols = this.currentLevelData.width;

        // Clear background
        ctx.fillStyle = this.currentLevelData.backgroundColor || '#07070b';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(-Math.floor(this.cameraX), -Math.floor(this.cameraY));

        // 1. Draw Tiles
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tileId = this.currentLevelData.tiles[r][c];
                if (tileId > 0) {
                    let color = '#202035';
                    switch (tileId) {
                        case 1: color = '#202035'; break; // stone
                        case 2: color = '#382020'; break; // brick
                        case 3: color = '#3d5266'; break; // platform
                        case 4: color = '#101018'; break; // backdrop
                    }
                    ctx.fillStyle = color;
                    ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
                }
            }
        }

        // 2. Draw Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        for (let r = 0; r <= rows; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * tileSize);
            ctx.lineTo(cols * tileSize, r * tileSize);
            ctx.stroke();
        }
        for (let c = 0; c <= cols; c++) {
            ctx.beginPath();
            ctx.moveTo(c * tileSize, 0);
            ctx.lineTo(c * tileSize, rows * tileSize);
            ctx.stroke();
        }

        // 3. Draw Level Perimeter Outline
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, cols * tileSize, rows * tileSize);

        // 4. Draw Entities with sharp, high-contrast graphical glyph badges
        for (const ent of this.currentLevelData.entities) {
            ctx.save();
            if (ent.type === 'hazard') {
                const w = ent.properties?.width || 16;
                const h = ent.properties?.height || 16;
                if (ent.properties?.hazardType === 1) {
                    // Falling block
                    ctx.fillStyle = '#ff5533';
                    ctx.fillRect(ent.x, ent.y, w, h);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(ent.x + 4, ent.y + 4, w - 8, 3);
                    ctx.fillRect(ent.x + w / 2 - 2, ent.y + 7, 4, 5);
                } else {
                    // Spikes
                    ctx.fillStyle = '#ff2222';
                    ctx.fillRect(ent.x, ent.y + h - 6, w, 6);
                    // Draw sharp triangle spike teeth
                    ctx.beginPath();
                    for (let x = 0; x < w; x += 8) {
                        ctx.moveTo(ent.x + x, ent.y + h - 6);
                        ctx.lineTo(ent.x + x + 4, ent.y);
                        ctx.lineTo(ent.x + x + 8, ent.y + h - 6);
                    }
                    ctx.fill();
                }
            } else if (ent.type === 'interactable') {
                if (ent.properties?.interactType === 1) {
                    // Exit Door / Sealed Gate
                    ctx.fillStyle = '#4d2d18';
                    ctx.fillRect(ent.x, ent.y - 16, 16, 32);
                    ctx.fillStyle = '#ffdd44';
                    ctx.fillRect(ent.x + 12, ent.y - 4, 2, 4); // brass handle
                    ctx.strokeStyle = '#2a1a0f';
                    ctx.strokeRect(ent.x, ent.y - 16, 16, 32);
                } else if (ent.properties?.interactType === 2) {
                    // Ancient Lever
                    ctx.fillStyle = '#444455';
                    ctx.fillRect(ent.x + 3, ent.y + 10, 10, 6);
                    ctx.fillStyle = '#ff5533';
                    ctx.fillRect(ent.x + 5, ent.y + 3, 3, 8);
                    ctx.fillStyle = '#ffff88';
                    ctx.fillRect(ent.x + 4, ent.y + 1, 5, 3);
                } else if (ent.properties?.interactType === 3) {
                    // Wall Torch
                    ctx.fillStyle = '#666677';
                    ctx.fillRect(ent.x + 6, ent.y + 8, 4, 8);
                    ctx.fillStyle = '#ff7722';
                    ctx.fillRect(ent.x + 5, ent.y + 3, 6, 6);
                    ctx.fillStyle = '#ffea66';
                    ctx.fillRect(ent.x + 6, ent.y + 4, 4, 3);
                } else {
                    // Lore Note
                    ctx.fillStyle = '#eedd66';
                    ctx.fillRect(ent.x + 2, ent.y + 2, 12, 12);
                    ctx.fillStyle = '#aa8822';
                    ctx.fillRect(ent.x + 4, ent.y + 5, 8, 1);
                    ctx.fillRect(ent.x + 4, ent.y + 8, 8, 1);
                    ctx.fillRect(ent.x + 4, ent.y + 11, 5, 1);
                }
            } else if (ent.type === 'shadow') {
                // Shadow Stalker
                ctx.fillStyle = 'rgba(70, 70, 160, 0.85)';
                ctx.fillRect(ent.x, ent.y, 16, 32);
                ctx.fillStyle = '#cc88ff';
                ctx.fillRect(ent.x + 4, ent.y + 6, 2, 2); // glowing eyes
                ctx.fillRect(ent.x + 10, ent.y + 6, 2, 2);
            }
            ctx.restore();
        }

        // 5. Draw Player Start
        const ps = this.currentLevelData.playerStart;
        if (ps) {
            ctx.save();
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(ps.x, ps.y, 12, 20);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ps.x + 8, ps.y + 4, 3, 3); // eye dot
            ctx.strokeStyle = '#00bb55';
            ctx.strokeRect(ps.x - 1, ps.y - 1, 14, 22);
            ctx.restore();
        }

        ctx.restore();
    }
}
