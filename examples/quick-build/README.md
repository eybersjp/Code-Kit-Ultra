# Easy Mode (Turbo) Example: Simple Express Server

This example demonstrates the **Quick Mode (Turbo)** flow, designed for rapid development where you trust the agent to execute changes directly.

## 🧠 Input Prompt

> "Build a simple Express server with a single GET route at `/` that returns 'Hello from Code Kit Ultra'."

## ⚡ Commands Used

```bash
# 1. Enter Turbo mode
codekit /ck-mode turbo

# 2. Initialize the project
codekit /ck-init "Build a simple Express server"

# 3. Execute the build autonomously
codekit /ck-run
```

## 🛠️ Resulting Artifacts

- `server.ts`: Initial Express boilerplate.
- `.ck/runs/<run_id>/artifacts/server.ts`: The build artifact.
- `.ck/queue/`: (Empty as execution was direct)

## 📊 Before/After Repo State

**Before:**

- Empty project or basic `package.json`.

**After:**

- New `server.ts` file created.
- Full audit log in `.ck/runs/`.
