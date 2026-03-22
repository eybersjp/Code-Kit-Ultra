# Software Requirements Specification (SRS): Code-Kit-Ultra

## 1. System Overview
Code-Kit-Ultra is a TypeScript-based monorepo consisting of a CLI application and five core internal packages (`shared`, `orchestrator`, `memory`, `adapters`, `skill-engine`, `observability`).

## 2. Functional Requirements

### 2.1 Orchestration Engine
- **REQ-ORC-001**: The system MUST normalize raw user input into a standard objective.
- **REQ-ORC-002**: The system MUST infer a project category (e.g., `web-app`, `api`) from the objective.
- **REQ-ORC-003**: The system MUST generate a directed acyclic graph (DAG) of implementation tasks.
- **REQ-ORC-004**: The system MUST support three progression modes: `safe`, `balanced`, and `god`.

### 2.2 Gate Management
- **REQ-GAT-001**: The system MUST evaluate at least 5 gates (Clarity, Completeness, Plan, Skill, Risk).
- **REQ-GAT-002**: A `blocked` status in any gate MUST prevent the run from being marked as successful for implementation.

### 2.3 Memory & Persistence
- **REQ-MEM-001**: The system MUST store runs in a versioned `project-memory.json` file.
- **REQ-MEM-002**: Each run MUST create a timestamped artifact directory containing the full `run-report.json`.

### 2.4 Skill Engine
- **REQ-SKL-001**: The system MUST score skills from a `skill-registry.json` based on keyword matching and project category.
- **REQ-SKL-002**: The system MUST fallback to a general scaffold skill if no specialist skill exceeds the scoring threshold.

## 3. Non-Functional Requirements

### 3.1 Performance
- **REQ-NFR-001**: The internal pipeline (Intake to Gate) MUST complete in under 500ms on standard developer hardware.

### 3.2 Observability
- **REQ-NFR-002**: All diagnostic logs MUST be emitted in structured JSON format.

### 3.3 Reliability
- **REQ-NFR-003**: The system MUST NOT throw unhandled exceptions during normal pipeline execution; errors must be captured in the `RunReport`.

## 4. Logical Interface Requirements
- **CLI**: Standard POSIX-compliant CLI using `commander.js`.
- **Environment Variables**: Supports `.env` for overriding base paths or telemetry keys.
