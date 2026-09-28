/**
 * @file AchievementManager.js
 * @description Event-driven progression and achievement engine listening to EventBus.
 */

import { events } from '../core/EventBus.js';

const STORAGE_KEY = 'echo_achievements_v2';

export const ACHIEVEMENTS = [
    {
        id: 'first_ember',
        title: 'First Ember',
        description: 'Enkindle an ancient torch to ward off the darkness.',
        icon: '🔥',
        color: '#fbbf24'
    },
    {
        id: 'sanctuary_of_light',
        title: 'Sanctuary of Light',
        description: 'Banish a creeping Shadow Lurker into the flame.',
        icon: '✨',
        color: '#38bdf8'
    },
    {
        id: 'first_descent',
        title: 'Into the Abyss',
        description: 'Unlock the sealed door and descend past Depth B1.',
        icon: '🚪',
        color: '#a855f7'
    },
    {
        id: 'deep_explorer',
        title: 'Abyssal Pilgrim',
        description: 'Survive and delve down to Depth B3 or lower.',
        icon: '🗝️',
        color: '#ec4899'
    },
    {
        id: 'forbidden_lore',
        title: 'Forbidden Inscriptions',
        description: 'Collect and decipher ancient parchment notes.',
        icon: '📜',
        color: '#e2e8f0'
    },
    {
        id: 'edge_of_madness',
        title: 'Edge of Madness',
        description: 'Unlock and descend while your sanity is below 20%.',
        icon: '👁️',
        color: '#ef4444'
    },
    {
        id: 'abyss_veteran',
        title: 'Clockwork Conqueror',
        description: 'Survive the swinging blades and delve past Depth B18.',
        icon: '⚙️',
        color: '#f59e0b'
    },
    {
        id: 'void_walker',
        title: 'Walker of the Void',
        description: 'Descend through the Obsidian Necropolis to Depth B25.',
        icon: '🌌',
        color: '#c084fc'
    },
    {
        id: 'dawn_breaker',
        title: 'Dawn Breaker',
        description: 'Break all 30 ancient seals and emerge into the morning sunlight.',
        icon: '☀️',
        color: '#34d399'
    },
    {
        id: 'first_demise',
        title: 'Lessons of the Void',
        description: 'Perish in the subterranean depths for the first time.',
        icon: '💀',
        color: '#94a3b8'
    }
];

export class AchievementManager {
    constructor(toastManager = null) {
        this.toastManager = toastManager;
        this.unlocked = new Set();
        this.load();
        this.setupListeners();
    }

    setToastManager(toastManager) {
        this.toastManager = toastManager;
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    this.unlocked = new Set(list);
                }
            }
        } catch (e) {
            console.error('[AchievementManager] Failed to load achievements:', e);
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.unlocked)));
        } catch (e) {
            console.error('[AchievementManager] Failed to save achievements:', e);
        }
    }

    unlock(id) {
        if (this.unlocked.has(id)) return false;

        const achievement = ACHIEVEMENTS.find(a => a.id === id);
        if (!achievement) return false;

        this.unlocked.add(id);
        this.save();

        if (this.toastManager) {
            this.toastManager.show({
                title: `ACHIEVEMENT: ${achievement.title}`,
                description: achievement.description,
                icon: achievement.icon,
                color: achievement.color
            });
        }

        events.emit('ACHIEVEMENT_UNLOCKED', achievement);
        return true;
    }

    isUnlocked(id) {
        return this.unlocked.has(id);
    }

    getAll() {
        return ACHIEVEMENTS.map(a => ({
            ...a,
            unlocked: this.unlocked.has(a.id)
        }));
    }

    setupListeners() {
        // 1. Torch Lit
        events.on('TORCH_LIT', () => {
            this.unlock('first_ember');
        });

        // 2. Enemy Banished
        events.on('ENEMY_BANISHED', () => {
            this.unlock('sanctuary_of_light');
        });

        // 3. Stage Clear / Floor descent
        events.on('STAGE_CLEAR', (data) => {
            const floor = data?.floorIndex || 1;
            if (floor >= 2) this.unlock('first_descent');
            if (floor >= 3) this.unlock('deep_explorer');
            if (floor >= 18) this.unlock('abyss_veteran');
            if (floor >= 25) this.unlock('void_walker');
            if (floor >= 30) this.unlock('dawn_breaker');

            if (data?.sanity !== undefined && data.sanity <= 20) {
                this.unlock('edge_of_madness');
            }
        });

        // 4. Note Collected
        events.on('NOTE_COLLECTED', () => {
            this.unlock('forbidden_lore');
        });

        // 5. Surface Finale Reached
        events.on('FINALE_START', () => {
            this.unlock('dawn_breaker');
        });

        // 6. Player Death
        events.on('PLAYER_DIED', () => {
            this.unlock('first_demise');
        });
    }
}

export const achievementManager = new AchievementManager();
export default achievementManager;
