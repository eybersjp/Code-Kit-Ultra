import type { SkillManifestValidator } from "../../shared/src/contracts";
import type { GeneratedSkillManifest } from "../../shared/src/types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export const skillManifestValidator: SkillManifestValidator = {
  validate(manifest: GeneratedSkillManifest) {
    const errors: string[] = [];

    if (!isNonEmptyString(manifest.skillId)) errors.push("skillId is required");
    if (!isNonEmptyString(manifest.version)) errors.push("version is required");
    if (!(manifest.kind === "generated" || manifest.kind === "installed")) {
      errors.push("kind must be generated or installed");
    }
    if (!isNonEmptyString(manifest.purpose)) errors.push("purpose is required");
    if (!isNonEmptyString(manifest.trigger)) errors.push("trigger is required");
    if (!isStringArray(manifest.inputs)) errors.push("inputs must be a string array");
    if (!isStringArray(manifest.outputs)) errors.push("outputs must be a string array");
    if (!isStringArray(manifest.dependencies)) errors.push("dependencies must be a string array");
    if (!isStringArray(manifest.procedure) || manifest.procedure.length === 0) {
      errors.push("procedure must be a non-empty string array");
    }
    if (!isStringArray(manifest.validation) || manifest.validation.length === 0) {
      errors.push("validation must be a non-empty string array");
    }
    if (!isStringArray(manifest.failureModes)) errors.push("failureModes must be a string array");
    if (!isNonEmptyString(manifest.reuseGuidance)) errors.push("reuseGuidance is required");
    if (!isNonEmptyString(manifest.sourceIdea)) errors.push("sourceIdea is required");
    if (!isNonEmptyString(manifest.generatedAt)) errors.push("generatedAt is required");

    return {
      valid: errors.length === 0,
      errors
    };
  }
};
