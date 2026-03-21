import fs from "node:fs";
import path from "node:path";
import { GeneratedSkillManifestSchema } from "./schema";
import type { GeneratedSkillManifest, SkillPackage } from "../../shared/src/contracts";

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function createGeneratedSkillFromIdea(idea: string): SkillPackage {
  const skillId = `skill_${slugify(idea).slice(0, 48)}`;
  const dir = path.resolve("skills/generated", skillId);
  fs.mkdirSync(path.join(dir, "examples"), { recursive: true });
  fs.mkdirSync(path.join(dir, "tests"), { recursive: true });

  const manifest: GeneratedSkillManifest = {
    skillId,
    version: "0.1.0",
    status: "generated",
    createdAt: new Date().toISOString(),
    auditTrail: [{ action: "generated", at: new Date().toISOString(), notes: `Created from idea: ${idea}` }]
  };

  GeneratedSkillManifestSchema.parse(manifest);

  const skillMarkdown = `# ${skillId}\n\n## Purpose\nGenerated fallback skill for: ${idea}\n\n## Trigger\nInvoke when no installed skill adequately matches the idea.\n\n## Validation\n- manifest exists\n- example input exists\n- review required before promotion\n`;

  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
  fs.writeFileSync(path.join(dir, "SKILL.md"), skillMarkdown, "utf-8");
  fs.writeFileSync(path.join(dir, "examples", "example-input.json"), JSON.stringify({ idea }, null, 2), "utf-8");
  fs.writeFileSync(path.join(dir, "tests", "README.md"), "Add skill validation tests here.\n", "utf-8");

  return { manifest, skillMarkdown, generatedPath: dir };
}

export function readManifest(skillId: string, bucket: "generated" | "installed" = "generated"): GeneratedSkillManifest {
  const file = path.resolve(`skills/${bucket}/${skillId}/manifest.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  return GeneratedSkillManifestSchema.parse(data);
}

export function writeManifest(skillId: string, manifest: GeneratedSkillManifest, bucket: "generated" | "installed" = "generated") {
  const file = path.resolve(`skills/${bucket}/${skillId}/manifest.json`);
  GeneratedSkillManifestSchema.parse(manifest);
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2), "utf-8");
}