import * as vscode from 'vscode';
import { SessionManager } from '../auth/sessionClient.js';

export async function signOutCommand() {
  const result = await vscode.window.showWarningMessage('Are you sure you want to sign out?', { modal: true }, 'Sign Out');
  
  if (result === 'Sign Out') {
    const session = SessionManager.getInstance();
    await session.signOut();
    vscode.window.showInformationMessage('Signed out successfully.');
    vscode.commands.executeCommand('code-kit.refresh');
  }
}
