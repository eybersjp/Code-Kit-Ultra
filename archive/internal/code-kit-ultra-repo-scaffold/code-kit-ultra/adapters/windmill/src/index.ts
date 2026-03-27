export interface WindmillAdapterContext {
  task: string;
  payload?: Record<string, unknown>;
}

export async function runWindmillAdapter(context: WindmillAdapterContext): Promise<{ platform: string; task: string; status: string; }> {
  return {
    platform: 'windmill',
    task: context.task,
    status: 'stubbed'
  };
}
