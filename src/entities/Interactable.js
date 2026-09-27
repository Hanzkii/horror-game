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
    }
    
    update(dt, input, scene) {
        this.timer += dt;
        const player = scene.getPlayer();
        if (!player) return;
        
        // Torches provide passive sanctuary, and can be actively flared!
        if (this.interactType === INTERACTABLE_TYPES.TORCH) {
            if (this.flareTimer > 0) {
                this.flareTimer -= dt;
            }
            const center = { x: this.x + this.width / 2, y: this.y + this.height / 2 };
            const pCenter = { x: player.x + player.width / 2, y: player.y + player.height / 2 };
            const distSq = Math.pow(center.x - pCenter.x, 2) + Math.pow(center.y - pCenter.y, 2);
            
            this.showPrompt = distSq <= Math.pow(38, 2);
            if (this.showPrompt && scene.gameState) {
                scene.gameState.canInteract = true;
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

            // Surprise element: Awakening the shadow lurker upon solving or triggering mechanisms!
            if (this.isActivated && scene.entities) {
                for (const ent of scene.entities) {
                    if (ent.type === 'shadow' && typeof ent.awaken === 'function') {
                        ent.awaken(player, scene, 'lever');
                    }
                }
            }
        } else if (this.interactType === INTERACTABLE_TYPES.TORCH) {
            // Flare torch with a holy blaze!
            this.flareTimer = 3.5;
            if (scene.audio) scene.audio.play('flame_flare');
            if (scene.postProcessing) scene.postProcessing.addTrauma(0.35);

            // Banish and disintegrate any shadow in 260px!
            if (scene.entities) {
                for (const ent of scene.entities) {
                    if (ent.type === 'shadow' && typeof ent.despawnInLight === 'function') {
                        const dist = Math.hypot(ent.x - (this.x + 8), ent.y - (this.y + 6));
                        if (dist < 260) {
                            ent.despawnInLight(scene, { x: this.x + 8, y: this.y + 6, radius: 150 });
                        }
                    }
                }
            }
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
            SpriteRenderer.drawTorch(renderer, this.x, this.y, this.timer);
        }
        
        // Mouse/Keyboard interaction prompt
        if (this.showPrompt) {
            let promptText = '[ CLICK ]';
            if (this.interactType === INTERACTABLE_TYPES.TORCH) {
                promptText = '[ CLICK ] Flare Flame';
            } else if (this.interactType === INTERACTABLE_TYPES.SWITCH) {
                promptText = this.isActivated ? '[ CLICK ] Reset' : '[ CLICK ] Pull';
            } else if (this.interactType === INTERACTABLE_TYPES.NOTE) {
                promptText = '[ CLICK ] Read';
            } else if (this.interactType === INTERACTABLE_TYPES.DOOR) {
                promptText = this.isLocked ? '[ CLICK ] Inspect' : '[ CLICK ] Enter';
            }

            renderer.drawText(promptText, this.x + this.width / 2, this.y - 12, {
                color: (this.interactType === INTERACTABLE_TYPES.TORCH) ? '#ffd080' : '#ffffff',
                font: '9px monospace',
                align: 'center'
            });
        }
    }
}
