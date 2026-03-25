import * as vscode from "vscode";
import axios from "axios";
import { RunsProvider } from "./views/runs-provider.js";
import { ApprovalsProvider } from "./views/approvals-provider.js";
import { RunDetailPanel } from "./webview/run-detail.js";

export function activate(context: vscode.ExtensionContext) {
  console.log("Code Kit Ultra Control Plane active");

  let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = "code-kit.startControlService";
  context.subscriptions.push(statusBarItem);
  statusBarItem.show();

  const updateConfig = () => {
    const config = vscode.workspace.getConfiguration("codeKitUltra");
    const apiKey = config.get<string>("apiKey") || "";
    const baseUrl = config.get<string>("controlServiceUrl") || "http://localhost:4000";
    axios.defaults.baseURL = baseUrl;
    axios.defaults.headers.common["x-api-key"] = apiKey;
  };

  updateConfig();
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("codeKitUltra")) updateConfig();
  }));

  const checkHealth = async () => {
    try {
      await axios.get("/runs");
      statusBarItem.text = "$(pass) Code Kit: Online";
      statusBarItem.tooltip = "Control Service is running";
      statusBarItem.command = undefined; // clear command if online
    } catch (e: any) {
      if (e.response && e.response.status === 401 || e.response?.status === 403) {
        statusBarItem.text = "$(warning) Code Kit: Auth Error";
        statusBarItem.tooltip = "Invalid API Key in Workspace Settings";
        statusBarItem.command = "workbench.action.openSettings";
      } else {
        statusBarItem.text = "$(error) Code Kit: Offline";
        statusBarItem.tooltip = "Click to Start Control Service";
        statusBarItem.command = "code-kit.startControlService";
      }
    }
  };

  // initial check and regular polling (every 5 seconds)
  checkHealth();
  const healthInterval = setInterval(checkHealth, 5000);
  context.subscriptions.push({ dispose: () => clearInterval(healthInterval) });

  const runsProvider = new RunsProvider();
  vscode.window.registerTreeDataProvider("code-kit-runs", runsProvider);

  const approvalsProvider = new ApprovalsProvider();
  vscode.window.registerTreeDataProvider("code-kit-approvals", approvalsProvider);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("code-kit.refresh", () => {
      runsProvider.refresh();
      approvalsProvider.refresh();
    }),
    vscode.commands.registerCommand("code-kit.openControlPanel", (item) => {
      RunDetailPanel.createOrShow(item.runId);
    }),
    vscode.commands.registerCommand("code-kit.startControlService", () => {
      const config = vscode.workspace.getConfiguration("codeKitUltra");
      const codeKitPath = config.get<string>("workspacePath");
      if (!codeKitPath) {
        vscode.window.showErrorMessage("Code Kit Ultra CodeKitPath is not set in Workspace Settings!");
        return;
      }
      const terminal = vscode.window.createTerminal({
        name: "Code Kit Control Service",
        cwd: codeKitPath
      });
      terminal.show();
      terminal.sendText("npm run start:control");
    }),
    vscode.commands.registerCommand("code-kit.approveBatch", async (item) => {
      try {
        await axios.post(`/approvals/${item.approvalId}/approve`);
        vscode.window.showInformationMessage(`Successfully approved: ${item.label}`);
        approvalsProvider.refresh();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Approval failed: ${err.message}`);
      }
    }),
    vscode.commands.registerCommand("code-kit.rejectBatch", async (item) => {
      try {
        await axios.post(`/approvals/${item.approvalId}/reject`);
        vscode.window.showInformationMessage(`Successfully rejected: ${item.label}`);
        approvalsProvider.refresh();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Rejection failed: ${err.message}`);
      }
    })
  );
}

export function deactivate() {}
