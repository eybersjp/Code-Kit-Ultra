import * as vscode from "vscode";
import axios from "axios";

export class ApprovalsProvider implements vscode.TreeDataProvider<ApprovalItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ApprovalItem | undefined | null | void> = new vscode.EventEmitter<ApprovalItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ApprovalItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ApprovalItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ApprovalItem): Promise<ApprovalItem[]> {
    if (element) return [];

    try {
      const resp = await axios.get("http://localhost:4000/approvals");
      return resp.data.map((appr: any) => new ApprovalItem(
        appr.input?.idea || "Pending Approval",
        appr.gates?.find((g: any) => g.status === "needs-review")?.gate || "Review Required",
        appr.input?.priority || "medium",
        appr.approvalId,
        appr.runId,
        vscode.TreeItemCollapsibleState.None
      ));
    } catch (err) {
      return [];
    }
  }
}

class ApprovalItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly gate: string,
    public readonly riskLevel: string,
    public readonly approvalId: string,
    public readonly runId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `Gate: ${this.gate} | Risk: ${this.riskLevel}`;
    this.description = this.gate;
    this.contextValue = "approval";

    if (riskLevel === "high") {
      this.iconPath = new vscode.ThemeIcon("warning", new vscode.ThemeColor("charts.red"));
    } else if (riskLevel === "medium") {
      this.iconPath = new vscode.ThemeIcon("info", new vscode.ThemeColor("charts.yellow"));
    } else {
      this.iconPath = new vscode.ThemeIcon("shield", new vscode.ThemeColor("charts.blue"));
    }

    this.command = {
      command: "code-kit.openControlPanel",
      title: "Inspect Batch",
      arguments: [this]
    };
  }
}
