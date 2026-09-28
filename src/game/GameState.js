/**
 * @file GameState.js
 * @description Central player and run state manager, wired to SaveManager and EventBus.
 */

import { saveManager } from '../managers/SaveManager.js';
import { events } from '../core/EventBus.js';

export class GameState {
    constructor() {
        this.maxSanity = 100;
        this.sanity = 100;
        
        this.notesCollected = [];
        this.visitedAreas = [];
        this.flags = {};
        
        this.currentLevel = null;
        this.floorIndex = 1;
        this.isPublishedMap = false;
        this.isTestLevel = false;
        this.isTutorialLevel = false;
        this.godMode = false;

        this.stats = {
            playtimeSeconds: 0,
            deaths: 0,
            lurkersBanished: 0,
            notesRead: 0,
            deepestFloor: 1
        };

        this.scene = null;
    }
    
    update(dt) {
        if (this.godMode) {
            this.sanity = this.maxSanity;
        }

        // Clamp values
        this.sanity = Math.max(0, Math.min(this.maxSanity, this.sanity));

        // Track active playtime
        this.stats.playtimeSeconds += dt;
    }
    
    takeDamage(amount = 100) {
        if (this.godMode) return;
        // In psychological horror without vitality, lethal hazards trigger death directly
        this.handleDeath();
    }
    
    drainSanity(amount) {
        if (this.godMode) return;
        this.sanity -= amount;
        if (this.sanity <= 15) {
            events.emit('SANITY_CRITICAL', { sanity: this.sanity });
        }
    }
    
    collectNote(id) {
        if (!this.notesCollected.includes(id)) {
            this.notesCollected.push(id);
            this.stats.notesRead++;
            events.emit('NOTE_COLLECTED', { id });
            this.save();
        }
    }
    
    setFlag(key, value) {
        this.flags[key] = value;
    }
    
    getFlag(key) {
        return this.flags[key];
    }
    
    handleDeath() {
        console.log("[GameState] Player died...");
        this.stats.deaths++;
        this.sanity = this.maxSanity;

        events.emit('PLAYER_DIED', { deaths: this.stats.deaths });

        if (this.scene && typeof this.scene.respawnPlayer === 'function') {
            this.scene.respawnPlayer();
        }
    }
    
    save(slot = 'auto') {
        if (this.floorIndex > (this.stats.deepestFloor || 1)) {
            this.stats.deepestFloor = this.floorIndex;
        }
        const data = {
            player: {
                floorIndex: this.floorIndex,
                currentLevel: this.currentLevel,
                sanity: this.sanity
            },
            inventory: {
                notesCollected: this.notesCollected,
                visitedAreas: this.visitedAreas,
                flags: this.flags
            },
            stats: this.stats
        };
        
        return saveManager.save(slot, data);
    }
    
    load(slot = 'auto') {
        const saved = saveManager.load(slot);
        if (saved) {
            if (saved.player) {
                this.sanity = saved.player.sanity ?? this.maxSanity;
                this.floorIndex = saved.player.floorIndex || 1;
                this.currentLevel = saved.player.currentLevel || null;
            }
            if (saved.inventory) {
                this.notesCollected = saved.inventory.notesCollected || [];
                this.visitedAreas = saved.inventory.visitedAreas || [];
                this.flags = saved.inventory.flags || {};
            }
            if (saved.stats) {
                Object.assign(this.stats, saved.stats);
            }
            return true;
        }
        return false;
    }

    hasSave(slot = 'auto') {
        return saveManager.hasSave(slot);
    }
    
    reset() {
        this.sanity = this.maxSanity;
        this.notesCollected = [];
        this.visitedAreas = [];
        this.flags = {};
        this.currentLevel = null;
        this.floorIndex = 1;
        this.stats = {
            playtimeSeconds: 0,
            deaths: 0,
            lurkersBanished: 0,
            notesRead: 0,
            deepestFloor: 1
        };
    }
}
