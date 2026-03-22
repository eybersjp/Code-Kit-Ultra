# UX/UI Design Specifications (CLI & Report Layouts)

## 1. CLI Interactive Patterns
The Code-Kit-Ultra interface is primarily CLI-driven, focusing on readability and information hierarchy.

### 1.1 Color Tokens (via Chalk)
- **Primary Action (Cyan)**: Command execution titles, primary headers.
- **Success (Green)**: Summaries, overall gate status, artifact paths.
- **Warning (Yellow)**: Section headers, plan tasks, assumption lists.
- **Error (Red)**: Validation failures, missing arguments.

### 1.2 Layout: Vertical Slice Report
When `ck init` is called, the output MUST follow this vertical flow:
1. **Logo/Header**: "Code Kit Ultra — Vertical Slice Report" (Cyan).
2. **Outcome Summary**: One-line summary and global gate status (Pass/Block).
3. **Paths**: Absolute links to report and memory files.
4. **Intake Analysis**:
   - Assumptions (Unordered list).
   - Clarifying Questions (Blocking vs. Non-blocking).
5. **Execution Plan**: Task list showing IDs and dependencies.
6. **Skill Mapping**: Selected skills with their selection reason.
7. **Gate Breakdown**: Status and logic for each of the 5 gates.

## 2. Report JSON Structure (`run-report.json`)
The structured report follows a "Single Source of Truth" pattern, allowing UI generators to render the dashboard from any execution artifact.

## 3. Wireframes (Concept for Future Web UI)
- **Top Bar**: Global Mode (Safe/Balanced/God) and Tenant Switcher.
- **Left Panel**: Historic Runs Timeline (from `recentArtifactDirectories`).
- **Main View**: Interactive Task DAG showing blocking dependencies.
- **Right Panel**: Detailed Gate evaluation logic and skill breakdown scores.
