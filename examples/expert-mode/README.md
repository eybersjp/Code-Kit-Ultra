# Expert Mode Example: Full Orchestration Pipeline

The **Expert Mode** flow involves granular steps from intake to deployment, ensuring maximum quality control for enterprise environments.

## 🧠 Input Prompt

> "Develop a full-featured Field-Service CRM with inventory tracking and client management."

## ⚡ Commands Used

```bash
# 1. Enable Expert Mode
codekit /ck-mode expert

# 2. Initialize the project
codekit /ck-init "Field-Service CRM"

# 3. Enter Plan-Build lifecycle
codekit /ck-run --phase intake
codekit /ck-run --phase planning
codekit /ck-run --phase building

# 4. Human-level review and quality audit
codekit /ck-preview
codekit /ck-approve-batch <batch_id>
codekit /ck-run

# 5. Run the trust pipeline to verify signatures
codekit /ck-verify <signed_envelope>.json
```

## 🛠️ Resulting Artifacts

- `.ck/plans/crm_plan.json`: The agent-generated architectural plan.
- `.ck/artifacts/crm-frontend/`: Initial UI framework.
- `.ck/signatures/batch-sha256.sig`: Signed provenance for the entire build.

## 📊 Before/After Repo State

**Before:**

- No project structure.

**After:**

- Full project initialized (frontend, backend, shared types).
- Every change signed and verified.
- Granular phase state in `.ck/runs/current/state.json`.
