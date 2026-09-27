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
    }
    
    update(dt) {
        // Natural sanity drain
        this.sanity -= 0.5 * dt;
        
        // Clamp values
        this.health = Math.max(0, Math.min(this.maxHealth, this.health));
        this.sanity = Math.max(0, Math.min(this.maxSanity, this.sanity));
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.handleDeath();
        }
    }
    
    drainSanity(amount) {
        this.sanity -= amount;
    }
    
    collectNote(id) {
        if (!this.notesCollected.includes(id)) {
            this.notesCollected.push(id);
            this.save();
        }
    }
    
    setFlag(key, value) {
        this.flags[key] = value;
        this.save();
    }
    
    getFlag(key) {
        return this.flags[key];
    }
    
    handleDeath() {
        console.log("Player died...");
        this.health = this.maxHealth;
        this.sanity = Math.max(50, this.sanity); // restore some sanity on respawn
    }
    
    save() {
        const data = {
            health: this.health,
            sanity: this.sanity,
            notesCollected: this.notesCollected,
            visitedAreas: this.visitedAreas,
            flags: this.flags,
            currentLevel: this.currentLevel
        };
        
        try {
            localStorage.setItem('horror_game_save', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save game state:', e);
        }
    }
    
    load() {
        try {
            const dataStr = localStorage.getItem('horror_game_save');
            if (dataStr) {
                const data = JSON.parse(dataStr);
                this.health = data.health || this.maxHealth;
                this.sanity = data.sanity || this.maxSanity;
                this.notesCollected = data.notesCollected || [];
                this.visitedAreas = data.visitedAreas || [];
                this.flags = data.flags || {};
                this.currentLevel = data.currentLevel;
                return true;
            }
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
        return false;
    }
    
    reset() {
        this.health = this.maxHealth;
        this.sanity = this.maxSanity;
        this.notesCollected = [];
        this.visitedAreas = [];
        this.flags = {};
        this.currentLevel = null;
        this.save();
    }
}
