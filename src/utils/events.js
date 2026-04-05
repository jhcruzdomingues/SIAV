/**
 * ================================================
 * Sistema de Event Bus (Pub/Sub)
 * Utilizado para desacoplar a lógica de negócios da UI
 * ================================================
 */

class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, payload = null) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(payload));
  }
}

export const events = new EventBus();