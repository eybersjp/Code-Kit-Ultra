import * as vscode from 'vscode';
import { SessionManager } from '../auth/sessionClient.js';
import axios from 'axios';

/**
 * Wave 6: Enhanced Status Bar for VS Code Extension.
 * Handles auth state + network health visually.
 * 
 * States:
 * - Code Kit: Signed Out
 * - Code Kit: Online
 * - Code Kit: Auth Expired
 * - Code Kit: Legacy Dev Mode
 * - Code Kit: Offline
 */
export class CKStatusBar {
  private item: vscode.StatusBarItem;
  private static instance: CKStatusBar;

  private constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'code-kit.signIn';
    context.subscriptions.push(this.item);
    this.item.show();
  }

  static init(context: vscode.ExtensionContext): CKStatusBar {
    this.instance = new CKStatusBar(context);
    return this.instance;
  }

  static getInstance(): CKStatusBar {
    return this.instance;
  }

  async update(isOnline: boolean) {
    const session = SessionManager.getInstance();
    const config = vscode.workspace.getConfiguration('codeKitUltra');
    const authMode = config.get<string>('authMode');

    if (!isOnline) {
      this.item.text = "$(error) Code Kit: Offline";
      this.item.tooltip = "Click to Start Control Service";
      this.item.command = 'code-kit.startControlService';
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      return;
    }

    this.item.backgroundColor = undefined;

    if (authMode === 'legacy-api-key') {
      this.item.text = "$(warning) Code Kit: Dev Mode (Legacy)";
      this.item.tooltip = "DEPRECATED: Using legacy API key. Click to switch to InsForge Bearer Sessions.";
      this.item.command = 'workbench.action.openSettings';
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      return;
    }

    if (!session.token) {
      this.item.text = "$(account) Code Kit: Signed Out";
      this.item.tooltip = "Click to Sign In with InsForge Bearer Session";
      this.item.command = 'code-kit.signIn';
      return;
    }

    if (!session.session) {
      this.item.text = "$(warning) Code Kit: Auth Expired";
      this.item.tooltip = "Session token invalid or expired. Please Sign In again.";
      this.item.command = 'code-kit.signIn';
      return;
    }

    // Default: Online & Authenticated
    this.item.text = "$(pass) Code Kit: Online";
    this.item.tooltip = `Logged in as: ${session.session.actor.actorName || session.session.actor.actorId} (${session.session.tenant.orgId})`;
    this.item.command = 'code-kit.signOut';
  }
}
