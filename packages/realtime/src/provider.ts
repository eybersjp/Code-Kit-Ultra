// packages/realtime/src/provider.ts
export interface RealtimeProvider {
  broadcast(topic: string, data: any): Promise<void>;
  status(): 'online' | 'offline' | 'pending';
}

let provider: RealtimeProvider | null = null;

export function setRealtimeProvider(p: RealtimeProvider) {
  provider = p;
}

export function getRealtimeProvider(): RealtimeProvider {
  if (!provider) {
    // Return a null provider that just logs for local dev visibility
    return {
      broadcast: async (topic, data) => {
        // console.log(`[Realtime: Null] Broadcast to ${topic}`, data.eventType);
      },
      status: () => 'offline'
    };
  }
  return provider;
}
