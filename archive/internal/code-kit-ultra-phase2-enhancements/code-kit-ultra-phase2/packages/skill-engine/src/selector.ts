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

export function generateSkill(idea: string, outputRoot = "skills/generated"): SkillMatch {
  const normalized = idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "general-solution-scaffold";

  const skillId = `skill_${normalized.replace(/-/g, "_")}`;
  const skillDir = path.resolve(outputRoot, skillId);
  const skillPath = path.join(skillDir, "SKILL.md");
  fs.mkdirSync(skillDir, { recursive: true });

  const content = `# ${skillId}\n\n## Purpose\nGenerated fallback skill for idea: ${idea}\n\n## Trigger\nUse when no installed skill matches.\n\n## Inputs\n- project idea\n\n## Outputs\n- starter plan scaffolding\n\n## Procedure\n1. Frame the idea\n2. Create a baseline structure\n3. Produce next actions\n\n## Validation\n- idea interpreted\n- baseline structure produced\n`;
  fs.writeFileSync(skillPath, content, "utf-8");

  return {
    skillId,
    reason: "No exact installed skill matched, generated fallback skill.",
    source: "generated",
    generatedPath: skillPath
  };
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
    return [generateSkill(idea)];
  }

  return matches;
}
