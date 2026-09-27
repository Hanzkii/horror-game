import Entity from '../engine/Entity.js';

export const INTERACTABLE_TYPES = {
    NOTE: 0,
    DOOR: 1,
    SWITCH: 2
};

export class Interactable extends Entity {
    constructor(x, y, type, properties = {}) {
        super(x, y, 16, 16);
        this.type = 'interactable';
        this.interactType = type;
        this.properties = properties;
        
        this.showPrompt = false;
    }
    
    update(dt, input, scene) {
        const player = scene.getPlayer();
        if (!player) return;
        
        const center = { x: this.x + this.width / 2, y: this.y + this.height / 2 };
        const pCenter = { x: player.x + player.width / 2, y: player.y + player.height / 2 };
        
        const distSq = Math.pow(center.x - pCenter.x, 2) + Math.pow(center.y - pCenter.y, 2);
        
        this.showPrompt = distSq <= Math.pow(35, 2);
        
        // Update canInteract on gameState for HUD
        if (this.showPrompt && scene.gameState) {
            scene.gameState.canInteract = true;
        }
    }
    
    trigger(player, scene) {
        if (this.interactType === INTERACTABLE_TYPES.NOTE) {
            // Set activeNote on gameState so HUD can display it
            if (scene.gameState) {
                scene.gameState.activeNote = this.properties.text || "An unreadable scrap of paper...";
                scene.gameState.collectNote(this.properties.id);
            }
            if (scene.audio) scene.audio.play('paper');
        } else if (this.interactType === INTERACTABLE_TYPES.DOOR) {
            if (scene.audio) scene.audio.play('door_creak');
            if (scene.onNextLevel) {
                scene.onNextLevel();
            } else if (scene.gameState) {
                scene.gameState.activeNote = "The heavy stone door unlocks...\nDescending deeper into the abyss.";
            }
        } else if (this.interactType === INTERACTABLE_TYPES.SWITCH) {
            if (scene.audio) scene.audio.play('click');
            if (this.properties.onToggle) {
                this.properties.onToggle(scene);
            }
        }
    }
    
    render(renderer) {
        if (this.interactType === INTERACTABLE_TYPES.NOTE) {
            renderer.drawRect(this.x + 4, this.y + 8, 8, 8, '#ccaa44');
        } else if (this.interactType === INTERACTABLE_TYPES.DOOR) {
            renderer.drawRect(this.x, this.y - 16, 16, 32, '#553311');
        } else if (this.interactType === INTERACTABLE_TYPES.SWITCH) {
            renderer.drawRect(this.x + 4, this.y + 4, 8, 12, '#666666');
        }
        
        if (this.showPrompt) {
            renderer.drawText('E', this.x + this.width / 2, this.y - 10, {
                color: '#ffffff',
                font: '10px monospace',
                align: 'center'
            });
        }
    }
}
