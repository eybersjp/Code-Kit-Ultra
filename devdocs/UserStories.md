# User Stories & Acceptance Criteria

## 1. Interactive Intake
**As a** Product Developer  
**I want** to provide a rough project idea and have it categorized  
**So that** I don't have to manually define the initial implementation scope.

### Acceptance Criteria
- System accepts a string input via `init` command.
- System outputs an inferred category (e.g., `CRM system` -> `web-app`).
- System identifies at least 2 assumptions and 2 clarifying questions based on the category.

## 2. Governed Progress (Gates)
**As a** Tech Lead  
**I want** the system to block progression if an objective is too vague  
**So that** we don't start implementing something that isn't clearly defined.

### Acceptance Criteria
- If `idea` is empty or nonsense, the `Objective Clarity` gate status is `blocked`.
- A summary of blocked gates is printed prominently in the CLI output.
- `overallGateStatus` is recorded as `blocked` in the report.

## 3. Skill Selection
**As a** Solutions Architect  
**I want** the engine to pick the best technical skills from our internal registry  
**So that** the final implementation plan uses our established patterns.

### Acceptance Criteria
- The system reads from `config/skill-registry.json`.
- Skills are ranked by a numerical score.
- The top-matched skills (up to 6) are included in the `selectedSkills` report field.

## 4. Structured Observability
**As a** DevOps Engineer  
**I want** to see logs in a structured JSON format  
**So that** I can ingest them into a log aggregator (ELK/Splunk) easily.

### Acceptance Criteria
- Every log line from the `observability` package is valid JSON.
- Error logs are directed to `stderr`.
- Log entries include a `timestamp`, `level`, and `service` identifier.
