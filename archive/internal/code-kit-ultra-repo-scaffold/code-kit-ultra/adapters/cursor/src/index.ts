export interface CursorAdapterContext {
  task: string;
  payload?: Record<string, unknown>;
}

export async function runCursorAdapter(context: CursorAdapterContext): Promise<{ platform: string; task: string; status: string; }> {
  return {
    platform: 'cursor',
    task: context.task,
    status: 'stubbed'
  };
}
