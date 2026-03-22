# API Documentation: Code-Kit-Ultra Internal SDK

## 1. Orchestrator Package

### `runVerticalSlice(input: RunVerticalSliceInput): RunVerticalSliceResult`
The main entry point for the orchestration pipeline.
- **Input**: `idea`, `mode?`, `dryRun?`.
- **Logic**: Executes Intake -> Planning -> Skill Selection -> Gate Evaluator -> Memory Storage.
- **Returns**: A full report metadata including result paths.

### `runIntake(input: IntakeInput): ClarificationResult`
Analyzes raw text into structured requirements.
- **Returns**: `normalizedIdea`, `inferredProjectType`, `assumptions`, `clarifyingQuestions`.

## 2. Memory Package

### `recordRun(report: RunReport): RecordedRunResult`
Persists a run to disk and updates the project memory global state.

### `loadProjectMemory(): ProjectMemory`
Loads the current project-level memory from `.codekit/memory/project-memory.json`.

## 3. Skill Engine Package

### `selectSkills(input: SkillSelectionInput): SelectedSkill[]`
Ranks skills from the configured registry.
- **Input**: `clarificationResult`, `plan`.

## 4. Observability Package

### `logger.info(message: string, data?: object): void`
Emits a structured JSON log entry at the `info` level.
- **Format**: `{"level":"info","message":"...", "timestamp":"...", "data":{...}}`

### `logger.error(message: string, error?: any): void`
Emits a structured JSON log entry for failures, routing to `stderr`.
