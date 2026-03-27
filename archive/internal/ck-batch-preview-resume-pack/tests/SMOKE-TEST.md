# Manual Smoke Test

## Queue
1. Create a batch JSON
2. Enqueue it using your orchestrator flow
3. Run /ck-pending
4. Confirm queued batch exists under .ck/queue/

## Preview
1. Run /ck-preview with example JSON
2. Confirm .ck/artifacts/{runId}/build-preview.md exists

## Approve Batch
1. Run /ck-approve-batch <batchId>
2. Confirm batch status changes to executed
3. Confirm action logs and artifacts are generated

## Resume
1. Pause a run at a manual or approval stage
2. Run /ck-resume
3. Confirm execution continues

## Rollback
1. Execute a low-risk file batch
2. Run /ck-rollback <runId>
3. Confirm generated files are removed where supported
