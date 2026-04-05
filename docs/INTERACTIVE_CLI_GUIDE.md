# Code Kit Ultra — Interactive CLI Guide

CKU now features an interactive CLI mode that guides you through common workflows with simple Y/N questions and prompts.

---

## Quick Start

### Start the Interactive Menu
```bash
npm run cku /ck-menu
```

This shows a menu of all available interactive tasks:
- Run governed pipeline (interactive setup)
- Login (interactive)
- Check authentication status
- List recent runs
- Initialize new project
- Exit

---

## Interactive Commands

### 1. Interactive Pipeline Run

**Description**: Step-by-step guided workflow to create and execute a governed run.

**Command**:
```bash
npm run cku /ck-interactive
# or
npm run cku /ck-run --interactive
# or from the menu
npm run cku /ck-menu  # then select "Run governed pipeline"
```

**What It Does**:
1. Asks for your project idea/goal
2. Prompts you to select execution mode (Safe/Balanced/God)
3. Asks if authentication is required
4. Asks if you want dry-run mode
5. Asks if you want to skip approval gates
6. Shows summary and asks for confirmation
7. Executes the pipeline

**Example**:
```
🚀 Code Kit Ultra — Interactive Run Setup

What do you want to accomplish?
> Add rate limiting to the API

Select execution mode:
❯ Safe — Maximum questions, early escalation
  Balanced — Reasonable assumptions, policy escalation
  God — Velocity-optimized, obeys all gates

Do you need authentication?
(Y/n) › Y

Run in dry-run mode (no actual changes)?
(y/N) › N

Skip approval gates if possible?
(y/N) › N

Configuration:
  Idea: Add rate limiting to the API
  Mode: balanced
  Auth: required
  Dry run: no
  Skip approval: no

Proceed with this configuration?
(y/N) › Y
```

---

### 2. Interactive Login

**Description**: Guided login workflow to set up authentication.

**Command**:
```bash
npm run cku auth login-interactive
# or from the menu
npm run cku /ck-menu  # then select "Login"
```

**What It Does**:
1. Prompts for your JWT bearer token
2. Verifies the token with the API
3. Stores the session locally
4. Shows confirmation with your identity

**Example**:
```
🔐 Code Kit Ultra — Interactive Login

Enter your JWT bearer token:
> eyJhbGc...

✓ Successfully logged in!
Session: alice@company.com (human)
```

---

### 3. Interactive Main Menu

**Description**: Navigate common tasks through an interactive menu.

**Command**:
```bash
npm run cku /ck-menu
```

**Options**:
- Run governed pipeline (interactive)
- Login (interactive)
- Check authentication status
- List recent runs
- Initialize new project
- Exit

---

## Interactive Prompt Types

The interactive CLI uses several types of prompts:

### Confirmation (Yes/No)
```
Do you need authentication?
(Y/n) › 
```
Press Enter for default or type Y/N

### Multiple Choice (Select One)
```
Select execution mode:
❯ Safe — Maximum questions
  Balanced — Reasonable assumptions
  God — Velocity-optimized
```
Use arrow keys to navigate, Enter to select

### Multiple Selection (Select Multiple)
```
Select capabilities:
❮ Authentication
❯ ✓ API Gateway
  ✓ Database
```
Use arrow keys and spacebar to toggle, Enter to confirm

### Text Input
```
What do you want to accomplish?
> 
```
Type your response and press Enter

### List Selection
```
Select an action:
❯ Run governed pipeline
  Login
  Check status
  Exit
```
Use arrow keys to navigate, Enter to select

---

## Common Workflows

### Scenario 1: First-Time User
```bash
npm run cku /ck-menu
# Select "Login" → Enter token
# Select "Initialize new project" → Enter idea
# Pipeline runs with defaults
```

### Scenario 2: Recurring Tasks
```bash
npm run cku /ck-interactive
# Answer quick Y/N questions
# Pipeline runs with your preferences
```

### Scenario 3: Advanced Mode
```bash
npm run cku /ck-run --interactive
# Same as /ck-interactive, but can override with flags
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate options |
| `Space` | Toggle selection (multiple choice) |
| `Enter` | Confirm selection |
| `Ctrl+C` | Cancel and exit |
| `Type` | Filter/search in lists |

---

## Environment Variables

You can bypass certain prompts with environment variables:

| Variable | Example | Effect |
|----------|---------|--------|
| `CKU_MODE` | `CKU_MODE=safe` | Skip mode prompt |
| `CKU_IDEA` | `CKU_IDEA="Build API"` | Skip idea prompt |
| `CKU_DRY_RUN` | `CKU_DRY_RUN=true` | Skip dry-run prompt |
| `CKU_REQUIRE_AUTH` | `CKU_REQUIRE_AUTH=false` | Skip auth prompt |

**Example**:
```bash
CKU_MODE=balanced CKU_DRY_RUN=false npm run cku /ck-interactive
# Skips mode and dry-run prompts, asks for idea
```

---

## Error Handling

### Token Validation Failed
```
✗ Login failed: Invalid token or expired session
```
**Solution**: Verify your token is correct and not expired

### No Project Data
```
No project data found.
```
**Solution**: Initialize a new project first with `/ck-init`

### API Connection Failed
```
Error: connect ECONNREFUSED
```
**Solution**: Ensure the control-service is running on port 7474

---

## Tips & Tricks

### 1. Save Your Session
Interactive login saves your session automatically:
```bash
npm run cku auth login-interactive
# Your token is stored in ~/.ck/session.json
```

### 2. Reuse Configuration
Once you confirm configuration in `/ck-interactive`, the same settings are used by default in future runs (if mode/auth/etc. are the same).

### 3. View Recent Runs
```bash
npm run cku /ck-menu
# Select "List recent runs" to see history
```

### 4. Quick Status Check
```bash
npm run cku auth status
# Shows current authentication without menu
```

### 5. Mix Interactive and Manual Flags
```bash
npm run cku /ck-run --interactive --mode safe
# Prompts for idea only, uses safe mode automatically
```

---

## Integration with Non-Interactive Mode

Interactive commands work alongside traditional flags:

```bash
# Traditional: All parameters as flags
npm run cku /ck-run "Build API" --mode balanced

# Interactive: Parameters as questions
npm run cku /ck-interactive

# Hybrid: Use interactive with some flags
npm run cku /ck-run --interactive --mode safe
```

---

## Troubleshooting

### Menu Doesn't Display
Ensure your terminal supports:
- Unicode characters (✓, ✗, →)
- 256 colors
- Interactive input

Workaround:
```bash
FORCE_COLOR=1 npm run cku /ck-menu
```

### Prompts Not Appearing
Ensure you're not piping input:
```bash
# ✗ Won't work (no TTY)
echo "my idea" | npm run cku /ck-interactive

# ✓ Works (TTY)
npm run cku /ck-interactive
```

### Keyboard Input Not Working
Try setting `TERM` variable:
```bash
TERM=xterm-256color npm run cku /ck-menu
```

---

## What's Next?

The interactive CLI is continuously improved. Planned enhancements:
- ✓ Authentication workflow
- ✓ Pipeline execution
- ✓ Main menu
- ⏳ Interactive gate approval
- ⏳ Interactive run history browser
- ⏳ Interactive policy configuration
- ⏳ Multi-step workflows with back/next

---

## Questions?

See related documentation:
- [CLI Usage Guide](./CLI_USAGE.md)
- [Development Guide](./DEVELOPMENT.md)
- [Complete Workflow Example](./apps/cli/examples/COMPLETE_WORKFLOW.md)
