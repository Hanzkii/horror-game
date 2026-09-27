export default class AdaptiveAudio {
    constructor(audioManager, soundStudio) {
        this.audio = audioManager;
        this.soundStudio = soundStudio;
        this.isActive = false;
        
        this.breathingSrc = null;
        this.breathingGain = null;
        
        this.crackleSrc = null;
        this.crackleGain = null;
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
        
        // Breathing
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

        // Crackle
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
    }
    
    stopAmbient() {
        this.isActive = false;
        if (this.breathingSrc) {
            this.breathingSrc.stop();
            this.breathingSrc = null;
        }
        if (this.crackleSrc) {
            this.crackleSrc.stop();
            this.crackleSrc = null;
        }
    }
    
    update(dt, gameState, shadowDistance, floorIndex) {
        if (!this.isActive) return;
        
        const ctx = this.audio.context;
        const time = ctx.currentTime;
        const hasSynth = this.soundStudio.isPlaying;
        
        // Sanity
        const sanityNorm = Math.max(0, Math.min(1, gameState.sanity / (gameState.maxSanity || 100)));
        
        let breathingVol = 0;
        let crackleVol = 0;
        
        // Shadow Distance overrides for breathing/crackle layers
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
            if (sanityNorm > 0.7) {
                params.droneFreq = Math.max(35, 55 - (floorIndex - 1) * 2);
                params.droneLfoRate = 0.2;
                params.chimesVol = 0.3;
                params.chimesRate = 6.0;
                params.heartbeatVol = 0;
                params.windVol = 0.2;
            } else if (sanityNorm > 0.4) {
                params.droneFreq = Math.max(35, 48 - (floorIndex - 1) * 2);
                params.droneLfoRate = 0.4;
                params.chimesVol = 0.6;
                params.chimesRate = 4.0;
                params.heartbeatVol = 0.3;
                params.heartbeatBpm = 60;
                params.windVol = 0.4;
            } else {
                params.droneFreq = Math.max(35, 40 - (floorIndex - 1) * 2);
                params.droneLfoRate = 0.8;
                params.chimesVol = 0.9;
                params.chimesRate = 2.0;
                params.heartbeatVol = 0.8;
                params.heartbeatBpm = 100;
                params.windVol = 0.7;
            }
            
            if (shadowDistance < 120) {
                params.heartbeatVol = Math.max(params.heartbeatVol, 0.7);
                params.heartbeatBpm = Math.max(params.heartbeatBpm, 120);
            }
            if (shadowDistance < 60) {
                params.droneLfoRate = Math.max(params.droneLfoRate, 1.2);
                params.windVol = 0.9;
                params.chimesVol = 1.0;
            }
            
            // Update sound studio nodes directly if needed to transition smoothly
            if (this.soundStudio.droneOsc1) {
                this.soundStudio.droneOsc1.frequency.setTargetAtTime(params.droneFreq, time, 0.5);
                this.soundStudio.droneOsc2.frequency.setTargetAtTime(params.droneFreq * 1.5, time, 0.5);
                this.soundStudio.droneOsc2.detune.setTargetAtTime(params.droneDetune + (floorIndex > 2 ? 10 : 0), time, 0.5);
            }
            if (this.soundStudio.droneLfo) {
                this.soundStudio.droneLfo.frequency.setTargetAtTime(params.droneLfoRate, time, 0.5);
            }
            if (this.soundStudio.windGain) {
                this.soundStudio.windGain.gain.setTargetAtTime(params.windVol * 0.12, time, 0.5);
            }
        }
    }
}
