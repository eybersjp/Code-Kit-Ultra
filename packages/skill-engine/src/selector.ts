import fs from "node:fs";
import path from "node:path";
import type { SkillMatch } from "../../shared/src/types";
import { createGeneratedManifest, writeGeneratedSkillPackage } from "./manifest";

interface RegistrySkill {
  skillId: string;
  keywords: string[];
}

function loadRegistry(): RegistrySkill[] {
  const file = path.resolve("config/skill-registry.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as RegistrySkill[];
}

export function generateSkill(idea: string, outputRoot = "skills/generated"): SkillMatch {
  const manifest = createGeneratedManifest(idea);
  const written = writeGeneratedSkillPackage(manifest, outputRoot);

  return {
    skillId: manifest.skillId,
    reason: "No exact installed skill matched, generated reusable skill package.",
    source: "generated",
    generatedPath: written.skillPath,
    manifestPath: written.manifestPath
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
