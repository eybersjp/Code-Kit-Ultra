import fs from "node:fs";
import path from "node:path";
import type { GeneratedSkillManifest } from "../../shared/src/types";
import { readManifest, updateSkillReviewStatus, writeManifest } from "./manifest";

export interface PromotionResult {
  skillId: string;
  fromDir: string;
  toDir: string;
  promotedManifestPath: string;
}

export function locateGeneratedSkill(skillId: string, generatedRoot = "skills/generated"): { skillDir: string; manifestPath: string } {
  const skillDir = path.resolve(generatedRoot, skillId);
  const manifestPath = path.join(skillDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Generated skill not found: ${skillId}`);
  }
  return { skillDir, manifestPath };
}

export function reviewGeneratedSkill(skillId: string, reviewNotes: string, generatedRoot = "skills/generated"): GeneratedSkillManifest {
  const { manifestPath } = locateGeneratedSkill(skillId, generatedRoot);
  return updateSkillReviewStatus(manifestPath, "reviewed", reviewNotes);
}

export function approveGeneratedSkill(skillId: string, reviewNotes = "Approved for promotion.", generatedRoot = "skills/generated"): GeneratedSkillManifest {
  const { manifestPath } = locateGeneratedSkill(skillId, generatedRoot);
  return updateSkillReviewStatus(manifestPath, "approved", reviewNotes);
}

export function promoteGeneratedSkill(skillId: string, installedRoot = "skills/installed", generatedRoot = "skills/generated"): PromotionResult {
  const { skillDir, manifestPath } = locateGeneratedSkill(skillId, generatedRoot);
  const manifest = readManifest(manifestPath);

  if (!(manifest.reviewStatus === "approved" || manifest.reviewStatus === "reviewed")) {
    throw new Error(`Skill ${skillId} must be reviewed or approved before promotion.`);
  }

  const targetDir = path.resolve(installedRoot, skillId);
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(skillDir, targetDir, { recursive: true });

  const targetManifestPath = path.join(targetDir, "manifest.json");
  const targetManifest = readManifest(targetManifestPath);
  targetManifest.kind = "installed";
  targetManifest.reviewStatus = "promoted";
  targetManifest.promotedAt = new Date().toISOString();
  targetManifest.promotedFrom = skillDir;
  writeManifest(targetManifestPath, targetManifest);

  return {
    skillId,
    fromDir: skillDir,
    toDir: targetDir,
    promotedManifestPath: targetManifestPath,
  };
}
