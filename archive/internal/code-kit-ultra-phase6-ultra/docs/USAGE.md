# Phase 6 Usage

## 1) Record an execution outcome

```bash
npx tsx apps/cli/src/index.ts /ck-outcome '{
  "runId": "run-101",
  "result": "success",
  "issues": [],
  "humanOverride": false,
  "rollbackOccurred": false,
  "postExecutionScore": 0.91,
  "riskLevel": "medium",
  "selectedSkills": ["skill_quote_engine", "skill_admin_dashboard_builder"],
  "agentDecisions": [
    {"agent":"planner","decision":"approve","confidence":0.84},
    {"agent":"builder","decision":"approve","confidence":0.81},
    {"agent":"reviewer","decision":"needs-review","confidence":0.70},
    {"agent":"security","decision":"approve","confidence":0.88}
  ]
}'
```

## 2) Generate a learning report

```bash
npx tsx apps/cli/src/index.ts /ck-learning-report
```

## 3) Inspect a single agent's evolution

```bash
npx tsx apps/cli/src/index.ts /ck-agent-evolution reviewer
```

## 4) Inspect threshold policy diffs

```bash
npx tsx apps/cli/src/index.ts /ck-policy-diff
```

## 5) Inspect skill learning

```bash
npx tsx apps/cli/src/index.ts /ck-skill-learning
```

## Files persisted by this pack

```text
.ck/learning/outcomes/*.json
.ck/learning/reports/latest-learning-report.json
.ck/learning/reports/latest-learning-report.md
.ck/learning/agents/*.json
.ck/learning/policies/threshold-policy.json
.ck/learning/policies/policy-diff.json
.ck/learning/skills/skill-stats.json
.ck/learning/memory/graph-events.jsonl
```
