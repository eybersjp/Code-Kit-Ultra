import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand("ck.openPanel", () => {
    vscode.window.showInformationMessage("Code Kit Ultra Panel Coming Soon");
  });

  context.subscriptions.push(command);
}

export function deactivate() {}
