# Database & Data Schema Diagram

## 1. System Memory Schema (`project-memory.json`)
The primary system database for Code-Kit-Ultra is a local JSON store.

| Field | Type | Description |
| :--- | :--- | :--- |
| `version` | `number` | Schema version (current: 1) |
| `updatedAt` | `ISO8601` | Last modification timestamp |
| `lastIdea` | `string` | The most recent user request idea |
| `recentIdeas` | `string[]` | List of recently entered ideas (deduplicated) |
| `runs` | `RunEntry[]` | History of all orchestration runs |

### 1.1 `RunEntry` Sub-Schema
- `recordedAt`: ISO8601 timestamp.
- `artifactDirectory`: Path to the run's artifacts.
- `artifactReportPath`: Path to the full JSON report.
- `summary`: One-line outcome.

## 2. Run Report Schema (`run-report.json`)
Every orchestration execution produces a full immutable report.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID/string` | Unique run identifier |
| `input` | `UserInput` | The original raw input and mode |
| `intakeResult` | `ClarificationResult` | Outcome of categorization and intake |
| `plan` | `Task[]` | The generated implementation task graph |
| `selectedSkills` | `SelectedSkill[]` | Scored and selected skills from registry |
| `gates` | `GateDecision[]` | Status and reasoning for each gate evaluation |
| `overallGateStatus`| `GateStatus` | Summary status (pass/blocked/needs-review) |

## 3. Skill Registry Schema (`skill-registry.json`)
A configuration file acting as the system's "Knowledge Base."

| Field | Type | Description |
| :--- | :--- | :--- |
| `skillId` | `string` | Unique ID for the skill |
| `name` | `string` | Display name |
| `category` | `string` | Grouping (e.g., `core`, `frontend`) |
| `triggers` | `string[]` | Keywords to trigger a match |
| `projectTypes` | `string[]` | Project categories this skill applies to |
| `taskTriggers` | `string[]` | Specific task IDs that activate this skill |
| `priority` | `number` | Inherent priority score (0-100) |
