# Rollback & Recovery Example: Reverting a Broken API Integration

This example shows how Code Kit Ultra's deterministic rollback system allows you to revert safely if a change introduces a bug.

## 🧠 Input Prompt

> "Integrate the new Payment Gateway API into types.ts and controllers/payments.ts."

## ⚡ Commands Used

```bash
# 1. Start the integration in Expert Mode
codekit /ck-mode pro
codekit /ck-run "API Integration"

# 2. Check changes and approve
codekit /ck-preview
codekit /ck-approve-batch <batch_id>
codekit /ck-run

# 3. Discovering integration error or test failure
npm test # Fails

# 4. Initiate full rollback to previous state
codekit /ck-rollback
```

## 🛠️ Resulting Artifacts

- `.ck/backups/<timestamp>/`: A snapshot of the files before mutation.
- `.ck/audit/rollback-<id>.log`: A detailed trace of the restoration process.
- `.ck/runs/<run_id>/`: The failed run history preserved for analysis.

## 📊 Before/After Repo State

**Before (Stable):**

- Original `types.ts` and `payments.ts`.

**During (Broken):**

- `types.ts` has missing interface definitions.
- `payments.ts` throws a compilation error.

**After (Restored):**

- Repo exactly as it was before the integration began.
- Files restored from `.ck/backups/`.
