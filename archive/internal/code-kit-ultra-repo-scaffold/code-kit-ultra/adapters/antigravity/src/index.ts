export interface AntigravityAdapterContext {
  task: string;
  payload?: Record<string, unknown>;
}

export async function runAntigravityAdapter(context: AntigravityAdapterContext): Promise<{ platform: string; task: string; status: string; }> {
  return {
    platform: 'antigravity',
    task: context.task,
    status: 'stubbed'
  };
}
