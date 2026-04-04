# SPEC — CLI Command Structure

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`
**Implements:** Master spec Section 12.1 — CLI Design
**Unblocks:** T2-4 implementation

---

## Objective

Refactor the CLI from namespaced slash-commands (`/ck-run`, `/ck-approve`) to standard Commander.js subcommand groups (`ck run create`, `ck gate approve`). Add the missing `ck outcome` feedback capture command. Maintain backward-compatible aliases with deprecation warnings during transition.

---

## Scope

**In scope:**
- Command group restructuring: `ck run`, `ck gate`, `ck auth`, `ck outcome`
- New `ck outcome` command for feedback capture
- Backward-compatible aliases for current `/ck-*` commands with deprecation warnings
- JSON output mode (`--json` flag) for scriptable usage
- Machine-friendly exit codes

**Out of scope:**
- Interactive TUI (future enhancement)
- Shell autocompletion generation (future enhancement)

---

## Command Catalog

### Auth Group

```
ck auth login                    Sign in via InsForge (opens browser)
ck auth logout                   Sign out and clear session
ck auth status                   Show current session actor, org, project, expiry
ck auth token                    Print current bearer token (for scripting)
```

### Run Group

```
ck run create "<idea>" \
  --project <projectId> \
  --mode <safe|balanced|god|turbo|builder|pro|expert> \
  --skill-level <beginner|intermediate|advanced> \
  --priority <speed|quality|cost> \
  --deliverable <app|api|script|report>    Create a new run

ck run list [--project <id>] [--status <status>] [--limit 20]
                                           List visible runs

ck run show <runId>               Show full run detail: plan, gates, timeline, artifacts

ck run resume <runId>             Resume a paused run

ck run rollback <runId>           Trigger rollback for a failed run

ck run cancel <runId>             Cancel a running or planned run
```

### Gate Group

```
ck gate list [--run <runId>] [--status pending]
                                  List gates (optionally filter by run or status)

ck gate approve <gateId> [--note "reason"]
                                  Approve a pending gate

ck gate reject <gateId> --note "reason"
                                  Reject a pending gate (note required)
```

### Outcome Group

```
ck outcome --run <runId> \
  --rating <1-5> \
  [--feedback "free text"]        Submit operator feedback for a completed run
```

### Top-level commands

```
ck init "<idea>"                  Shorthand for ck run create (interactive prompts for missing args)
ck doctor                         Run health checks (env, auth, control-service connectivity)
```

---

## Implementation

### Entry Point — `apps/cli/src/index.ts`

```typescript
import { Command } from 'commander';

const program = new Command()
  .name('ck')
  .description('Code Kit Ultra CLI')
  .version(VERSION);

// Auth group
const auth = program.command('auth').description('Authentication commands');
auth.command('login').description('Sign in via InsForge').action(authLogin);
auth.command('logout').description('Sign out').action(authLogout);
auth.command('status').description('Show session status').action(authStatus);

// Run group
const run = program.command('run').description('Run management');
run.command('create')
  .argument('<idea>', 'Project idea')
  .option('--project <id>', 'Project ID')
  .option('--mode <mode>', 'Execution mode', 'balanced')
  .option('--skill-level <level>', 'Skill level', 'intermediate')
  .option('--priority <priority>', 'Priority', 'quality')
  .option('--deliverable <type>', 'Deliverable type', 'app')
  .option('--dry-run', 'Simulate without executing')
  .option('--json', 'Output as JSON')
  .action(runCreate);

run.command('list')
  .option('--project <id>', 'Filter by project')
  .option('--status <status>', 'Filter by status')
  .option('--limit <n>', 'Max results', '20')
  .option('--json', 'Output as JSON')
  .action(runList);

run.command('show')
  .argument('<runId>', 'Run ID')
  .option('--json', 'Output as JSON')
  .action(runShow);

// Gate group
const gate = program.command('gate').description('Gate management');
gate.command('approve')
  .argument('<gateId>', 'Gate ID')
  .option('--note <text>', 'Optional note')
  .action(gateApprove);

gate.command('reject')
  .argument('<gateId>', 'Gate ID')
  .requiredOption('--note <text>', 'Rejection reason (required)')
  .action(gateReject);

// Outcome group
program.command('outcome')
  .requiredOption('--run <runId>', 'Run ID')
  .requiredOption('--rating <n>', 'Rating 1-5')
  .option('--feedback <text>', 'Optional feedback text')
  .action(outcomeCapture);

// Backward-compat aliases (with deprecation warnings)
program.command('/ck-run', { hidden: true }).action(() => {
  console.warn('⚠️  /ck-run is deprecated. Use: ck run create "<idea>"');
  process.exit(1);
});

program.parse();
```

### Outcome Handler — `apps/cli/src/handlers/outcome.ts`

```typescript
import type { CommandContext } from '@cku/shared';
import { apiClient } from '../api-client.js';

export async function outcomeCapture(options: {
  run: string;
  rating: string;
  feedback?: string;
}, ctx: CommandContext) {
  const rating = parseInt(options.rating, 10);
  if (rating < 1 || rating > 5) {
    console.error('Rating must be between 1 and 5');
    process.exit(1);
  }

  const result = await apiClient.post(`/v1/runs/${options.run}/outcome`, {
    rating,
    feedback: options.feedback,
  });

  console.log(`✅ Feedback submitted for run ${options.run}`);
  if (result.data.learningUpdated) {
    console.log('📈 Learning engine updated with your feedback');
  }
}
```

---

## Output Modes

### Human-readable (default)

```
$ ck run show run_123
Run: run_123
Status: paused
Mode: balanced
Idea: Build a CRM for solar installers

Plan (6 tasks):
  ✅ Interpret project idea
  ✅ Generate execution plan
  ⏳ Workspace setup
  🔒 Approval checkpoint

Gates:
  🟡 clarity     — needs-review (awaiting your approval)
  ✅ architecture — pass
  🔴 deployment   — blocked (missing rollback plan)
```

### JSON mode (`--json`)

```json
{
  "runId": "run_123",
  "status": "paused",
  "mode": "balanced",
  "gates": [...]
}
```

---

## Files to Modify

| File | Action |
|------|--------|
| `apps/cli/src/index.ts` | Refactor — add command groups, register all subcommands |
| `apps/cli/src/handlers/outcome.ts` | Create — outcome feedback command |
| `apps/cli/src/handlers/gate-reject.ts` | Create — gate reject command |

---

## Dependencies

- `SPEC_API_VERSIONING.md` — CLI calls `/v1/` endpoints
- `SPEC_GATE_REJECTION.md` — `ck gate reject` requires the API endpoint to exist

---

## Definition of Done

- [ ] `ck run create "<idea>" --project <id>` creates a run and prints summary
- [ ] `ck gate approve <gateId>` and `ck gate reject <gateId> --note` work
- [ ] `ck outcome --run <id> --rating 4` submits feedback and prints confirmation
- [ ] `--json` flag returns machine-parseable JSON output for all commands
- [ ] Deprecated `/ck-*` commands print deprecation warning and exit 1
- [ ] `ck auth status` shows current actor, org, project, and token expiry
- [ ] `ck doctor` checks env, session, and control-service connectivity
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`
