import type { BuilderActionBatch } from "../../agents/src/action-types";

export interface IntentVerificationResult {
  valid: boolean;
  confidence: number;
  driftDetected: boolean;
  matchedKeywords: string[];
  missingKeywords: string[];
  notes: string[];
}

function tokenize(text: string): string[] {
  return Array.from(new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 3)
  ));
}

export function verifyIntent(originalIdea: string, batch: BuilderActionBatch): IntentVerificationResult {
  const ideaTokens = tokenize(originalIdea);
  const batchText = [batch.summary, ...batch.actions.map((a) => a.type === "run_command" ? `${a.command} ${a.reason ?? ""}` : `${"path" in a ? a.path : ""} ${a.reason ?? ""}`)].join(" ");
  const batchTokens = tokenize(batchText);

  const matchedKeywords = ideaTokens.filter((t) => batchTokens.includes(t));
  const missingKeywords = ideaTokens.filter((t) => !batchTokens.includes(t));
  const coverage = ideaTokens.length === 0 ? 1 : matchedKeywords.length / ideaTokens.length;
  const driftDetected = coverage < 0.35;
  const notes: string[] = [];

  if (driftDetected) notes.push("Batch appears weakly aligned with the original user intent.");
  if (missingKeywords.length > 0) notes.push(`Missing intent keywords: ${missingKeywords.join(", ")}`);
  if (matchedKeywords.length > 0) notes.push(`Matched intent keywords: ${matchedKeywords.join(", ")}`);

  return {
    valid: !driftDetected,
    confidence: Number(coverage.toFixed(2)),
    driftDetected,
    matchedKeywords,
    missingKeywords,
    notes,
  };
}
