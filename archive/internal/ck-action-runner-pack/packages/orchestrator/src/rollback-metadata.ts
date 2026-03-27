export interface RollbackEntry {
  type: "file_write" | "file_append" | "dir_create" | "command";
  target: string;
  timestamp: string;
  note: string;
}

export interface RollbackMetadata {
  runId: string;
  entries: RollbackEntry[];
}
