import type { GovernanceTrace } from "./types";

export function renderScoreExplanation(trace: GovernanceTrace): string {
  const lines: string[] = [];
  lines.push(`Confidence: ${trace.confidence.score}`);
  lines.push(`Threshold: ${trace.confidence.threshold}`);
  lines.push("");
  lines.push("Breakdown:");

  for (const component of trace.confidence.components) {
    lines.push(
      `- ${component.label}: score=${component.score} weight=${component.weight}$${""}`.replace("$", ""),
    );
    if (component.note) {
      lines.push(`  note: ${component.note}`);
    }
  }

  lines.push("");
  lines.push(trace.confidence.reason);
  return lines.join("\n");
}
