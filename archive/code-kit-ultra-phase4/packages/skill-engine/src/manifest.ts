import fs from "node:fs";
import path from "node:path";
import type { GeneratedSkillManifest, SkillReviewStatus } from "../../shared/src/types";
import { skillManifestValidator } from "./schema";

export function normalizeSkillId(idea: string): string {
  const normalized = idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "general-solution-scaffold";

  return `skill_${normalized.replace(/-/g, "_")}`;
}

export function createGeneratedManifest(idea: string, skillId = normalizeSkillId(idea)): GeneratedSkillManifest {
  return {
    skillId,
    version: "0.1.0-generated",
    kind: "generated",
    reviewStatus: "generated",
    purpose: `Generated fallback skill for: ${idea}`,
    trigger: "Use when no installed skill matches the current project intent.",
    inputs: ["project idea", "execution mode", "project context"],
    outputs: ["starter plan scaffolding", "baseline task framing", "next-step guidance"],
    dependencies: ["orchestrator", "planner", "gate-manager"],
    procedure: [
      "Interpret the project idea and identify the core capability gap.",
      "Create a baseline structure for tasks and artifacts.",
      "Generate safe next actions aligned to the chosen mode."
    ],
    validation: [
      "The idea is interpreted into a concrete capability.",
      "A baseline skill package is created on disk.",
      "The package includes both SKILL.md and manifest.json."
    ],
    failureModes: [
      "The idea is too vague to infer a capability.",
      "The package directory cannot be written.",
      "The manifest fails validation."
    ],
    reuseGuidance: "Review the generated package and promote it into installed skills if it proves reusable.",
    sourceIdea: idea,
    generatedAt: new Date().toISOString(),
  };
}

function renderSkillMarkdown(manifest: GeneratedSkillManifest): string {
  return `# ${manifest.skillId}

## Purpose
${manifest.purpose}

## Review Status
${manifest.reviewStatus}

## Trigger
${manifest.trigger}

## Inputs
${manifest.inputs.map((item) => `- ${item}`).join("\n")}

## Outputs
${manifest.outputs.map((item) => `- ${item}`).join("\n")}

## Dependencies
${manifest.dependencies.map((item) => `- ${item}`).join("\n")}

## Procedure
${manifest.procedure.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## Validation
${manifest.validation.map((item) => `- ${item}`).join("\n")}

## Failure Modes
${manifest.failureModes.map((item) => `- ${item}`).join("\n")}

## Reuse Guidance
${manifest.reuseGuidance}
`;
}

export function readManifest(manifestPath: string): GeneratedSkillManifest {
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as GeneratedSkillManifest;
}

export function writeManifest(manifestPath: string, manifest: GeneratedSkillManifest): void {
  const validation = skillManifestValidator.validate(manifest);
  if (!validation.valid) {
    throw new Error(`Generated skill manifest invalid: ${validation.errors.join(", ")}`);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

export function updateSkillReviewStatus(manifestPath: string, status: SkillReviewStatus, reviewNotes?: string): GeneratedSkillManifest {
  const manifest = readManifest(manifestPath);
  manifest.reviewStatus = status;
  if (reviewNotes) manifest.reviewNotes = reviewNotes;
  writeManifest(manifestPath, manifest);
  return manifest;
}

export function writeGeneratedSkillPackage(
  manifest: GeneratedSkillManifest,
  outputRoot = "skills/generated"
): { skillDir: string; skillPath: string; manifestPath: string } {
  const validation = skillManifestValidator.validate(manifest);
  if (!validation.valid) {
    throw new Error(`Generated skill manifest invalid: ${validation.errors.join(", ")}`);
  }

  const skillDir = path.resolve(outputRoot, manifest.skillId);
  const examplesDir = path.join(skillDir, "examples");
  const testsDir = path.join(skillDir, "tests");
  const skillPath = path.join(skillDir, "SKILL.md");
  const manifestPath = path.join(skillDir, "manifest.json");

  fs.mkdirSync(examplesDir, { recursive: true });
  fs.mkdirSync(testsDir, { recursive: true });
  fs.writeFileSync(skillPath, renderSkillMarkdown(manifest), "utf-8");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  fs.writeFileSync(path.join(examplesDir, "example-input.json"), JSON.stringify({ idea: manifest.sourceIdea }, null, 2), "utf-8");
  fs.writeFileSync(path.join(testsDir, "README.md"), `# ${manifest.skillId} tests

Add contract tests here.
`, "utf-8");

  return { skillDir, skillPath, manifestPath };
}
