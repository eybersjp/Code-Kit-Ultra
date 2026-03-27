import * as vscode from 'vscode';
import { SessionManager } from '../auth/sessionClient.js';

export async function selectProjectCommand() {
  const session = SessionManager.getInstance();
  
  // If we have a session, we can show what project we are currently in
  const currentProject = vscode.workspace.getConfiguration('codeKitUltra').get<string>('projectId');

  const projectId = await vscode.window.showInputBox({
    prompt: "Select or enter the Project ID scope for this workspace.",
    placeHolder: currentProject || "proj_...",
    value: currentProject || "",
    ignoreFocusOut: true
  });

  if (projectId !== undefined) {
    await vscode.workspace.getConfiguration('codeKitUltra').update('projectId', projectId, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`✅ Project scope updated to: ${projectId}`);
    
    // Refresh views
    vscode.commands.executeCommand('code-kit.refresh');
  }
}
