/**
 * Real-time event subscription for Web Control Plane.
 * Subscribes to canonical realtime/timeline events.
 */

export interface RealtimeEvent {
  topic: string;
  data: any;
}

type EventListener = (data: any) => void;

class RealtimeClient {
  private listeners: Map<string, Set<EventListener>> = new Map();

  constructor() {
    // In production, this would open a WebSocket or SSE to the Control Service
    // For now, we simulate connectivity
  }

  subscribe(topic: string, callback: EventListener) {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(callback);

    return () => this.unsubscribe(topic, callback);
  }

  unsubscribe(topic: string, callback: EventListener) {
    if (this.listeners.has(topic)) {
      this.listeners.get(topic)!.delete(callback);
    }
  }

  // Simulated method to handle incoming messages from the backend
  public handleRemoteEvent(event: RealtimeEvent) {
    if (this.listeners.has(event.topic)) {
      this.listeners.get(event.topic)!.forEach((cb: EventListener) => cb(event.data));
    }
    
    // Broadcast globally to all subscribers if necessary
    if (this.listeners.has('*')) {
      this.listeners.get('*')!.forEach(cb => cb(event));
    }
  }
}

export const realtime = new RealtimeClient();
