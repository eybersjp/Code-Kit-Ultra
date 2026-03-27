import fs from "node:fs";
import path from "node:path";
import type { GeneratedSkillManifest } from "../../shared/src/types";
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
    generatedAt: new Date().toISOString()
  };
}

function renderSkillMarkdown(manifest: GeneratedSkillManifest): string {
  return `# ${manifest.skillId}\n\n## Purpose\n${manifest.purpose}\n\n## Trigger\n${manifest.trigger}\n\n## Inputs\n${manifest.inputs.map((item) => `- ${item}`).join("\n")}\n\n## Outputs\n${manifest.outputs.map((item) => `- ${item}`).join("\n")}\n\n## Dependencies\n${manifest.dependencies.map((item) => `- ${item}`).join("\n")}\n\n## Procedure\n${manifest.procedure.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## Validation\n${manifest.validation.map((item) => `- ${item}`).join("\n")}\n\n## Failure Modes\n${manifest.failureModes.map((item) => `- ${item}`).join("\n")}\n\n## Reuse Guidance\n${manifest.reuseGuidance}\n`;
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
  fs.writeFileSync(path.join(testsDir, "README.md"), `# ${manifest.skillId} tests\n\nAdd contract tests here.\n`, "utf-8");

  return { skillDir, skillPath, manifestPath };
}
