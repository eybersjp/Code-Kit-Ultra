import fs from "node:fs";
import path from "node:path";
import type { AdapterArtifact, ExecutionLogArtifact, IntakeArtifact, PlanArtifact, RunBundle, RunState } from "../../shared/src/types";

function runsRoot(): string {
  return path.resolve(".codekit/runs");
}

export function getRunDir(runId: string): string {
  return path.join(runsRoot(), runId);
}

export function ensureRunDir(runId: string): string {
  const dir = getRunDir(runId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export function saveRunBundle(bundle: RunBundle): string {
  const dir = ensureRunDir(bundle.state.runId);
  writeJson(path.join(dir, "intake.json"), bundle.intake);
  writeJson(path.join(dir, "plan.json"), bundle.plan);
  writeJson(path.join(dir, "gates.json"), bundle.gates);
  writeJson(path.join(dir, "adapters.json"), bundle.adapters);
  writeJson(path.join(dir, "execution-log.json"), bundle.executionLog);
  writeJson(path.join(dir, "state.json"), bundle.state);
  fs.writeFileSync(path.join(dir, "report.md"), bundle.reportMarkdown, "utf-8");
  return dir;
}

export function updateRunState(runId: string, state: RunState): void {
  const dir = ensureRunDir(runId);
  writeJson(path.join(dir, "state.json"), state);
}

export function updateAdapters(runId: string, adapters: AdapterArtifact): void {
  const dir = ensureRunDir(runId);
  writeJson(path.join(dir, "adapters.json"), adapters);
}

export function updateExecutionLog(runId: string, executionLog: ExecutionLogArtifact): void {
  const dir = ensureRunDir(runId);
  writeJson(path.join(dir, "execution-log.json"), executionLog);
}

export function updateReport(runId: string, markdown: string): void {
  const dir = ensureRunDir(runId);
  fs.writeFileSync(path.join(dir, "report.md"), markdown, "utf-8");
}

export function loadRunBundle(runId: string): RunBundle {
  const dir = getRunDir(runId);
  const intake = readJson<IntakeArtifact>(path.join(dir, "intake.json"));
  const plan = readJson<PlanArtifact>(path.join(dir, "plan.json"));
  const gates = readJson<RunBundle["gates"]>(path.join(dir, "gates.json"));
  const adapters = readJson<AdapterArtifact>(path.join(dir, "adapters.json"));
  const executionLog = readJson<ExecutionLogArtifact>(path.join(dir, "execution-log.json"));
  const state = readJson<RunState>(path.join(dir, "state.json"));
  const reportMarkdown = fs.readFileSync(path.join(dir, "report.md"), "utf-8");
  return { intake, plan, gates, adapters, executionLog, state, reportMarkdown };
}

export function listRunIds(): string[] {
  const root = runsRoot();
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter((name) => fs.statSync(path.join(root, name)).isDirectory()).sort();
}
