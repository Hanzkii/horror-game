/**
 * @file EventBus.js
 * @description Lightweight decoupled event emitter for game-wide notifications and observer pattern.
 */

export class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe a listener to an event.
     * @param {string} event 
     * @param {Function} callback 
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe a listener from an event.
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
            if (this.listeners.get(event).size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * Emit an event with data.
     * @param {string} event 
     * @param {*} data 
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`[EventBus] Error in listener for event "${event}":`, err);
                }
            }
        }
    }

    /**
     * Clear all registered listeners.
     */
    clear() {
        this.listeners.clear();
    }
}

// Global singleton instance
export const events = new EventBus();
export default events;
