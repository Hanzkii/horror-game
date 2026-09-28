/**
 * @file GameState.js
 * @description Central player and run state manager, wired to SaveManager and EventBus.
 */

import { saveManager } from '../managers/SaveManager.js';
import { events } from '../core/EventBus.js';

export class GameState {
    constructor() {
        this.maxHealth = 100;
        this.health = 100;
        
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
        // Sanity does not drain passively; only drains when stalkers prowl nearby or strike!
        
        // Clamp values
        this.health = Math.max(0, Math.min(this.maxHealth, this.health));
        this.sanity = Math.max(0, Math.min(this.maxSanity, this.sanity));

        // Track active playtime
        this.stats.playtimeSeconds += dt;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.handleDeath();
        }
    }
    
    drainSanity(amount) {
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
        this.health = this.maxHealth;
        this.sanity = Math.max(50, this.sanity);

        events.emit('PLAYER_DIED', { deaths: this.stats.deaths });

        if (this.scene && typeof this.scene.respawnPlayer === 'function') {
            this.scene.respawnPlayer();
        }
    }
    
    save(slot = 'auto') {
        const data = {
            player: {
                floorIndex: this.floorIndex,
                currentLevel: this.currentLevel,
                health: this.health,
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
                this.health = saved.player.health ?? this.maxHealth;
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
        this.health = this.maxHealth;
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
