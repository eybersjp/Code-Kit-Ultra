import fs from "node:fs";
import path from "node:path";
import { readManifest, writeManifest } from "./manifest";
import { recordPromotionEvent } from "../../memory/src/run-store";

export function reviewSkill(skillId: string, reviewer: string, notes: string) {
  const manifest = readManifest(skillId, "generated");
  manifest.status = "reviewed";
  manifest.review = { reviewer, notes, approved: false, reviewedAt: new Date().toISOString() };
  manifest.auditTrail.push({ action: "reviewed", by: reviewer, at: new Date().toISOString(), notes });
  writeManifest(skillId, manifest, "generated");
  recordPromotionEvent(skillId, "reviewed", reviewer);
  return manifest;
}

export function approveSkill(skillId: string, reviewer: string, notes: string) {
  const manifest = readManifest(skillId, "generated");
  manifest.status = "approved";
  manifest.review = { reviewer, notes, approved: true, reviewedAt: new Date().toISOString() };
  manifest.auditTrail.push({ action: "approved", by: reviewer, at: new Date().toISOString(), notes });
  writeManifest(skillId, manifest, "generated");
  recordPromotionEvent(skillId, "approved", reviewer);
  return manifest;
}

export function promoteSkill(skillId: string, reviewer: string) {
  const sourceDir = path.resolve(`skills/generated/${skillId}`);
  const targetDir = path.resolve(`skills/installed/${skillId}`);
  const manifest = readManifest(skillId, "generated");
  if (manifest.status !== "approved") {
    throw new Error(`Skill ${skillId} must be approved before promotion.`);
  }
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  manifest.status = "installed";
  manifest.promotedAt = new Date().toISOString();
  manifest.auditTrail.push({ action: "promoted", by: reviewer, at: new Date().toISOString() });
  writeManifest(skillId, manifest, "installed");
  recordPromotionEvent(skillId, "promoted", reviewer);
  return manifest;
}

export function rollbackSkill(skillId: string, reviewer: string) {
  const installedDir = path.resolve(`skills/installed/${skillId}`);
  if (!fs.existsSync(installedDir)) throw new Error(`Installed skill not found: ${skillId}`);
  const manifest = readManifest(skillId, "installed");
  manifest.status = "rolled-back";
  manifest.rolledBackAt = new Date().toISOString();
  manifest.auditTrail.push({ action: "rolled-back", by: reviewer, at: new Date().toISOString() });
  writeManifest(skillId, manifest, "installed");
  fs.rmSync(installedDir, { recursive: true, force: true });
  recordPromotionEvent(skillId, "rolled-back", reviewer);
  return manifest;
}