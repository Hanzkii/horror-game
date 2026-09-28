/**
 * @file Interactable.js
 * @description Interactive world entities: Notes, Locked Doors, Ancient Levers, and Flickering Torches.
 */

import Entity from '../engine/Entity.js';
import SpriteRenderer from '../art/SpriteRenderer.js';

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
        this.flareTimer = 0;
        this.extinguishTimer = 0;
        this.flickerIntensity = 0;
    }
    
    update(dt, input, scene) {
        this.timer += dt;
        const player = scene.getPlayer();
        if (!player) return;
        
        // Torches are pure ambient light sources and automatic sanctuaries (no interaction prompt)
        if (this.interactType === INTERACTABLE_TYPES.TORCH) {
            this.showPrompt = false;
            if (this.extinguishTimer > 0) {
                this.extinguishTimer = Math.max(0, this.extinguishTimer - dt);
            }
            if (this.flickerIntensity > 0) {
                this.flickerIntensity = Math.max(0, this.flickerIntensity - dt * 0.8);
            }
            return;
        }
        
        const center = { x: this.x + this.width / 2, y: this.y + this.height / 2 };
        const pCenter = { x: player.x + player.width / 2, y: player.y + player.height / 2 };
        
        const distSq = Math.pow(center.x - pCenter.x, 2) + Math.pow(center.y - pCenter.y, 2);
        this.showPrompt = distSq <= Math.pow(36, 2);
        
        if (this.showPrompt && scene.gameState) {
            scene.gameState.canInteract = true;
        }
        
        if (this.interactType === INTERACTABLE_TYPES.DOOR) {
            const requiresFlag = this.properties.requiresFlag;
            this.isLocked = requiresFlag && scene.gameState && !scene.gameState.getFlag(requiresFlag);
        }
    }
    
    trigger(player, scene) {
        if (this.interactType === INTERACTABLE_TYPES.NOTE) {
            // Read lore note
            if (scene.gameState) {
                scene.gameState.activeNote = this.properties.text || "An unreadable scrap of paper...";
                scene.gameState.activeNoteTitle = this.properties.title || "ANCIENT INSCRIPTION";
                scene.gameState.collectNote(this.properties.id || 'note_generic');
            }
            if (scene.audio) scene.audio.play('paper');
            
            // Surprise element: Awakening shadow upon disturbing cursed notes
            if (scene.entities) {
                const isCursed = Math.random() < 0.4 || (this.properties.text && this.properties.text.toLowerCase().includes('shadow'));
                if (isCursed) {
                    for (const ent of scene.entities) {
                        if (ent.type === 'shadow' && typeof ent.awaken === 'function') {
                            ent.awaken(player, scene, 'note');
                        }
                    }
                }
            }
            
        } else if (this.interactType === INTERACTABLE_TYPES.DOOR) {
            // Check if door requires a lever / key
            const requiresFlag = this.properties.requiresFlag;
            const isUnlocked = !requiresFlag || (scene.gameState && scene.gameState.getFlag(requiresFlag));
            
            if (!isUnlocked) {
                // Door is locked!
                if (scene.audio) scene.audio.play('thud');
                if (scene.gameState) {
                    scene.gameState.activeNote = "THE IRON GATE IS SEALED SHUT.\n\nAn ancient mechanism locks it in place.\nA lever must be hidden in the chambers above...";
                    scene.gameState.activeNoteTitle = "SEALED GATE";
                }
            } else {
                // Door unlocked!
                if (scene.audio) scene.audio.play('door_creak');
                if (scene.onNextLevel) {
                    scene.onNextLevel();
                } else if (scene.gameState) {
                    scene.gameState.activeNote = "The heavy stone door unlocks...\nDescending deeper into the abyss.";
                    scene.gameState.activeNoteTitle = "PORTAL OF DESCENT";
                }
            }
            
        } else if (this.interactType === INTERACTABLE_TYPES.SWITCH) {
            // Pull lever
            this.isActivated = !this.isActivated;
            if (scene.audio) {
                scene.audio.play('click');
                scene.audio.play('rumble');
            }
            
            const flagKey = this.properties.flag || 'gate_unlocked';
            if (scene.gameState) {
                scene.gameState.setFlag(flagKey, this.isActivated);
                // No activeNote popup here: keeps gameplay fast and fluid!
            }
            if (this.properties.onToggle) {
                this.properties.onToggle(scene);
            }

            // Mechanical trauma feedback
            if (scene.postProcessing) {
                scene.postProcessing.addTrauma(0.35);
            }

            // Awakening or alerting the shadow lurker upon pulling the ancient lever!
            if (this.isActivated && scene.entities) {
                for (const ent of scene.entities) {
                    if (ent.type === 'shadow' && typeof ent.awaken === 'function') {
                        ent.awaken(player, scene, 'lever');
                    }
                }
            }
        } else if (this.interactType === INTERACTABLE_TYPES.TORCH) {
            // Torches are passive sanctuaries that automatically protect against shadows
            return;
        }
    }
    
    render(renderer) {
        if (this.interactType === INTERACTABLE_TYPES.NOTE) {
            SpriteRenderer.drawNote(renderer, this.x, this.y);
        } else if (this.interactType === INTERACTABLE_TYPES.DOOR) {
            SpriteRenderer.drawDoor(renderer, this.x, this.y, this.isLocked);
        } else if (this.interactType === INTERACTABLE_TYPES.SWITCH) {
            SpriteRenderer.drawLever(renderer, this.x, this.y, this.isActivated);
        } else if (this.interactType === INTERACTABLE_TYPES.TORCH) {
            SpriteRenderer.drawTorch(renderer, this.x, this.y, this.timer, this.extinguishTimer > 0);
        }
        
        // In-world interaction glint (no floating text tooltips)
        if (this.showPrompt && this.interactType !== INTERACTABLE_TYPES.TORCH) {
            const glintPulse = (Math.sin(this.timer * 6) + 1) * 0.5;
            const glintY = this.y - 3 + Math.sin(this.timer * 4) * 2;
            const glintX = this.x + this.width / 2;
            renderer.drawRect(glintX - 1, glintY - 1, 2, 2, `rgba(255, 230, 140, ${0.35 + glintPulse * 0.55})`);
        }
    }
}
