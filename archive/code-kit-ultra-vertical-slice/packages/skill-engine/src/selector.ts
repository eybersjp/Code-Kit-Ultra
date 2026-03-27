import fs from "node:fs";
import path from "node:path";
import type { SkillMatch } from "../../shared/src/types";

interface RegistrySkill {
  skillId: string;
  keywords: string[];
}

function loadRegistry(): RegistrySkill[] {
  const file = path.resolve("config/skill-registry.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as RegistrySkill[];
}

export function selectSkills(idea: string): SkillMatch[] {
  const registry = loadRegistry();
  const lower = idea.toLowerCase();

  const matches = registry
    .filter((skill) => skill.keywords.some((kw) => lower.includes(kw)))
    .map<SkillMatch>((skill) => ({
      skillId: skill.skillId,
      reason: `Matched idea keywords to ${skill.skillId}`,
      source: "installed"
    }));

  if (matches.length === 0) {
    return [
      {
        skillId: "skill_general_solution_scaffold",
        reason: "No exact installed skill matched, using generic scaffold skill.",
        source: "generated"
      }
    ];
  }

  return matches;
}
