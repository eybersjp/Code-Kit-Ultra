import fs from "node:fs";
import path from "node:path";
import type { ClarificationResult, SelectedSkill, Task } from "../../shared/src";

export interface SkillRegistryEntry {
  skillId: string;
  name: string;
  category: string;
  description: string;
  triggers: string[];
  projectTypes: string[];
  taskTriggers: string[];
  priority: number;
}

export interface SkillSelectionInput {
  clarification: ClarificationResult;
  plan: Task[];
}

export interface SkillScoreBreakdown {
  skillId: string;
  score: number;
  matchedProjectType: boolean;
  objectiveMatches: string[];
  taskMatches: string[];
  taskTriggerMatches: string[];
  priorityBonus: number;
}

export interface SkillSelectionOptions {
  repoRoot?: string;
  maxSkills?: number;
  minimumScore?: number;
}

const DEFAULT_MAX_SKILLS = 6;
const DEFAULT_MINIMUM_SCORE = 6;

function getRepoRoot(options?: SkillSelectionOptions): string {
  return options?.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
}

function getRegistryPath(options?: SkillSelectionOptions): string {
  return path.join(getRepoRoot(options), "config", "skill-registry.json");
}

export function loadSkillRegistry(
  options?: SkillSelectionOptions,
): SkillRegistryEntry[] {
  const registryPath = getRegistryPath(options);

  if (!fs.existsSync(registryPath)) {
    throw new Error(
      `Skill registry not found at ${registryPath}. Expected config/skill-registry.json.`,
    );
  }

  const raw = fs.readFileSync(registryPath, "utf-8").trim();
  if (!raw) {
    throw new Error(`Skill registry file is empty at ${registryPath}.`);
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Skill registry must be a JSON array.");
  }

  return parsed.filter(isSkillRegistryEntry);
}

export function selectSkills(
  input: SkillSelectionInput,
  options?: SkillSelectionOptions,
): SelectedSkill[] {
  const registry = loadSkillRegistry(options);
  const projectType = normalizeProjectType(input.clarification);
  const objectiveText = collectObjectiveText(input.clarification);
  const planText = input.plan.map((task) => `${task.title} ${task.description}`).join(" ");
  const maxSkills = options?.maxSkills ?? DEFAULT_MAX_SKILLS;
  const minimumScore = options?.minimumScore ?? DEFAULT_MINIMUM_SCORE;

  const scored = registry
    .map((entry) =>
      scoreSkill({
        entry,
        projectType,
        objectiveText,
        tasks: input.plan,
        planText,
      }),
    )
    .filter((item) => item.breakdown.score >= minimumScore)
    .sort(compareScoredSkills)
    .slice(0, Math.max(1, maxSkills));

  if (scored.length === 0) {
    return [createFallbackSelectedSkill()];
  }

  return scored.map((item) =>
    coerceSelectedSkill({
      skillId: item.entry.skillId,
      name: item.entry.name,
      category: item.entry.category,
      reason: buildReason(item.breakdown, item.entry),
      score: item.breakdown.score,
      source: "registry",
    }),
  );
}

export function selectSkillsFromClarification(
  clarification: ClarificationResult,
  plan: Task[],
  options?: SkillSelectionOptions,
): SelectedSkill[] {
  return selectSkills(
    {
      clarification,
      plan,
    },
    options,
  );
}

export function explainSkillSelection(
  input: SkillSelectionInput,
  options?: SkillSelectionOptions,
): SkillScoreBreakdown[] {
  const registry = loadSkillRegistry(options);
  const projectType = normalizeProjectType(input.clarification);
  const objectiveText = collectObjectiveText(input.clarification);
  const planText = input.plan.map((task) => `${task.title} ${task.description}`).join(" ");

  return registry
    .map((entry) =>
      scoreSkill({
        entry,
        projectType,
        objectiveText,
        tasks: input.plan,
        planText,
      }).breakdown,
    )
    .sort((left, right) => right.score - left.score || left.skillId.localeCompare(right.skillId));
}

interface ScoreSkillInput {
  entry: SkillRegistryEntry;
  projectType: string;
  objectiveText: string;
  tasks: Task[];
  planText: string;
}

interface ScoredSkill {
  entry: SkillRegistryEntry;
  breakdown: SkillScoreBreakdown;
}

function scoreSkill(input: ScoreSkillInput): ScoredSkill {
  const objectiveMatches = matchKeywords(input.objectiveText, input.entry.triggers);
  const taskMatches = matchKeywords(input.planText, input.entry.triggers);
  const taskTriggerMatches = input.entry.taskTriggers.filter((trigger) =>
    input.tasks.some((task) => task.id === trigger),
  );
  const matchedProjectType = input.entry.projectTypes.includes(input.projectType);

  const score =
    (matchedProjectType ? 5 : 0) +
    objectiveMatches.length * 4 +
    taskMatches.length * 2 +
    taskTriggerMatches.length * 3 +
    computePriorityBonus(input.entry.priority);

  return {
    entry: input.entry,
    breakdown: {
      skillId: input.entry.skillId,
      score,
      matchedProjectType,
      objectiveMatches,
      taskMatches,
      taskTriggerMatches,
      priorityBonus: computePriorityBonus(input.entry.priority),
    },
  };
}

function computePriorityBonus(priority: number): number {
  if (priority >= 95) {
    return 3;
  }

  if (priority >= 85) {
    return 2;
  }

  if (priority >= 70) {
    return 1;
  }

  return 0;
}

function compareScoredSkills(left: ScoredSkill, right: ScoredSkill): number {
  return (
    right.breakdown.score - left.breakdown.score ||
    right.entry.priority - left.entry.priority ||
    left.entry.skillId.localeCompare(right.entry.skillId)
  );
}

function buildReason(
  breakdown: SkillScoreBreakdown,
  entry: SkillRegistryEntry,
): string {
  const parts: string[] = [];

  if (breakdown.matchedProjectType) {
    parts.push(`matches the ${entry.projectTypes.join(", ")} project-type bucket`);
  }

  if (breakdown.objectiveMatches.length > 0) {
    parts.push(`matched idea keywords: ${breakdown.objectiveMatches.join(", ")}`);
  }

  if (breakdown.taskTriggerMatches.length > 0) {
    parts.push(`aligned with plan tasks: ${breakdown.taskTriggerMatches.join(", ")}`);
  }

  if (breakdown.taskMatches.length > 0) {
    parts.push(`reinforced by planning language: ${breakdown.taskMatches.join(", ")}`);
  }

  if (parts.length === 0) {
    parts.push("selected as a general-purpose implementation support skill");
  }

  return `${entry.name} was selected because it ${parts.join("; ")}.`;
}

function collectObjectiveText(clarification: ClarificationResult): string {
  const normalizedIdea = readString(clarification, ["normalizedIdea", "objective", "idea"]);
  const projectType = readString(clarification, ["inferredProjectType", "projectType", "category"]);

  const assumptionText = Array.isArray(clarification.assumptions)
    ? clarification.assumptions.map((item) => item.text).join(" ")
    : "";

  const questionText = Array.isArray(clarification.clarifyingQuestions)
    ? clarification.clarifyingQuestions.map((item) => item.text).join(" ")
    : "";

  return `${normalizedIdea} ${projectType} ${assumptionText} ${questionText}`
    .toLowerCase()
    .trim();
}

function normalizeProjectType(clarification: ClarificationResult): string {
  const rawType = readString(clarification, [
    "inferredProjectType",
    "projectType",
    "category",
  ]).toLowerCase();

  if (rawType.includes("website") || rawType.includes("landing")) {
    return "website";
  }

  if (rawType.includes("agent")) {
    return "ai-agent";
  }

  if (rawType.includes("automation")) {
    return "automation";
  }

  if (rawType.includes("api")) {
    return "api";
  }

  if (
    rawType.includes("app") ||
    rawType.includes("crm") ||
    rawType.includes("portal") ||
    rawType.includes("dashboard")
  ) {
    return "web-app";
  }

  return "unknown";
}

function matchKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  const matches: string[] = [];

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    if (!normalizedKeyword) {
      continue;
    }

    if (lower.includes(normalizedKeyword)) {
      matches.push(normalizedKeyword);
    }
  }

  return dedupe(matches);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function readString(source: unknown, keys: string[]): string {
  if (!source || typeof source !== "object") {
    return "";
  }

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function createFallbackSelectedSkill(): SelectedSkill {
  return coerceSelectedSkill({
    skillId: "general-solution-scaffold",
    name: "General Solution Scaffold",
    category: "fallback",
    reason:
      "No specialist registry entry crossed the selection threshold, so the selector used the fallback scaffold skill.",
    score: 1,
    source: "fallback",
  });
}

function coerceSelectedSkill(value: Record<string, unknown>): SelectedSkill {
  return value as SelectedSkill;
}

function isSkillRegistryEntry(value: unknown): value is SkillRegistryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.skillId === "string" &&
    typeof item.name === "string" &&
    typeof item.category === "string" &&
    typeof item.description === "string" &&
    Array.isArray(item.triggers) &&
    Array.isArray(item.projectTypes) &&
    Array.isArray(item.taskTriggers) &&
    typeof item.priority === "number"
  );
}
