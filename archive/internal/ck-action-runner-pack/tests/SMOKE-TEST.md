# Manual Smoke Test

1. Load `examples/build-batch.json`
2. Call `runActionBatch()` with:
   - workspaceRoot = your project directory
   - mode = "builder"
   - approvedGates = ["build"] if you want command execution without approval hold
3. Confirm files are created under your workspace
4. Confirm logs are written under `.ck/logs/{runId}/`
5. Confirm artifact is written under `.ck/artifacts/{runId}/build-actions.md`
