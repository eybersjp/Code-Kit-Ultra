import type { BuilderActionBatch } from "../../agents/src/action-types";

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  checks: ValidationCheck[];
  summary: string;
}

export function validateBatch(batch: BuilderActionBatch): ValidationResult {
  const checks: ValidationCheck[] = [];
  checks.push({ name: "non_empty_actions", passed: batch.actions.length > 0, message: batch.actions.length > 0 ? "Batch contains actions." : "Batch contains no actions." });
  checks.push({ name: "summary_present", passed: batch.summary.trim().length > 0, message: batch.summary.trim().length > 0 ? "Summary present." : "Summary missing." });
  checks.push({ name: "all_actions_have_reason", passed: batch.actions.every((a) => Boolean(a.reason && a.reason.trim())), message: batch.actions.every((a) => Boolean(a.reason && a.reason.trim())) ? "All actions include reasons." : "One or more actions are missing reasons." });
  checks.push({ name: "run_id_present", passed: Boolean(batch.runId?.trim()), message: Boolean(batch.runId?.trim()) ? "Run ID present." : "Run ID missing." });

  return {
    valid: checks.every((c) => c.passed),
    checks,
    summary: checks.every((c) => c.passed) ? "Batch passed structural validation." : "Batch failed one or more validation checks.",
  };
}
