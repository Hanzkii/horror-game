/**
 * @file SoundStudio.js
 * @description In-game procedural horror sound design studio and synthesizer:
 * multi-layer generative ambient background music, drone engine, melodic tension chimes,
 * heartbeat pulse, cavern wind, and SFX tester.
 */

export default class SoundStudio {
    constructor(audioManager) {
        this.audio = audioManager;
        this.ctx = audioManager.context;
        this.isOpen = false;

        // Sound parameters
        this.params = {
            masterVol: 0.8,
            musicVol: 0.7,
            sfxVol: 0.85,
            droneVol: 0.6,
            droneFreq: 55, // A1
            droneWave: 'sine',
            droneLfoRate: 0.2, // breathing rate
            droneDetune: 8,
            chimesVol: 0.5,
            chimesRate: 3.5, // seconds between melodic chimes
            chimesTension: 0.6, // frequency of dissonant tritones/minor 2nds
            heartbeatVol: 0.4,
            heartbeatBpm: 60,
            windVol: 0.35,
            windCutoff: 350
        };

        // Synthesizer nodes
        this.isPlaying = false;
        this.synthNodes = {};
        this.chimesTimer = null;
        this.heartbeatTimer = null;

        this.initUI();
        this.setupSynth();
    }

    /**
     * Initializes the Sound Studio UI overlay.
     */
    initUI() {
        const overlay = document.createElement('div');
        overlay.id = 'sound-studio-panel';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            display: none;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #f0f6fc;
            z-index: 9100;
            user-select: none;
        `;

        overlay.innerHTML = `
            <!-- Top Bar -->
            <div style="pointer-events: auto; background: rgba(13, 17, 23, 0.98); border-bottom: 1px solid #30363d; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 6px 20px rgba(0,0,0,0.6);">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-weight: 800; font-size: 16px; letter-spacing: 0.08rem; color: #a371f7; display: flex; align-items: center; gap: 8px;">
                        <span style="background: #a371f7; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
                        SOUND DESIGN STUDIO
                    </span>
                    <span style="color: #6e7681; font-size: 13px;">|</span>
                    <span id="audio-status-label" style="color: #7ee787; font-size: 13px; font-weight: 600;">Active Procedural Soundscape</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button id="btn-toggle-music" style="background: #238636; border: 1px solid #2ea043; color: #fff; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.15s;">
                        <span>🔊</span> MUTE / UNMUTE
                    </button>
                    <button id="btn-close-sound" style="background: #30363d; border: 1px solid #444c56; color: #c9d1d9; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                        CLOSE
                    </button>
                </div>
            </div>

            <!-- Main Studio Content Grid -->
            <div style="pointer-events: auto; position: absolute; left: 50%; top: 70px; transform: translateX(-50%); width: 880px; max-width: 95vw; background: rgba(13, 17, 23, 0.96); border: 1px solid #30363d; border-radius: 10px; padding: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; box-shadow: 0 12px 36px rgba(0,0,0,0.7); max-height: calc(100vh - 100px); overflow-y: auto;">
                
                <!-- Column 1: Drone & Atmosphere Synthesizer -->
                <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <div style="font-size: 13px; font-weight: 800; color: #58a6ff; letter-spacing: 0.05rem; text-transform: uppercase;">
                        🌑 Sub-Drone Synthesizer
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px;">
                            <span>Drone Volume:</span>
                            <span id="lbl-drone-vol" style="color: #58a6ff; font-weight: 700;">60%</span>
                        </div>
                        <input type="range" id="slider-drone-vol" min="0" max="100" value="60" style="width: 100%; accent-color: #58a6ff;">
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px;">
                            <span>Root Pitch (Hz):</span>
                            <span id="lbl-drone-freq" style="color: #58a6ff; font-weight: 700;">55 Hz (A1)</span>
                        </div>
                        <input type="range" id="slider-drone-freq" min="35" max="110" value="55" style="width: 100%; accent-color: #58a6ff;">
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px;">
                            <span>Breathing Pulse (LFO):</span>
                            <span id="lbl-drone-lfo" style="color: #58a6ff; font-weight: 700;">0.20 Hz</span>
                        </div>
                        <input type="range" id="slider-drone-lfo" min="5" max="80" value="20" style="width: 100%; accent-color: #58a6ff;">
                    </div>

                    <div style="border-top: 1px solid #30363d; padding-top: 10px;">
                        <div style="font-size: 12px; font-weight: 700; color: #8b949e; margin-bottom: 6px; text-transform: uppercase;">Cavern Wind</div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px;">
                            <span>Wind Volume:</span>
                            <span id="lbl-wind-vol" style="color: #a5d6ff; font-weight: 700;">35%</span>
                        </div>
                        <input type="range" id="slider-wind-vol" min="0" max="100" value="35" style="width: 100%; accent-color: #a5d6ff;">
                    </div>
                </div>

                <!-- Column 2: Melodic Chimes & Heartbeat -->
                <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <div style="font-size: 13px; font-weight: 800; color: #a371f7; letter-spacing: 0.05rem; text-transform: uppercase;">
                        🎶 Horror Chimes & Pulse
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px;">
                            <span>Eerie Chimes Volume:</span>
                            <span id="lbl-chimes-vol" style="color: #a371f7; font-weight: 700;">50%</span>
                        </div>
                        <input type="range" id="slider-chimes-vol" min="0" max="100" value="50" style="width: 100%; accent-color: #a371f7;">
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px;">
                            <span>Chime Interval:</span>
                            <span id="lbl-chimes-rate" style="color: #a371f7; font-weight: 700;">3.5s</span>
                        </div>
                        <input type="range" id="slider-chimes-rate" min="15" max="80" value="35" style="width: 100%; accent-color: #a371f7;">
                    </div>

                    <div style="border-top: 1px solid #30363d; padding-top: 10px;">
                        <div style="font-size: 12px; font-weight: 700; color: #ff7b72; margin-bottom: 6px; text-transform: uppercase;">Heartbeat Thump</div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-bottom: 4px;">
                            <span>Heartbeat Volume:</span>
                            <span id="lbl-heart-vol" style="color: #ff7b72; font-weight: 700;">40%</span>
                        </div>
                        <input type="range" id="slider-heart-vol" min="0" max="100" value="40" style="width: 100%; accent-color: #ff7b72;">

                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #c9d1d9; margin-top: 10px; margin-bottom: 4px;">
                            <span>Pulse Rate (BPM):</span>
                            <span id="lbl-heart-bpm" style="color: #ff7b72; font-weight: 700;">60 BPM</span>
                        </div>
                        <input type="range" id="slider-heart-bpm" min="40" max="140" value="60" style="width: 100%; accent-color: #ff7b72;">
                    </div>
                </div>

                <!-- Column 3: Presets & Live SFX Tester -->
                <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 14px;">
                    <div style="font-size: 13px; font-weight: 800; color: #f0883e; letter-spacing: 0.05rem; text-transform: uppercase;">
                        🎛️ Presets & SFX Tester
                    </div>

                    <div>
                        <div style="font-size: 11px; font-weight: 700; color: #8b949e; margin-bottom: 6px; text-transform: uppercase;">Soundscape Presets</div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <button class="sound-preset-btn" data-preset="crypt" style="padding: 6px 10px; font-size: 12px; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; cursor: pointer; text-align: left; border-radius: 5px;">🌑 The Silent Crypt</button>
                            <button class="sound-preset-btn" data-preset="stalker" style="padding: 6px 10px; font-size: 12px; background: #0d1117; border: 1px solid #30363d; color: #a371f7; cursor: pointer; text-align: left; border-radius: 5px;">🩸 Stalker's Breath</button>
                            <button class="sound-preset-btn" data-preset="winds" style="padding: 6px 10px; font-size: 12px; background: #0d1117; border: 1px solid #30363d; color: #a5d6ff; cursor: pointer; text-align: left; border-radius: 5px;">🌪️ Abyssal Winds</button>
                            <button class="sound-preset-btn" data-preset="panic" style="padding: 6px 10px; font-size: 12px; background: #0d1117; border: 1px solid #30363d; color: #ff7b72; cursor: pointer; text-align: left; border-radius: 5px;">⚡ Sanity Collapse (Panic)</button>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #30363d; padding-top: 10px;">
                        <div style="font-size: 11px; font-weight: 700; color: #8b949e; margin-bottom: 6px; text-transform: uppercase;">Test In-Game Sound Effects</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            <button class="sfx-test-btn" data-sfx="footstep" style="padding: 6px; font-size: 11px; background: #21262d; border: 1px solid #30363d; color: #c9d1d9; cursor: pointer; border-radius: 4px;">👟 Footstep</button>
                            <button class="sfx-test-btn" data-sfx="thud" style="padding: 6px; font-size: 11px; background: #21262d; border: 1px solid #30363d; color: #c9d1d9; cursor: pointer; border-radius: 4px;">💥 Stone Thud</button>
                            <button class="sfx-test-btn" data-sfx="rumble" style="padding: 6px; font-size: 11px; background: #21262d; border: 1px solid #30363d; color: #c9d1d9; cursor: pointer; border-radius: 4px;">🪨 Cave Rumble</button>
                            <button class="sfx-test-btn" data-sfx="door_creak" style="padding: 6px; font-size: 11px; background: #21262d; border: 1px solid #30363d; color: #c9d1d9; cursor: pointer; border-radius: 4px;">🚪 Door Creak</button>
                            <button class="sfx-test-btn" data-sfx="click" style="padding: 6px; font-size: 11px; background: #21262d; border: 1px solid #30363d; color: #c9d1d9; cursor: pointer; border-radius: 4px;">⚙️ Lever Clank</button>
                            <button class="sfx-test-btn" data-sfx="dissonance" style="padding: 6px; font-size: 11px; background: #3d1b4d; border: 1px solid #8957e5; color: #d2a8ff; cursor: pointer; border-radius: 4px;">👻 Stalker Cry</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.dom = overlay;

        // Add Top-Right Sound Studio Trigger button
        const soundBtn = document.createElement('button');
        soundBtn.id = 'btn-open-sound-studio';
        soundBtn.innerHTML = '🎵 <span style="font-weight: 700;">SOUND STUDIO</span>';
        soundBtn.style.cssText = `
            position: fixed;
            top: 14px;
            right: 180px;
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
        soundBtn.addEventListener('mouseenter', () => {
            soundBtn.style.background = '#30363d';
            soundBtn.style.borderColor = '#a371f7';
        });
        soundBtn.addEventListener('mouseleave', () => {
            soundBtn.style.background = 'rgba(22, 27, 34, 0.9)';
            soundBtn.style.borderColor = '#30363d';
        });
        soundBtn.addEventListener('click', () => this.toggle());
        document.body.appendChild(soundBtn);

        this.setupEventListeners();
    }

    /**
     * Sets up Web Audio synthesis graphs for Drone, Wind, Heartbeat, and Chimes.
     */
    setupSynth() {
        if (!this.ctx) return;
        const ctx = this.ctx;

        // Master Bus for Studio
        this.studioMaster = ctx.createGain();
        this.studioMaster.gain.value = this.params.masterVol;
        this.studioMaster.connect(this.audio.masterGain);

        // 1. DRONE SYNTH
        this.droneGain = ctx.createGain();
        this.droneGain.gain.value = this.params.droneVol * 0.25;

        this.droneOsc1 = ctx.createOscillator();
        this.droneOsc1.type = 'sine';
        this.droneOsc1.frequency.value = this.params.droneFreq;

        this.droneOsc2 = ctx.createOscillator();
        this.droneOsc2.type = 'triangle';
        this.droneOsc2.frequency.value = this.params.droneFreq * 1.5; // perfect fifth
        this.droneOsc2.detune.value = this.params.droneDetune;

        // LFO for breathing swell
        this.droneLfo = ctx.createOscillator();
        this.droneLfo.frequency.value = this.params.droneLfoRate;
        this.droneLfoGain = ctx.createGain();
        this.droneLfoGain.gain.value = 6;
        this.droneLfo.connect(this.droneLfoGain);
        this.droneLfoGain.connect(this.droneOsc1.frequency);

        this.droneOsc1.connect(this.droneGain);
        this.droneOsc2.connect(this.droneGain);
        this.droneGain.connect(this.studioMaster);

        // 2. CAVERN WIND SYNTH (Filtered Noise)
        this.windGain = ctx.createGain();
        this.windGain.gain.value = this.params.windVol * 0.12;

        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        this.windNoise = ctx.createBufferSource();
        this.windNoise.buffer = noiseBuffer;
        this.windNoise.loop = true;

        this.windFilter = ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.value = this.params.windCutoff;
        this.windFilter.Q.value = 3.0;

        this.windNoise.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.studioMaster);

        // Start continuous generators
        try {
            this.droneOsc1.start();
            this.droneOsc2.start();
            this.droneLfo.start();
            this.windNoise.start();
            this.isPlaying = true;
        } catch (e) {
            // will start on user interaction
        }

        // 3. START TIMED PROCEDURAL LAYERS (Chimes & Heartbeat)
        this.startChimesLoop();
        this.startHeartbeatLoop();
    }

    /**
     * Plays a random eerie chime note (minor seconds, tritones, fifths).
     */
    triggerCreepyChime() {
        if (!this.isPlaying || this.params.chimesVol <= 0) return;
        const ctx = this.ctx;

        const notes = [
            220.0,  // A3
            233.08, // Bb3 (minor second dissonance!)
            277.18, // C#4
            311.13, // Eb4 (tritone!)
            329.63, // E4
            440.0,  // A4
            466.16  // Bb4
        ];
        const freq = notes[Math.floor(Math.random() * notes.length)];

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.params.chimesVol * 0.18, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

        osc.connect(gain);
        gain.connect(this.studioMaster);

        osc.start(now);
        osc.stop(now + 3.0);
    }

    startChimesLoop() {
        if (this.chimesTimer) clearTimeout(this.chimesTimer);
        const nextTime = (this.params.chimesRate * 0.7 + Math.random() * this.params.chimesRate * 0.6) * 1000;
        this.chimesTimer = setTimeout(() => {
            this.triggerCreepyChime();
            this.startChimesLoop();
        }, nextTime);
    }

    /**
     * Plays dual-thump heartbeat.
     */
    triggerHeartbeat() {
        if (!this.isPlaying || this.params.heartbeatVol <= 0) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const playThump = (timeOffset, intensity) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(80, now + timeOffset);
            osc.frequency.exponentialRampToValueAtTime(35, now + timeOffset + 0.12);

            gain.gain.setValueAtTime(0, now + timeOffset);
            gain.gain.linearRampToValueAtTime(this.params.heartbeatVol * 0.35 * intensity, now + timeOffset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.18);

            osc.connect(gain);
            gain.connect(this.studioMaster);
            osc.start(now + timeOffset);
            osc.stop(now + timeOffset + 0.2);
        };

        playThump(0, 1.0);     // "lub"
        playThump(0.14, 0.7);  // "dub"
    }

    startHeartbeatLoop() {
        if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
        const intervalMs = (60 / this.params.heartbeatBpm) * 1000;
        this.heartbeatTimer = setTimeout(() => {
            this.triggerHeartbeat();
            this.startHeartbeatLoop();
        }, intervalMs);
    }

    /**
     * Binds DOM UI controls to synthesizer parameters.
     */
    setupEventListeners() {
        const bindSlider = (id, labelId, formatter, onChange) => {
            const slider = this.dom.querySelector(id);
            const label = this.dom.querySelector(labelId);
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                label.innerText = formatter(val);
                onChange(val);
            });
        };

        // Drone Vol
        bindSlider('#slider-drone-vol', '#lbl-drone-vol', (v) => `${v}%`, (v) => {
            this.params.droneVol = v / 100;
            if (this.droneGain) this.droneGain.gain.setTargetAtTime(this.params.droneVol * 0.25, this.ctx.currentTime, 0.1);
        });

        // Drone Pitch
        bindSlider('#slider-drone-freq', '#lbl-drone-freq', (v) => `${v} Hz`, (v) => {
            this.params.droneFreq = v;
            if (this.droneOsc1) this.droneOsc1.frequency.setTargetAtTime(v, this.ctx.currentTime, 0.1);
            if (this.droneOsc2) this.droneOsc2.frequency.setTargetAtTime(v * 1.5, this.ctx.currentTime, 0.1);
        });

        // Drone LFO
        bindSlider('#slider-drone-lfo', '#lbl-drone-lfo', (v) => `${(v / 100).toFixed(2)} Hz`, (v) => {
            this.params.droneLfoRate = v / 100;
            if (this.droneLfo) this.droneLfo.frequency.setTargetAtTime(this.params.droneLfoRate, this.ctx.currentTime, 0.1);
        });

        // Wind Vol
        bindSlider('#slider-wind-vol', '#lbl-wind-vol', (v) => `${v}%`, (v) => {
            this.params.windVol = v / 100;
            if (this.windGain) this.windGain.gain.setTargetAtTime(this.params.windVol * 0.12, this.ctx.currentTime, 0.1);
        });

        // Chimes Vol
        bindSlider('#slider-chimes-vol', '#lbl-chimes-vol', (v) => `${v}%`, (v) => {
            this.params.chimesVol = v / 100;
        });

        // Chimes Rate
        bindSlider('#slider-chimes-rate', '#lbl-chimes-rate', (v) => `${(v / 10).toFixed(1)}s`, (v) => {
            this.params.chimesRate = v / 10;
        });

        // Heartbeat Vol
        bindSlider('#slider-heart-vol', '#lbl-heart-vol', (v) => `${v}%`, (v) => {
            this.params.heartbeatVol = v / 100;
        });

        // Heartbeat BPM
        bindSlider('#slider-heart-bpm', '#lbl-heart-bpm', (v) => `${v} BPM`, (v) => {
            this.params.heartbeatBpm = v;
        });

        // Close button
        this.dom.querySelector('#btn-close-sound').addEventListener('click', () => this.toggle(false));

        // Mute / Unmute
        this.dom.querySelector('#btn-toggle-music').addEventListener('click', () => {
            if (this.studioMaster.gain.value > 0) {
                this.studioMaster.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
                this.dom.querySelector('#audio-status-label').innerText = 'Muted';
                this.dom.querySelector('#audio-status-label').style.color = '#ff7b72';
            } else {
                this.studioMaster.gain.setTargetAtTime(this.params.masterVol, this.ctx.currentTime, 0.05);
                this.dom.querySelector('#audio-status-label').innerText = 'Active Procedural Soundscape';
                this.dom.querySelector('#audio-status-label').style.color = '#7ee787';
            }
        });

        // Presets
        this.dom.querySelectorAll('.sound-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyPreset(preset);
            });
        });

        // SFX Tester
        this.dom.querySelectorAll('.sfx-test-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sfx = btn.dataset.sfx;
                if (this.audio) this.audio.play(sfx);
            });
        });
    }

    applyPreset(name) {
        if (name === 'crypt') {
            this.params.droneFreq = 55;
            this.params.droneVol = 0.6;
            this.params.chimesVol = 0.3;
            this.params.windVol = 0.4;
            this.params.heartbeatVol = 0.2;
            this.params.heartbeatBpm = 50;
        } else if (name === 'stalker') {
            this.params.droneFreq = 48;
            this.params.droneVol = 0.7;
            this.params.chimesVol = 0.75;
            this.params.chimesRate = 2.0;
            this.params.windVol = 0.2;
            this.params.heartbeatVol = 0.6;
            this.params.heartbeatBpm = 85;
        } else if (name === 'winds') {
            this.params.droneFreq = 40;
            this.params.droneVol = 0.4;
            this.params.chimesVol = 0.2;
            this.params.windVol = 0.8;
            this.params.heartbeatVol = 0.15;
            this.params.heartbeatBpm = 45;
        } else if (name === 'panic') {
            this.params.droneFreq = 65;
            this.params.droneVol = 0.85;
            this.params.chimesVol = 0.9;
            this.params.chimesRate = 1.2;
            this.params.windVol = 0.5;
            this.params.heartbeatVol = 0.9;
            this.params.heartbeatBpm = 125;
        }

        // Sync sliders & synth
        if (this.droneGain) this.droneGain.gain.setTargetAtTime(this.params.droneVol * 0.25, this.ctx.currentTime, 0.1);
        if (this.droneOsc1) this.droneOsc1.frequency.setTargetAtTime(this.params.droneFreq, this.ctx.currentTime, 0.1);
        if (this.windGain) this.windGain.gain.setTargetAtTime(this.params.windVol * 0.12, this.ctx.currentTime, 0.1);
    }

    toggle(forceState) {
        this.isOpen = (forceState !== undefined) ? forceState : !this.isOpen;
        this.dom.style.display = this.isOpen ? 'block' : 'none';
    }
}
