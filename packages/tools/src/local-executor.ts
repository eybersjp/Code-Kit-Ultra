import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import type { ToolExecutor } from "./executor-interface";

export class LocalExecutor implements ToolExecutor {
  constructor(private workspaceRoot: string) {}

  async createDir(targetPath: string): Promise<void> {
    fs.mkdirSync(path.join(this.workspaceRoot, targetPath), { recursive: true });
  }

  async writeFile(targetPath: string, content: string): Promise<void> {
    const full = path.join(this.workspaceRoot, targetPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
  }

  async appendFile(targetPath: string, content: string): Promise<void> {
    const full = path.join(this.workspaceRoot, targetPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.appendFileSync(full, content, "utf-8");
  }

  async runCommand(command: string, cwd = "."): Promise<void> {
    execSync(command, {
      cwd: path.join(this.workspaceRoot, cwd),
      stdio: "pipe",
    });
  }
}
