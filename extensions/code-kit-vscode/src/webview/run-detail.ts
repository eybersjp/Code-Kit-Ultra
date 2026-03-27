import * as vscode from "vscode";
import { ckuApi } from "../api/client.js";

/**
 * Wave 6: Run Detail Panel for VS Code Extension.
 * Updated to use centralized ckuApi instead of ad-hoc axios instance.
 */
export class RunDetailPanel {
  public static currentPanel: RunDetailPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(runId: string) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (RunDetailPanel.currentPanel) {
      RunDetailPanel.currentPanel._panel.reveal(column);
      RunDetailPanel.currentPanel.update(runId);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "runDetail",
      `Run Detail: ${runId}`,
      column || vscode.ViewColumn.One,
      { enableScripts: true }
    );

    RunDetailPanel.currentPanel = new RunDetailPanel(panel, runId);
  }

  private constructor(panel: vscode.WebviewPanel, runId: string) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this.update(runId);
  }

  public async update(runId: string) {
    const webview = this._panel.webview;
    this._panel.title = `Run Detail: ${runId}`;
    
    try {
      // Wave 6: Use centralized API client instead of hardcoded URLs
      const [runResp, timelineResp] = await Promise.all([
        ckuApi.get(`/runs/${runId}`),
        ckuApi.get(`/runs/${runId}/timeline`)
      ]);

      webview.html = this._getHtmlForWebview(runResp.data, timelineResp.data);
    } catch (err: any) {
      webview.html = `<h1>Error loading run: ${err.message}</h1>`;
    }
  }

  private _getHtmlForWebview(run: any, timeline: any[]) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: sans-serif; padding: 20px; color: #ccc; background: #1e1e1e; font-size: 13px; line-height: 1.5; }
            .header { border-bottom: 1px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            h1 { margin: 0; color: #fff; font-size: 1.8rem; }
            h2 { color: #569cd6; font-size: 1.2rem; margin-top: 25px; border-bottom: 1px solid #333; padding-bottom: 5px; }
            h3 { color: #ce9178; font-size: 1rem; margin-top: 0; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .badge-pass { background: #1b4d2e; color: #81c784; }
            .badge-review { background: #4d3d1b; color: #ffd54f; }
            .card { background: #252526; border-radius: 8px; padding: 15px; margin-bottom: 15px; border: 1px solid #444; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .timeline-item { padding: 10px; border-left: 2px solid #333; margin-bottom: 15px; background: rgba(255,255,255,0.02); }
            .timeline-item.done { border-left-color: #4caf50; }
            .tag { color: #888; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Run: ${run.runId}</h1>
            <p style="font-size: 1.1rem; color: #ddd;">${run.input?.idea || 'No Idea'}</p>
            <div style="margin-top: 10px;">
                <span class="badge" style="background: #333; color: #eee; margin-right: 5px;">Mode: ${run.input?.mode || 'N/A'}</span>
                <span class="badge" style="background: #333; color: #eee;">Priority: ${run.input?.priority || 'low'}</span>
            </div>
        </div>

        <div class="grid">
            <div>
                <h2>Specialist Gates</h2>
                ${(run.gates || []).map((g: any) => `
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <h3>${g.gate}</h3>
                            <span class="badge badge-${g.status === 'pass' ? 'pass' : 'review'}">${g.status}</span>
                        </div>
                        <p style="margin: 5px 0; opacity: 0.8;">${g.reason}</p>
                    </div>
                `).join('')}
            </div>
            <div>
                <h2>Execution Plan</h2>
                ${(run.plan || []).map((p: any) => `
                    <div class="timeline-item done">
                        <div class="tag">${p.phase} | ${p.taskType}</div>
                        <strong>${p.title}</strong>
                        <div style="opacity: 0.7; margin-top: 4px;">${p.description}</div>
                        <div style="font-style: italic; font-size: 0.85em; color: #569cd6; margin-top: 4px;">Done: ${p.doneDefinition}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <h2>Adapter Executions</h2>
        <div class="card">
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="text-align: left; opacity: 0.5; border-bottom: 1px solid #444;">
                    <th style="padding: 8px;">Task</th>
                    <th style="padding: 8px;">Adapter</th>
                    <th style="padding: 8px;">Status</th>
                    <th style="padding: 8px;">Output</th>
                </tr>
                ${(run.adapterExecutions || []).map((e: any) => `
                    <tr style="border-bottom: 1px solid #333;">
                        <td style="padding: 8px;">${e.taskId}</td>
                        <td style="padding: 8px; color: #ce9178;">${e.adapter}</td>
                        <td style="padding: 8px;"><span class="badge" style="background: #1e1e1e; border: 1px solid #444;">${e.status}</span></td>
                        <td style="padding: 8px; opacity: 0.8;">${e.output}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    </body>
    </html>`;
  }

  public dispose() {
    RunDetailPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }
}
