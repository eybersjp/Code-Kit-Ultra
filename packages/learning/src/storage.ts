import fs from "node:fs";
import path from "node:path";
import { DEFAULT_AGENT_PROFILES } from "../../agents/src/profiles";
import { DEFAULT_THRESHOLD_POLICY } from "../../governance/src/default-threshold-policy";
import type {
  AgentProfile,
  LearningState,
  RunOutcomeInput,
  SkillLearningStat,
  ThresholdPolicy,
} from "../../shared/src/governance-types";

const root = path.resolve(".ck/learning");
const outcomesDir = path.join(root, "outcomes");
const agentsDir = path.join(root, "agents");
const skillsDir = path.join(root, "skills");
const policiesDir = path.join(root, "policies");
const reportsDir = path.join(root, "reports");

function ensureDirs(): void {
  [root, outcomesDir, agentsDir, skillsDir, policiesDir, reportsDir].forEach((dir) =>
    fs.mkdirSync(dir, { recursive: true }),
  );
}

export function loadLearningState(): LearningState {
  ensureDirs();

  const thresholdFile = path.join(policiesDir, "threshold-policy.json");
  const skillsFile = path.join(skillsDir, "skill-stats.json");

  const thresholdPolicy: ThresholdPolicy = fs.existsSync(thresholdFile)
    ? JSON.parse(fs.readFileSync(thresholdFile, "utf-8"))
    : DEFAULT_THRESHOLD_POLICY;

  const skillStats: Record<string, SkillLearningStat> = fs.existsSync(skillsFile)
    ? JSON.parse(fs.readFileSync(skillsFile, "utf-8"))
    : {};

  const agentProfiles = { ...DEFAULT_AGENT_PROFILES } as Record<string, AgentProfile>;
  for (const key of Object.keys(DEFAULT_AGENT_PROFILES)) {
    const file = path.join(agentsDir, `${key}.json`);
    if (fs.existsSync(file)) {
      agentProfiles[key] = JSON.parse(fs.readFileSync(file, "utf-8")) as AgentProfile;
    }
  }

  return {
    agentProfiles: agentProfiles as LearningState["agentProfiles"],
    thresholdPolicy,
    skillStats,
  };
}

export function saveLearningState(state: LearningState): void {
  ensureDirs();
  for (const [agent, profile] of Object.entries(state.agentProfiles)) {
    fs.writeFileSync(path.join(agentsDir, `${agent}.json`), JSON.stringify(profile, null, 2));
  }
  fs.writeFileSync(
    path.join(policiesDir, "threshold-policy.json"),
    JSON.stringify(state.thresholdPolicy, null, 2),
  );
  fs.writeFileSync(path.join(skillsDir, "skill-stats.json"), JSON.stringify(state.skillStats, null, 2));
}

export function persistOutcome(outcome: RunOutcomeInput): string {
  ensureDirs();
  const file = path.join(outcomesDir, `${outcome.runId}.json`);
  fs.writeFileSync(file, JSON.stringify(outcome, null, 2), "utf-8");
  return file;
}

export function savePolicyDiff(diff: Record<string, { before: number; after: number }>): void {
  ensureDirs();
  fs.writeFileSync(path.join(policiesDir, "policy-diff.json"), JSON.stringify(diff, null, 2), "utf-8");
}

export function saveLearningReports(json: unknown, markdown: string): void {
  ensureDirs();
  fs.writeFileSync(path.join(reportsDir, "latest-learning-report.json"), JSON.stringify(json, null, 2), "utf-8");
  fs.writeFileSync(path.join(reportsDir, "latest-learning-report.md"), markdown, "utf-8");
}
