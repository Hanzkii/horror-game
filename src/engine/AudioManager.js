/**
 * @file AudioManager.js
 * @description Web Audio API manager for sound effects, ambient loops, and spatial audio.
 */

export default class AudioManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        
        this.buffers = new Map();
        
        // Volume nodes
        this.masterGain = this.context.createGain();
        this.sfxGain = this.context.createGain();
        this.musicGain = this.context.createGain();
        
        // Routing
        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);
        
        // Active sources
        this.activeSources = [];
        this.ambientSource = null;
        this.ambientGain = null;
        
        // Listener for spatial audio
        this.listener = this.context.listener;
    }
    
    /**
     * Sets volume for a specific bus.
     * @param {string} bus - 'master', 'sfx', or 'music'
     * @param {number} value - 0.0 to 1.0
     */
    setVolume(bus, value) {
        const clamped = Math.max(0, Math.min(1, value));
        switch(bus) {
            case 'master': this.masterGain.gain.value = clamped; break;
            case 'sfx': this.sfxGain.gain.value = clamped; break;
            case 'music': this.musicGain.gain.value = clamped; break;
        }
    }
    
    /**
     * Loads a sound from a URL and caches it.
     * @param {string} name 
     * @param {string} url 
     * @returns {Promise<void>}
     */
    async loadSound(name, url) {
        if (this.buffers.has(name)) return;
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.buffers.set(name, audioBuffer);
        } catch (e) {
            console.error(`Failed to load sound: ${name} from ${url}`, e);
        }
    }
    
    /**
     * Plays a sound effect.
     * @param {string} name 
     * @param {Object} options - volume, pitch, loop, x, y (for spatial)
     * @returns {AudioBufferSourceNode|null}
     */
    play(name, options = {}) {
        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`Sound not loaded: ${name}`);
            return null;
        }
        
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = options.loop || false;
        
        if (options.pitch) {
            // Apply slight random pitch variation if requested
            source.playbackRate.value = 1.0 + (Math.random() * options.pitch * 2 - options.pitch);
        }
        
        let outputNode = this.sfxGain;
        
        // Spatial Audio Setup
        if (options.x !== undefined && options.y !== undefined) {
            const panner = this.context.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 50;
            panner.maxDistance = 1000;
            panner.rolloffFactor = 1;
            panner.positionX.value = options.x;
            panner.positionY.value = options.y;
            panner.positionZ.value = 0;
            
            source.connect(panner);
            panner.connect(this.sfxGain);
        } else {
            source.connect(this.sfxGain);
        }
        
        source.start();
        this.activeSources.push(source);
        
        source.onended = () => {
            const index = this.activeSources.indexOf(source);
            if (index > -1) this.activeSources.splice(index, 1);
        };
        
        return source;
    }
    
    /**
     * Plays a looping ambient track with crossfade.
     * @param {string} name 
     */
    playAmbient(name) {
        const buffer = this.buffers.get(name);
        if (!buffer) return;
        
        // Fade out current ambient
        if (this.ambientGain) {
            const oldGain = this.ambientGain;
            const oldSource = this.ambientSource;
            oldGain.gain.setTargetAtTime(0, this.context.currentTime, 1);
            setTimeout(() => {
                oldSource.stop();
                oldGain.disconnect();
            }, 3000);
        }
        
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        
        const gainNode = this.context.createGain();
        gainNode.gain.setValueAtTime(0, this.context.currentTime);
        gainNode.gain.setTargetAtTime(1, this.context.currentTime, 1); // Fade in
        
        source.connect(gainNode);
        gainNode.connect(this.musicGain);
        
        source.start();
        
        this.ambientSource = source;
        this.ambientGain = gainNode;
    }
    
    /**
     * Updates listener position for spatial audio (usually matches camera).
     * @param {number} x 
     * @param {number} y 
     */
    updateListener(x, y) {
        this.listener.positionX.value = x;
        this.listener.positionY.value = y;
        this.listener.positionZ.value = 100; // Fixed Z distance
    }
    
    /**
     * Stops all currently playing sounds.
     */
    stopAll() {
        this.activeSources.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        this.activeSources = [];
        
        if (this.ambientSource) {
            try { this.ambientSource.stop(); } catch(e) {}
            this.ambientSource = null;
        }
    }
}
