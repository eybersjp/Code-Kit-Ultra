import * as vscode from "vscode";
import axios from "axios";

export class RunsProvider implements vscode.TreeDataProvider<RunItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<RunItem | undefined | null | void> = new vscode.EventEmitter<RunItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<RunItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: RunItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: RunItem): Promise<RunItem[]> {
    if (element) return [];

    try {
      const resp = await axios.get("http://localhost:4000/runs");
      return resp.data.map((run: any) => new RunItem(
        run.label || run.runId,
        run.status,
        run.createdAt,
        run.runId,
        vscode.TreeItemCollapsibleState.None
      ));
    } catch (err) {
      return [new RunItem("Error loading runs", "error", "", "", vscode.TreeItemCollapsibleState.None)];
    }
  }
}

class RunItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly status: string,
    public readonly createdAt: string,
    public readonly runId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label} (${this.status})`;
    this.description = this.status;
    this.contextValue = "run";
    
    if (status === "execute") {
      this.iconPath = new vscode.ThemeIcon("pass-filled", new vscode.ThemeColor("charts.green"));
    } else if (status === "blocked") {
      this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
    } else if (status === "paused") {
      this.iconPath = new vscode.ThemeIcon("debug-pause", new vscode.ThemeColor("charts.yellow"));
    } else {
      this.iconPath = new vscode.ThemeIcon("circle-outline");
    }

    this.command = {
      command: "code-kit.openControlPanel",
      title: "Open Run Detail",
      arguments: [this]
    };
  }
}
