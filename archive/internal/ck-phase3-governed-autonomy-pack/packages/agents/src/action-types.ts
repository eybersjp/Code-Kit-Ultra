export type BuilderAction =
  | { type: "write_file"; path: string; content: string; reason?: string }
  | { type: "append_file"; path: string; content: string; reason?: string }
  | { type: "create_dir"; path: string; reason?: string }
  | { type: "run_command"; command: string; cwd?: string; reason?: string };

export interface BuilderActionBatch {
  runId: string;
  phase: "build" | "review" | "qa" | "deploy";
  generatedBy: string;
  summary: string;
  actions: BuilderAction[];
  recommendations?: string[];
}
