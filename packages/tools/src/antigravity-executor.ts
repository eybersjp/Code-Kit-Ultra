import type { ToolExecutor } from "./executor-interface";

/**
 * Replace the placeholder implementation with your real Antigravity tool bindings.
 */
export class AntigravityExecutor implements ToolExecutor {
  async createDir(targetPath: string): Promise<void> {
    void targetPath;
    throw new Error("AntigravityExecutor.createDir is not wired yet.");
  }

  async writeFile(targetPath: string, content: string): Promise<void> {
    void targetPath;
    void content;
    throw new Error("AntigravityExecutor.writeFile is not wired yet.");
  }

  async appendFile(targetPath: string, content: string): Promise<void> {
    void targetPath;
    void content;
    throw new Error("AntigravityExecutor.appendFile is not wired yet.");
  }

  async runCommand(command: string, cwd?: string): Promise<void> {
    void command;
    void cwd;
    throw new Error("AntigravityExecutor.runCommand is not wired yet.");
  }
}
