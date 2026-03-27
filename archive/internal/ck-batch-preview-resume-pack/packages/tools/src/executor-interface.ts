export interface ToolExecutor {
  createDir(path: string): Promise<void>;
  writeFile(path: string, content: string): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;
  runCommand(command: string, cwd?: string): Promise<void>;
}
