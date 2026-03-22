# User Manual: Code-Kit-Ultra

## 1. Key Concepts
- **Objective**: Your high-level project idea.
- **Mode**: How much risk you're willing to take (Safe = asks many questions; God = pushes through skip-able steps).
- **Run Report**: The final decision document containing your task plan and skill set.

## 2. Using the CLI

### 2.1 Starting a Project
Use the `init` command to scaffold your idea.
```bash
npx ck init "Build a modern solar energy dashboard"
```

### 2.2 Controlling Progression
For high-speed exploration, use `--mode god`.
```bash
npx ck init "Draft a new micro-service API" --mode god
```

### 2.3 Checking Your Records
View your last run and overall system usage status.
```bash
npx ck validate-env
```

### 2.4 Analyzing Performance
Get a breakdown of how many runs you've done in each mode.
```bash
npx ck metrics
```

## 3. Working with Artifacts
After every `init`, note the **Artifact Report Path**. Open this JSON file in your favorite editor to see the deep logic behind the plan.

## 4. FAQs
- **Q: Where is my data?**  
  A: All data is in your proyecto root's `.codekit` hidden folder.
- **Q: How do I change the skills selected?**  
  A: Update `config/skill-registry.json` and re-run your `init` command.
- **Q: What is a "Gate"?**  
  A: A gate is an automated logical check to ensure your project is stable enough to proceed.
