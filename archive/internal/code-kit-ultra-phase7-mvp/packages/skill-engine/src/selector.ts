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

function writeGeneratedSkill(skillId: string, idea: string): void {
  const dir = path.resolve("skills/generated", skillId);
  fs.mkdirSync(dir, { recursive: true });
  const content = `# ${skillId}\n\nGenerated fallback skill for idea:\n\n- ${idea}\n\n## Purpose\nProvide a generic scaffold path when no installed skill matches the request.\n`;
  fs.writeFileSync(path.join(dir, "SKILL.md"), content, "utf-8");
}

export function selectSkills(idea: string): SkillMatch[] {
  const registry = loadRegistry();
  const lower = idea.toLowerCase();

  const matches = registry
    .filter((skill) => skill.keywords.some((kw) => lower.includes(kw.toLowerCase())))
    .map<SkillMatch>((skill) => ({
      skillId: skill.skillId,
      reason: `Matched idea keywords to ${skill.skillId}`,
      source: "installed",
    }));

  if (matches.length === 0) {
    const generatedSkillId = "skill_general_solution_scaffold";
    writeGeneratedSkill(generatedSkillId, idea);
    return [
      {
        skillId: generatedSkillId,
        reason: "No exact installed skill matched, using generic scaffold skill.",
        source: "generated",
      },
    ];
  }

  return matches;
}
