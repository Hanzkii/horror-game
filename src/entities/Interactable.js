/**
 * @file Interactable.js
 * @description Interactive world entities: Notes, Locked Doors, Ancient Levers, and Flickering Torches.
 */

import Entity from '../engine/Entity.js';

export const INTERACTABLE_TYPES = {
    NOTE: 0,
    DOOR: 1,
    SWITCH: 2,
    TORCH: 3
};

export class Interactable extends Entity {
    constructor(x, y, type = INTERACTABLE_TYPES.NOTE, properties = {}) {
        super(x, y, 16, 16);
        this.type = 'interactable';
        this.interactType = type;
        this.properties = properties;
        
        this.showPrompt = false;
        this.isActivated = false;
        this.timer = Math.random() * 10;
    }
    
    update(dt, input, scene) {
        this.timer += dt;
        const player = scene.getPlayer();
        if (!player) return;
        
        // Torches register light source in the scene
        if (this.interactType === INTERACTABLE_TYPES.TORCH) {
            if (!scene.lights) scene.lights = [];
            const flicker = Math.sin(this.timer * 7) * 4 + Math.sin(this.timer * 19) * 2;
            scene.lights.push({
                x: this.x + 8,
                y: this.y + 6,
                radius: 75 + flicker,
                color: 'rgba(255, 170, 70, 0.8)'
            });
            return; // torches don't need 'E' prompt
        }
        
        const center = { x: this.x + this.width / 2, y: this.y + this.height / 2 };
        const pCenter = { x: player.x + player.width / 2, y: player.y + player.height / 2 };
        
        const distSq = Math.pow(center.x - pCenter.x, 2) + Math.pow(center.y - pCenter.y, 2);
        this.showPrompt = distSq <= Math.pow(36, 2);
        
        if (this.showPrompt && scene.gameState) {
            scene.gameState.canInteract = true;
        }
    }
    
    trigger(player, scene) {
        if (this.interactType === INTERACTABLE_TYPES.NOTE) {
            // Read lore note
            if (scene.gameState) {
                scene.gameState.activeNote = this.properties.text || "An unreadable scrap of paper...";
                scene.gameState.collectNote(this.properties.id || 'note_generic');
            }
            if (scene.audio) scene.audio.play('paper');
            
        } else if (this.interactType === INTERACTABLE_TYPES.DOOR) {
            // Check if door requires a lever / key
            const requiresFlag = this.properties.requiresFlag;
            const isUnlocked = !requiresFlag || (scene.gameState && scene.gameState.getFlag(requiresFlag));
            
            if (!isUnlocked) {
                // Door is locked!
                if (scene.audio) scene.audio.play('thud');
                if (scene.gameState) {
                    scene.gameState.activeNote = "THE IRON GATE IS SEALED SHUT.\n\nAn ancient mechanism locks it in place.\nA lever must be hidden in the chambers above...";
                }
            } else {
                // Door unlocked!
                if (scene.audio) scene.audio.play('door_creak');
                if (scene.onNextLevel) {
                    scene.onNextLevel();
                } else if (scene.gameState) {
                    scene.gameState.activeNote = "The heavy stone door unlocks...\nDescending deeper into the abyss.";
                }
            }
            
        } else if (this.interactType === INTERACTABLE_TYPES.SWITCH) {
            // Pull lever
            this.isActivated = !this.isActivated;
            if (scene.audio) scene.audio.play('click');
            
            const flagKey = this.properties.flag || 'gate_unlocked';
            if (scene.gameState) {
                scene.gameState.setFlag(flagKey, this.isActivated);
                scene.gameState.activeNote = this.isActivated
                    ? "CLANK! Heavy gears grind within the stone.\n\nThe Sealed Gate has opened!"
                    : "The mechanism resets.";
            }
            if (this.properties.onToggle) {
                this.properties.onToggle(scene);
            }
        }
    }
    
    render(renderer) {
        if (this.interactType === INTERACTABLE_TYPES.NOTE) {
            // Parchment Note
            renderer.drawRect(this.x + 3, this.y + 3, 10, 10, '#eedd66');
            renderer.drawRect(this.x + 4, this.y + 5, 8, 1, '#aa8822');
            renderer.drawRect(this.x + 4, this.y + 8, 8, 1, '#aa8822');
            
        } else if (this.interactType === INTERACTABLE_TYPES.DOOR) {
            // Arched Door / Gate
            renderer.drawRect(this.x, this.y - 16, 16, 32, '#4d2d18');
            renderer.drawRect(this.x + 1, this.y - 15, 14, 30, '#381e0f');
            // Iron banding or brass handle
            renderer.drawRect(this.x + 12, this.y - 2, 2, 4, '#ffdd44');
            renderer.drawRect(this.x + 2, this.y - 8, 12, 1, '#666666');
            renderer.drawRect(this.x + 2, this.y + 6, 12, 1, '#666666');
            
        } else if (this.interactType === INTERACTABLE_TYPES.SWITCH) {
            // Lever Base
            renderer.drawRect(this.x + 3, this.y + 10, 10, 6, '#444455');
            // Lever Stick (angle depends on activation)
            if (this.isActivated) {
                renderer.drawRect(this.x + 8, this.y + 4, 6, 8, '#ff5533'); // pulled right
                renderer.drawRect(this.x + 12, this.y + 2, 3, 3, '#ffff88');
            } else {
                renderer.drawRect(this.x + 4, this.y + 4, 3, 8, '#ff5533'); // upright left
                renderer.drawRect(this.x + 3, this.y + 2, 3, 3, '#ffff88');
            }
            
        } else if (this.interactType === INTERACTABLE_TYPES.TORCH) {
            // Sconce bracket
            renderer.drawRect(this.x + 6, this.y + 8, 4, 8, '#555566');
            renderer.drawRect(this.x + 5, this.y + 6, 6, 3, '#777788');
            // Flickering flame
            const flameW = 4 + Math.floor(Math.sin(this.timer * 12) * 1.5);
            const flameH = 6 + Math.floor(Math.cos(this.timer * 15) * 1.5);
            renderer.drawRect(this.x + 8 - flameW / 2, this.y + 6 - flameH, flameW, flameH, '#ff7722');
            renderer.drawRect(this.x + 7, this.y + 6 - flameH + 2, 2, 3, '#ffdd44');
        }
        
        // E interaction prompt
        if (this.showPrompt) {
            renderer.drawText('[ E ]', this.x + this.width / 2, this.y - 10, {
                color: '#ffffff',
                font: '9px monospace',
                align: 'center'
            });
        }
    }
}
