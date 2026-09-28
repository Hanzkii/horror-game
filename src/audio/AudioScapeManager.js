/**
 * @file AudioScapeManager.js
 * @description Dynamic multi-state horror soundscape controller with procedural synthesis,
 * audio bus mixing, generative wind/drones, biological heartbeat, and seamless state crossfading.
 */

export const AUDIO_STATES = {
    MENU: 'menu',
    EXPLORATION: 'exploration',
    TENSION: 'tension',
    CHASE: 'chase',
    SANCTUARY: 'sanctuary',
    SURFACE_PEACEFUL: 'surface_peaceful',
    FINALE_TWIST: 'finale_twist'
};

export class AudioScapeManager {
    constructor(audioManager) {
        this.audio = audioManager;
        this.ctx = audioManager?.context || null;
        this.currentState = AUDIO_STATES.MENU;
        this.stateTimer = 0;
        this.isPlaying = false;

        // Bus gains (0.0 to 1.0)
        this.volumes = {
            master: 0.8,
            music: 0.7,
            ambient: 0.85,
            sfx: 0.85
        };

        // Synthesis parameters
        this.params = {
            masterVol: 0.8,
            droneVol: 0.15,
            droneFreq: 38,
            windVol: 0.65,
            windCutoff: 450,
            chimesVol: 0.25,
            chimesRate: 6.0,
            heartbeatVol: 0.0,
            heartbeatBpm: 55
        };

        // Synthesizer timers & node references
        this.synthNodes = {};
        this.chimesTimer = null;
        this.heartbeatTimer = null;
        this.nextBirdChirpTime = 0;

        if (this.ctx) {
            this.setupSynth();
        }
    }

    /**
     * Initializes procedural Web Audio synthesis graphs for Drone, Wind, and Master Output.
     */
    setupSynth() {
        if (!this.ctx) return;
        const ctx = this.ctx;

        try {
            // Master Bus for Ambient Synthesizer
            this.studioMaster = ctx.createGain();
            this.studioMaster.gain.value = 0;
            if (this.audio && this.audio.masterGain) {
                this.studioMaster.connect(this.audio.masterGain);
            } else {
                this.studioMaster.connect(ctx.destination);
            }

            // 1. DEEP SUBTERRANEAN DREAD DRONE (Binaural beating sub-bass rumble)
            this.droneGain = ctx.createGain();
            this.droneGain.gain.value = 0;

            this.droneOsc1 = ctx.createOscillator();
            this.droneOsc1.type = 'sine';
            this.droneOsc1.frequency.value = this.params.droneFreq; // 38 Hz deep chest resonance

            this.droneOsc2 = ctx.createOscillator();
            this.droneOsc2.type = 'sine';
            this.droneOsc2.frequency.value = this.params.droneFreq + 1.4; // Binaural 1.4Hz pulse

            // Slow breathing LFO
            this.droneLfo = ctx.createOscillator();
            this.droneLfo.frequency.value = 0.08;
            this.droneLfoGain = ctx.createGain();
            this.droneLfoGain.gain.value = 2.5;
            this.droneLfo.connect(this.droneLfoGain);
            this.droneLfoGain.connect(this.droneOsc1.frequency);

            this.droneOsc1.connect(this.droneGain);
            this.droneOsc2.connect(this.droneGain);
            this.droneGain.connect(this.studioMaster);

            // 2. CAVERN WIND & HOWLING DRAFTS SYNTH
            this.windGain = ctx.createGain();
            this.windGain.gain.value = 0;

            const bufferSize = Math.floor(ctx.sampleRate * 3);
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            let lastSample = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                lastSample = (lastSample + 0.03 * white) / 1.03; // Pink/brown acoustic noise
                output[i] = lastSample * 3.5;
            }

            this.windNoise = ctx.createBufferSource();
            this.windNoise.buffer = noiseBuffer;
            this.windNoise.loop = true;

            this.windFilter = ctx.createBiquadFilter();
            this.windFilter.type = 'lowpass';
            this.windFilter.frequency.value = 600;

            this.windResonance = ctx.createBiquadFilter();
            this.windResonance.type = 'bandpass';
            this.windResonance.frequency.value = this.params.windCutoff;
            this.windResonance.Q.value = 1.8;

            // Wind LFO sweeps resonant bandpass to simulate organic howling drafts
            this.windLfo = ctx.createOscillator();
            this.windLfo.frequency.value = 0.12;
            this.windLfoGain = ctx.createGain();
            this.windLfoGain.gain.value = 180;
            this.windLfo.connect(this.windLfoGain);
            this.windLfoGain.connect(this.windResonance.frequency);

            this.windNoise.connect(this.windFilter);
            this.windFilter.connect(this.windResonance);
            this.windResonance.connect(this.windGain);
            this.windGain.connect(this.studioMaster);

            // Start generators
            this.droneOsc1.start();
            this.droneOsc2.start();
            this.droneLfo.start();
            this.windNoise.start();
            this.windLfo.start();
        } catch (e) {
            console.warn('AudioScape synth setup error:', e);
        }
    }

    setVolumes(volumes) {
        if (!volumes) return;
        if (volumes.masterVol !== undefined) this.volumes.master = volumes.masterVol;
        if (volumes.musicVol !== undefined) this.volumes.music = volumes.musicVol;
        if (volumes.ambientVol !== undefined) this.volumes.ambient = volumes.ambientVol;
        if (volumes.sfxVol !== undefined) this.volumes.sfx = volumes.sfxVol;
        if (volumes.master !== undefined) this.volumes.master = volumes.master;
        if (volumes.music !== undefined) this.volumes.music = volumes.music;
        if (volumes.ambient !== undefined) this.volumes.ambient = volumes.ambient;
        if (volumes.sfx !== undefined) this.volumes.sfx = volumes.sfx;

        if (this.audio) {
            if (this.audio.setMasterVolume) this.audio.setMasterVolume(this.volumes.master);
            if (this.audio.setMusicVolume) this.audio.setMusicVolume(this.volumes.music);
            if (this.audio.setAmbientVolume) this.audio.setAmbientVolume(this.volumes.ambient);
            if (this.audio.setSfxVolume) this.audio.setSfxVolume(this.volumes.sfx);
        }

        if (this.studioMaster && this.ctx) {
            const vol = this.isPlaying ? this.volumes.master : 0;
            this.studioMaster.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
        }
    }

    startAmbient() {
        if (this.isPlaying || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        this.isPlaying = true;
        const now = this.ctx.currentTime;
        if (this.studioMaster) {
            this.studioMaster.gain.setTargetAtTime(this.volumes.master, now, 0.4);
        }
        this.startChimesLoop();
        this.startHeartbeatLoop();
    }

    stopAmbient() {
        if (!this.isPlaying || !this.ctx) return;
        this.isPlaying = false;
        const now = this.ctx.currentTime;
        if (this.studioMaster) {
            this.studioMaster.gain.setTargetAtTime(0, now, 0.1);
        }
        if (this.chimesTimer) {
            clearTimeout(this.chimesTimer);
            this.chimesTimer = null;
        }
        if (this.heartbeatTimer) {
            clearTimeout(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    setState(newState) {
        if (this.currentState === newState) return;
        this.currentState = newState;
        this.stateTimer = 0;

        if (newState === AUDIO_STATES.MENU) {
            this.stopAmbient();
        } else {
            if (!this.isPlaying) {
                this.startAmbient();
            }
        }
    }

    /**
     * Plays dual-thump visceral heartbeat ("lub-dub").
     */
    triggerHeartbeat() {
        if (!this.isPlaying || this.params.heartbeatVol <= 0 || !this.ctx) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;

        const playThump = (timeOffset, intensity, startFreq, endFreq) => {
            try {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(startFreq, now + timeOffset);
                osc.frequency.exponentialRampToValueAtTime(endFreq, now + timeOffset + 0.11);

                gain.gain.setValueAtTime(0, now + timeOffset);
                gain.gain.linearRampToValueAtTime(this.params.heartbeatVol * 0.45 * intensity, now + timeOffset + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.16);

                osc.connect(gain);
                gain.connect(this.studioMaster || ctx.destination);
                osc.start(now + timeOffset);
                osc.stop(now + timeOffset + 0.18);
            } catch (e) {}
        };

        playThump(0, 1.0, 75, 35);      // "lub"
        playThump(0.14, 0.72, 65, 30);  // "dub"
    }

    startHeartbeatLoop() {
        if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
        const intervalMs = Math.max(300, (60 / (this.params.heartbeatBpm || 60)) * 1000);
        this.heartbeatTimer = setTimeout(() => {
            this.triggerHeartbeat();
            if (this.isPlaying) {
                this.startHeartbeatLoop();
            }
        }, intervalMs);
    }

    /**
     * Plays a random dissonant chime note.
     */
    triggerCreepyChime() {
        if (!this.isPlaying || this.params.chimesVol <= 0 || !this.ctx) return;
        const ctx = this.ctx;
        const notes = [220.0, 233.08, 277.18, 311.13, 329.63, 440.0, 466.16];
        const freq = notes[Math.floor(Math.random() * notes.length)];

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const now = ctx.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.params.chimesVol * 0.18, now + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

            osc.connect(gain);
            gain.connect(this.studioMaster || ctx.destination);
            osc.start(now);
            osc.stop(now + 2.8);
        } catch (e) {}
    }

    startChimesLoop() {
        if (this.chimesTimer) clearTimeout(this.chimesTimer);
        const nextTime = (this.params.chimesRate * 0.7 + Math.random() * this.params.chimesRate * 0.6) * 1000;
        this.chimesTimer = setTimeout(() => {
            this.triggerCreepyChime();
            if (this.isPlaying) {
                this.startChimesLoop();
            }
        }, nextTime);
    }

    update(dt, gameState, shadowDistance = 9999, floorIndex = 1, options = {}) {
        if (!this.ctx) return;
        const time = this.ctx.currentTime;

        if (this.currentState === AUDIO_STATES.MENU) {
            if (this.isPlaying) this.stopAmbient();
            return;
        }

        this.stateTimer += dt;

        // Finale peaceful / twist scripted modes
        if (this.currentState === AUDIO_STATES.SURFACE_PEACEFUL || this.currentState === AUDIO_STATES.FINALE_TWIST) {
            if (this.currentState === AUDIO_STATES.SURFACE_PEACEFUL) {
                if (this.windGain) this.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.15, time, 0.4);
                if (this.droneGain) this.droneGain.gain.setTargetAtTime(0, time, 0.4);
                this.params.heartbeatVol = 0;
                if (time >= this.nextBirdChirpTime) {
                    this.playBirdChirp();
                    this.nextBirdChirpTime = time + 1.2 + Math.random() * 2.2;
                }
                return;
            } else if (this.currentState === AUDIO_STATES.FINALE_TWIST) {
                if (this.windGain) this.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.65, time, 0.1);
                if (this.droneGain) this.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.5, time, 0.1);
                if (this.droneOsc1) this.droneOsc1.frequency.setTargetAtTime(28, time, 0.1);
                this.params.heartbeatVol = 0.95;
                this.params.heartbeatBpm = 135;
                return;
            }
        }

        // Subterranean Horror States
        let targetState = AUDIO_STATES.EXPLORATION;
        if (options.isNearTorch) {
            targetState = AUDIO_STATES.SANCTUARY;
        } else if (shadowDistance < 70) {
            targetState = AUDIO_STATES.CHASE;
        } else if (shadowDistance < 220) {
            targetState = AUDIO_STATES.TENSION;
        }

        if (this.currentState !== targetState) {
            this.currentState = targetState;
        }

        switch (this.currentState) {
            case AUDIO_STATES.SANCTUARY:
                if (this.windGain) this.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.2, time, 0.4);
                if (this.droneGain) this.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.03, time, 0.4);
                break;

            case AUDIO_STATES.CHASE:
                if (this.windGain) this.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.62, time, 0.2);
                if (this.droneGain) this.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.38, time, 0.2);
                if (Math.random() < 0.03 && this.audio) {
                    try { this.audio.play('static_crackle', { volume: 0.25 }); } catch (e) {}
                }
                break;

            case AUDIO_STATES.TENSION:
                if (this.windGain) this.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.48, time, 0.3);
                if (this.droneGain) this.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.22, time, 0.3);
                break;

            case AUDIO_STATES.EXPLORATION:
            default:
                if (this.windGain) this.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.4, time, 0.5);
                if (this.droneGain) this.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.08, time, 0.5);
                break;
        }

        // Dynamic Heartbeat based on sanity and proximity
        const maxSanity = (gameState && gameState.maxSanity) || 100;
        const currentSanity = (gameState && gameState.sanity !== undefined) ? gameState.sanity : 100;
        const sanityNorm = Math.max(0, Math.min(1, currentSanity / maxSanity));
        const panic = 1 - sanityNorm;

        const isChasing = (this.currentState === AUDIO_STATES.CHASE);
        const isTense = (this.currentState === AUDIO_STATES.TENSION);

        if (panic > 0.05 || isChasing || isTense) {
            const threatBoost = isChasing ? 0.35 : (isTense ? 0.15 : 0);
            const totalPanic = Math.min(1.0, panic + threatBoost);

            this.params.heartbeatVol = totalPanic * 0.95 * (this.volumes.sfx ?? 0.85);
            this.params.heartbeatBpm = Math.round(55 + totalPanic * 85);
        } else {
            this.params.heartbeatVol = 0;
            this.params.heartbeatBpm = 55;
        }

        // Deeper floor pitch tuning
        if (this.droneOsc1 && this.droneOsc1.frequency) {
            const targetPitch = Math.max(30, 38 - (floorIndex - 1) * 2);
            this.droneOsc1.frequency.setTargetAtTime(targetPitch, time, 0.6);
        }
    }

    /**
     * Synthesizes an organic morning birdsong chirp using Web Audio oscillators.
     */
    playBirdChirp() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';

            const baseFreq = 2200 + Math.random() * 800;
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq + 850, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(baseFreq - 300, now + 0.14);

            const vol = (this.volumes.ambient || 0.8) * 0.14;
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(vol, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

            osc.connect(gain);
            gain.connect(this.studioMaster || ctx.destination);

            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }
}

export default AudioScapeManager;
