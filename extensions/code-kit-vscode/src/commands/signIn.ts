import * as vscode from 'vscode';
import { SessionManager } from '../auth/sessionClient.js';

/**
 * Wave 6: Sign In Command.
 * Requests a bearer token from the user and initializes the session.
 */
export async function signInCommand() {
  const token = await vscode.window.showInputBox({
    prompt: "Enter your Code Kit Ultra Bearer Token (InsForge Session)",
    placeHolder: "Bearer token from InsForge UI...",
    ignoreFocusOut: true,
    password: true
  });

  if (!token) return;

  const session = SessionManager.getInstance();
  await session.setToken(token);
  
  const success = await session.refreshSession();
  if (success) {
    vscode.window.showInformationMessage(`Signed in successfully as ${session.session?.actor.actorName || session.session?.actor.actorId}`);
    vscode.commands.executeCommand('code-kit.refresh');
  } else {
    vscode.window.showErrorMessage("Failed to sign in. Please verify your token and ensure the Control Service is reachable.");
  }
}
