# Integration Snippet

## Orchestrator hook example

```ts
import {
  recordRunOutcome,
  applyLearningCycle,
  loadLearningState,
} from "../../packages/learning/src/index";

async function finalizeGovernedRun(payload: {
  runId: string;
  outcome: "success" | "partial" | "failure";
  postExecutionScore: number;
  rollbackOccurred: boolean;
  humanOverride: boolean;
  riskLevel: "low" | "medium" | "high";
  selectedSkills: string[];
  agentDecisions: Array<{
    agent: "planner" | "builder" | "reviewer" | "security";
    decision: "approve" | "needs-review" | "reject";
    confidence: number;
  }>;
}) {
  const state = loadLearningState();

  const outcome = recordRunOutcome({
    runId: payload.runId,
    result: payload.outcome,
    issues: [],
    rollbackOccurred: payload.rollbackOccurred,
    humanOverride: payload.humanOverride,
    postExecutionScore: payload.postExecutionScore,
    riskLevel: payload.riskLevel,
    selectedSkills: payload.selectedSkills,
    agentDecisions: payload.agentDecisions,
  });

  const learning = applyLearningCycle({
    state,
    outcome,
  });

  return learning;
}
```

## CLI registration example

```ts
import { registerOutcomeCommand } from "./handlers/outcome";
import { registerLearningReportCommand } from "./handlers/learning-report";
import { registerAgentEvolutionCommand } from "./handlers/agent-evolution";
import { registerPolicyDiffCommand } from "./handlers/policy-diff";
import { registerSkillLearningCommand } from "./handlers/skill-learning";

registerOutcomeCommand(program);
registerLearningReportCommand(program);
registerAgentEvolutionCommand(program);
registerPolicyDiffCommand(program);
registerSkillLearningCommand(program);
```
