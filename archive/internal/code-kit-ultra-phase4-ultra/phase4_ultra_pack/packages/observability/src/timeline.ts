import type { TimelineEvent } from "./types";
import { isoNow } from "./utils";

export class TimelineBuilder {
  private events: TimelineEvent[] = [];

  constructor(private readonly runId: string) {}

  add(
    phase: string,
    event: string,
    detail: string,
    level: TimelineEvent["level"] = "info",
    metadata?: Record<string, unknown>,
  ): TimelineBuilder {
    this.events.push({
      id: `${this.runId}-${this.events.length + 1}`,
      runId: this.runId,
      at: isoNow(),
      phase,
      event,
      detail,
      level,
      metadata,
    });
    return this;
  }

  build(): TimelineEvent[] {
    return [...this.events];
  }
}
