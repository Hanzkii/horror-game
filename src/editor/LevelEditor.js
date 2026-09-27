/**
 * @file LevelEditor.js
 * @description Interactive visual level editor with procedural generation controls, tile palette, entity placement, and live playtesting.
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

        // Editor camera offset and pan
        this.cameraX = 0;
        this.cameraY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.isPainting = false;

        // Generator parameters
        this.genParams = {
            seed: Math.floor(Math.random() * 99999),
            width: 75,
            height: 20,
            roomCount: 5,
            hazardDensity: 0.4,
            verticality: 0.5,
            shadowCount: 1,
            noteCount: 2
        };

        this.initUI();
        this.setupEvents();
    }

    /**
     * Initializes the editor DOM overlay.
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            color: #ddd;
            z-index: 9000;
        `;

        overlay.innerHTML = `
            <!-- Top Bar -->
            <div style="pointer-events: auto; background: rgba(14, 14, 22, 0.95); border-bottom: 1px solid #333; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-weight: 700; font-size: 15px; letter-spacing: 0.1rem; color: #ff5555;">[ECHO] LEVEL ARCHITECT</span>
                    <span id="editor-level-name" style="color: #888; font-size: 12px;">Editing: The Awakening</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="btn-play-level" style="background: #238636; border: 1px solid #2ea043; color: #fff; padding: 6px 14px; border-radius: 4px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        <span>▶</span> TEST LEVEL
                    </button>
                    <button id="btn-close-editor" style="background: #30363d; border: 1px solid #444c56; color: #ccc; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                        CLOSE [TAB]
                    </button>
                </div>
            </div>

            <!-- Left Tool Palette -->
            <div style="pointer-events: auto; position: absolute; left: 16px; top: 60px; width: 175px; background: rgba(18, 18, 28, 0.95); border: 1px solid #333; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 10px; max-height: calc(100vh - 80px); overflow-y: auto;">
                <div style="font-size: 11px; font-weight: 700; color: #888; letter-spacing: 0.05rem;">TILES</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;" id="tile-buttons">
                    <button class="tool-btn" data-tool="tile_0" style="padding: 6px; font-size: 11px; background: #222; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 3px;">Air (0)</button>
                    <button class="tool-btn active" data-tool="tile_1" style="padding: 6px; font-size: 11px; background: #1a1a2e; border: 1px solid #6688cc; color: #fff; cursor: pointer; border-radius: 3px;">Stone (1)</button>
                    <button class="tool-btn" data-tool="tile_2" style="padding: 6px; font-size: 11px; background: #2a1a1a; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 3px;">Brick (2)</button>
                    <button class="tool-btn" data-tool="tile_3" style="padding: 6px; font-size: 11px; background: #333344; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 3px;">Platform (3)</button>
                    <button class="tool-btn" data-tool="tile_4" style="padding: 6px; font-size: 11px; background: #0d0d15; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 3px;">Backdrop (4)</button>
                </div>

                <div style="font-size: 11px; font-weight: 700; color: #888; letter-spacing: 0.05rem; margin-top: 6px;">ENTITIES</div>
                <div style="display: flex; flex-direction: column; gap: 4px;" id="entity-buttons">
                    <button class="tool-btn" data-tool="ent_player" style="padding: 6px; font-size: 11px; background: #222; border: 1px solid #444; color: #eee; cursor: pointer; border-radius: 3px; text-align: left;">👤 Player Start</button>
                    <button class="tool-btn" data-tool="ent_spikes" style="padding: 6px; font-size: 11px; background: #222; border: 1px solid #444; color: #f77; cursor: pointer; border-radius: 3px; text-align: left;">⚠️ Spikes Hazard</button>
                    <button class="tool-btn" data-tool="ent_falling" style="padding: 6px; font-size: 11px; background: #222; border: 1px solid #444; color: #f99; cursor: pointer; border-radius: 3px; text-align: left;">⬇️ Falling Trap</button>
                    <button class="tool-btn" data-tool="ent_note" style="padding: 6px; font-size: 11px; background: #222; border: 1px solid #444; color: #dd4; cursor: pointer; border-radius: 3px; text-align: left;">📜 Lore Note</button>
                    <button class="tool-btn" data-tool="ent_door" style="padding: 6px; font-size: 11px; background: #222; border: 1px solid #444; color: #a63; cursor: pointer; border-radius: 3px; text-align: left;">🚪 Exit Door</button>
                    <button class="tool-btn" data-tool="ent_shadow" style="padding: 6px; font-size: 11px; background: #222; border: 1px solid #444; color: #88c; cursor: pointer; border-radius: 3px; text-align: left;">👤 Shadow Stalker</button>
                    <button class="tool-btn" data-tool="ent_erase" style="padding: 6px; font-size: 11px; background: #331111; border: 1px solid #622; color: #fbb; cursor: pointer; border-radius: 3px; text-align: left;">❌ Erase Entity</button>
                </div>

                <div style="font-size: 10px; color: #666; margin-top: 8px;">
                    Left-Click: Paint<br>
                    Right-Click/Drag: Pan<br>
                    TAB: Toggle Editor
                </div>
            </div>

            <!-- Right Procedural Generator Panel -->
            <div style="pointer-events: auto; position: absolute; right: 16px; top: 60px; width: 240px; background: rgba(18, 18, 28, 0.95); border: 1px solid #333; border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
                <div style="font-size: 12px; font-weight: 700; color: #ffaa55; letter-spacing: 0.05rem;">PROCEDURAL GENERATOR</div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 2px;">
                        <span>Seed:</span>
                        <button id="btn-random-seed" style="background: none; border: none; color: #66aaff; cursor: pointer; font-size: 10px;">🎲 Randomize</button>
                    </div>
                    <input type="number" id="gen-seed" style="width: 100%; box-sizing: border-box; background: #0f0f18; border: 1px solid #444; color: #fff; padding: 4px 8px; border-radius: 3px; font-size: 11px;">
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
                        <span>Chambers:</span>
                        <span id="lbl-rooms">5</span>
                    </div>
                    <input type="range" id="gen-rooms" min="3" max="8" value="5" style="width: 100%;">
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
                        <span>Hazard Danger:</span>
                        <span id="lbl-hazards">40%</span>
                    </div>
                    <input type="range" id="gen-hazards" min="0" max="100" value="40" style="width: 100%;">
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
                        <span>Verticality / Platforms:</span>
                        <span id="lbl-vert">50%</span>
                    </div>
                    <input type="range" id="gen-vert" min="0" max="100" value="50" style="width: 100%;">
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa;">
                        <span>Shadow Stalkers:</span>
                        <span id="lbl-shadows">1</span>
                    </div>
                    <input type="range" id="gen-shadows" min="0" max="3" value="1" style="width: 100%;">
                </div>

                <button id="btn-generate-now" style="background: #6e40c9; border: 1px solid #8957e5; color: #fff; padding: 8px; border-radius: 4px; font-weight: 600; cursor: pointer; margin-top: 4px;">
                    ✨ GENERATE PROCEDURAL LEVEL
                </button>

                <div style="border-top: 1px solid #333; margin-top: 6px; padding-top: 8px;">
                    <div style="font-size: 11px; font-weight: 700; color: #888; margin-bottom: 6px;">PRESETS</div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <button class="preset-btn" data-preset="level1" style="padding: 4px 8px; font-size: 11px; background: #222; border: 1px solid #444; color: #bbb; cursor: pointer; text-align: left; border-radius: 3px;">The Awakening (Fixed Map)</button>
                        <button class="preset-btn" data-preset="catacombs" style="padding: 4px 8px; font-size: 11px; background: #222; border: 1px solid #444; color: #bbb; cursor: pointer; text-align: left; border-radius: 3px;">The Crypt (Procedural)</button>
                        <button class="preset-btn" data-preset="gauntlet" style="padding: 4px 8px; font-size: 11px; background: #222; border: 1px solid #444; color: #bbb; cursor: pointer; text-align: left; border-radius: 3px;">The Gauntlet (High Hazard)</button>
                    </div>
                </div>
            </div>

            <!-- Bottom Floating Status -->
            <div id="editor-tile-info" style="pointer-events: none; position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); padding: 4px 12px; border-radius: 4px; font-size: 11px; color: #888;">
                Tile [X: 0, Y: 0]
            </div>
        `;

        document.body.appendChild(overlay);
        this.dom = overlay;

        // Floating trigger button on top-right during gameplay
        const triggerBtn = document.createElement('button');
        triggerBtn.id = 'btn-open-editor';
        triggerBtn.innerText = '🛠️ LEVEL ARCHITECT';
        triggerBtn.style.cssText = `
            position: fixed;
            top: 12px;
            right: 12px;
            background: rgba(25, 25, 35, 0.85);
            border: 1px solid #444;
            color: #ddd;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
            cursor: pointer;
            z-index: 8000;
            transition: all 0.2s ease;
        `;
        triggerBtn.addEventListener('mouseenter', () => {
            triggerBtn.style.background = '#30363d';
            triggerBtn.style.borderColor = '#ff5555';
        });
        triggerBtn.addEventListener('mouseleave', () => {
            triggerBtn.style.background = 'rgba(25, 25, 35, 0.85)';
            triggerBtn.style.borderColor = '#444';
        });
        triggerBtn.addEventListener('click', () => this.toggle());
        document.body.appendChild(triggerBtn);
    }

    /**
     * Binds all editor DOM and Canvas interactions.
     */
    setupEvents() {
        // Toggle on TAB key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Close button
        this.dom.querySelector('#btn-close-editor').addEventListener('click', () => this.toggle(false));

        // Play level button
        this.dom.querySelector('#btn-play-level').addEventListener('click', () => {
            if (this.currentLevelData && this.onPlayLevel) {
                this.toggle(false);
                this.onPlayLevel(this.currentLevelData);
            }
        });

        // Tool buttons
        const toolBtns = this.dom.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.borderColor = '#444';
                });
                btn.classList.add('active');
                btn.style.borderColor = '#66aaff';
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
            this.generateNewLevel();
        });

        // Presets
        this.dom.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                if (preset === 'level1') {
                    this.loadLevel(Level1);
                } else if (preset === 'catacombs') {
                    this.genParams.hazardDensity = 0.3;
                    this.genParams.verticality = 0.6;
                    this.generateNewLevel('The Catacombs');
                } else if (preset === 'gauntlet') {
                    this.genParams.hazardDensity = 0.8;
                    this.genParams.verticality = 0.8;
                    this.generateNewLevel('The Gauntlet');
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
                    `Tile [Col: ${pos.col}, Row: ${pos.row}] | World [${pos.col * 16}px, ${pos.row * 16}px]`;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.isPainting = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.isOpen) e.preventDefault();
        });
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

        const { col, row, worldX, worldY } = coord;
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
            name: customName || `Procedural Catacombs (Seed ${this.genParams.seed})`
        });

        this.loadLevel(level);
    }

    /**
     * Loads level data into editor state.
     */
    loadLevel(levelData) {
        // Deep copy tile grid
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

        this.dom.querySelector('#editor-level-name').innerText = `Editing: ${this.currentLevelData.name}`;

        // Reset editor camera to player start
        this.cameraX = Math.max(0, this.currentLevelData.playerStart.x - this.renderer.width / 2);
        this.cameraY = Math.max(0, this.currentLevelData.playerStart.y - this.renderer.height / 2);
    }

    /**
     * Toggles editor open/closed state.
     */
    toggle(forceState) {
        this.isOpen = (forceState !== undefined) ? forceState : !this.isOpen;
        this.dom.style.display = this.isOpen ? 'block' : 'none';

        if (this.isOpen) {
            // If opening editor and no level loaded, load current scene map
            if (!this.currentLevelData) {
                this.loadLevel(Level1);
            }
        }
    }

    /**
     * Renders the editor view (tiles, entities, grid lines, and badges) onto the canvas buffer.
     */
    render() {
        if (!this.isOpen || !this.currentLevelData) return;

        const ctx = this.renderer.bctx;
        const width = this.renderer.width;
        const height = this.renderer.height;
        const tileSize = this.currentLevelData.tileSize || 16;
        const rows = this.currentLevelData.height;
        const cols = this.currentLevelData.width;

        // Clear with background
        ctx.fillStyle = this.currentLevelData.backgroundColor || '#07070b';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(-Math.floor(this.cameraX), -Math.floor(this.cameraY));

        // 1. Draw Tiles
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tileId = this.currentLevelData.tiles[r][c];
                if (tileId > 0) {
                    let color = '#1a1a2e';
                    switch (tileId) {
                        case 1: color = '#202035'; break; // stone
                        case 2: color = '#382020'; break; // brick
                        case 3: color = '#445566'; break; // platform
                        case 4: color = '#101018'; break; // backdrop
                    }
                    ctx.fillStyle = color;
                    ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
                }
            }
        }

        // 2. Draw Subtle Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
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

        // 3. Draw Level Boundary Outline
        ctx.strokeStyle = '#ff5555';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, cols * tileSize, rows * tileSize);

        // 4. Draw Entities with clear badges
        for (const ent of this.currentLevelData.entities) {
            ctx.save();
            if (ent.type === 'hazard') {
                ctx.fillStyle = '#ff2222';
                ctx.fillRect(ent.x, ent.y, ent.properties?.width || 16, ent.properties?.height || 16);
                ctx.fillStyle = '#ffffff';
                ctx.font = '8px monospace';
                ctx.fillText(ent.properties?.hazardType === 1 ? '⬇️ TRAP' : '⚠️ SPIKES', ent.x + 2, ent.y - 2);
            } else if (ent.type === 'interactable') {
                if (ent.properties?.interactType === 1) {
                    ctx.fillStyle = '#aa6622';
                    ctx.fillRect(ent.x, ent.y - 16, 16, 32);
                    ctx.fillStyle = '#ffdd88';
                    ctx.font = '8px monospace';
                    ctx.fillText('🚪 EXIT', ent.x, ent.y - 18);
                } else {
                    ctx.fillStyle = '#ddcc44';
                    ctx.fillRect(ent.x + 4, ent.y + 4, 8, 8);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '8px monospace';
                    ctx.fillText('📜 NOTE', ent.x, ent.y - 2);
                }
            } else if (ent.type === 'shadow') {
                ctx.fillStyle = 'rgba(100, 100, 255, 0.7)';
                ctx.fillRect(ent.x, ent.y, 16, 32);
                ctx.fillStyle = '#88aaff';
                ctx.font = '8px monospace';
                ctx.fillText('👻 SHADOW', ent.x - 4, ent.y - 4);
            }
            ctx.restore();
        }

        // 5. Draw Player Spawn Point
        const ps = this.currentLevelData.playerStart;
        if (ps) {
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(ps.x, ps.y, 12, 20);
            ctx.fillStyle = '#00ff88';
            ctx.font = '9px monospace';
            ctx.fillText('👤 START', ps.x - 8, ps.y - 4);
        }

        ctx.restore();
    }
}
