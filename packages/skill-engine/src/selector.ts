import fs from "node:fs";
import path from "node:path";
import type { SkillMatch } from "../../shared/src/types";

interface RegistrySkill {
  skillId: string;
  keywords: string[];
  taskType: "planning" | "implementation" | "automation" | "skills" | "deployment" | "general";
}

function loadRegistry(): RegistrySkill[] {
  return JSON.parse(fs.readFileSync(path.resolve("config/skill-registry.json"), "utf-8")) as RegistrySkill[];
}

export function selectSkills(idea: string): SkillMatch[] {
  const registry = loadRegistry();
  const lower = idea.toLowerCase();
  const matches = registry
    .filter((skill) => skill.keywords.some((kw) => lower.includes(kw)))
    .map<SkillMatch>((skill) => ({
      skillId: skill.skillId,
      reason: `Matched idea keywords to ${skill.skillId}`,
      source: "installed",
      taskType: skill.taskType
    }));

  if (matches.length > 0) return matches;
  return [{
    skillId: "skill_general_solution_scaffold",
    reason: "No installed skill matched; using general scaffold.",
    source: "generated",
    taskType: "skills",
    generatedPath: "skills/generated/skill_general_solution_scaffold"
  }];
}