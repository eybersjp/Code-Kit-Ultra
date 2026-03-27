# System Architecture

## Target-state topology

```text
VS Code Extension      Web Control Plane      CLI / Automation
        \                  |                  /
         \                 |                 /
          ---- Identity Gateway / Control Service ----
                            |
         ------------------------------------------------------
         |            |              |              |         |
     Orchestrator  Policy Svc   Execution Svc   Audit Svc  Learning Svc
         |            |              |              |         |
         ------------------------------------------------------
                            |
                    InsForge Platform Layer
         ------------------------------------------------------
         | Auth | Postgres | Storage | Functions | Realtime |
         ------------------------------------------------------
```

## Main principles
1. One root identity plane: InsForge
2. One execution governance plane: Code Kit Ultra
3. One audit model across all clients
4. One shared run/event model across CLI, extension, and web UI
5. Separation between identity token and execution token
6. Keep execution workers behind the control service boundary

## Request path
1. User authenticates with InsForge
2. Client receives InsForge JWT/session
3. Client calls Code Kit Ultra control-service
4. Control-service validates JWT and resolves org/workspace/project context
5. Control-service authorizes action against CKU policy rules
6. Control-service issues scoped execution token when needed
7. Orchestrator creates run and dispatches jobs
8. Execution service performs simulation, gating, execution, verification
9. Audit + events persist to InsForge-backed storage
10. Realtime pushes status to extension/web control plane
