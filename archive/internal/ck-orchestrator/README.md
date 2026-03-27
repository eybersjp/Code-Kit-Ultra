
# Code Kit Ultra - Full Orchestrator Integration

## Includes
- Run lifecycle management
- Gate integration
- Approval system
- /ck-run, /ck-approve, /ck-init handlers

## Flow
/init -> create run
/run -> evaluate gates
/approve -> unblock
/run -> execute
