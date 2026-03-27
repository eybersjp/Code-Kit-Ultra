export interface WindsurfAdapterContext {
  task: string;
  payload?: Record<string, unknown>;
}

export async function runWindsurfAdapter(context: WindsurfAdapterContext): Promise<{ platform: string; task: string; status: string; }> {
  return {
    platform: 'windsurf',
    task: context.task,
    status: 'stubbed'
  };
}
