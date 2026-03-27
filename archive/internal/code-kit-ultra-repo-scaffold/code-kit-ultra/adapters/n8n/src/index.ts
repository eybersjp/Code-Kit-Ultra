export interface N8nAdapterContext {
  task: string;
  payload?: Record<string, unknown>;
}

export async function runN8nAdapter(context: N8nAdapterContext): Promise<{ platform: string; task: string; status: string; }> {
  return {
    platform: 'n8n',
    task: context.task,
    status: 'stubbed'
  };
}
