/**
 * @file SaveManager.js
 * @description Decoupled, robust persistence manager with schema versioning, backup recovery, and multi-slot support.
 */

const STORAGE_PREFIX = 'echo_save_';
const SETTINGS_KEY = 'echo_settings_v2';
const CURRENT_SCHEMA_VERSION = 2;

export class SaveManager {
    constructor() {
        this.currentSlot = 'auto';
    }

    /**
     * Creates default game data template.
     */
    getDefaultSaveData() {
        return {
            version: CURRENT_SCHEMA_VERSION,
            timestamp: Date.now(),
            slot: this.currentSlot,
            player: {
                floorIndex: 1,
                currentLevel: 'Catacombs — Depth B1',
                checkpointId: 'start',
                x: 48,
                y: 200,
                health: 100,
                sanity: 100
            },
            inventory: {
                notesCollected: [],
                torchesLit: [],
                flags: {}
            },
            stats: {
                playtimeSeconds: 0,
                deaths: 0,
                lurkersBanished: 0,
                notesRead: 0,
                deepestFloor: 1
            }
        };
    }

    /**
     * Default audio & display settings.
     */
    getDefaultSettings() {
        return {
            version: CURRENT_SCHEMA_VERSION,
            masterVol: 0.8,
            musicVol: 0.7,
            ambientVol: 0.85,
            sfxVol: 0.85,
            screenShake: true,
            highContrastText: false
        };
    }

    /**
     * Checks if a save exists for a given slot.
     * @param {string} slot 
     * @returns {boolean}
     */
    hasSave(slot = 'auto') {
        try {
            return localStorage.getItem(`${STORAGE_PREFIX}${slot}`) !== null;
        } catch (e) {
            return false;
        }
    }

    /**
     * Saves game state to localStorage with automatic backup.
     * @param {string} slot
     * @param {Object} data
     * @returns {boolean} Success status
     */
    save(slot = 'auto', data) {
        try {
            const payload = {
                ...this.getDefaultSaveData(),
                ...data,
                version: CURRENT_SCHEMA_VERSION,
                timestamp: Date.now(),
                slot
            };
            const json = JSON.stringify(payload);
            const key = `${STORAGE_PREFIX}${slot}`;
            
            // Back up previous valid save if it exists
            const existing = localStorage.getItem(key);
            if (existing) {
                localStorage.setItem(`${key}_backup`, existing);
            }

            localStorage.setItem(key, json);
            return true;
        } catch (e) {
            console.error('[SaveManager] Failed to save game state:', e);
            return false;
        }
    }

    /**
     * Loads game state from localStorage with fallback to backup on parse failure.
     * @param {string} slot
     * @returns {Object|null}
     */
    load(slot = 'auto') {
        const key = `${STORAGE_PREFIX}${slot}`;
        let raw = null;
        try {
            raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return this.migrate(parsed);
        } catch (err) {
            console.warn(`[SaveManager] Primary save for slot "${slot}" corrupt, attempting backup recovery...`, err);
            try {
                const backupRaw = localStorage.getItem(`${key}_backup`);
                if (backupRaw) {
                    const parsedBackup = JSON.parse(backupRaw);
                    console.info('[SaveManager] Successfully recovered from backup save.');
                    return this.migrate(parsedBackup);
                }
            } catch (backupErr) {
                console.error('[SaveManager] Backup recovery also failed:', backupErr);
            }
            return null;
        }
    }

    /**
     * Migrates legacy or older schema versions.
     * @param {Object} data 
     */
    migrate(data) {
        if (!data || typeof data !== 'object') {
            return this.getDefaultSaveData();
        }

        // Migration from legacy unversioned horror_game_save
        if (!data.version || data.version < 2) {
            const migrated = this.getDefaultSaveData();
            if (data.health !== undefined) migrated.player.health = data.health;
            if (data.sanity !== undefined) migrated.player.sanity = data.sanity;
            if (data.notesCollected) migrated.inventory.notesCollected = data.notesCollected;
            if (data.flags) migrated.inventory.flags = data.flags;
            if (data.currentLevel) migrated.player.currentLevel = data.currentLevel;
            migrated.version = CURRENT_SCHEMA_VERSION;
            return migrated;
        }

        return data;
    }

    /**
     * Removes a save slot.
     * @param {string} slot 
     */
    deleteSave(slot = 'auto') {
        try {
            localStorage.removeItem(`${STORAGE_PREFIX}${slot}`);
            localStorage.removeItem(`${STORAGE_PREFIX}${slot}_backup`);
        } catch (e) {}
    }

    /**
     * Saves user settings.
     * @param {Object} settings 
     */
    saveSettings(settings) {
        try {
            const data = {
                ...this.getDefaultSettings(),
                ...settings,
                timestamp: Date.now()
            };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('[SaveManager] Failed to persist settings:', e);
        }
    }

    /**
     * Loads user settings.
     * @returns {Object}
     */
    loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                return { ...this.getDefaultSettings(), ...JSON.parse(raw) };
            }
        } catch (e) {}
        return this.getDefaultSettings();
    }
}

export const saveManager = new SaveManager();
export default saveManager;
