# Code Kit Ultra — P2 Trust Layer Pack

This pack adds the P2 trust layer for Code Kit Ultra.

## Included
- line-level diff preview engine
- batch provenance metadata
- batch signing and verification
- file backup system
- snapshot restore engine
- `/ck-diff` command handler
- `/ck-verify` command handler
- example batch + manual smoke test

## Goals
- make execution explainable
- make batches tamper-evident
- make rollback stronger than best-effort metadata only
- improve operator trust in governed execution

## New Runtime Folders
- `.ck/backups/{runId}/`
- `.ck/provenance/{runId}/`
- `.ck/signatures/{runId}/`
- `.ck/artifacts/{runId}/`
