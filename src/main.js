// Import Core Architecture & Persistence
import { events } from './core/EventBus.js';
import { saveManager } from './managers/SaveManager.js';
import { achievementManager } from './managers/AchievementManager.js';

// Import Engine Components
import Renderer from './engine/Renderer.js';
import Input from './engine/Input.js';
import AudioManager from './engine/AudioManager.js';
import Scene from './engine/Scene.js';

// Import Entities
import { Player } from './entities/Player.js';
import { Hazard } from './entities/Hazard.js';
import { Interactable } from './entities/Interactable.js';
import { Shadow } from './entities/Shadow.js';

// Import Content & Tools
import { Level1 } from './levels/Level1.js';
import { TutorialLevel } from './levels/TutorialLevel.js';
import { GameState } from './game/GameState.js';
import { generateProceduralLevel } from './generator/LevelGenerator.js';
import LevelEditor from './editor/LevelEditor.js';
import SoundStudio from './audio/SoundStudio.js';

// Import visual & audio systems
import PostProcessing from './effects/PostProcessing.js';
import HUD from './ui/HUD.js';
import MainMenu from './ui/MainMenu.js';
import ToastNotification from './ui/ToastNotification.js';
import { AudioScapeManager, AUDIO_STATES } from './audio/AudioScapeManager.js';

// Configuration
const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;

const GAME_STATES = {
    LOADING: 'loading',
    MENU: 'menu',
    STORY: 'story',
    DESIGN_LEVEL: 'design_level',
    DESIGN_SOUND: 'design_sound',
    PAUSED: 'paused'
};
let currentState = GAME_STATES.LOADING;

async function init() {
    const canvas = document.getElementById('gameCanvas');

    // High-DPI Display Canvas Resize Handler
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
    }
    window.addEventListener('resize', resize);
    resize();

    // Initialize core engine systems
    const input = new Input();
    input.attachCanvas(canvas, GAME_WIDTH, GAME_HEIGHT);
    const audio = new AudioManager();
    const renderer = new Renderer(canvas, GAME_WIDTH, GAME_HEIGHT);
    const gameState = new GameState();

    const toastNotification = new ToastNotification(audio);
    achievementManager.setToastManager(toastNotification);

    const ctx = renderer.bctx; // Offscreen 480x270 pixel art buffer
    const postProcessing = new PostProcessing(ctx, GAME_WIDTH, GAME_HEIGHT);
    const hud = new HUD(ctx, GAME_WIDTH, GAME_HEIGHT);
    const mainMenu = new MainMenu(ctx, GAME_WIDTH, GAME_HEIGHT, audio, canvas);

    const scene = new Scene();

    // Wire up subsystems on scene so entities can access them
    scene.audio = audio;
    scene.ui = hud;
    scene.gameState = gameState;
    scene.input = input;
    gameState.scene = scene;

    // Procedural sound effects synthesizer
    setupProceduralAudio(audio);

    // Initialize Procedural Sound Studio & AudioScape Manager
    const soundStudio = new SoundStudio(audio);
    const audioScape = new AudioScapeManager(audio, soundStudio);
    const savedSettings = saveManager.loadSettings();
    audioScape.setVolumes(savedSettings);

    let isTestLevelMode = false;

    // Helper to get the next level in the main dungeon descent, injecting published community levels
    function getNextDungeonLevel(floorIndex) {
        let publishedList = [];
        try {
            const raw = localStorage.getItem('echo_published_levels');
            if (raw) publishedList = JSON.parse(raw);
        } catch (e) {}

        // If there are published levels, integrate them into the descent!
        const pubIdx = floorIndex - 2;
        if (publishedList.length > 0 && pubIdx >= 0 && pubIdx < publishedList.length) {
            const pub = publishedList[pubIdx];
            gameState.isPublishedMap = true;
            return {
                ...pub,
                name: `Depth B${floorIndex} [COMMUNITY: ${pub.name}]`,
                isPublishedMap: true
            };
        }

        gameState.isPublishedMap = false;
        return generateProceduralLevel({
            seed: Math.floor(Math.random() * 999999),
            roomCount: Math.min(8, 4 + floorIndex),
            hazardDensity: Math.min(0.75, 0.3 + floorIndex * 0.08),
            verticality: Math.min(0.75, 0.4 + floorIndex * 0.08),
            name: `Catacombs — Depth B${floorIndex}`
        });
    }

    // Handler for descending deeper when unlocking exit doors
    scene.onNextLevel = () => {
        if (isTestLevelMode) {
            // It was a test level from Level Architect — return back to editor!
            if (audio) audio.play('stinger_sharp');
            isTestLevelMode = false;
            gameState.isTestLevel = false;
            currentState = GAME_STATES.DESIGN_LEVEL;
            audioScape.setState(AUDIO_STATES.MENU);
            editor.toggle(true);
            editor.showTooltipMsg('🎉 Test Level Completed! Exit door reached successfully.');
            return;
        }

        if (gameState.isTutorialLevel) {
            // Tutorial chamber completed!
            if (audio) audio.play('stinger_sharp');
            gameState.isTutorialLevel = false;
            currentState = GAME_STATES.MENU;
            audioScape.setState(AUDIO_STATES.MENU);
            gameState.activeNote = "TRIAL COMPLETED!\n\nYou have mastered ancient movement, mechanisms, and banishing shadows with holy flame.\n\nYou are ready to descend into the abyss.";
            return;
        }

        // Emit Stage Clear milestone before advancing floor
        events.emit('STAGE_CLEAR', { floorIndex: gameState.floorIndex, sanity: gameState.sanity });

        gameState.floorIndex = (gameState.floorIndex || 1) + 1;
        gameState.save('auto'); // Milestone autosave!

        const nextLevel = getNextDungeonLevel(gameState.floorIndex);
        loadLevel(scene, nextLevel, gameState, renderer);
        editor.loadLevel(nextLevel);
        hud.fadeIn(0.5);
    };

    // Initialize Level Architect (Editor & Procedural Generator)
    const editor = new LevelEditor(canvas, scene, renderer, (customLevel) => {
        isTestLevelMode = true;
        gameState.isTestLevel = true;
        events.emit('MAP_TESTED');
        loadLevel(scene, customLevel, gameState, renderer);
        currentState = GAME_STATES.STORY;
        audioScape.setState(AUDIO_STATES.EXPLORATION);
        hud.fadeIn(0.5);
    });
    
    // Hide floating buttons — navigation is through menu now
    const editorBtn = document.getElementById('btn-open-editor');
    if (editorBtn) editorBtn.style.display = 'none';
    const soundBtn = document.getElementById('btn-open-sound-studio');
    if (soundBtn) soundBtn.style.display = 'none';

    // Callbacks to go back to main menu
    editor.onClose = () => {
        currentState = GAME_STATES.MENU;
        mainMenu.showDesignMenu();
    };
    soundStudio.onClose = () => {
        currentState = GAME_STATES.MENU;
        mainMenu.showDesignMenu();
    };

    let lastTime = 0;

    // Main Game Loop
    function loop(timestamp) {
        if (lastTime === 0) lastTime = timestamp;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
        lastTime = timestamp;

        switch (currentState) {
            case GAME_STATES.MENU:
                canvas.style.cursor = 'default';
                mainMenu.update(dt, input);
                toastNotification.update(dt);

                renderer.clear();
                renderer.present();

                const menuUiCtx = renderer.getUIContext();
                const { width: menuW, height: menuH } = renderer.getDisplaySize();
                mainMenu.renderHighRes(menuUiCtx, menuW, menuH);
                toastNotification.render(menuUiCtx, menuW, menuH);
                
                const sel = mainMenu.getSelection();
                if (sel === 'continue') {
                    currentState = GAME_STATES.STORY;
                    isTestLevelMode = false;
                    gameState.isTestLevel = false;
                    gameState.isTutorialLevel = false;
                    if (gameState.load('auto')) {
                        if (gameState.floorIndex === 1) {
                            loadLevel(scene, Level1, gameState, renderer);
                        } else {
                            const nextLevel = getNextDungeonLevel(gameState.floorIndex);
                            loadLevel(scene, nextLevel, gameState, renderer);
                        }
                    } else {
                        gameState.floorIndex = 1;
                        loadLevel(scene, Level1, gameState, renderer);
                    }
                    audioScape.setState(AUDIO_STATES.EXPLORATION);
                } else if (sel === 'story') { 
                    currentState = GAME_STATES.STORY; 
                    isTestLevelMode = false;
                    gameState.isTestLevel = false;
                    gameState.isTutorialLevel = false;
                    gameState.reset();
                    gameState.floorIndex = 1;
                    gameState.isPublishedMap = false;
                    loadLevel(scene, Level1, gameState, renderer);
                    gameState.save('auto');
                    audioScape.setState(AUDIO_STATES.EXPLORATION);
                } else if (sel === 'tutorial') {
                    currentState = GAME_STATES.STORY;
                    isTestLevelMode = false;
                    gameState.isTestLevel = false;
                    gameState.isTutorialLevel = true;
                    gameState.floorIndex = 0;
                    loadLevel(scene, TutorialLevel, gameState, renderer);
                    audioScape.setState(AUDIO_STATES.EXPLORATION);
                } else if (sel === 'design_level') {
                    currentState = GAME_STATES.DESIGN_LEVEL;
                    editor.toggle(true);
                } else if (sel === 'design_sound') {
                    currentState = GAME_STATES.DESIGN_SOUND;
                    soundStudio.toggle(true);
                }
                break;
                
            case GAME_STATES.STORY:
                if (editor.isOpen) {
                    currentState = GAME_STATES.DESIGN_LEVEL;
                    adaptiveAudio.stopAmbient();
                    break;
                }

                if (gameState.activeNote) {
                    if (gameState.activeNoteTimer === undefined || gameState.activeNoteTimer === null) {
                        gameState.activeNoteTimer = 0;
                    }
                    gameState.activeNoteTimer += dt;

                    // Close ONLY on movement (A/D/arrows), jump (Space), pause (Escape), or mouse click
                    // Never close automatically on 'E' or 'Enter'
                    let isClosePressed = false;
                    if (gameState.activeNoteTimer > 0.15) {
                        isClosePressed = 
                            input.isJustPressed('left') || 
                            input.isJustPressed('right') || 
                            input.isJustPressed('jump') || 
                            input.isJustPressed('pause') || 
                            Boolean(input.keys['KeyA']) ||
                            Boolean(input.keys['KeyD']) ||
                            Boolean(input.keys['ArrowLeft']) ||
                            Boolean(input.keys['ArrowRight']) ||
                            Boolean(input.keys['Space']) ||
                            Boolean(input.keys['Escape']) ||
                            (input.isMouseClicked && input.isMouseClicked());
                    }

                    if (isClosePressed) {
                        gameState.activeNote = null;
                        gameState.activeNoteTimer = 0;
                        if (input.keys) {
                            input.keys['Escape'] = false;
                        }
                        try {
                            if (audio) audio.play('paper');
                        } catch (e) {}
                    }
                } else {
                    gameState.activeNoteTimer = 0;
                    if (input.isJustPressed('pause') || hud.getRequestedPause()) {
                        currentState = GAME_STATES.PAUSED;
                        gameState.isPaused = true;
                    }
                }

                if (!gameState.isPaused && !gameState.activeNote) {
                    // Reset per-frame interaction state
                    gameState.canInteract = false;
                    
                    // Pre-populate environmental torchlights before update
                    scene.lights = scene.gatherLights ? scene.gatherLights() : [];

                    // Update systems
                    scene.update(dt, input, gameState);
                    gameState.update(dt);
                    postProcessing.update(dt);
                    hud.update(dt);

                    // Camera follow player with clamping to level bounds
                    if (scene.player) {
                        renderer.lookAt(scene.player.x + scene.player.width / 2, scene.player.y + scene.player.height / 2);
                        renderer.updateCamera(dt);
                    }
                }

                // Render pass
                renderer.clear();
                scene.render(renderer);

                const playerScreenPos = scene.player
                    ? {
                        x: scene.player.x + scene.player.width / 2 - renderer.camera.x,
                        y: scene.player.y + scene.player.height / 2 - renderer.camera.y
                    }
                    : { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };

                const screenLights = (scene.lights || []).map(l => ({
                    x: l.x - renderer.camera.x,
                    y: l.y - renderer.camera.y,
                    radius: l.radius,
                    color: l.color
                }));

                let shadowDistance = 9999;
                let drawJumpscare = false;
                let leverDist = 9999;
                let doorDist = 9999;
                let isLeverPulled = false;

                if (scene.player) {
                    for (const ent of scene.entities) {
                        const dist = Math.hypot(ent.x - scene.player.x, ent.y - scene.player.y);
                        if (ent instanceof Shadow || ent.type === 'shadow') {
                            const isAwake = (ent.state !== undefined ? ent.state !== 0 : true) && (ent.alpha === undefined || ent.alpha > 0.05);
                            if (isAwake) {
                                if (dist < shadowDistance) shadowDistance = dist;
                                if (ent.jumpScareTimer > 0) drawJumpscare = true;
                            }
                        } else if (ent.type === 'interactable') {
                            const iType = (ent.interactType !== undefined) ? ent.interactType : ent.properties?.interactType;
                            if (iType === 2) { // Lever / Switch
                                if (dist < leverDist) leverDist = dist;
                                const flag = ent.properties?.flag || 'lever_dungeon_unlocked';
                                if (ent.isActivated || (gameState && gameState.getFlag(flag))) {
                                    isLeverPulled = true;
                                }
                            } else if (iType === 1) { // Exit Door / Gate
                                if (dist < doorDist) doorDist = dist;
                            }
                        }
                    }
                }

                let isNearTorch = false;
                if (scene.lights) {
                    for (const l of scene.lights) {
                        if (scene.player && Math.hypot(scene.player.x - l.x, scene.player.y - l.y) < 70) {
                            isNearTorch = true;
                            break;
                        }
                    }
                }

                audioScape.update(dt, gameState, shadowDistance, gameState.floorIndex || 1, {
                    isNearTorch,
                    leverDist,
                    doorDist,
                    isLeverPulled
                });

                const sanityNormalized = gameState.sanity / gameState.maxSanity;
                postProcessing.render(playerScreenPos, sanityNormalized, screenLights, shadowDistance);

                if (drawJumpscare) {
                    // 1. Dark nightmare void
                    ctx.fillStyle = 'rgba(6, 2, 8, 0.95)';
                    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

                    // 2. Visceral blood trauma gradient
                    const traumaGrad = ctx.createRadialGradient(
                        GAME_WIDTH / 2, GAME_HEIGHT / 2, 20,
                        GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 1.8
                    );
                    traumaGrad.addColorStop(0, 'rgba(160, 20, 20, 0.45)');
                    traumaGrad.addColorStop(0.7, 'rgba(90, 0, 15, 0.85)');
                    traumaGrad.addColorStop(1, 'rgba(20, 0, 5, 0.98)');
                    ctx.fillStyle = traumaGrad;
                    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

                    // 3. Slashing nightmare claws across screen
                    ctx.strokeStyle = '#05020a';
                    ctx.lineWidth = 6;
                    ctx.lineCap = 'round';
                    for (let c = 0; c < 4; c++) {
                        const startX = GAME_WIDTH * 0.2 + c * 75;
                        const startY = 15 + (c % 2) * 25;
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(startX - 65, startY + 190);
                        ctx.stroke();
                    }

                    // 4. Eldritch Eyes tearing through reality
                    const eyeY = GAME_HEIGHT * 0.44;
                    const leftEyeX = GAME_WIDTH * 0.38;
                    const rightEyeX = GAME_WIDTH * 0.62;

                    // Black hollow sockets
                    ctx.fillStyle = '#0a0005';
                    ctx.beginPath();
                    ctx.ellipse(leftEyeX, eyeY, 34, 18, -0.15, 0, Math.PI * 2);
                    ctx.ellipse(rightEyeX, eyeY, 34, 18, 0.15, 0, Math.PI * 2);
                    ctx.fill();

                    // Burning violet-white irises
                    ctx.fillStyle = '#d4beff';
                    ctx.beginPath();
                    ctx.ellipse(leftEyeX, eyeY, 20, 12, 0, 0, Math.PI * 2);
                    ctx.ellipse(rightEyeX, eyeY, 20, 12, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Narrow crimson demonic pupils
                    ctx.fillStyle = '#ff0033';
                    ctx.beginPath();
                    ctx.ellipse(leftEyeX, eyeY, 5, 12, 0, 0, Math.PI * 2);
                    ctx.ellipse(rightEyeX, eyeY, 5, 12, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Glitch noise sparks
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                    for (let n = 0; n < 35; n++) {
                        ctx.fillRect(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, 2 + Math.random() * 5, 1);
                    }
                }

                // Mouse cursor hidden during gameplay (shown only in menus and active note screens)
                canvas.style.cursor = (gameState.activeNote || gameState.isPaused) ? 'default' : 'none';

                // Blit low-res pixel art to display canvas
                renderer.present();

                // Draw high-resolution anti-aliased vector HUD, lore notes, and toasts
                const storyUiCtx = renderer.getUIContext();
                const { width: sW, height: sH } = renderer.getDisplaySize();
                hud.renderHighRes(storyUiCtx, sW, sH, gameState, input, scene.player);
                toastNotification.update(dt);
                toastNotification.render(storyUiCtx, sW, sH);

                if (hud.getRequestedPause()) {
                    currentState = GAME_STATES.PAUSED;
                    gameState.isPaused = true;
                }
                break;
                
            case GAME_STATES.PAUSED:
                canvas.style.cursor = 'default';
                renderer.clear();
                scene.render(renderer);
                renderer.present();
                
                const pauseUiCtx = renderer.getUIContext();
                const { width: pW, height: pH } = renderer.getDisplaySize();
                hud.renderHighRes(pauseUiCtx, pW, pH, gameState, input);
                toastNotification.update(dt);
                toastNotification.render(pauseUiCtx, pW, pH);

                const pauseAction = hud.getPauseAction();
                if (pauseAction === 'resume' || input.isJustPressed('pause')) {
                    gameState.isPaused = false;
                    currentState = GAME_STATES.STORY;
                } else if (pauseAction === 'quit' || input.keys['KeyQ']) {
                    gameState.isPaused = false;
                    audioScape.setState(AUDIO_STATES.MENU);
                    if (isTestLevelMode) {
                        isTestLevelMode = false;
                        gameState.isTestLevel = false;
                        currentState = GAME_STATES.DESIGN_LEVEL;
                        editor.toggle(true);
                    } else {
                        currentState = GAME_STATES.MENU;
                    }
                }
                break;
                
            case GAME_STATES.DESIGN_LEVEL:
                if (!editor.isOpen) {
                    if (currentState === GAME_STATES.DESIGN_LEVEL) {
                        currentState = GAME_STATES.MENU;
                        mainMenu.showDesignMenu();
                    }
                } else {
                    editor.render();
                    renderer.present();
                }
                break;
                
            case GAME_STATES.DESIGN_SOUND:
                if (!soundStudio.isOpen) {
                    currentState = GAME_STATES.MENU;
                    mainMenu.showDesignMenu();
                } else {
                    renderer.clear();
                    renderer.present();
                }
                break;
        }

        input.update();
        requestAnimationFrame(loop);
    }

    // Title screen awakening and input focus management
    const loadingOverlay = document.getElementById('loading-overlay');
    let gameStarted = false;

    function startGame() {
        if (gameStarted) return;
        gameStarted = true;

        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }
        
        window.focus();
        if (document.body) document.body.focus();

        // Unlock browser Web Audio
        if (audio && audio.context && audio.context.state === 'suspended') {
            audio.context.resume().catch(() => {});
        }
        
        // Ensure main menu is completely quiet (no droning sound)
        audioScape.setState(AUDIO_STATES.MENU);
        
        currentState = GAME_STATES.MENU;
        requestAnimationFrame(loop);
    }

    // Tab blur/focus safety: prevent physics warp upon returning to backgrounded tab
    window.addEventListener('blur', () => {
        lastTime = 0;
    });
    window.addEventListener('focus', () => {
        lastTime = performance.now();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            lastTime = performance.now();
        }
    });

    // Awaken on ANY keypress, click, or touch anywhere on the page
    const awaken = (e) => {
        if (!gameStarted) {
            startGame();
        }
    };

    if (loadingOverlay) {
        loadingOverlay.addEventListener('click', awaken);
        loadingOverlay.addEventListener('pointerdown', awaken);
    }
    window.addEventListener('click', awaken, true);
    window.addEventListener('pointerdown', awaken, true);
    window.addEventListener('keydown', awaken, true);
    document.addEventListener('keydown', awaken, true);
    if (document.body) {
        document.body.addEventListener('keydown', awaken, true);
        document.body.focus();
    }
}

function loadLevel(scene, levelData, gameState, renderer) {
    // Clear old entities
    scene.entities = [];
    scene.entitiesToAdd = [];
    scene.entitiesToRemove = [];

    // Load tilemap
    const tiles = typeof levelData.tiles === 'function' ? levelData.tiles() : levelData.tiles;
    scene.loadMap(tiles, levelData.tileSize || 16, null);

    // Set world dimensions and camera bounds
    scene.width = scene.columns * scene.tileSize;
    scene.height = scene.rows * scene.tileSize;
    if (renderer) {
        renderer.setWorldBounds(scene.width, scene.height);
    }

    // Spawn player at level start
    const ps = levelData.playerStart || { x: 48, y: 200 };
    scene.player = new Player(ps.x, ps.y);
    scene.add(scene.player);

    if (renderer) {
        renderer.snapCamera(ps.x, ps.y);
    }

    // Spawn entities based on level data
    if (levelData.entities) {
        levelData.entities.forEach(ent => {
            const props = ent.properties || {};
            switch (ent.type) {
                case 'hazard':
                    scene.add(new Hazard(ent.x, ent.y, props.hazardType || 0, props.width || 16, props.height || 16));
                    break;
                case 'interactable':
                    scene.add(new Interactable(ent.x, ent.y, props.interactType || 0, props));
                    break;
                case 'shadow':
                    scene.add(new Shadow(ent.x, ent.y));
                    break;
            }
        });
    }

    gameState.currentLevel = levelData.name;
}

function setupProceduralAudio(audioManager) {
    const ctx = audioManager.context;
    const sampleRate = ctx.sampleRate;

    function createBuffer(duration, generator) {
        const frameCount = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            data[i] = generator(t, i, frameCount);
        }
        return buffer;
    }

    // Stinger: sharp dissonant chord burst
    const stinger = createBuffer(0.3, (t) => {
        const env = Math.exp(-t * 12);
        const f1 = Math.sin(2 * Math.PI * 440 * t);      // A4
        const f2 = Math.sin(2 * Math.PI * 466.16 * t);   // Bb4 (minor 2nd)
        const f3 = Math.sin(2 * Math.PI * 622.25 * t);   // Eb5 (tritone)
        const f4 = Math.sin(2 * Math.PI * 277.18 * t);   // C#4
        return (f1 + f2 + f3 + f4) * 0.25 * env * 0.9;
    });
    audioManager.buffers.set('stinger_sharp', stinger);

    // Shadow scream: descending pitch sweep with noise
    const scream = createBuffer(0.5, (t) => {
        const env = Math.exp(-t * 6);
        const freq = 800 * Math.exp(-t * 8) + 100;
        const tone = Math.sin(2 * Math.PI * freq * t);
        const noise = (Math.random() * 2 - 1) * 0.4;
        return (tone * 0.6 + noise * 0.4) * env * 0.8;
    });
    audioManager.buffers.set('shadow_scream', scream);

    // Breathing: rhythmic filtered noise
    const breathing = createBuffer(1.5, (t) => {
        const breathCycle = Math.sin(2 * Math.PI * 0.5 * t); // one full breath
        const env = Math.max(0, breathCycle) * 0.7;
        const noise = (Math.random() * 2 - 1);
        const filtered = noise * Math.sin(2 * Math.PI * 200 * t) * 0.3;
        return filtered * env * 0.5;
    });
    audioManager.buffers.set('breathing', breathing);

    // Footstep variations
    for (let i = 1; i <= 3; i++) {
        const pitch = 80 + i * 15;
        const step = createBuffer(0.08, (t) => {
            const env = Math.exp(-t * (45 + i * 8));
            const noise = (Math.random() * 2 - 1) * 0.3;
            const tone = Math.sin(2 * Math.PI * pitch * t);
            return (tone * 0.7 + noise) * env * 0.35;
        });
        audioManager.buffers.set(`footstep_${i}`, step);
    }
    audioManager.buffers.set('footstep', audioManager.buffers.get('footstep_1'));

    // Environmental: water drip
    const drip = createBuffer(0.15, (t) => {
        const env = Math.exp(-t * 35);
        const freq = 2200 * Math.exp(-t * 20) + 800;
        return Math.sin(2 * Math.PI * freq * t) * env * 0.25;
    });
    audioManager.buffers.set('drip', drip);

    // Static crackle
    const crackle = createBuffer(0.4, (t) => {
        const env = Math.sin((t / 0.4) * Math.PI);
        const noise = (Math.random() * 2 - 1);
        const gate = Math.random() > 0.5 ? 1 : 0;
        return noise * gate * env * 0.3;
    });
    audioManager.buffers.set('static_crackle', crackle);

    // Rumble: low trembling drone
    const rumble = createBuffer(0.7, (t) => {
        const env = Math.sin((t / 0.7) * Math.PI);
        const noise = (Math.random() * 2 - 1) * 0.3;
        const low = Math.sin(2 * Math.PI * (45 + Math.sin(t * 15) * 10) * t);
        return (low * 0.6 + noise * 0.4) * env * 0.6;
    });
    audioManager.buffers.set('rumble', rumble);

    // Thud: heavy stone impact
    const thud = createBuffer(0.25, (t) => {
        const env = Math.exp(-t * 18);
        const freq = 120 * Math.exp(-t * 25) + 35;
        const tone = Math.sin(2 * Math.PI * freq * t);
        return tone * env * 0.7;
    });
    audioManager.buffers.set('thud', thud);

    // Paper: crinkling rustle
    const paper = createBuffer(0.18, (t) => {
        const env = Math.exp(-t * 15) * Math.sin(t * 40);
        return (Math.random() * 2 - 1) * env * 0.3;
    });
    audioManager.buffers.set('paper', paper);

    // Click: mechanical switch
    const click = createBuffer(0.04, (t) => {
        const env = Math.exp(-t * 120);
        const tone = Math.sin(2 * Math.PI * 1800 * t);
        return tone * env * 0.4;
    });
    audioManager.buffers.set('click', click);

    // Door creak: eerie scraping wood sound
    const doorCreak = createBuffer(0.6, (t) => {
        const env = Math.sin((t / 0.6) * Math.PI);
        const freq = 180 + Math.sin(t * 35) * 80 + Math.sin(t * 70) * 40;
        const tone = Math.sin(2 * Math.PI * freq * t);
        return tone * env * 0.35;
    });
    audioManager.buffers.set('door_creak', doorCreak);

    // Dissonance: eerie unsettling interval
    const dissonance = createBuffer(1.4, (t) => {
        const env = Math.sin((t / 1.4) * Math.PI);
        const f1 = Math.sin(2 * Math.PI * 220 * t);
        const f2 = Math.sin(2 * Math.PI * 233.08 * t); // minor second dissonance
        const f3 = Math.sin(2 * Math.PI * 311.13 * t); // tritone
        return (f1 + f2 + f3) * (1 / 3) * env * 0.5;
    });
    audioManager.buffers.set('dissonance', dissonance);

    // Shadow Hit: heavy visceral strike impact with low bass drop
    const shadowHit = createBuffer(0.45, (t) => {
        const env = Math.exp(-t * 12);
        const sub = Math.sin(2 * Math.PI * (75 * Math.exp(-t * 8) + 25) * t);
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22);
        return (sub * 0.7 + noise * 0.3) * env * 0.95;
    });
    audioManager.buffers.set('shadow_hit', shadowHit);

    // Shadow Burn: searing steam hiss and burning embers
    const shadowBurn = createBuffer(0.75, (t) => {
        const env = Math.sin((t / 0.75) * Math.PI) * Math.exp(-t * 2);
        const noise = (Math.random() * 2 - 1);
        const hiss = Math.sin(2 * Math.PI * 3200 * t) * 0.3 + noise * 0.7;
        return hiss * env * 0.65;
    });
    audioManager.buffers.set('shadow_burn', shadowBurn);

    // Flame Flare: burst whoosh of torch flame
    const flameFlare = createBuffer(0.5, (t) => {
        const env = Math.sin((t / 0.5) * Math.PI);
        const noise = (Math.random() * 2 - 1);
        const tone = Math.sin(2 * Math.PI * (280 - t * 180) * t);
        return (tone * 0.4 + noise * 0.6) * env * 0.7;
    });
    audioManager.buffers.set('flame_flare', flameFlare);
}

// Start once DOM is ready (or immediately if already parsed)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
