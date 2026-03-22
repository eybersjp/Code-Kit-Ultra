# Disaster Recovery & Security Protocol

## 1. Disaster Recovery (DR)

### 1.1 Data Loss (Local Memory)
Code-Kit-Ultra stores all system state in the local `.codekit/` directory. Should this directory be deleted:
- **Impact**: All historical run reports and idea tracking are lost.
- **Recovery**: The directory is **automatically reconstructed** on the next `ck init` or `ck validate-env`.
- **Precaution**: Important `RunReport` artifacts should be committed to version control if they are to be kept permanently.

### 1.2 Corrupt Skill Registry
If `config/skill-registry.json` becomes corrupted:
- **Impact**: Skill selection will throw a JSON parse error.
- **Recovery**: Re-copy the `config/skill-registry.json.example` or revert the file using `git checkout config/skill-registry.json`.

## 2. Security Protocol

### 2.1 Code Execution Safety
Code-Kit-Ultra is a **governed** engine. It identifies tasks and plans but does **not** execute arbitrary code automatically without an explicit adapter (e.g., Cursor) receiving user approval for file edits.

### 2.2 Data Privacy
- All system memory is **local-only**. No project idea data is sent to a central Code-Kit-Ultra server by the core engine.
- External adapters (Cursor/Windsurf) have their own privacy policies for how they transmit data to LLM backends.

### 2.3 Role-Based Access (Future)
Future enterprise versions of Code-Kit-Ultra will implement RBAC for skill promotion, requiring a signed JWT for any modification to `skill-registry.json`.

### 2.4 Integrity Checks
Every release contains a `RELEASE_CHECKSUMS.md` to ensure the distributed CLI has not been tampered with.
