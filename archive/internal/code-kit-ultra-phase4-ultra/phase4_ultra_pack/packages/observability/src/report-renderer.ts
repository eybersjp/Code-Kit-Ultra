import type { GovernanceTrace, TimelineEvent } from "./types";

function renderVotes(trace: GovernanceTrace): string {
  if (!trace.consensus.votes.length) return "- No votes recorded";
  return trace.consensus.votes
    .map(
      (vote) =>
        `- **${vote.agent}**: ${vote.decision} (weight ${vote.weight}) — ${vote.reason}`,
    )
    .join("\n");
}

function renderTimeline(events: TimelineEvent[]): string {
  if (!events.length) return "- No timeline events recorded";
  return events
    .map((event) => `- [${event.at}] [${event.phase}] ${event.event} — ${event.detail}`)
    .join("\n");
}

export function renderGovernanceMarkdownReport(
  trace: GovernanceTrace,
  timeline: TimelineEvent[],
): string {
  return `# Code Kit Ultra — Governance Execution Report

## Run

- **Run ID:** ${trace.runId}
- **Created At:** ${trace.createdAt}
- **Mode:** ${trace.mode ?? "unknown"}
- **Summary:** ${trace.summary}

## Final Decision

- **Decision:** ${trace.finalDecision}
- **Reason:** ${trace.finalReason}
- **Suggested Action:** ${trace.suggestedAction ?? "N/A"}

## Intent Check

- **Passed:** ${trace.intent.passed}
- **Reason:** ${trace.intent.reason}
- **Score:** ${trace.intent.score ?? "N/A"}

## Constraint Check

- **Passed:** ${trace.constraints.passed}
- **Violations:** ${trace.constraints.violations.length ? trace.constraints.violations.join(", ") : "None"}
- **Warnings:** ${trace.constraints.warnings?.length ? trace.constraints.warnings.join(", ") : "None"}

## Validation Check

- **Passed:** ${trace.validation.passed}
- **Errors:** ${trace.validation.errors.length ? trace.validation.errors.join(", ") : "None"}
- **Warnings:** ${trace.validation.warnings?.length ? trace.validation.warnings.join(", ") : "None"}

## Consensus

- **Passed:** ${trace.consensus.passed}
- **Approval Weight:** ${trace.consensus.approvalWeight}
- **Rejection Weight:** ${trace.consensus.rejectionWeight}
- **Threshold:** ${trace.consensus.threshold}
- **Reason:** ${trace.consensus.reason}

${renderVotes(trace)}

## Confidence

- **Score:** ${trace.confidence.score}
- **Threshold:** ${trace.confidence.threshold}
- **Reason:** ${trace.confidence.reason}

${trace.confidence.components
  .map((c) => `- **${c.label}**: score=${c.score}, weight=${c.weight}${c.note ? ` — ${c.note}` : ""}`)
  .join("\n")}

## Timeline

${renderTimeline(timeline)}
`;
}
