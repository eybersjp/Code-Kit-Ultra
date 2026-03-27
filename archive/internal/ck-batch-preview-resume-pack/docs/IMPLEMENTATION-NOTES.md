# Implementation Notes

## What this adds
The orchestrator can now persist action batches before execution, preview them for review, resume paused runs, and attempt rollback based on saved metadata.

## Integration order
1. Wire `batch-queue.ts` into your run store or keep it as a filesystem queue.
2. Update `/ck-run` to enqueue medium/high-risk batches instead of directly discarding or immediately executing them.
3. Use `/ck-preview` to generate a human-readable preview artifact before execution.
4. Use `/ck-approve-batch` to promote a queued batch into execution.
5. Use `/ck-resume` to continue from the current paused phase.
6. Use `/ck-rollback` to inspect and partially reverse recorded actions.

## Important
Rollback for shell commands is best-effort only.
