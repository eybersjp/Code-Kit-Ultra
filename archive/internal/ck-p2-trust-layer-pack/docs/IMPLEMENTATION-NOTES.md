# Implementation Notes

## Recommended integration order
1. Generate diff previews before queueing or executing any batch.
2. Persist provenance for every batch emitted by an agent.
3. Sign the batch immediately after provenance generation.
4. Verify signature before approval and before execution.
5. Backup files before overwrite or append actions.
6. Use restore engine for deterministic rollback.

## Command surface
- `/ck-diff <JSON batch>`
- `/ck-verify <JSON signed batch envelope>`

## Suggested run flow
1. builder emits batch
2. provenance generated
3. batch signed
4. diff preview written
5. queue or execute
6. verify before execution
7. backup before mutation
8. restore if rollback requested

## Important
This pack uses SHA-256 and HMAC-SHA256 with Node's built-in `crypto` module.
