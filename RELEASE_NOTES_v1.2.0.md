# Release Notes — Code Kit Ultra v1.2.0

## 🔖 Version
**v1.2.0-ide-control-plane**

## 🎯 Highlights

### 🧩 IDE-Native Control Plane (NEW)

Full integration with VS Code.

- **Sidebar**:
  - **Runs Explorer**: Live run tracking for all autonomous activities.
  - **Approvals Queue**: Real-time management of pending gates and decisions.
- **Webview Dashboard**:
  - **Intake Summary**: High-level overview of the original intent.
  - **Execution Plan**: Visual breakdown of the planned task graph.
  - **Specialist Gates**: Transparency into multi-agent consensus results.
  - **Adapter Logs**: Live feed of execution details.

### 🧠 Phase 7 MVP Alignment (COMPLETED)
- `.codekit/runs` now acts as the single source of truth for all execution data.
- Standardized JSON schemas for:
    - `intake.json`
    - `plan.json`
    - `gates.json`
    - `adapters.json`

### ⚙️ Control Service (Layer 2)
- **RunReader**: Dynamically parses run artifacts for the UI.
- **ApprovalService**: Detects pending approvals and emits real-time signals.

### 🖥️ VS Code Extension (Layer 3)
- **Sidebar Providers**: `RunsProvider` and `ApprovalsProvider`.
- **Run Detail Panel**: Comprehensive multi-section dashboard for deep-dive inspection.

### 🛑 Governance System (LIVE)
Execution automatically pauses on medium-risk batches and specialist-triggered gates, requiring human approval via the IDE.

## 📁 Artifacts
All run data is persistently stored in:
`.codekit/runs/<run-id>/`

## 🧪 Verified Scenarios
- ✅ Full run execution loop.
- ✅ Gate-triggered execution pause.
- ✅ IDE approval → resume workflow.
- ✅ Dashboard rendering and data synchronization.

## 🔐 What This Unlocks
- A governed autonomous agent system.
- Human-in-the-loop execution for high-risk regions.
- Visual debugging and governance interface.
- Persistent execution memory layer for long-running workflows.
