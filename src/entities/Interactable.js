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
    TORCH: 3,
    OIL_FLASK: 4
};

export class Interactable extends Entity {
    constructor(x, y, type = INTERACTABLE_TYPES.NOTE, properties = {}) {
        super(x, y, 16, 16);
        this.type = 'interactable';
        this.interactType = type;
        this.properties = properties;
        
        this.showPrompt = false;
        this.isActivated = false;
        this.readCount = 0;
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
            const reqFlags = this.properties.requiresFlags || 
                (this.properties.requiresFlag ? [this.properties.requiresFlag] : []);
            this.totalSeals = reqFlags.length;
            this.brokenSeals = reqFlags.filter(f => scene.gameState && scene.gameState.getFlag(f)).length;
            this.isLocked = this.totalSeals > 0 && this.brokenSeals < this.totalSeals;
        }
    }
    
    trigger(player, scene) {
        if (this.interactType === INTERACTABLE_TYPES.NOTE) {
            // Read lore note
            this.readCount = (this.readCount || 0) + 1;
            const currentSanity = (scene.gameState && scene.gameState.sanity !== undefined) ? scene.gameState.sanity : 100;
            const isCorrupted = this.readCount > 1 || currentSanity < 50;

            if (scene.gameState) {
                if (isCorrupted) {
                    const hallucinatoryTexts = [
                        "DID YOU FEEL THAT COLD BREATH ON YOUR NECK?\n\nIT WAS STANDING RIGHT BEHIND YOU.",
                        "THE GATES ONLY OPEN FOR THOSE WHO INTEND TO DIE HERE.\n\nWHY DO YOU STILL RUN?",
                        "YOUR LANTERN IS SPUTTERING.\n\nWHEN THE FLAME DIES, YOU BELONG TO THE ABYSS.",
                        "DO NOT LOOK AT THE SILHOUETTE IN THE DARK.\n\nIT IS WEARING YOUR FACE.",
                        "THERE WERE NEVER ANY STAIRS LEADING OUT.\n\nLOOK AT THE BONES BENEATH YOUR BOOTS."
                    ];
                    const seed = Math.abs(Math.floor(this.x * 7 + this.y * 13)) % hallucinatoryTexts.length;
                    scene.gameState.activeNote = hallucinatoryTexts[seed];
                    scene.gameState.activeNoteTitle = "CURSED INSCRIPTION";
                    if (scene.audio) {
                        scene.audio.play('phantom_whisper');
                    }
                    if (scene.postProcessing) {
                        scene.postProcessing.addTrauma(0.3);
                    }
                    scene.gameState.drainSanity(6);
                } else {
                    scene.gameState.activeNote = this.properties.text || "An ancient inscription carved into stone...";
                    scene.gameState.activeNoteTitle = this.properties.title || "ANCIENT INSCRIPTION";
                    if (scene.audio) scene.audio.play('paper');
                }
                scene.gameState.collectNote(this.properties.id || 'note_generic');
            }
            
            // Surprise element: Awakening shadow upon disturbing cursed notes
            if (scene.entities) {
                const isCursed = Math.random() < 0.45 || (this.properties.text && this.properties.text.toLowerCase().includes('shadow')) || isCorrupted;
                if (isCursed) {
                    for (const ent of scene.entities) {
                        if (ent.type === 'shadow' && typeof ent.awaken === 'function') {
                            ent.awaken(player, scene, 'note');
                        }
                    }
                }
            }
            
        } else if (this.interactType === INTERACTABLE_TYPES.OIL_FLASK) {
            // Pick up oil flask: refills lantern oil
            if (player) {
                player.lanternOil = Math.min(player.maxOil || 100, (player.lanternOil || 100) + 45);
            }
            if (scene.audio) {
                scene.audio.play('bottle_clink');
            }
            if (scene.gameState) {
                scene.gameState.sanctuaryPromptTimer = 2.0;
                scene.gameState.lastPromptText = "+45 LANTERN OIL — The flame burns bright";
            }
            if (scene.postProcessing) {
                scene.postProcessing.addTrauma(0.1);
            }
            this.active = false;
        } else if (this.interactType === INTERACTABLE_TYPES.DOOR) {
            // Check if door requires one or more levers / conduit flags
            const reqFlags = this.properties.requiresFlags || 
                (this.properties.requiresFlag ? [this.properties.requiresFlag] : []);
            const totalSeals = reqFlags.length;
            const brokenSeals = reqFlags.filter(f => scene.gameState && scene.gameState.getFlag(f)).length;
            const isUnlocked = totalSeals === 0 || brokenSeals >= totalSeals;
            
            if (!isUnlocked) {
                // Door is locked!
                const remaining = totalSeals - brokenSeals;
                if (scene.audio) scene.audio.play('thud');
                if (scene.gameState) {
                    if (totalSeals > 1) {
                        scene.gameState.activeNote = `THE IRON GATE IS BOUND BY RUNIC CONDUITS.\n\n${brokenSeals} / ${totalSeals} runic seals broken (${remaining} remaining).\n\nExplore every branch of the catacombs and activate all conduit levers to unseal the passage.`;
                        scene.gameState.activeNoteTitle = "RUNIC SEALED GATE";
                    } else {
                        scene.gameState.activeNote = "THE IRON GATE IS SEALED SHUT.\n\nAn ancient mechanism locks it in place.\nA lever must be hidden in the chambers above...";
                        scene.gameState.activeNoteTitle = "SEALED GATE";
                    }
                }
            } else {
                // Door unlocked — transition immediately, no inscription popup
                if (scene.audio) scene.audio.play('door_creak');
                if (scene.onNextLevel) {
                    scene.onNextLevel();
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
        if (this.properties.isBirchTree) {
            SpriteRenderer.drawBirchTree(renderer, this.x, this.y);
            return;
        }

        if (this.interactType === INTERACTABLE_TYPES.NOTE) {
            SpriteRenderer.drawNote(renderer, this.x, this.y);
        } else if (this.interactType === INTERACTABLE_TYPES.DOOR) {
            SpriteRenderer.drawDoor(renderer, this.x, this.y, this.isLocked, this.totalSeals || 1, this.brokenSeals || 0);
        } else if (this.interactType === INTERACTABLE_TYPES.SWITCH) {
            SpriteRenderer.drawLever(renderer, this.x, this.y, this.isActivated);
        } else if (this.interactType === INTERACTABLE_TYPES.TORCH) {
            SpriteRenderer.drawTorch(renderer, this.x, this.y, this.timer, this.extinguishTimer > 0);
        } else if (this.interactType === INTERACTABLE_TYPES.OIL_FLASK) {
            SpriteRenderer.drawOilFlask(renderer, this.x, this.y, this.timer);
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
