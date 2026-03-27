# Code Kit Ultra — Batch Queue, Preview, Resume, and Rollback Pack

This pack extends Code Kit Ultra with:
- pending action batch queue
- resumable execution
- approval-aware batch processing
- execution preview artifacts
- executor abstraction
- rollback engine
- new command handlers

## New Commands
- /ck-pending
- /ck-approve-batch <id>
- /ck-preview <JSON batch>
- /ck-resume
- /ck-rollback <runId>

## Intended Use
This pack sits on top of your:
- persistent run store
- mode-aware action runner
- multi-agent execution layer
