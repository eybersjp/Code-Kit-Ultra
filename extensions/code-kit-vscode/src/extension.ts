import * as vscode from "vscode";
import { RunsProvider } from "./views/runs-provider.js";
import { ApprovalsProvider } from "./views/approvals-provider.js";
import { RunDetailPanel } from "./webview/run-detail.js";
import { SessionManager } from "./auth/sessionClient.js";
import { CKStatusBar } from "./status/statusBar.js";
import { ckuApi } from "./api/client.js";
import { signInCommand } from "./commands/signIn.js";
import { signOutCommand } from "./commands/signOut.js";
import { selectProjectCommand } from "./commands/selectProject.js";

/**
 * Wave 6: VS Code Extension Session-First Migration.
 * Moving from API-key-first to InsForge-session-first.
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log("Code Kit Ultra Control Plane active");

  // 1. Initialize Management Layers
  await SessionManager.init(context);
  const statusBar = CKStatusBar.init(context);

  const runsProvider = new RunsProvider();
  vscode.window.registerTreeDataProvider("code-kit-runs", runsProvider);

  const approvalsProvider = new ApprovalsProvider();
  vscode.window.registerTreeDataProvider("code-kit-approvals", approvalsProvider);

  // 2. Health & Session Polling
  const checkState = async () => {
    try {
      const session = SessionManager.getInstance();
      
      // Attempt to refresh session (calls /v1/session if not in legacy mode)
      await session.refreshSession();
      
      // Check network health of Control Service
      await ckuApi.get("/health", { timeout: 2000 });
      
      // Update status bar with current auth + network state
      statusBar.update(true);

      // Wave 11: Onboarding Nudge
      const onboardingKey = "cku.onboarding.sessionAuth.v1";
      const hasNudged = context.globalState.get<boolean>(onboardingKey);
      const config = vscode.workspace.getConfiguration("codeKitUltra");
      const authMode = config.get<string>("authMode");

      if (!hasNudged && authMode === "bearer-session" && !session.token) {
        const selection = await vscode.window.showInformationMessage(
          "Welcome to Code Kit Ultra! We've moved to session-first authentication via InsForge for improved security and governance.",
          "Sign In Now",
          "Learn More"
        );
        if (selection === "Sign In Now") {
          vscode.commands.executeCommand("code-kit.signIn");
        } else if (selection === "Learn More") {
          vscode.env.openExternal(vscode.Uri.parse("https://docs.insforge.com/code-kit/auth"));
        }
        await context.globalState.update(onboardingKey, true);
      }
    } catch (e: any) {
      // If we get an error, it might be the service is down
      statusBar.update(false);
    }
  };

  // Initial check and regular polling (every 5 seconds)
  checkState();
  const stateInterval = setInterval(checkState, 5000);
  context.subscriptions.push({ dispose: () => clearInterval(stateInterval) });

  // 3. Register Commands
  context.subscriptions.push(
    // Auth Commands
    vscode.commands.registerCommand("code-kit.signIn", signInCommand),
    vscode.commands.registerCommand("code-kit.signOut", signOutCommand),
    vscode.commands.registerCommand("code-kit.selectProject", selectProjectCommand),
    
    // View Shortcuts
    vscode.commands.registerCommand("code-kit.openRuns", () => {
       vscode.commands.executeCommand("code-kit-runs.focus");
    }),
    vscode.commands.registerCommand("code-kit.openGates", () => {
       vscode.commands.executeCommand("code-kit-approvals.focus");
    }),

    // Data Management
    vscode.commands.registerCommand("code-kit.refresh", () => {
      runsProvider.refresh();
      approvalsProvider.refresh();
    }),
    
    vscode.commands.registerCommand("code-kit.openControlPanel", (item) => {
      RunDetailPanel.createOrShow(item.runId);
    }),

    // Local Service Management
    vscode.commands.registerCommand("code-kit.startControlService", () => {
      const config = vscode.workspace.getConfiguration("codeKitUltra");
      const codeKitPath = config.get<string>("workspacePath");
      if (!codeKitPath) {
        vscode.window.showErrorMessage("Code Kit Ultra workspacePath is not set in Workspace Settings!");
        return;
      }
      // Re-use current terminal or create new one
      const existingTerminal = vscode.window.terminals.find(t => t.name === "Code Kit Control Service");
      const terminal = existingTerminal || vscode.window.createTerminal({
        name: "Code Kit Control Service",
        cwd: codeKitPath
      });
      terminal.show();
      terminal.sendText("npm run start:control");
    }),

    // Approval Actions
    vscode.commands.registerCommand("code-kit.approveBatch", async (item) => {
      try {
        await ckuApi.post(`/approvals/${item.approvalId}/approve`);
        vscode.window.showInformationMessage(`✅ Successfully approved: ${item.label}`);
        approvalsProvider.refresh();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Approval failed: ${err.message}`);
      }
    }),
    vscode.commands.registerCommand("code-kit.rejectBatch", async (item) => {
      try {
        await ckuApi.post(`/approvals/${item.approvalId}/reject`);
        vscode.window.showInformationMessage(`Successfully rejected: ${item.label}`);
        approvalsProvider.refresh();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Rejection failed: ${err.message}`);
      }
    })
  );
}

export function deactivate() {}
