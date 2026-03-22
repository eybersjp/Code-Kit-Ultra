import fs from "node:fs";
import path from "node:path";
import type { Mode, RunReport } from "../../shared/src";

/**
 * A lightweight memory entry for one recorded run.
 */
export interface ProjectMemoryRunEntry {
  recordedAt: string;
  artifactDirectory: string;
  artifactReportPath: string;
  summary?: string;
  idea?: string;
  mode?: Mode;
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
  return path.join(getRepoRoot(options), "artifacts", "test-runs");
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
  return value === "safe" || value === "balanced" || value === "god";
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
    recordedAt,
    artifactDirectory,
    artifactReportPath,
    summary,
    idea,
    mode,
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
    (typeof entry.mode === "string" || typeof entry.mode === "undefined")
  );
}
