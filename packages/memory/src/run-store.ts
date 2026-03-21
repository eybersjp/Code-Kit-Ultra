import fs from "node:fs";
import path from "node:path";
import type { PersistentMemory, RunPaths, RunReport } from "../../shared/src/types";

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function createRunPaths(outputRoot?: string): RunPaths {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir = path.resolve(outputRoot || `artifacts/test-runs/${timestamp}`);
  ensureDir(baseDir);

  return {
    baseDir,
    jsonReportPath: path.join(baseDir, "run-report.json"),
    markdownReportPath: path.join(baseDir, "report.md"),
    consoleLogPath: path.join(baseDir, "console.log"),
    gateSnapshotPath: path.join(baseDir, "gates.json"),
    memoryPath: path.resolve(".codekit/memory/project-memory.json"),
  };
}

export function saveRunReport(report: RunReport, paths: RunPaths): string {
  ensureDir(path.dirname(paths.jsonReportPath));
  fs.writeFileSync(paths.jsonReportPath, JSON.stringify(report, null, 2), "utf-8");
  fs.writeFileSync(paths.gateSnapshotPath, JSON.stringify(report.gates, null, 2), "utf-8");
  return paths.jsonReportPath;
}

export function saveConsoleOutput(lines: string[], paths: RunPaths): void {
  ensureDir(path.dirname(paths.consoleLogPath));
  fs.writeFileSync(paths.consoleLogPath, lines.join("\n"), "utf-8");
}

export function loadMemory(memoryPath?: string): PersistentMemory {
  const target = path.resolve(memoryPath || ".codekit/memory/project-memory.json");
  ensureDir(path.dirname(target));

  if (!fs.existsSync(target)) {
    const empty: PersistentMemory = {
      acceptedAssumptions: [],
      rejectedPatterns: [],
      successfulSkillMappings: {},
      successfulAdapterSelections: {},
      adapterSuccessCounts: {},
      promotedSkills: {},
      lastIdeas: [],
    };
    fs.writeFileSync(target, JSON.stringify(empty, null, 2), "utf-8");
    return empty;
  }

  return JSON.parse(fs.readFileSync(target, "utf-8")) as PersistentMemory;
}

export function markPromotedSkill(skillId: string, manifestPath: string, memoryPath?: string): PersistentMemory {
  const target = path.resolve(memoryPath || ".codekit/memory/project-memory.json");
  const current = loadMemory(target);
  current.promotedSkills[skillId] = manifestPath;
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, JSON.stringify(current, null, 2), "utf-8");
  return current;
}

export function updateMemory(report: RunReport, memoryPath?: string): PersistentMemory {
  const target = path.resolve(memoryPath || ".codekit/memory/project-memory.json");
  const current = loadMemory(target);

  current.preferredMode = report.input.mode;
  current.lastIdeas = [report.input.idea, ...current.lastIdeas].slice(0, 10);
  current.acceptedAssumptions = Array.from(
    new Set([...current.acceptedAssumptions, ...report.assumptions.map((a) => a.text)])
  ).slice(0, 50);

  for (const skill of report.selectedSkills) {
    const key = report.input.idea.toLowerCase();
    const existing = current.successfulSkillMappings[key] || [];
    current.successfulSkillMappings[key] = Array.from(new Set([...existing, skill.skillId]));
  }

  for (const route of report.routeSelections) {
    const existing = current.successfulAdapterSelections[route.taskType] || [];
    current.successfulAdapterSelections[route.taskType] = Array.from(
      new Set([route.selectedAdapter, ...existing])
    ).slice(0, 5);
    current.adapterSuccessCounts[route.selectedAdapter] =
      (current.adapterSuccessCounts[route.selectedAdapter] || 0) + 1;
  }

  ensureDir(path.dirname(target));
  fs.writeFileSync(target, JSON.stringify(current, null, 2), "utf-8");
  return current;
}
