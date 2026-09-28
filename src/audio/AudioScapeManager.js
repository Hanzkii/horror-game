/**
 * @file AudioScapeManager.js
 * @description Dynamic multi-state soundscape controller with audio bus mixing and seamless crossfading.
 */

export const AUDIO_STATES = {
    MENU: 'menu',
    EXPLORATION: 'exploration',
    TENSION: 'tension',
    CHASE: 'chase',
    SANCTUARY: 'sanctuary'
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
    }

    setVolumes(volumes) {
        Object.assign(this.volumes, volumes);
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

        // Determine dynamic state based on proximity & sanctuary
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

        // Deeper floor pitch tuning
        if (this.studio.droneOsc1 && this.studio.droneOsc1.frequency) {
            const targetPitch = Math.max(30, 38 - (floorIndex - 1) * 2);
            this.studio.droneOsc1.frequency.setTargetAtTime(targetPitch, time, 0.6);
        }
    }
}

export default AudioScapeManager;
