import fs from "node:fs";
import path from "node:path";
import type { GovernanceTrace, TimelineEvent } from "./types";
import { slugTimestamp } from "./utils";

const TRACE_DIR = path.resolve(".ck/traces");
const TIMELINE_DIR = path.resolve(".ck/timelines");
const REPORT_DIR = path.resolve(".ck/reports");

function ensure(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function saveGovernanceTrace(trace: GovernanceTrace): string {
  ensure(TRACE_DIR);
  const file = path.join(TRACE_DIR, `${trace.runId}-${slugTimestamp()}.json`);
  fs.writeFileSync(file, JSON.stringify(trace, null, 2), "utf-8");
  return file;
}

export function saveTimeline(runId: string, events: TimelineEvent[]): string {
  ensure(TIMELINE_DIR);
  const file = path.join(TIMELINE_DIR, `${runId}-${slugTimestamp()}.json`);
  fs.writeFileSync(file, JSON.stringify(events, null, 2), "utf-8");
  return file;
}

export function saveMarkdownReport(runId: string, markdown: string): string {
  ensure(REPORT_DIR);
  const file = path.join(REPORT_DIR, `${runId}-${slugTimestamp()}.md`);
  fs.writeFileSync(file, markdown, "utf-8");
  return file;
}

function latestFile(dir: string, runId: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((file) => file.startsWith(`${runId}-`))
    .sort()
    .reverse();
  return files.length ? path.join(dir, files[0]) : null;
}

export function loadLatestGovernanceTrace(runId: string): GovernanceTrace | null {
  const file = latestFile(TRACE_DIR, runId);
  if (!file) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as GovernanceTrace;
}

export function loadLatestTimeline(runId: string): TimelineEvent[] | null {
  const file = latestFile(TIMELINE_DIR, runId);
  if (!file) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as TimelineEvent[];
}
