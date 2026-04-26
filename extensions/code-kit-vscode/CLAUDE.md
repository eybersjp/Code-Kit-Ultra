# VS Code Extension — Code Kit Ultra IDE Integration

## Quick Overview

The VS Code Extension (`extensions/code-kit-vscode/`) brings Code Kit Ultra governance directly into the IDE. It provides:
- Inline execution intent entry
- Status bar indicators for run progress
- Sidebar views for runs, approvals, and alerts
- Webview UI for complex workflows (approval dialogs)
- Direct API integration with control-service
- Token management and authentication (InsForge or legacy API keys)

The extension is built with **TypeScript** and the **VS Code Extension API**. It communicates with control-service via HTTP and displays real-time updates in multiple UI components.

**Key Files:**
- `src/extension.ts` — Extension entry point, activation
- `src/commands/` — Command handlers (signIn, signOut, selectProject)
- `src/auth/sessionClient.ts` — Session and token management
- `src/api/client.ts` — HTTP API client
- `src/views/` — Sidebar tree views (runs-provider, approvals-provider)
- `src/status/statusBar.ts` — Status bar integration
- `src/webview/` — Complex UI via webviews
- `package.json` — Extension manifest, contributes, permissions

---

## Extension Manifest

**File:** `package.json`

Key manifest sections:

### Activation Events
```json
"activationEvents": [
  "onStartupFinished"
]
```
Activates when VS Code starts. Other options: `onCommand`, `onView`, `onLanguage`.

### Contributes

#### Commands
```json
"commands": [
  {
    "command": "code-kit.signIn",
    "title": "CK: Sign In"
  },
  {
    "command": "code-kit.selectProject",
    "title": "CK: Select Project"
  }
]
```

#### Configuration
```json
"configuration": {
  "properties": {
    "codeKitUltra.controlServiceUrl": {
      "type": "string",
      "default": "http://localhost:4000",
      "description": "URL of the control-service"
    },
    "codeKitUltra.authMode": {
      "type": "string",
      "enum": ["bearer-session", "legacy-api-key"],
      "default": "bearer-session"
    }
  }
}
```

#### Views
```json
"viewsContainers": {
  "activitybar": [
    {
      "id": "code-kit-ultra",
      "title": "Code Kit Ultra",
      "icon": "assets/icon.svg"
    }
  ]
},
"views": {
  "code-kit-ultra": [
    {
      "id": "code-kit-overview",
      "name": "Overview"
    },
    {
      "id": "code-kit-runs",
      "name": "Runs"
    },
    {
      "id": "code-kit-approvals",
      "name": "Approvals"
    }
  ]
}
```

---

## Directory Structure

```
extensions/code-kit-vscode/
├── src/
│   ├── extension.ts               # Activation & command registration
│   ├── commands/
│   │   ├── signIn.ts             # Sign in command
│   │   ├── signOut.ts            # Sign out command
│   │   └── selectProject.ts      # Project selection
│   ├── auth/
│   │   ├── sessionClient.ts      # Session and token management
│   │   └── sessionClient.test.ts # Tests
│   ├── api/
│   │   └── client.ts             # HTTP API client (Axios-based)
│   ├── views/
│   │   ├── runs-provider.ts      # Runs tree view provider
│   │   ├── approvals-provider.ts # Approvals tree view provider
│   │   └── alerts-provider.ts    # Alerts/notifications view
│   ├── status/
│   │   ├── statusBar.ts          # Status bar UI
│   │   └── statusBar.test.ts     # Tests
│   ├── webview/
│   │   ├── run-detail.ts         # Run detail webview
│   │   ├── approval-dialog.ts    # Approval UI webview
│   │   └── [other webviews]
│   └── types.ts                  # TypeScript type definitions
├── assets/
│   ├── icon.svg                  # Activity bar icon
│   └── [other images]
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript config
└── vite.config.ts                # Build config (if using Vite)
```

---

## Core Components

### 1. Extension Entry Point

**File:** `src/extension.ts`

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // Initialize when extension loads
  console.log('Code Kit Ultra extension activated')

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('code-kit.signIn', signInCommand),
    vscode.commands.registerCommand('code-kit.selectProject', selectProjectCommand)
  )

  // Register tree view providers
  const runsProvider = new RunsTreeViewProvider()
  vscode.window.registerTreeDataProvider('code-kit-runs', runsProvider)

  const approvalsProvider = new ApprovalsTreeViewProvider()
  vscode.window.registerTreeDataProvider('code-kit-approvals', approvalsProvider)

  // Register status bar
  statusBar.initialize()

  // Set up polling for real-time updates (every 5 seconds)
  setInterval(() => {
    runsProvider.refresh()
    approvalsProvider.refresh()
  }, 5000)
}

export function deactivate() {
  // Cleanup on extension unload
  statusBar.dispose()
}
```

### 2. Authentication & Session Management

**File:** `src/auth/sessionClient.ts`

```typescript
interface Session {
  token: string
  userId: string
  projectId: string
  expiresAt: Date
}

class SessionClient {
  private context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  async signIn(email: string, password: string): Promise<Session> {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password
    })
    
    const session: Session = response.data
    await this.saveSession(session)
    return session
  }

  async getSession(): Promise<Session | null> {
    return this.context.secrets.get('codekit_session')
  }

  async saveSession(session: Session): Promise<void> {
    // Store in secure vscode.SecretStorage
    await this.context.secrets.store('codekit_session', JSON.stringify(session))
  }

  async clearSession(): Promise<void> {
    await this.context.secrets.delete('codekit_session')
  }

  isTokenExpired(session: Session): boolean {
    return new Date() > session.expiresAt
  }
}
```

### 3. API Client

**File:** `src/api/client.ts`

```typescript
class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = vscode.workspace
      .getConfiguration('codeKitUltra')
      .get('controlServiceUrl') || 'http://localhost:4000'
  }

  async setToken(token: string) {
    this.token = token
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders()
    })
    return response.json() as T
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    })
    return response.json() as T
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }
}
```

### 4. Sidebar Tree Views

**File:** `src/views/runs-provider.ts`

Tree view providers implement `vscode.TreeDataProvider<T>`:

```typescript
interface RunTreeItem {
  id: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  timestamp: Date
  collapsibleState: vscode.TreeItemCollapsibleState
}

class RunsTreeViewProvider implements vscode.TreeDataProvider<RunTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RunTreeItem | undefined>()
  onDidChangeTreeData = this._onDidChangeTreeData.event

  async getChildren(element?: RunTreeItem): Promise<RunTreeItem[]> {
    if (!element) {
      // Root level: List runs
      const runs = await apiClient.get<Run[]>('/api/runs?limit=20')
      return runs.map(run => ({
        id: run.id,
        label: `${run.intent} (${run.status})`,
        status: run.status,
        timestamp: new Date(run.createdAt),
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
      }))
    } else {
      // Child level: Run details
      const run = await apiClient.get<Run>(`/api/runs/${element.id}`)
      return [
        { id: `${element.id}-intent`, label: `Intent: ${run.intent}` },
        { id: `${element.id}-status`, label: `Status: ${run.status}` },
        { id: `${element.id}-gates`, label: `Gates: ${run.gates.length}` }
      ]
    }
  }

  getTreeItem(element: RunTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, element.collapsibleState)
    item.iconPath = this.getStatusIcon(element.status)
    item.command = {
      command: 'code-kit.viewRunDetail',
      title: 'View Run',
      arguments: [element.id]
    }
    return item
  }

  refresh() {
    this._onDidChangeTreeData.fire(undefined)
  }

  private getStatusIcon(status: string): vscode.ThemeIcon {
    switch (status) {
      case 'completed': return new vscode.ThemeIcon('pass')
      case 'failed': return new vscode.ThemeIcon('error')
      case 'running': return new vscode.ThemeIcon('sync~spin')
      default: return new vscode.ThemeIcon('circle-outline')
    }
  }
}
```

### 5. Status Bar Integration

**File:** `src/status/statusBar.ts`

```typescript
class StatusBar {
  private statusBarItem: vscode.StatusBarItem
  private currentRun: Run | null = null

  initialize() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    )
    this.statusBarItem.show()
    this.updateStatus()
  }

  async updateStatus() {
    const session = await sessionClient.getSession()
    
    if (!session) {
      this.statusBarItem.text = '$(circle-outline) CK: Sign In'
      this.statusBarItem.command = 'code-kit.signIn'
      return
    }

    // Fetch current run if exists
    const runs = await apiClient.get<Run[]>('/api/runs?limit=1&status=running')
    
    if (runs.length > 0) {
      this.currentRun = runs[0]
      this.statusBarItem.text = `$(sync~spin) CK: ${this.currentRun.status}`
      this.statusBarItem.tooltip = `Run: ${this.currentRun.intent}`
    } else {
      this.statusBarItem.text = '$(check) CK: Ready'
      this.statusBarItem.command = 'code-kit.selectProject'
    }
  }

  dispose() {
    this.statusBarItem.dispose()
  }
}
```

### 6. Webview UI (Approval Dialog)

**File:** `src/webview/approval-dialog.ts`

For complex UIs (approval form), use webviews:

```typescript
async function showApprovalDialog(gateId: string) {
  const panel = vscode.window.createWebviewPanel(
    'approvalDialog',
    'Approve Gate',
    vscode.ViewColumn.One,
    { enableScripts: true }
  )

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: var(--vscode-font-family); }
          input { width: 100%; padding: 8px; margin: 8px 0; }
          button { padding: 8px 16px; background: var(--vscode-button-background); }
        </style>
      </head>
      <body>
        <h2>Approve Gate</h2>
        <p>Gate ID: ${gateId}</p>
        <textarea id="reason" placeholder="Reason for approval..." style="width: 100%; height: 100px;"></textarea>
        <button onclick="approve()">Approve</button>
        <button onclick="reject()">Reject</button>
        <script>
          const vscode = acquireVsCodeApi()
          
          function approve() {
            const reason = document.getElementById('reason').value
            vscode.postMessage({ command: 'approve', reason })
          }
          
          function reject() {
            vscode.postMessage({ command: 'reject' })
          }
        </script>
      </body>
    </html>
  `

  // Handle message from webview
  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === 'approve') {
      await apiClient.post(`/api/gates/${gateId}/approve`, {
        reason: message.reason
      })
      vscode.window.showInformationMessage('Gate approved!')
      panel.dispose()
    }
  })
}
```

---

## Commands & Workflows

### 1. Sign In Command

**File:** `src/commands/signIn.ts`

```typescript
async function signInCommand() {
  const email = await vscode.window.showInputBox({
    prompt: 'Enter your email'
  })

  if (!email) return

  const password = await vscode.window.showInputBox({
    prompt: 'Enter password',
    password: true
  })

  if (!password) return

  try {
    const session = await sessionClient.signIn(email, password)
    apiClient.setToken(session.token)
    vscode.window.showInformationMessage('Signed in successfully!')
    statusBar.updateStatus()
  } catch (error) {
    vscode.window.showErrorMessage(`Sign in failed: ${error.message}`)
  }
}
```

### 2. Select Project Command

**File:** `src/commands/selectProject.ts`

```typescript
async function selectProjectCommand() {
  const projects = await apiClient.get<Project[]>('/api/projects')
  
  const selected = await vscode.window.showQuickPick(
    projects.map(p => ({ label: p.name, value: p.id }))
  )

  if (selected) {
    // Save selected project to workspace config
    const config = vscode.workspace.getConfiguration('codeKitUltra')
    await config.update('projectId', selected.value)
    
    vscode.window.showInformationMessage(`Selected project: ${selected.label}`)
  }
}
```

### 3. Create Run Command

Can be triggered via command palette or keyboard shortcut:

```typescript
vscode.commands.registerCommand('code-kit.createRun', async () => {
  const intent = await vscode.window.showInputBox({
    prompt: 'What would you like to do?'
  })

  if (!intent) return

  try {
    const run = await apiClient.post<Run>('/api/runs', { intent })
    vscode.window.showInformationMessage(`Run created: ${run.id}`)
    // Open run detail view
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create run: ${error.message}`)
  }
})
```

---

## Authentication Modes

### Mode 1: Bearer Session (Recommended)

Uses InsForge for OAuth. Token managed automatically:

```json
"codeKitUltra.authMode": "bearer-session"
```

Flow:
1. User clicks "Sign In"
2. Browser opens InsForge login
3. Callback returns session token
4. Token stored in VS Code's secure storage (`vscode.SecretStorage`)
5. Token automatically injected in API calls

### Mode 2: Legacy API Key

Deprecated but supported for backward compatibility:

```json
"codeKitUltra.authMode": "legacy-api-key",
"codeKitUltra.legacyApiKey": "sk-..."
```

Simple static API key sent in every request header.

---

## Configuration

### User Settings

Users configure extension via VS Code settings:

**Settings UI:** File → Preferences → Settings → Extensions → Code Kit Ultra

**Or `settings.json`:**
```json
{
  "codeKitUltra.controlServiceUrl": "https://api.prod.example.com",
  "codeKitUltra.authMode": "bearer-session",
  "codeKitUltra.projectId": "proj-123"
}
```

### Configuration Keys

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `controlServiceUrl` | string | `http://localhost:4000` | Control-service endpoint |
| `authMode` | string | `bearer-session` | Auth method (bearer-session or legacy-api-key) |
| `legacyApiKey` | string | (empty) | Static API key (legacy) |
| `projectId` | string | (empty) | Default project ID |
| `workspacePath` | string | (empty) | Auto-start control-service repo path |

---

## Testing

### Unit Tests

Test location: `src/**/*.test.ts`

Using **Vitest** with VS Code API mocked:

```typescript
describe('SessionClient', () => {
  it('should save session to secure storage', async () => {
    const client = new SessionClient(mockContext)
    const session = { token: 'abc123', userId: 'user-1', expiresAt: new Date() }
    
    await client.saveSession(session)
    
    expect(mockContext.secrets.store).toHaveBeenCalledWith(
      'codekit_session',
      JSON.stringify(session)
    )
  })
})
```

### Running Tests

```bash
pnpm --filter code-kit-vscode run test
pnpm --filter code-kit-vscode run test:watch
```

### Manual Testing (Debug Mode)

1. Open extension in VS Code
2. Press **F5** to launch debug window
3. Debug window opens with extension running
4. Open command palette (Ctrl+Shift+P)
5. Run "CK: Sign In" or other commands
6. Check status bar and sidebar for updates

---

## Packaging & Distribution

### Building for Distribution

```bash
# 1. Build TypeScript
pnpm --filter code-kit-vscode run compile

# 2. Package as .vsix
npm install -g vsce
vsce package

# Output: code-kit-vscode-1.2.0.vsix
```

### Publishing to VS Code Marketplace

1. Create publisher account: https://marketplace.visualstudio.com/manage
2. Get Personal Access Token (PAT)
3. Login to vsce: `vsce login`
4. Publish: `vsce publish`

### Manual Installation

Users can install .vsix locally:
```bash
code --install-extension code-kit-vscode-1.2.0.vsix
```

---

## Gotchas & Troubleshooting

### 1. Extension Activation Issues

**Problem:** Extension doesn't activate on startup

**Solution:**
- Check `activationEvents` in package.json
- Verify extension files compiled: `npm run compile`
- Check debug output: View → Output → "Code Kit Ultra"
- Force reload: Ctrl+R in debug window

### 2. Token Security

**Problem:** Token stored insecurely or leaked in logs

**Solution:**
- Always use `vscode.SecretStorage` for tokens
- Never log tokens or secrets
- Use HTTP (not console.log) for debugging
- Enable secure storage: Most VS Code versions support it natively

### 3. Webview CSP (Content Security Policy)

**Problem:** Webview scripts don't load, "Refused to execute"

**Solution:**
- Enable scripts in webview creation:
  ```typescript
  const panel = vscode.window.createWebviewPanel(
    'id', 'title', column,
    { enableScripts: true }  // Must be true
  )
  ```
- Use CSP meta tag in HTML:
  ```html
  <meta http-equiv="Content-Security-Policy" 
    content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
  ```

### 4. API Endpoint Discovery

**Problem:** Extension can't reach control-service

**Solution:**
- Check settings: `codeKitUltra.controlServiceUrl`
- Default: `http://localhost:4000`
- Test: Open DevTools and curl the endpoint
- If remote: Verify CORS headers and firewall rules

### 5. Workspace Trust

**Problem:** Extension prompts for workspace trust on every reload

**Solution:**
- Add extension to trusted list in workspace
- Or set in `.vscode/settings.json` to allow:
  ```json
  {
    "security.workspace.trust.untrustedFiles": "open"
  }
  ```

---

## Common Workflows

### Approve a Gate from VS Code

1. Open Code Kit sidebar (activity bar, bottom icon)
2. Click "Approvals" view
3. Pending gates list appears
4. Click gate to expand details
5. Click "Approve" button
6. Enter reason in popup
7. Confirmation message appears
8. List refreshes automatically

### Create a New Run

1. Press Ctrl+Shift+P (command palette)
2. Type "Code Kit: Create Run"
3. Enter intent (e.g., "Add authentication to API")
4. Run created, ID shown in status bar
5. Click status bar to view run detail

### Switch Projects

1. Command palette: "Code Kit: Select Project"
2. QuickPick shows available projects
3. Select project
4. Sidebar updates with relevant runs/approvals

---

## Cross-References

**Phase 1 (Core):**

- [`packages/shared`](../../packages/shared/CLAUDE.md) — Shared types (Run, Gate, Session)
- [`packages/auth`](../../packages/auth/CLAUDE.md) — Token generation and validation
- [`packages/governance`](../../packages/governance/CLAUDE.md) — Gate definitions

**Phase 2 (Tier A - Optional):**

- [`packages/realtime`](../../packages/realtime/CLAUDE.md) — WebSocket events for live updates
- [`packages/observability`](../../packages/observability/CLAUDE.md) — Metrics integration

**Tier B (Orchestration):**

- [`packages/core`](../../packages/core/CLAUDE.md) — Type validation and auth utilities
- [`packages/adapters`](../../packages/adapters/CLAUDE.md) — Platform integration reference
- [`packages/storage`](../../packages/storage/CLAUDE.md) — Artifact retrieval

**Applications:**

- [`apps/control-service`](../control-service/CLAUDE.md) — Provides API endpoints
- [`apps/cli`](../cli/CLAUDE.md) — Alternative command-line interface (same control-service)
- [`apps/web-control-plane`](../web-control-plane/CLAUDE.md) — Web alternative UI
- [`apps/web-landing`](../web-landing/CLAUDE.md) — Landing page with links

**Cross-Cutting Documentation:**

- [Root CLAUDE.md](../../CLAUDE.md) — Project overview and architecture
- [Architecture Guide](../../docs/ARCHITECTURE.md) — System design and layers
- [Config Schema](../../docs/CONFIG_SCHEMA.md) — Configuration reference
- [Testing Guide](../../docs/TESTING.md) — Test patterns for extensions
- [Deployment Guide](../../docs/DEPLOYMENT.md) — Publishing to VS Code marketplace
- [Troubleshooting Guide](../../docs/TROUBLESHOOTING.md) — Common extension issues
