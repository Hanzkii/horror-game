/**
 * @file AudioScapeManager.js
 * @description Dynamic multi-state soundscape controller with audio bus mixing and seamless crossfading.
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
    constructor(audioManager, soundStudio = null) {
        this.audio = audioManager;
        this.studio = soundStudio;
        this.currentState = AUDIO_STATES.MENU;
        this.stateTimer = 0;

        // Bus gains (0.0 to 1.0)
        this.volumes = {
            master: 0.8,
            music: 0.7,
            ambient: 0.85,
            sfx: 0.85
        };

        // Proximity trackers
        this.lastHeartbeatTime = 0;
        this.heartbeatInterval = 1.0;
        this.nextBirdChirpTime = 0;
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
        if (this.studio && this.studio.params) {
            this.studio.params.masterVol = this.volumes.master;
            this.studio.params.windVol = this.volumes.ambient;
            this.studio.params.droneVol = this.volumes.ambient * 0.25;
        }
    }

    setState(newState) {
        if (this.currentState === newState) return;
        this.currentState = newState;
        this.stateTimer = 0;

        if (newState === AUDIO_STATES.MENU) {
            if (this.studio && this.studio.stopAmbient) {
                this.studio.stopAmbient();
            }
        } else {
            if (this.studio && this.studio.startAmbient && !this.studio.isPlaying) {
                this.studio.startAmbient();
            }
        }
    }

    update(dt, gameState, shadowDistance = 9999, floorIndex = 1, options = {}) {
        if (!this.studio || !this.studio.ctx) return;
        const ctx = this.studio.ctx;
        const time = ctx.currentTime;

        // Menu state remains completely silent
        if (this.currentState === AUDIO_STATES.MENU) {
            if (this.studio.isPlaying) {
                this.studio.stopAmbient();
            }
            return;
        }

        this.stateTimer += dt;

        // In finale scenes, maintain the scripted surface or twist state
        if (this.currentState === AUDIO_STATES.SURFACE_PEACEFUL || this.currentState === AUDIO_STATES.FINALE_TWIST) {
            if (this.currentState === AUDIO_STATES.SURFACE_PEACEFUL) {
                if (this.studio.windGain) {
                    this.studio.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.15, time, 0.4);
                }
                if (this.studio.droneGain) {
                    this.studio.droneGain.gain.setTargetAtTime(0, time, 0.4);
                }
                this.studio.params.heartbeatVol = 0;
                // Periodic procedural morning bird chirps
                if (time >= this.nextBirdChirpTime) {
                    this.playBirdChirp();
                    this.nextBirdChirpTime = time + 1.2 + Math.random() * 2.2;
                }
                return;
            } else if (this.currentState === AUDIO_STATES.FINALE_TWIST) {
                // Sudden dark discord cut
                if (this.studio.windGain) {
                    this.studio.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.65, time, 0.1);
                }
                if (this.studio.droneGain) {
                    this.studio.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.5, time, 0.1);
                }
                if (this.studio.droneOsc1 && this.studio.droneOsc1.frequency) {
                    this.studio.droneOsc1.frequency.setTargetAtTime(28, time, 0.1);
                }
                this.studio.params.heartbeatVol = 0.95;
                this.studio.params.heartbeatBpm = 135;
                return;
            }
        }

        // Determine dynamic subterranean state based on proximity & sanctuary
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

        const params = this.studio.params;

        // Apply audio levels smoothly based on state
        switch (this.currentState) {
            case AUDIO_STATES.SANCTUARY:
                // Soft comforting embers, reduced wind, calm sub-bass
                if (this.studio.windGain) {
                    this.studio.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.2, time, 0.4);
                }
                if (this.studio.droneGain) {
                    this.studio.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.03, time, 0.4);
                }
                break;

            case AUDIO_STATES.CHASE:
                // Heavy adrenaline, high screeching tension, rapid heartbeat
                if (this.studio.windGain) {
                    this.studio.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.6, time, 0.2);
                }
                if (this.studio.droneGain) {
                    this.studio.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.35, time, 0.2);
                }
                // Periodic breathing / static
                if (Math.random() < 0.03 && this.audio) {
                    try { this.audio.play('static_crackle', { volume: 0.25 }); } catch (e) {}
                }
                break;

            case AUDIO_STATES.TENSION:
                // Sub-bass dread swell and rising wind resonance
                if (this.studio.windGain) {
                    this.studio.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.5, time, 0.3);
                }
                if (this.studio.droneGain) {
                    this.studio.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.22, time, 0.3);
                }
                break;

            case AUDIO_STATES.EXPLORATION:
            default:
                // Standard subterranean soundscape: prominent wind, deep 38Hz quiet drone
                if (this.studio.windGain) {
                    this.studio.windGain.gain.setTargetAtTime(this.volumes.ambient * 0.42, time, 0.5);
                }
                if (this.studio.droneGain) {
                    this.studio.droneGain.gain.setTargetAtTime(this.volumes.ambient * 0.08, time, 0.5);
                }
                break;
        }

        // Dynamic Heartbeat: As sanity drops, heartbeat rises in volume and accelerates in BPM!
        if (this.studio && this.studio.params) {
            const maxSanity = (gameState && gameState.maxSanity) || 100;
            const currentSanity = (gameState && gameState.sanity !== undefined) ? gameState.sanity : 100;
            const sanityNorm = Math.max(0, Math.min(1, currentSanity / maxSanity));
            const panic = 1 - sanityNorm; // 0 = calm, 1 = terrified

            const isChasing = (this.currentState === AUDIO_STATES.CHASE);
            const isTense = (this.currentState === AUDIO_STATES.TENSION);

            if (panic > 0.05 || isChasing || isTense) {
                const threatBoost = isChasing ? 0.35 : (isTense ? 0.15 : 0);
                const totalPanic = Math.min(1.0, panic + threatBoost);

                // Heartbeat volume scales with panic & SFX bus
                this.studio.params.heartbeatVol = totalPanic * 0.95 * (this.volumes.sfx ?? 0.85);
                // Heartbeat BPM accelerates from 55 BPM (calm) up to 140 BPM (frantic panic)
                this.studio.params.heartbeatBpm = Math.round(55 + totalPanic * 85);

                if (!this.studio.heartbeatTimer && this.studio.startHeartbeatLoop) {
                    this.studio.startHeartbeatLoop();
                }
            } else {
                this.studio.params.heartbeatVol = 0;
                this.studio.params.heartbeatBpm = 55;
            }
        }

        // Deeper floor pitch tuning
        if (this.studio.droneOsc1 && this.studio.droneOsc1.frequency) {
            const targetPitch = Math.max(30, 38 - (floorIndex - 1) * 2);
            this.studio.droneOsc1.frequency.setTargetAtTime(targetPitch, time, 0.6);
        }
    }

    /**
     * Synthesizes an organic morning birdsong chirp using Web Audio oscillators.
     */
    playBirdChirp() {
        if (!this.studio || !this.studio.ctx) return;
        const ctx = this.studio.ctx;
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
            gain.connect(this.studio.masterGain || ctx.destination);

            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }
}

export default AudioScapeManager;
