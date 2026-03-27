import fs from "node:fs";
import path from "node:path";
import type { Mode, RunReport } from "../../shared/src";
import { StorageProvider, getStorageProvider, ArtifactMetadata } from "../../storage/src/index.js";

/**
 * A lightweight memory entry for one recorded run.
 */
export interface ProjectMemoryRunEntry {
  id: string; // Machine-readable unique identifier for the run
  recordedAt: string;
  artifactDirectory: string;
  artifactReportPath: string;
  summary?: string;
  idea?: string;
  mode?: Mode;
  approvedGates?: string[];
  currentPhase?: string;

  // Wave 4: Multi-tenant & Actor context
  orgId?: string;
  workspaceId?: string;
  projectId?: string;
  actorId?: string;
  actorType?: string;
  correlationId?: string;
  authMode?: string;

  // Wave 9: Remote storage metadata
  artifacts?: Record<string, ArtifactMetadata>;
}

/**
 * Get the full RunReport for a specific run ID.
 */
export function getMemoryByRunId(runId: string, options?: RunStoreOptions): RunReport | null {
  const memory = loadProjectMemory(options);
  const entry = memory.runs.find(r => r.id === runId);
  if (!entry) return null;

  const reportPath = entry.artifactReportPath;
  if (!fs.existsSync(reportPath)) return null;

  const raw = fs.readFileSync(reportPath, "utf-8");
  return JSON.parse(raw) as RunReport;
}

/**
 * Project-level local memory for Code-Kit-Ultra.
 */
export interface ProjectMemory {
  version: number;
  updatedAt: string;
  lastRunAt: string | null;
  lastIdea: string | null;
  recentIdeas: string[];
  recentArtifactDirectories: string[];
  runs: ProjectMemoryRunEntry[];
}

/**
 * Return shape for orchestrator integration.
 */
export interface RecordedRunResult {
  artifactDirectory: string;
  artifactReportPath: string;
  memoryPath: string;
  memory: ProjectMemory;
}

/**
 * Optional override paths for testing or custom environments.
 */
export interface RunStoreOptions {
  repoRoot?: string;
  maxRecentIdeas?: number;
  maxRecentArtifacts?: number;
  maxStoredRuns?: number;
  storageProvider?: StorageProvider;
}

const DEFAULT_MAX_RECENT_IDEAS = 20;
const DEFAULT_MAX_RECENT_ARTIFACTS = 20;
const DEFAULT_MAX_STORED_RUNS = 50;

function getRepoRoot(options?: RunStoreOptions): string {
  return options?.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
}

function getCodekitRoot(options?: RunStoreOptions): string {
  return path.join(getRepoRoot(options), ".codekit");
}

function getMemoryDirectory(options?: RunStoreOptions): string {
  return path.join(getCodekitRoot(options), "memory");
}

function getProjectMemoryPath(options?: RunStoreOptions): string {
  return path.join(getMemoryDirectory(options), "project-memory.json");
}

function getArtifactsRoot(options?: RunStoreOptions): string {
  return path.join(getCodekitRoot(options), "runs");
}

function getRunDirectory(runId: string, options?: RunStoreOptions): string {
  return path.join(getArtifactsRoot(options), runId);
}

let defaultProvider: StorageProvider | null = null;

function getProvider(options?: RunStoreOptions): StorageProvider {
  if (options?.storageProvider) return options.storageProvider;
  if (!defaultProvider) {
    defaultProvider = getStorageProvider({
      type: (process.env.CKU_STORAGE_TYPE || "local") as any,
      localBaseDir: getArtifactsRoot(options),
      insforgeBucket: process.env.INSFORGE_STORAGE_BUCKET,
      insforgeApiKey: process.env.INSFORGE_STORAGE_API_KEY
    });
  }
  return defaultProvider!;
}

function ensureDirectory(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function ensureBaseDirectories(options?: RunStoreOptions): void {
  ensureDirectory(getCodekitRoot(options));
  ensureDirectory(getMemoryDirectory(options));
  ensureDirectory(getArtifactsRoot(options));
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fileExists(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as T;
}

function writeJsonFile(filePath: string, value: unknown): void {
  const parentDirectory = path.dirname(filePath);
  ensureDirectory(parentDirectory);

  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function toSafeTimestamp(input = new Date()): string {
  return input.toISOString().replace(/[:.]/g, "-");
}

function getReportCreatedAt(report: RunReport): string {
  const candidate = extractStringProperty(report, ["createdAt", "generatedAt", "timestamp"]);
  return candidate ?? new Date().toISOString();
}

function extractIdeaFromReport(report: RunReport): string | undefined {
  const topLevelIdea = extractStringProperty(report, ["idea"]);
  if (topLevelIdea) {
    return topLevelIdea;
  }

  const inputValue = extractObjectProperty(report, ["input", "userInput", "request"]);
  if (!inputValue) {
    return undefined;
  }

  return extractStringProperty(inputValue, ["idea", "objective", "prompt"]);
}

function extractModeFromReport(report: RunReport): Mode | undefined {
  const topLevelMode = extractStringProperty(report, ["mode"]);
  if (isMode(topLevelMode)) {
    return topLevelMode;
  }

  const inputValue = extractObjectProperty(report, ["input", "userInput", "request"]);
  if (!inputValue) {
    return undefined;
  }

  const nestedMode = extractStringProperty(inputValue, ["mode"]);
  return isMode(nestedMode) ? nestedMode : undefined;
}

function extractSummaryFromReport(report: RunReport): string | undefined {
  return extractStringProperty(report, ["summary"]);
}

function extractStringProperty(source: unknown, keys: string[]): string | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const sourceRecord = source as Record<string, unknown>;

  for (const key of keys) {
    const value = sourceRecord[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function extractObjectProperty(source: unknown, keys: string[]): Record<string, unknown> | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const sourceRecord = source as Record<string, unknown>;

  for (const key of keys) {
    const value = sourceRecord[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

function isMode(value: unknown): value is Mode {
  return value === "turbo" || value === "builder" || value === "pro" || value === "expert";
}

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function trimToMax(values: string[], maxItems: number): string[] {
  return values.slice(0, Math.max(0, maxItems));
}

function trimRunsToMax(
  runs: ProjectMemoryRunEntry[],
  maxItems: number,
): ProjectMemoryRunEntry[] {
  return runs.slice(0, Math.max(0, maxItems));
}

export function createDefaultProjectMemory(): ProjectMemory {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    lastRunAt: null,
    lastIdea: null,
    recentIdeas: [],
    recentArtifactDirectories: [],
    runs: [],
  };
}

export function loadProjectMemory(options?: RunStoreOptions): ProjectMemory {
  ensureBaseDirectories(options);

  const memoryPath = getProjectMemoryPath(options);
  const stored = readJsonFile<ProjectMemory>(memoryPath);

  if (!stored) {
    return createDefaultProjectMemory();
  }

  return {
    version: typeof stored.version === "number" ? stored.version : 1,
    updatedAt:
      typeof stored.updatedAt === "string"
        ? stored.updatedAt
        : new Date().toISOString(),
    lastRunAt:
      typeof stored.lastRunAt === "string" || stored.lastRunAt === null
        ? stored.lastRunAt
        : null,
    lastIdea:
      typeof stored.lastIdea === "string" || stored.lastIdea === null
        ? stored.lastIdea
        : null,
    recentIdeas: Array.isArray(stored.recentIdeas)
      ? stored.recentIdeas.filter((value): value is string => typeof value === "string")
      : [],
    recentArtifactDirectories: Array.isArray(stored.recentArtifactDirectories)
      ? stored.recentArtifactDirectories.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    runs: Array.isArray(stored.runs)
      ? stored.runs.filter(isProjectMemoryRunEntry)
      : [],
  };
}

export function saveProjectMemory(
  memory: ProjectMemory,
  options?: RunStoreOptions,
): string {
  ensureBaseDirectories(options);

  const memoryPath = getProjectMemoryPath(options);
  const normalizedMemory: ProjectMemory = {
    ...memory,
    updatedAt: new Date().toISOString(),
  };

  writeJsonFile(memoryPath, normalizedMemory);
  return memoryPath;
}

export function createTimestampedArtifactDirectory(
  options?: RunStoreOptions,
): string {
  ensureBaseDirectories(options);

  const timestamp = toSafeTimestamp();
  const artifactDirectory = path.join(getArtifactsRoot(options), timestamp);

  ensureDirectory(artifactDirectory);
  return artifactDirectory;
}

export function saveRunReport(
  report: RunReport,
  options?: RunStoreOptions,
): string {
  const artifactDirectory = createTimestampedArtifactDirectory(options);
  const reportPath = path.join(artifactDirectory, "run-report.json");

  writeJsonFile(reportPath, report);
  return reportPath;
}

export function saveRunReportToDirectory(
  report: RunReport,
  artifactDirectory: string,
): string {
  ensureDirectory(artifactDirectory);

  const reportPath = path.join(artifactDirectory, "run-report.json");
  writeJsonFile(reportPath, report);
  return reportPath;
}

export function recordRun(
  report: RunReport,
  options?: RunStoreOptions,
): RecordedRunResult {
  ensureBaseDirectories(options);

  const artifactDirectory = createTimestampedArtifactDirectory(options);
  const artifactReportPath = saveRunReportToDirectory(report, artifactDirectory);

  const existingMemory = loadProjectMemory(options);
  const recordedAt = getReportCreatedAt(report);
  const idea = extractIdeaFromReport(report);
  const mode = extractModeFromReport(report);
  const summary = extractSummaryFromReport(report);

  const newRunEntry: ProjectMemoryRunEntry = {
    id: report.id || `run-${toSafeTimestamp()}`,
    recordedAt,
    artifactDirectory,
    artifactReportPath,
    summary,
    idea,
    mode,
    approvedGates: report.approvedGates,
    currentPhase: report.currentPhase,

    // Wave 4: Extract tenant context from report status or metadata if present
    // Note: We maintain local JSON fallback while allowing for DB-aware columns
    orgId: (report as any).orgId,
    workspaceId: (report as any).workspaceId,
    projectId: (report as any).projectId,
    actorId: (report as any).actorId,
    actorType: (report as any).actorType,
    correlationId: (report as any).correlationId,
    authMode: (report as any).authMode,
  };

  const maxRecentIdeas = options?.maxRecentIdeas ?? DEFAULT_MAX_RECENT_IDEAS;
  const maxRecentArtifacts =
    options?.maxRecentArtifacts ?? DEFAULT_MAX_RECENT_ARTIFACTS;
  const maxStoredRuns = options?.maxStoredRuns ?? DEFAULT_MAX_STORED_RUNS;

  const updatedMemory: ProjectMemory = {
    ...existingMemory,
    updatedAt: new Date().toISOString(),
    lastRunAt: recordedAt,
    lastIdea: idea ?? existingMemory.lastIdea,
    recentIdeas: trimToMax(
      dedupePreserveOrder([...(idea ? [idea] : []), ...existingMemory.recentIdeas]),
      maxRecentIdeas,
    ),
    recentArtifactDirectories: trimToMax(
      dedupePreserveOrder([artifactDirectory, ...existingMemory.recentArtifactDirectories]),
      maxRecentArtifacts,
    ),
    runs: trimRunsToMax([newRunEntry, ...existingMemory.runs], maxStoredRuns),
  };

  const memoryPath = saveProjectMemory(updatedMemory, options);

  return {
    artifactDirectory,
    artifactReportPath,
    memoryPath,
    memory: updatedMemory,
  };
}

export function getProjectMemoryPathForDebug(options?: RunStoreOptions): string {
  return getProjectMemoryPath(options);
}

export function getArtifactsRootForDebug(options?: RunStoreOptions): string {
  return getArtifactsRoot(options);
}

import type {
  IntakeArtifact,
  PlanArtifact,
  GateDecision,
  AdapterArtifact,
  ExecutionLogArtifact,
  RunState,
  RunBundle,
  AuditLogArtifact,
} from "../../shared/src/types";

export async function updateIntake(runId: string, intake: IntakeArtifact, options?: RunStoreOptions): Promise<ArtifactMetadata> {
  const dir = getRunDirectory(runId, options);
  ensureDirectory(dir);
  const json = JSON.stringify(intake, null, 2);
  const filePath = path.join(dir, "intake.json");
  fs.writeFileSync(filePath, json);

  const provider = getProvider(options);
  return provider.put(`${runId}/intake.json`, json, { contentType: "application/json" });
}

export async function updatePlan(runId: string, plan: PlanArtifact, options?: RunStoreOptions): Promise<ArtifactMetadata> {
  const dir = getRunDirectory(runId, options);
  ensureDirectory(dir);
  const json = JSON.stringify(plan, null, 2);
  fs.writeFileSync(path.join(dir, "plan.json"), json);

  const provider = getProvider(options);
  return provider.put(`${runId}/plan.json`, json, { contentType: "application/json" });
}

export async function updateGates(runId: string, gates: GateDecision[], options?: RunStoreOptions): Promise<ArtifactMetadata> {
  const dir = getRunDirectory(runId, options);
  ensureDirectory(dir);
  const json = JSON.stringify(gates, null, 2);
  fs.writeFileSync(path.join(dir, "gates.json"), json);

  const provider = getProvider(options);
  return provider.put(`${runId}/gates.json`, json, { contentType: "application/json" });
}

export async function updateAdapters(runId: string, adapters: AdapterArtifact, options?: RunStoreOptions): Promise<ArtifactMetadata> {
  const dir = getRunDirectory(runId, options);
  ensureDirectory(dir);
  const json = JSON.stringify(adapters, null, 2);
  fs.writeFileSync(path.join(dir, "adapters.json"), json);

  const provider = getProvider(options);
  return provider.put(`${runId}/adapters.json`, json, { contentType: "application/json" });
}

export async function updateExecutionLog(runId: string, log: ExecutionLogArtifact, options?: RunStoreOptions): Promise<ArtifactMetadata> {
  const dir = getRunDirectory(runId, options);
  ensureDirectory(dir);
  const json = JSON.stringify(log, null, 2);
  fs.writeFileSync(path.join(dir, "execution-log.json"), json);

  const provider = getProvider(options);
  return provider.put(`${runId}/execution-log.json`, json, { contentType: "application/json" });
}

export async function updateRunState(runId: string, state: RunState, options?: RunStoreOptions): Promise<ArtifactMetadata> {
  const dir = getRunDirectory(runId, options);
  ensureDirectory(dir);
  const json = JSON.stringify(state, null, 2);
  fs.writeFileSync(path.join(dir, "state.json"), json);

  const provider = getProvider(options);
  return provider.put(`${runId}/state.json`, json, { contentType: "application/json" });
}

export async function updateAuditLog(runId: string, log: AuditLogArtifact, options?: RunStoreOptions): Promise<ArtifactMetadata> {
  const dir = getRunDirectory(runId, options);
  ensureDirectory(dir);
  const json = JSON.stringify(log, null, 2);
  fs.writeFileSync(path.join(dir, "audit-log.json"), json);

  const provider = getProvider(options);
  return provider.put(`${runId}/audit-log.json`, json, { contentType: "application/json" });
}

export function loadRunBundle(runId: string): RunBundle | null {
  const dir = getRunDirectory(runId);
  if (!fs.existsSync(dir)) return null;

  const intake = readJsonFile<IntakeArtifact>(path.join(dir, "intake.json"));
  const plan = readJsonFile<PlanArtifact>(path.join(dir, "plan.json"));
  const gates = readJsonFile<GateDecision[]>(path.join(dir, "gates.json"));
  const adapters = readJsonFile<AdapterArtifact>(path.join(dir, "adapters.json"));
  const log = readJsonFile<ExecutionLogArtifact>(path.join(dir, "execution-log.json"));
  const state = readJsonFile<RunState>(path.join(dir, "state.json"));
  const audit = readJsonFile<AuditLogArtifact>(path.join(dir, "audit-log.json"));

  if (!intake || !plan || !state) return null;

  return {
    intake,
    plan,
    gates: gates || [],
    adapters: adapters || { runId, createdAt: intake.createdAt, executions: [] },
    executionLog: log || { runId, createdAt: intake.createdAt, steps: [] },
    state,
    auditLog: audit || { runId, createdAt: intake.createdAt, updatedAt: intake.createdAt, events: [] },
    reportMarkdown: "",
  };
}

export function listRunIds(options?: RunStoreOptions): string[] {
  const root = getArtifactsRoot(options);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).filter((f) => fs.statSync(path.join(root, f)).isDirectory());
}

function isProjectMemoryRunEntry(value: unknown): value is ProjectMemoryRunEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.recordedAt === "string" &&
    typeof entry.artifactDirectory === "string" &&
    typeof entry.artifactReportPath === "string" &&
    (typeof entry.summary === "string" || typeof entry.summary === "undefined") &&
    (typeof entry.idea === "string" || typeof entry.idea === "undefined") &&
    (typeof entry.mode === "string" || typeof entry.mode === "undefined") &&
    (typeof entry.currentPhase === "string" || typeof entry.currentPhase === "undefined") &&
    (typeof entry.orgId === "string" || typeof entry.orgId === "undefined") &&
    (typeof entry.workspaceId === "string" || typeof entry.workspaceId === "undefined") &&
    (typeof entry.projectId === "string" || typeof entry.projectId === "undefined") &&
    (typeof entry.actorId === "string" || typeof entry.actorId === "undefined") &&
    (typeof entry.actorType === "string" || typeof entry.actorType === "undefined") &&
    (typeof entry.correlationId === "string" || typeof entry.correlationId === "undefined") &&
    (typeof entry.authMode === "string" || typeof entry.authMode === "undefined")
  );
}
