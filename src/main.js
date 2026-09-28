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
import { Doppelganger } from './entities/Doppelganger.js';

// Import Content & Tools
import { Level1 } from './levels/Level1.js';
import { TutorialLevel } from './levels/TutorialLevel.js';
import { SurfaceFinale } from './levels/SurfaceFinale.js';
import { GameState } from './game/GameState.js';
import { generateProceduralLevel } from './generator/LevelGenerator.js';

// Import visual & audio systems
import PostProcessing from './effects/PostProcessing.js';
import HUD from './ui/HUD.js';
import MainMenu from './ui/MainMenu.js';
import ToastNotification from './ui/ToastNotification.js';
import { AudioScapeManager, AUDIO_STATES } from './audio/AudioScapeManager.js';
import { Typography, FONT_STACKS } from './ui/Typography.js';

// Configuration
const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;

const GAME_STATES = {
    LOADING: 'loading',
    MENU: 'menu',
    STORY: 'story',
    FINALE: 'finale',
    PAUSED: 'paused'
};
let currentState = GAME_STATES.LOADING;
let returnState = GAME_STATES.STORY;

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

    // Initialize Procedural AudioScape Manager
    const audioScape = new AudioScapeManager(audio);
    const savedSettings = saveManager.loadSettings();
    audioScape.setVolumes(savedSettings);
    hud.setAudioScape(audioScape);
    hud.setAudio(audio);
    mainMenu.audioScape = audioScape;

    // Helper to get the next level in the main dungeon descent
    function getNextDungeonLevel(floorIndex) {
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

        if (gameState.floorIndex >= 4) {
            // Player unlocked the final gate on Depth B4 — emerge to the surface!
            startSurfaceFinale();
            return;
        }

        gameState.floorIndex = (gameState.floorIndex || 1) + 1;
        gameState.save('auto'); // Milestone autosave!

        const nextLevel = getNextDungeonLevel(gameState.floorIndex);
        loadLevel(scene, nextLevel, gameState, renderer);
        hud.fadeIn(0.5);
    };

    // Surface Finale Director State
    const finaleState = {
        phase: 'emerge', // 'emerge' -> 'meadow' -> 'overlook' -> 'twist' -> 'title_drop'
        timer: 0,
        twistTimer: 0,
        textTimer: 0,
        dialogue: "The oppressive stone is behind you...\nWarm morning air fills your lungs.",
        shadowEyesAlpha: 0,
        shadowDetached: false
    };

    function startSurfaceFinale() {
        currentState = GAME_STATES.FINALE;
        loadLevel(scene, SurfaceFinale, gameState, renderer);
        audioScape.setState(AUDIO_STATES.SURFACE_PEACEFUL);
        hud.fadeIn(1.0);

        finaleState.phase = 'emerge';
        finaleState.timer = 0;
        finaleState.twistTimer = 0;
        finaleState.textTimer = 0;
        finaleState.dialogue = "The oppressive stone is behind you...\nWarm morning air fills your lungs.";
        finaleState.shadowEyesAlpha = 0;
        finaleState.shadowDetached = false;
        gameState.currentLevel = "The Surface — A New Dawn";
    }

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
                    gameState.isTutorialLevel = false;
                    gameState.reset();
                    gameState.floorIndex = 1;
                    gameState.isPublishedMap = false;
                    loadLevel(scene, Level1, gameState, renderer);
                    gameState.save('auto');
                    audioScape.setState(AUDIO_STATES.EXPLORATION);
                } else if (sel === 'tutorial') {
                    currentState = GAME_STATES.STORY;
                    gameState.isTutorialLevel = true;
                    gameState.floorIndex = 0;
                    loadLevel(scene, TutorialLevel, gameState, renderer);
                    audioScape.setState(AUDIO_STATES.EXPLORATION);
                }
                break;
                
            case GAME_STATES.STORY:
                if (gameState.godMode) {
                    gameState.health = 100;
                    gameState.sanity = 100;
                }

                if (gameState.activeNote) {
                    if (gameState.activeNoteTimer === undefined || gameState.activeNoteTimer === null) {
                        gameState.activeNoteTimer = 0;
                    }
                    gameState.activeNoteTimer += dt;

                    // Close on E, Enter, movement (A/D/arrows), jump (Space), pause (Escape), or mouse click
                    // Timer cooldown prevents the same E-press that opened the note from closing it
                    let isClosePressed = false;
                    if (gameState.activeNoteTimer > 0.3) {
                        isClosePressed = 
                            input.isJustPressed('interact') ||
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
                            Boolean(input.keys['Enter']) ||
                            Boolean(input.keys['KeyE']) ||
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
                        hud.pauseSubmenu = 'main';
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

                if (isNearTorch && gameState.sanity < (gameState.maxSanity || 100)) {
                    // Holy torch sanctuary steadily calms the trembling mind
                    gameState.sanity = Math.min(gameState.maxSanity || 100, gameState.sanity + 12 * dt);
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
                    const t = performance.now() * 0.001;

                    // 1. Total blackout — the void swallows everything
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

                    // 2. Violent screen tear bands — horizontal slices displaced randomly
                    for (let i = 0; i < 12; i++) {
                        const tearY = Math.floor(Math.random() * GAME_HEIGHT);
                        const tearH = 1 + Math.floor(Math.random() * 6);
                        const tearOffset = (Math.random() - 0.5) * 40;
                        // Displaced static strips in the void
                        const brightness = Math.floor(Math.random() * 30);
                        ctx.fillStyle = `rgb(${brightness}, ${brightness >> 1}, ${brightness >> 2})`;
                        ctx.fillRect(tearOffset, tearY, GAME_WIDTH, tearH);
                    }

                    // 3. Dense static noise — the signal is dying
                    for (let n = 0; n < 200; n++) {
                        const nx = Math.random() * GAME_WIDTH;
                        const ny = Math.random() * GAME_HEIGHT;
                        const nw = 1 + Math.random() * 4;
                        const intensity = Math.random();
                        if (intensity > 0.85) {
                            // Rare bright white flicker
                            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.5})`;
                        } else {
                            // Dark noise grain
                            ctx.fillStyle = `rgba(${Math.random() * 60}, 0, ${Math.random() * 20}, ${0.3 + Math.random() * 0.5})`;
                        }
                        ctx.fillRect(nx, ny, nw, 1);
                    }

                    // 4. Strobing red trauma pulse — like a dying heartbeat
                    const pulse = Math.sin(t * 35) > 0.3 ? 0.35 : 0;
                    if (pulse > 0) {
                        ctx.fillStyle = `rgba(120, 0, 0, ${pulse})`;
                        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
                    }

                    // 5. Brief inverted flash frame — 15% chance per frame
                    if (Math.random() < 0.15) {
                        ctx.globalCompositeOperation = 'difference';
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
                        ctx.globalCompositeOperation = 'source-over';
                    }

                    // 6. Massive corruption blocks — something is wrong with reality
                    for (let b = 0; b < 3; b++) {
                        const bx = Math.random() * GAME_WIDTH;
                        const by = Math.random() * GAME_HEIGHT;
                        const bw = 10 + Math.random() * 80;
                        const bh = 2 + Math.random() * 12;
                        ctx.fillStyle = `rgba(${Math.random() * 40}, 0, ${Math.random() * 15}, 0.9)`;
                        ctx.fillRect(bx, by, bw, bh);
                    }

                    // 7. Vignette of dread — edges closing in
                    const dreadGrad = ctx.createRadialGradient(
                        GAME_WIDTH / 2, GAME_HEIGHT / 2, 10,
                        GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 2.5
                    );
                    dreadGrad.addColorStop(0, 'rgba(80, 0, 0, 0.15)');
                    dreadGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
                    ctx.fillStyle = dreadGrad;
                    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
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
                    hud.pauseSubmenu = 'main';
                }
                break;

            case GAME_STATES.FINALE:
                const { width: fW, height: fH } = renderer.getDisplaySize();
                const fMouse = input.getClientMousePos ? input.getClientMousePos() : { x: -999, y: -999 };
                const fClick = input.isMouseClicked ? input.isMouseClicked() : false;

                // Handle pausing / menu opening during active surface exploration
                if (finaleState.phase !== 'title_drop') {
                    const menuBtnW = 90;
                    const menuBtnH = 32;
                    const menuBtnX = fW - menuBtnW - 28;
                    const menuBtnY = 24;
                    const isHoverMenu = fMouse.x >= menuBtnX && fMouse.x <= menuBtnX + menuBtnW && fMouse.y >= menuBtnY && fMouse.y <= menuBtnY + menuBtnH;

                    canvas.style.cursor = isHoverMenu ? 'pointer' : 'default';

                    if (input.isJustPressed('pause') || (isHoverMenu && fClick)) {
                        returnState = GAME_STATES.FINALE;
                        currentState = GAME_STATES.PAUSED;
                        gameState.isPaused = true;
                        hud.pauseSubmenu = 'main';
                        break;
                    }
                } else {
                    canvas.style.cursor = 'default';
                }

                finaleState.timer += dt;
                finaleState.textTimer += dt;

                // Update player movement and camera during gameplay phases
                if (finaleState.phase !== 'title_drop') {
                    scene.update(dt, input, gameState);
                    if (scene.player) {
                        renderer.lookAt(scene.player.x + scene.player.width / 2, scene.player.y + scene.player.height / 2);
                        renderer.updateCamera(dt);
                    }
                    audioScape.update(dt, gameState, 9999, 1, {});

                    // Phase transitions based on player exploration
                    if (scene.player) {
                        if (finaleState.phase === 'emerge' && scene.player.x > 320) {
                            finaleState.phase = 'meadow';
                            finaleState.textTimer = 0;
                            finaleState.dialogue = "The birds are singing in the high canopy.\nAgainst all odds, the nightmare is over.";
                        } else if (finaleState.phase === 'meadow' && scene.player.x > 780) {
                            finaleState.phase = 'overlook';
                            finaleState.textTimer = 0;
                            finaleState.dialogue = "You did it.\nYou escaped the Abyssal Vault.";
                        } else if (finaleState.phase === 'overlook' && finaleState.textTimer > 3.6) {
                            finaleState.phase = 'twist';
                            finaleState.twistTimer = 0;
                            finaleState.textTimer = 0;
                            audioScape.setState(AUDIO_STATES.FINALE_TWIST);
                            if (audio) {
                                try { audio.play('stinger_sharp'); } catch (e) {}
                            }
                            postProcessing.addTrauma(0.65);
                        } else if (finaleState.phase === 'twist') {
                            finaleState.twistTimer += dt;
                            finaleState.shadowEyesAlpha = Math.min(1.0, finaleState.twistTimer * 0.6);
                            finaleState.shadowDetached = true;
                            finaleState.dialogue = "A cold shiver crawls down your spine...\n\nIt was never bound to the stone.\nIt was bound to you.";
                            if (finaleState.twistTimer > 6.0) {
                                finaleState.phase = 'title_drop';
                                finaleState.titleDropTimer = 0;
                                audioScape.setState(AUDIO_STATES.MENU);
                            }
                        }
                    }
                }

                // Render Surface Visuals
                renderer.clear();
                
                if (finaleState.phase !== 'title_drop') {
                    // Draw serene morning sky gradient directly to canvas
                    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
                    skyGrad.addColorStop(0, '#5da0d6'); // sky blue
                    skyGrad.addColorStop(0.65, '#a1d2f0');
                    skyGrad.addColorStop(1, '#ffe082'); // golden sunrise glow
                    ctx.fillStyle = skyGrad;
                    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

                    // Sun disk and warm rays
                    ctx.fillStyle = 'rgba(255, 245, 200, 0.95)';
                    ctx.beginPath();
                    ctx.arc(GAME_WIDTH * 0.78, 48, 22, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255, 235, 150, 0.25)';
                    ctx.beginPath();
                    ctx.arc(GAME_WIDTH * 0.78, 48, 48, 0, Math.PI * 2);
                    ctx.fill();

                    // Render World (Tiles, Birch tree, Player)
                    scene.render(renderer);

                    // If in twist phase, draw the watching eyes in the birch tree canopy and detached shadow
                    if (finaleState.phase === 'twist' && finaleState.shadowEyesAlpha > 0) {
                        renderer.beginCamera();
                        // Birch tree canopy position: x: 56 * 16 + 28, y: 13 * 16 - 95
                        const treeEyesX = 56 * 16 + 28;
                        const treeEyesY = 13 * 16 - 95;
                        SpriteRenderer.drawWatchingEyes(renderer, treeEyesX, treeEyesY, finaleState.shadowEyesAlpha);

                        // Detached elongated shadow standing in the sunny grass behind player
                        if (scene.player) {
                            const shadX = scene.player.x - 24;
                            const shadY = scene.player.y;
                            renderer.drawRect(shadX, shadY + 4, 12, 16, `rgba(10, 5, 15, ${finaleState.shadowEyesAlpha * 0.9})`);
                            renderer.drawRect(shadX + 2, shadY - 4, 8, 8, `rgba(10, 5, 15, ${finaleState.shadowEyesAlpha * 0.9})`);
                            // Shadow eyes glowing
                            renderer.drawRect(shadX + 3, shadY - 2, 2, 2, `rgba(255, 255, 255, ${finaleState.shadowEyesAlpha})`);
                            renderer.drawRect(shadX + 6, shadY - 2, 2, 2, `rgba(255, 255, 255, ${finaleState.shadowEyesAlpha})`);
                        }
                        renderer.endCamera();
                    }

                    // Blit pixel world to display canvas
                    renderer.present();

                    // Draw Crisp Epilogue Narration Banner & UI Overlay
                    const finaleUiCtx = renderer.getUIContext();
                    
                    // 1. Top-Right MENU Button on Surface
                    const menuBtnW = 90;
                    const menuBtnH = 32;
                    const menuBtnX = fW - menuBtnW - 28;
                    const menuBtnY = 24;
                    const isHoverMenu = fMouse.x >= menuBtnX && fMouse.x <= menuBtnX + menuBtnW && fMouse.y >= menuBtnY && fMouse.y <= menuBtnY + menuBtnH;

                    Typography.drawButton(finaleUiCtx, 'MENU', menuBtnX, menuBtnY, menuBtnW, menuBtnH, {
                        isHovered: isHoverMenu,
                        font: FONT_STACKS.CAPTION
                    });

                    // 2. Epilogue dialogue banner
                    if (finaleState.dialogue) {
                        const bannerW = Math.min(740, fW * 0.85);
                        const bannerH = 100;
                        const bannerX = fW / 2 - bannerW / 2;
                        const bannerY = fH - 140;

                        finaleUiCtx.save();
                        finaleUiCtx.fillStyle = finaleState.phase === 'twist' ? 'rgba(10, 2, 8, 0.92)' : 'rgba(15, 23, 42, 0.88)';
                        finaleUiCtx.fillRect(bannerX, bannerY, bannerW, bannerH);
                        finaleUiCtx.strokeStyle = finaleState.phase === 'twist' ? '#e11d48' : '#38bdf8';
                        finaleUiCtx.lineWidth = 2;
                        finaleUiCtx.strokeRect(bannerX, bannerY, bannerW, bannerH);

                        const lines = finaleState.dialogue.split('\n');
                        const startY = bannerY + (lines.length > 2 ? 26 : 38);
                        lines.forEach((line, idx) => {
                            finaleUiCtx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                            finaleUiCtx.fillStyle = finaleState.phase === 'twist' ? '#fecdd3' : '#f8fafc';
                            finaleUiCtx.textAlign = 'center';
                            finaleUiCtx.fillText(line, fW / 2, startY + idx * 24);
                        });
                        finaleUiCtx.restore();
                    }
                } else {
                    // Phase: Title Drop / Sequel Teaser
                    renderer.present();
                    const finaleUiCtx = renderer.getUIContext();

                    finaleState.titleDropTimer = (finaleState.titleDropTimer || 0) + dt;
                    const autoReturnDuration = 10.0;
                    const timeRemaining = Math.max(0, autoReturnDuration - finaleState.titleDropTimer);

                    finaleUiCtx.fillStyle = '#050208';
                    finaleUiCtx.fillRect(0, 0, fW, fH);

                    // Glowing sequel title
                    finaleUiCtx.save();
                    finaleUiCtx.textAlign = 'center';

                    // Title
                    finaleUiCtx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                    finaleUiCtx.fillStyle = '#f43f5e';
                    finaleUiCtx.fillText('ECHO II', fW / 2, fH * 0.36);

                    // Subtitle
                    finaleUiCtx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                    finaleUiCtx.fillStyle = '#cbd5e1';
                    finaleUiCtx.fillText('THE WATCHER REMAINS', fW / 2, fH * 0.44);

                    // Epilogue quote
                    finaleUiCtx.font = 'italic 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                    finaleUiCtx.fillStyle = '#94a3b8';
                    finaleUiCtx.fillText('"You escaped the stone. But the shadow never leaves."', fW / 2, fH * 0.54);
                    finaleUiCtx.restore();

                    // Prominent Return to Main Menu Button
                    const retBtnW = 280;
                    const retBtnH = 44;
                    const retBtnX = fW / 2 - retBtnW / 2;
                    const retBtnY = fH * 0.64;
                    const isHoverRet = fMouse.x >= retBtnX && fMouse.x <= retBtnX + retBtnW && fMouse.y >= retBtnY && fMouse.y <= retBtnY + retBtnH;

                    Typography.drawButton(finaleUiCtx, 'RETURN TO MAIN MENU', retBtnX, retBtnY, retBtnW, retBtnH, {
                        isHovered: isHoverRet,
                        isSelected: true,
                        font: FONT_STACKS.BODY_BOLD,
                        borderColor: isHoverRet ? '#38bdf8' : '#f43f5e',
                        textColor: isHoverRet ? '#ffffff' : '#fecdd3'
                    });

                    // Countdown & prompt guidance
                    Typography.drawText(finaleUiCtx, `Returning to Main Menu automatically in ${Math.ceil(timeRemaining)}s...`, fW / 2, retBtnY + retBtnH + 26, {
                        font: FONT_STACKS.CAPTION,
                        color: '#64748b',
                        align: 'center'
                    });
                    Typography.drawText(finaleUiCtx, 'Click button or press SPACE / ENTER / ESC to return now', fW / 2, retBtnY + retBtnH + 46, {
                        font: FONT_STACKS.CAPTION,
                        color: '#475569',
                        align: 'center'
                    });

                    // Check triggers to return to Main Menu
                    const isReturnTriggered = 
                        timeRemaining <= 0 ||
                        (isHoverRet && fClick) ||
                        (fClick && finaleState.titleDropTimer > 0.4) ||
                        input.isJustPressed('jump') ||
                        input.isJustPressed('pause') ||
                        Boolean(input.keys['Enter']) ||
                        Boolean(input.keys['Space']) ||
                        Boolean(input.keys['Escape']) ||
                        Boolean(input.keys['KeyE']);

                    if (isReturnTriggered) {
                        currentState = GAME_STATES.MENU;
                        audioScape.setState(AUDIO_STATES.MENU);
                        gameState.reset();
                    }
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
                if (pauseAction === 'resume' || (input.isJustPressed('pause') && hud.pauseSubmenu === 'main')) {
                    gameState.isPaused = false;
                    currentState = returnState;
                } else if (input.isJustPressed('pause')) {
                    hud.pauseSubmenu = 'main';
                } else if (pauseAction === 'refill_stats') {
                    gameState.health = 100;
                    gameState.sanity = 100;
                    if (scene.player) {
                        scene.player.stamina = 100;
                        scene.player.lanternOil = 100;
                    }
                    toastNotification.show('Refilled Health, Sanity, Stamina & Lantern Oil!', 'success');
                } else if (pauseAction === 'spawn_stalker') {
                    let shadow = scene.entities.find(e => e.type === 'shadow' || e instanceof Shadow);
                    if (!shadow && scene.player) {
                        shadow = new Shadow(scene.player.x + 80, scene.player.y);
                        scene.add(shadow);
                    }
                    if (shadow && scene.player) {
                        shadow.state = 1;
                        shadow.alpha = 1.0;
                        shadow.x = scene.player.x + (scene.player.facingRight ? -80 : 80);
                        shadow.y = scene.player.y;
                    }
                    audioScape.setState(AUDIO_STATES.CHASE);
                    toastNotification.show('👻 Shadow Stalker summoned in darkness!', 'warning');
                } else if (pauseAction === 'test_jumpscare') {
                    let shadow = scene.entities.find(e => e.type === 'shadow' || e instanceof Shadow);
                    if (!shadow && scene.player) {
                        shadow = new Shadow(scene.player.x + 20, scene.player.y);
                        scene.add(shadow);
                    }
                    if (shadow) {
                        shadow.jumpScareTimer = 0.55;
                    }
                    if (audio) {
                        audio.play('stalker_shriek');
                        audio.play('stinger_sharp');
                    }
                    postProcessing.addTrauma(1.0);
                    gameState.isPaused = false;
                    currentState = GAME_STATES.STORY;
                } else if (pauseAction === 'warp_tutorial') {
                    hud.pauseSubmenu = 'main';
                    gameState.isPaused = false;
                    currentState = GAME_STATES.STORY;
                    gameState.isTutorialLevel = true;
                    gameState.floorIndex = 0;
                    loadLevel(scene, TutorialLevel, gameState, renderer);
                    audioScape.setState(AUDIO_STATES.EXPLORATION);
                } else if (pauseAction === 'warp_b1') {
                    hud.pauseSubmenu = 'main';
                    gameState.isPaused = false;
                    currentState = GAME_STATES.STORY;
                    gameState.isTutorialLevel = false;
                    gameState.floorIndex = 1;
                    loadLevel(scene, Level1, gameState, renderer);
                    audioScape.setState(AUDIO_STATES.EXPLORATION);
                } else if (pauseAction === 'warp_b2') {
                    hud.pauseSubmenu = 'main';
                    gameState.isPaused = false;
                    currentState = GAME_STATES.STORY;
                    gameState.isTutorialLevel = false;
                    gameState.floorIndex = 2;
                    const nextLevel = getNextDungeonLevel(2);
                    loadLevel(scene, nextLevel, gameState, renderer);
                    audioScape.setState(AUDIO_STATES.EXPLORATION);
                } else if (pauseAction === 'warp_b3') {
                    hud.pauseSubmenu = 'main';
                    gameState.isPaused = false;
                    currentState = GAME_STATES.STORY;
                    gameState.isTutorialLevel = false;
                    gameState.floorIndex = 3;
                    const nextLevel = getNextDungeonLevel(3);
                    loadLevel(scene, nextLevel, gameState, renderer);
                    audioScape.setState(AUDIO_STATES.EXPLORATION);
                } else if (pauseAction === 'warp_finale') {
                    hud.pauseSubmenu = 'main';
                    gameState.isPaused = false;
                    startSurfaceFinale();
                } else if (pauseAction === 'quit' || input.keys['KeyQ']) {
                    hud.pauseSubmenu = 'main';
                    gameState.isPaused = false;
                    audioScape.setState(AUDIO_STATES.MENU);
                    currentState = GAME_STATES.MENU;
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

        // Flush input so the click/key that dismissed the overlay doesn't
        // bleed through and accidentally select a menu button on frame 1
        input.update();
        if (input.mouse) {
            input.mouse.isClicked = false;
            input.mouse.isDown = false;
            input.mouse.wasDown = false;
        }

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

    // If user clicked or pressed a key while scripts were loading, awaken immediately!
    if (window._userAwakened) {
        startGame();
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
                    scene.add(new Hazard(ent.x, ent.y, props.hazardType || 0, props.width || 16, props.height || 16, props));
                    break;
                case 'interactable':
                    scene.add(new Interactable(ent.x, ent.y, ent.interactType !== undefined ? ent.interactType : (props.interactType || 0), props));
                    break;
                case 'shadow':
                    scene.add(new Shadow(ent.x, ent.y));
                    break;
                case 'doppelganger':
                    scene.add(new Doppelganger(ent.x, ent.y, ent.facingRight ?? true));
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

    // --- REALISTIC FOOTSTEPS ---
    // 1. Dry, gritty stone footsteps
    for (let i = 1; i <= 3; i++) {
        const baseFreq = 85 + i * 18;
        const frictionFreq = 1600 + i * 250;
        const stoneStep = createBuffer(0.12, (t) => {
            const env = Math.exp(-t * 55);
            const body = Math.sin(2 * Math.PI * (baseFreq * Math.exp(-t * 40)) * t);
            const gritNoise = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * frictionFreq * t);
            const crunch = (Math.random() * 2 - 1) * Math.exp(-t * 80);
            return (body * 0.55 + gritNoise * 0.35 + crunch * 0.3) * env * 0.65;
        });
        audioManager.buffers.set(`footstep_stone_${i}`, stoneStep);
        audioManager.buffers.set(`footstep_${i}`, stoneStep);
    }
    audioManager.buffers.set('footstep', audioManager.buffers.get('footstep_stone_1'));

    // 2. Wet cavern puddle footsteps
    for (let i = 1; i <= 3; i++) {
        const splashPitch = 320 + i * 80;
        const wetStep = createBuffer(0.16, (t) => {
            const env = Math.exp(-t * 38);
            const bubbleFreq = splashPitch * Math.exp(-t * 25) + 120;
            const bubble = Math.sin(2 * Math.PI * bubbleFreq * t);
            const splash = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * (2400 + i * 300) * t);
            const thud = Math.sin(2 * Math.PI * 65 * t) * Math.exp(-t * 60);
            return (bubble * 0.45 + splash * 0.4 + thud * 0.3) * env * 0.6;
        });
        audioManager.buffers.set(`footstep_wet_${i}`, wetStep);
    }

    // --- VISCERAL BIOLOGICAL HEARTBEAT ("LUB-DUB") ---
    const visceralHeart = createBuffer(0.45, (t) => {
        let lub = 0;
        if (t < 0.14) {
            const tLub = t;
            const envLub = Math.exp(-tLub * 32);
            const freqLub = 75 * Math.exp(-tLub * 20) + 38;
            lub = Math.sin(2 * Math.PI * freqLub * tLub) * envLub * 0.9;
        }
        let dub = 0;
        if (t >= 0.14) {
            const tDub = t - 0.14;
            const envDub = Math.exp(-tDub * 36);
            const freqDub = 65 * Math.exp(-tDub * 22) + 32;
            dub = Math.sin(2 * Math.PI * freqDub * tDub) * envDub * 0.75;
        }
        return (lub + dub) * 0.95;
    });
    audioManager.buffers.set('visceral_heartbeat', visceralHeart);

    // --- RAGGED HUMAN BREATHING (HYPERVENTILATION) ---
    const raggedBreath = createBuffer(1.4, (t) => {
        let sample = 0;
        const noise = (Math.random() * 2 - 1);
        if (t < 0.65) {
            const tin = t / 0.65;
            const envIn = Math.sin(tin * Math.PI * 0.5) * Math.exp(- (1 - tin) * 1.5);
            const tremor = 0.7 + 0.3 * Math.sin(2 * Math.PI * 14 * t);
            const formant = Math.sin(2 * Math.PI * 520 * t) * 0.3 + noise * 0.7;
            sample = formant * envIn * tremor * 0.5;
        } else {
            const tout = (t - 0.65) / 0.75;
            const envOut = Math.sin(tout * Math.PI) * Math.exp(-tout * 2.2);
            const formant = Math.sin(2 * Math.PI * 340 * t) * 0.25 + noise * 0.75;
            sample = formant * envOut * 0.55;
        }
        return sample;
    });
    audioManager.buffers.set('ragged_breath', raggedBreath);
    audioManager.buffers.set('breathing', raggedBreath);

    // --- BONE SNAP & FLESH IMPACT ---
    const boneSnap = createBuffer(0.3, (t) => {
        const env = Math.exp(-t * 22);
        let snap = 0;
        if (t < 0.02) {
            snap = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 3400 * t) * (1 - t / 0.02);
        }
        const thud = Math.sin(2 * Math.PI * (120 * Math.exp(-t * 30) + 42) * t);
        const crunch = (Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.5;
        return (snap * 1.2 + thud * 0.7 + crunch * 0.4) * env * 0.95;
    });
    audioManager.buffers.set('bone_snap', boneSnap);
    audioManager.buffers.set('shadow_hit', boneSnap);

    const fleshWound = createBuffer(0.35, (t) => {
        const env = Math.exp(-t * 16);
        const sub = Math.sin(2 * Math.PI * (85 * Math.exp(-t * 25) + 32) * t);
        const squelch = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * (800 + Math.sin(t * 60) * 400) * t);
        return (sub * 0.7 + squelch * 0.45) * env * 0.9;
    });
    audioManager.buffers.set('flesh_wound', fleshWound);

    // --- STALKER SHRIEK & LUNGE ---
    const stalkerShriek = createBuffer(0.75, (t) => {
        const env = Math.exp(-t * 4.5);
        const f1 = 580 * Math.exp(-t * 3.5) + 180;
        const f2 = f1 * 1.05946;
        const f3 = f1 * 1.414;
        const fm = Math.sin(2 * Math.PI * 45 * t) * 80;
        const tone1 = Math.sin(2 * Math.PI * (f1 + fm) * t);
        const tone2 = Math.sin(2 * Math.PI * f2 * t);
        const tone3 = Math.sin(2 * Math.PI * f3 * t);
        const harsh = (Math.random() * 2 - 1) * 0.45;
        const sub = Math.sin(2 * Math.PI * 45 * t) * 0.5;
        return ((tone1 + tone2 + tone3) * 0.28 + harsh + sub) * env * 0.95;
    });
    audioManager.buffers.set('stalker_shriek', stalkerShriek);
    audioManager.buffers.set('shadow_scream', stalkerShriek);

    const stalkerLunge = createBuffer(0.5, (t) => {
        const env = Math.sin((t / 0.5) * Math.PI);
        const whoosh = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * (600 - t * 450) * t);
        const growl = Math.sin(2 * Math.PI * (160 * Math.exp(-t * 8) + 40) * t);
        return (whoosh * 0.6 + growl * 0.6) * env * 0.9;
    });
    audioManager.buffers.set('stalker_lunge', stalkerLunge);

    // --- PSYCHOLOGICAL: PHANTOM WHISPER ---
    const phantomWhisper = createBuffer(1.2, (t) => {
        const env = Math.sin((t / 1.2) * Math.PI);
        const noise = (Math.random() * 2 - 1);
        const formant = Math.sin(2 * Math.PI * (450 + Math.sin(t * 8) * 220) * t) * 0.4;
        const sibilance = Math.sin(2 * Math.PI * 3200 * t) * 0.25;
        return (noise * 0.45 + formant + sibilance) * env * 0.35;
    });
    audioManager.buffers.set('phantom_whisper', phantomWhisper);
    audioManager.buffers.set('whisper', phantomWhisper);

    // --- PSYCHOLOGICAL: HALLUCINATION DELAYED STEP ---
    const hallucinationStep = createBuffer(0.28, (t) => {
        const env = Math.exp(-t * 22);
        const impact = Math.sin(2 * Math.PI * (95 * Math.exp(-t * 35) + 38) * t);
        const scrape = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 1850 * t) * 0.35;
        const tail = Math.sin(2 * Math.PI * 160 * t) * Math.exp(-t * 12) * 0.3;
        return (impact * 0.7 + scrape * 0.3 + tail * 0.3) * env * 0.8;
    });
    audioManager.buffers.set('hallucination_step', hallucinationStep);

    // --- TORCH SNUFF & WICK HISS ---
    const torchSnuff = createBuffer(0.4, (t) => {
        const env = Math.exp(-t * 18);
        const pop = Math.sin(2 * Math.PI * (180 * Math.exp(-t * 40) + 45) * t) * 0.6;
        const hiss = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 2600 * t) * Math.exp(-t * 10);
        return (pop + hiss * 0.5) * env * 0.85;
    });
    audioManager.buffers.set('torch_snuff', torchSnuff);

    // --- ANCIENT STONE GATE GRIND ---
    const gateGrind = createBuffer(0.65, (t) => {
        const env = Math.sin((t / 0.65) * Math.PI);
        const sub = Math.sin(2 * Math.PI * 55 * t);
        const grit = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 420 * t);
        const friction = Math.sin(2 * Math.PI * (140 + Math.sin(t * 30) * 40) * t);
        return (sub * 0.4 + grit * 0.4 + friction * 0.35) * env * 0.75;
    });
    audioManager.buffers.set('gate_grind', gateGrind);

    // --- SWINGING PENDULUM WHOOSH ---
    const pendulumWhoosh = createBuffer(0.45, (t) => {
        const env = Math.sin((t / 0.45) * Math.PI);
        const sweepFreq = 480 * Math.exp(-t * 3.5) + 140;
        const tone = Math.sin(2 * Math.PI * sweepFreq * t);
        const air = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 900 * t);
        const metallicRing = Math.sin(2 * Math.PI * 1850 * t) * 0.2;
        return (tone * 0.4 + air * 0.5 + metallicRing) * env * 0.8;
    });
    audioManager.buffers.set('pendulum_whoosh', pendulumWhoosh);

    // --- EXISTING ESSENTIALS WITH POLISHED HARMONICS ---
    const stinger = createBuffer(0.35, (t) => {
        const env = Math.exp(-t * 12);
        const f1 = Math.sin(2 * Math.PI * 440 * t);      // A4
        const f2 = Math.sin(2 * Math.PI * 466.16 * t);   // Bb4 (minor 2nd)
        const f3 = Math.sin(2 * Math.PI * 622.25 * t);   // Eb5 (tritone)
        const f4 = Math.sin(2 * Math.PI * 277.18 * t);   // C#4
        return (f1 + f2 + f3 + f4) * 0.25 * env * 0.95;
    });
    audioManager.buffers.set('stinger_sharp', stinger);

    const drip = createBuffer(0.15, (t) => {
        const env = Math.exp(-t * 35);
        const freq = 2200 * Math.exp(-t * 20) + 800;
        return Math.sin(2 * Math.PI * freq * t) * env * 0.28;
    });
    audioManager.buffers.set('drip', drip);

    const crackle = createBuffer(0.4, (t) => {
        const env = Math.sin((t / 0.4) * Math.PI);
        const noise = (Math.random() * 2 - 1);
        const gate = Math.random() > 0.45 ? 1 : 0;
        return noise * gate * env * 0.35;
    });
    audioManager.buffers.set('static_crackle', crackle);

    const rumble = createBuffer(0.7, (t) => {
        const env = Math.sin((t / 0.7) * Math.PI);
        const noise = (Math.random() * 2 - 1) * 0.3;
        const low = Math.sin(2 * Math.PI * (45 + Math.sin(t * 15) * 10) * t);
        return (low * 0.6 + noise * 0.4) * env * 0.65;
    });
    audioManager.buffers.set('rumble', rumble);

    const thud = createBuffer(0.25, (t) => {
        const env = Math.exp(-t * 18);
        const freq = 120 * Math.exp(-t * 25) + 35;
        const tone = Math.sin(2 * Math.PI * freq * t);
        return tone * env * 0.75;
    });
    audioManager.buffers.set('thud', thud);

    const paper = createBuffer(0.18, (t) => {
        const env = Math.exp(-t * 15) * Math.sin(t * 40);
        return (Math.random() * 2 - 1) * env * 0.35;
    });
    audioManager.buffers.set('paper', paper);

    const click = createBuffer(0.05, (t) => {
        const env = Math.exp(-t * 110);
        const tone = Math.sin(2 * Math.PI * 1650 * t);
        return tone * env * 0.45;
    });
    audioManager.buffers.set('click', click);

    const doorCreak = createBuffer(0.6, (t) => {
        const env = Math.sin((t / 0.6) * Math.PI);
        const freq = 180 + Math.sin(t * 35) * 80 + Math.sin(t * 70) * 40;
        const tone = Math.sin(2 * Math.PI * freq * t);
        return tone * env * 0.4;
    });
    audioManager.buffers.set('door_creak', doorCreak);

    const dissonance = createBuffer(1.4, (t) => {
        const env = Math.sin((t / 1.4) * Math.PI);
        const f1 = Math.sin(2 * Math.PI * 220 * t);
        const f2 = Math.sin(2 * Math.PI * 233.08 * t);
        const f3 = Math.sin(2 * Math.PI * 311.13 * t);
        return (f1 + f2 + f3) * (1 / 3) * env * 0.55;
    });
    audioManager.buffers.set('dissonance', dissonance);

    const shadowBurn = createBuffer(0.75, (t) => {
        const env = Math.sin((t / 0.75) * Math.PI) * Math.exp(-t * 2);
        const noise = (Math.random() * 2 - 1);
        const hiss = Math.sin(2 * Math.PI * 3200 * t) * 0.3 + noise * 0.7;
        return hiss * env * 0.7;
    });
    audioManager.buffers.set('shadow_burn', shadowBurn);

    const flameFlare = createBuffer(0.5, (t) => {
        const env = Math.sin((t / 0.5) * Math.PI);
        const noise = (Math.random() * 2 - 1);
        const tone = Math.sin(2 * Math.PI * (280 - t * 180) * t);
        return (tone * 0.4 + noise * 0.6) * env * 0.75;
    });
    audioManager.buffers.set('flame_flare', flameFlare);

    // Glass bottle clink and fluid swirl for oil flasks
    const bottleClink = createBuffer(0.32, (t) => {
        const env = Math.exp(-t * 24);
        const glass1 = Math.sin(2 * Math.PI * 2250 * t);
        const glass2 = Math.sin(2 * Math.PI * 3420 * t) * 0.45;
        const slosh = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 450 * t) * Math.exp(-t * 14);
        return (glass1 + glass2 + slosh * 0.4) * env * 0.65;
    });
    audioManager.buffers.set('bottle_clink', bottleClink);
}

// Start once DOM is ready (or immediately if already parsed)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
