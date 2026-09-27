/**
 * @file AdaptiveAudio.js
 * @description Reactive horror soundscape & acoustic puzzle clue synthesizer.
 * Dynamically alters sub-drone harmonics, LFO pulsation, subterranean resonance,
 * and proximity clues as the player explores and interacts with dungeon puzzles.
 */

export default class AdaptiveAudio {
    constructor(audioManager, soundStudio) {
        this.audio = audioManager;
        this.soundStudio = soundStudio;
        this.isActive = false;
        
        this.breathingSrc = null;
        this.breathingGain = null;
        
        this.crackleSrc = null;
        this.crackleGain = null;

        // Dedicated acoustic clue & puzzle resonance synthesizer
        this.puzzleResonanceOsc = null;
        this.puzzleResonanceGain = null;
        this.lastLeverPulled = false;
    }
    
    startAmbient() {
        this.isActive = true;
        const ctx = this.audio.context;
        
        // Ensure sound studio synth is running
        if (!this.soundStudio.isPlaying) {
            try {
                if (this.soundStudio.droneOsc1) this.soundStudio.droneOsc1.start();
                if (this.soundStudio.droneOsc2) this.soundStudio.droneOsc2.start();
                if (this.soundStudio.droneLfo) this.soundStudio.droneLfo.start();
                if (this.soundStudio.windNoise) this.soundStudio.windNoise.start();
                this.soundStudio.isPlaying = true;
                if (this.soundStudio.startChimesLoop) this.soundStudio.startChimesLoop();
                if (this.soundStudio.startHeartbeatLoop) this.soundStudio.startHeartbeatLoop();
            } catch(e) { /* may already be started */ }
        }
        
        // 1. Proximity Breathing Layer
        const breathBuf = this.audio.buffers.get('breathing');
        if (breathBuf) {
            this.breathingSrc = ctx.createBufferSource();
            this.breathingSrc.buffer = breathBuf;
            this.breathingSrc.loop = true;
            this.breathingGain = ctx.createGain();
            this.breathingGain.gain.value = 0;
            this.breathingSrc.connect(this.breathingGain);
            this.breathingGain.connect(this.audio.masterGain);
            this.breathingSrc.start();
        }

        // 2. Static Crackle Layer
        const crackleBuf = this.audio.buffers.get('static_crackle');
        if (crackleBuf) {
            this.crackleSrc = ctx.createBufferSource();
            this.crackleSrc.buffer = crackleBuf;
            this.crackleSrc.loop = true;
            this.crackleGain = ctx.createGain();
            this.crackleGain.gain.value = 0;
            this.crackleSrc.connect(this.crackleGain);
            this.crackleGain.connect(this.audio.masterGain);
            this.crackleSrc.start();
        }

        // 3. Acoustic Puzzle Resonance Synthesizer (Singing Harmonic Clue Node)
        try {
            this.puzzleResonanceGain = ctx.createGain();
            this.puzzleResonanceGain.gain.value = 0;
            this.puzzleResonanceOsc = ctx.createOscillator();
            this.puzzleResonanceOsc.type = 'sine';
            this.puzzleResonanceOsc.frequency.value = 110; // A2
            this.puzzleResonanceOsc.connect(this.puzzleResonanceGain);
            this.puzzleResonanceGain.connect(this.audio.masterGain);
            this.puzzleResonanceOsc.start();
        } catch (e) {}
    }
    
    stopAmbient() {
        this.isActive = false;
        if (this.breathingSrc) {
            try { this.breathingSrc.stop(); } catch(e) {}
            this.breathingSrc = null;
        }
        if (this.crackleSrc) {
            try { this.crackleSrc.stop(); } catch(e) {}
            this.crackleSrc = null;
        }
        if (this.puzzleResonanceOsc) {
            try { this.puzzleResonanceOsc.stop(); } catch(e) {}
            this.puzzleResonanceOsc = null;
        }
    }
    
    update(dt, gameState, shadowDistance, floorIndex, puzzleInfo = null) {
        if (!this.isActive) return;
        
        const ctx = this.audio.context;
        const time = ctx.currentTime;
        const hasSynth = this.soundStudio.isPlaying;
        
        // Sanity normalization
        const sanityNorm = Math.max(0, Math.min(1, gameState.sanity / (gameState.maxSanity || 100)));
        
        let breathingVol = 0;
        let crackleVol = 0;
        
        // Shadow Proximity overrides for breathing/crackle layers
        if (shadowDistance < 200) {
            breathingVol = 1.0 - Math.max(0, (shadowDistance - 120) / 80);
        }
        if (shadowDistance < 60) {
            crackleVol = 1.0 - Math.max(0, shadowDistance / 60);
        }
        
        if (this.breathingGain) {
            this.breathingGain.gain.setTargetAtTime(breathingVol * 0.8, time, 0.2);
        }
        if (this.crackleGain) {
            this.crackleGain.gain.setTargetAtTime(crackleVol * 0.5, time, 0.2);
        }
        
        if (hasSynth) {
            const params = this.soundStudio.params;

            // Base ambient drone tier depending on player sanity
            let baseDroneFreq = 55;
            if (sanityNorm > 0.7) {
                baseDroneFreq = Math.max(35, 55 - (floorIndex - 1) * 2);
                params.droneLfoRate = 0.2;
                params.chimesVol = 0.3;
                params.chimesRate = 6.0;
                params.heartbeatVol = 0;
                params.windVol = 0.2;
            } else if (sanityNorm > 0.4) {
                baseDroneFreq = Math.max(35, 48 - (floorIndex - 1) * 2);
                params.droneLfoRate = 0.4;
                params.chimesVol = 0.6;
                params.chimesRate = 4.0;
                params.heartbeatVol = 0.3;
                params.heartbeatBpm = 60;
                params.windVol = 0.4;
            } else {
                baseDroneFreq = Math.max(35, 40 - (floorIndex - 1) * 2);
                params.droneLfoRate = 0.8;
                params.chimesVol = 0.9;
                params.chimesRate = 2.0;
                params.heartbeatVol = 0.8;
                params.heartbeatBpm = 100;
                params.windVol = 0.7;
            }

            // Stalker Proximity overrides
            if (shadowDistance < 120) {
                params.heartbeatVol = Math.max(params.heartbeatVol, 0.7);
                params.heartbeatBpm = Math.max(params.heartbeatBpm, 120);
            }
            if (shadowDistance < 60) {
                params.droneLfoRate = Math.max(params.droneLfoRate, 1.2);
                params.windVol = 0.9;
                params.chimesVol = 1.0;
            }

            // --- PUZZLE ACOUSTIC CLUE SYSTEM ---
            params.droneFreq = baseDroneFreq;
            params.droneDetune = 8;
            let puzzleShimmerVol = 0;
            let puzzleResonanceFreq = 110;

            if (puzzleInfo) {
                const { leverDist, doorDist, isLeverPulled } = puzzleInfo;

                // 1. Mechanism Unlocked Resolution Event (Sudden Subterranean Resonance)
                if (isLeverPulled && !this.lastLeverPulled) {
                    this.lastLeverPulled = true;
                    // Play sudden deep mechanical reverberation chord
                    if (this.puzzleResonanceOsc && this.puzzleResonanceGain) {
                        this.puzzleResonanceOsc.frequency.setValueAtTime(55, time);
                        this.puzzleResonanceOsc.frequency.exponentialRampToValueAtTime(110, time + 1.2);
                        this.puzzleResonanceGain.gain.setValueAtTime(0.35, time);
                        this.puzzleResonanceGain.gain.exponentialRampToValueAtTime(0.001, time + 2.5);
                    }
                    if (this.audio && this.audio.buffers.has('rumble')) {
                        this.audio.play('rumble');
                    }
                } else if (!isLeverPulled) {
                    this.lastLeverPulled = false;
                }

                // 2. Searching for the Lever (Hot / Cold Sonar Guidance)
                if (!isLeverPulled) {
                    if (leverDist < 380) {
                        // Proximity ratio: 0.0 at 380px -> 1.0 at 0px
                        const prox = Math.max(0, Math.min(1.0, (380 - leverDist) / 380));

                        // Sub Drone Pitch Climbs: warmer as you get closer to the lever
                        params.droneFreq = Math.round(baseDroneFreq + prox * 22);

                        // Sub Drone Sonar Beating: pulses faster and faster near the lever
                        params.droneLfoRate = Math.max(params.droneLfoRate, 0.25 + prox * 1.5);

                        // Acoustic Harmonic Shimmer in stone walls
                        puzzleShimmerVol = prox * 0.22;
                        puzzleResonanceFreq = 110 + prox * 55; // Ascends musically (A2 to C#3)

                        // Harmonic alignment: detune clears to pure harmony when right on the lever
                        params.droneDetune = Math.max(0, 10 * (1.0 - prox));
                    }

                    // Warning: Approaching the locked gate without the lever
                    if (doorDist < 160) {
                        const doorTension = (160 - doorDist) / 160;
                        // Harsh minor-second detune clash warning player the door is sealed
                        params.droneDetune = 12 + doorTension * 32;
                    }
                }
                // 3. Lever Solved: Sub Drone Guides Player to Unlocked Exit Gate
                else {
                    if (doorDist < 350) {
                        const exitProx = Math.max(0, Math.min(1.0, (350 - doorDist) / 350));

                        // Pure, clean harmony (no harsh dissonance)
                        params.droneDetune = 0;

                        // Rhythmic, comforting acoustic breath towards freedom
                        params.droneLfoRate = 0.4 + exitProx * 0.5;

                        // Warm, welcoming major fifth resonance
                        puzzleShimmerVol = exitProx * 0.18;
                        puzzleResonanceFreq = 165; // E3 (resonant fifth above A)
                    }
                }
            }

            // Apply acoustic clue shimmer to the dedicated resonance node
            if (this.puzzleResonanceOsc && this.puzzleResonanceGain) {
                this.puzzleResonanceOsc.frequency.setTargetAtTime(puzzleResonanceFreq, time, 0.25);
                this.puzzleResonanceGain.gain.setTargetAtTime(puzzleShimmerVol, time, 0.25);
            }

            // Update Sound Studio synthesis nodes in real-time
            if (this.soundStudio.droneOsc1) {
                this.soundStudio.droneOsc1.frequency.setTargetAtTime(params.droneFreq, time, 0.35);
                this.soundStudio.droneOsc2.frequency.setTargetAtTime(params.droneFreq * 1.5, time, 0.35);
                this.soundStudio.droneOsc2.detune.setTargetAtTime(params.droneDetune, time, 0.35);
            }
            if (this.soundStudio.droneLfo) {
                this.soundStudio.droneLfo.frequency.setTargetAtTime(params.droneLfoRate, time, 0.35);
            }
            if (this.soundStudio.windGain) {
                this.soundStudio.windGain.gain.setTargetAtTime(params.windVol * 0.12, time, 0.4);
            }
        }
    }
}
