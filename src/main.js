// Import Engine Components
import Game from './engine/Game.js';
import Renderer from './engine/Renderer.js';
import Input from './engine/Input.js';
import AudioManager from './engine/AudioManager.js';
import Scene from './engine/Scene.js';

// Import Entities
import { Player } from './entities/Player.js';
import { Hazard } from './entities/Hazard.js';
import { Interactable } from './entities/Interactable.js';
import { Shadow } from './entities/Shadow.js';

// Import Content
import { Level1 } from './levels/Level1.js';
import { GameState } from './game/GameState.js';

// Import local systems
import PostProcessing from './effects/PostProcessing.js';
import HUD from './ui/HUD.js';

// Configuration
const GAME_WIDTH = 480;
const GAME_HEIGHT = 270;

async function init() {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    // Resize handler to maintain aspect ratio
    function resize() {
        const scale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
        canvas.style.width = `${GAME_WIDTH * scale}px`;
        canvas.style.height = `${GAME_HEIGHT * scale}px`;
    }
    window.addEventListener('resize', resize);
    resize();

    // Initialize core systems
    const input = new Input();
    const audio = new AudioManager();
    const renderer = new Renderer(canvas, GAME_WIDTH, GAME_HEIGHT);
    const gameState = new GameState();

    const ctx = renderer.bctx; // Use the renderer's internal buffer context for overlays
    const postProcessing = new PostProcessing(ctx, GAME_WIDTH, GAME_HEIGHT);
    const hud = new HUD(ctx, GAME_WIDTH, GAME_HEIGHT);

    const scene = new Scene();

    // Wire up subsystems on scene so entities can access them
    scene.audio = audio;
    scene.ui = hud;
    scene.gameState = gameState;
    scene.input = input;

    // Procedural Audio Generation (since we lack audio files)
    setupProceduralAudio(audio);

    // Load Level 1
    loadLevel(scene, Level1, gameState);

    let lastTime = 0;

    // Main Game Loop
    function loop(timestamp) {
        // Prevent huge dt on first frame
        if (lastTime === 0) lastTime = timestamp;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
        lastTime = timestamp;

        // Input handling for pausing
        if (input.isJustPressed('pause')) {
            if (gameState.activeNote) {
                gameState.activeNote = null;
            } else {
                gameState.isPaused = !gameState.isPaused;
            }
        }

        if (!gameState.isPaused && !gameState.activeNote) {
            // Reset per-frame interaction state (Interactables set this when player is in range)
            gameState.canInteract = false;

            // Update systems
            scene.update(dt, input, gameState);
            gameState.update(dt);
            postProcessing.update(dt);
            hud.update(dt);

            // Camera follow player
            if (scene.player) {
                renderer.lookAt(scene.player.x + scene.player.width / 2, scene.player.y + scene.player.height / 2);
                renderer.updateCamera(dt);
            }
        }

        // Render pass
        renderer.clear();

        // Render world (tiles + entities) through the renderer's camera system
        scene.render(renderer);

        // Post Processing (effects that rely on screen space)
        // Transform player pos to screen space for light origin
        const playerScreenPos = scene.player
            ? {
                x: scene.player.x + scene.player.width / 2 - renderer.camera.x,
                y: scene.player.y + scene.player.height / 2 - renderer.camera.y
            }
            : { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };

        // Normalize sanity to 0-1 range for effects
        const sanityNormalized = gameState.sanity / gameState.maxSanity;
        postProcessing.render(playerScreenPos, sanityNormalized);

        // UI
        hud.render(gameState);

        // Present the internal buffer to the display canvas
        renderer.present();

        // Cycle input states at end of frame
        input.update();

        requestAnimationFrame(loop);
    }

    // Title screen awakening and input focus management
    const loadingOverlay = document.getElementById('loading-overlay');
    let gameStarted = false;

    function startGame() {
        if (gameStarted) return;
        gameStarted = true;

        loadingOverlay.classList.add('hidden');
        window.focus();

        // Unlock browser Web Audio
        if (audio.context.state === 'suspended') {
            audio.context.resume();
        }
        startAmbientDrone(audio);
        hud.fadeIn(0.5);
        requestAnimationFrame(loop);
    }

    // Awaken on explicit click or keypress
    loadingOverlay.addEventListener('click', startGame);
    window.addEventListener('click', () => {
        window.focus();
        if (!gameStarted) startGame();
    });
    window.addEventListener('keydown', () => {
        if (!gameStarted) startGame();
    });

    // Fallback auto-start after 3.5 seconds
    setTimeout(() => {
        if (!gameStarted) startGame();
    }, 3500);
}

function loadLevel(scene, levelData, gameState) {
    // Load tilemap — no tileset image for prototype, we'll render colored rectangles
    scene.loadMap(levelData.tiles, levelData.tileSize || 16, null);

    // Store level dimensions for camera clamping
    scene.width = scene.columns * scene.tileSize;
    scene.height = scene.rows * scene.tileSize;

    // Spawn player at level start
    const ps = levelData.playerStart;
    scene.player = new Player(ps.x, ps.y);
    scene.add(scene.player);

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

    // Footstep: low muffled tap
    const footstep = createBuffer(0.08, (t) => {
        const env = Math.exp(-t * 50);
        const noise = (Math.random() * 2 - 1) * 0.3;
        const tone = Math.sin(2 * Math.PI * 90 * t);
        return (tone * 0.7 + noise) * env * 0.35;
    });
    audioManager.buffers.set('footstep', footstep);

    // Rumble: low trembling drone
    const rumble = createBuffer(0.7, (t) => {
        const env = Math.sin((t / 0.7) * Math.PI);
        const noise = (Math.random() * 2 - 1) * 0.3;
        const low = Math.sin(2 * Math.PI * (45 + Math.sin(t * 15) * 10) * t);
        return (low * 0.6 + noise * 0.4) * env * 0.6;
    });
    audioManager.buffers.set('rumble', rumble);

    // Thud: heavy impact
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
}

function startAmbientDrone(audioManager) {
    const ctx = audioManager.context;

    // Low drone oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55; // Low drone

    // Subtle LFO for breathing effect
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(audioManager.masterGain);
    gain.gain.value = 0.15;

    osc.start();
    lfo.start();

    // Secondary eerie overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = 82.5; // Perfect fifth above drone
    osc2.connect(gain2);
    gain2.connect(audioManager.masterGain);
    gain2.gain.value = 0.05;
    osc2.start();
}

// Start everything once DOM is ready
window.addEventListener('DOMContentLoaded', init);
