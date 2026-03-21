import fs from "node:fs";
import path from "node:path";
import type { RunReport } from "../../shared/src/types";

interface ProjectMemory {
  acceptedAssumptions: string[];
  successfulSkillMappings: Record<string, number>;
  successfulAdapterSelections: Record<string, number>;
  adapterSuccessCounts: Record<string, number>;
  promotionHistory: Array<{ skillId: string; action: string; by?: string; at: string }>;
}

function memoryPath() {
  return path.resolve(".codekit/memory/project-memory.json");
}

export function loadProjectMemory(): ProjectMemory {
  const file = memoryPath();
  if (!fs.existsSync(file)) {
    const seed: ProjectMemory = { acceptedAssumptions: [], successfulSkillMappings: {}, successfulAdapterSelections: {}, adapterSuccessCounts: {}, promotionHistory: [] };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
  return JSON.parse(fs.readFileSync(file, "utf-8")) as ProjectMemory;
}

export function updateMemoryFromRun(report: RunReport) {
  const mem = loadProjectMemory();
  for (const a of report.assumptions) {
    if (!mem.acceptedAssumptions.includes(a.text)) mem.acceptedAssumptions.push(a.text);
  }
  for (const s of report.selectedSkills) {
    mem.successfulSkillMappings[s.skillId] = (mem.successfulSkillMappings[s.skillId] || 0) + 1;
  }
  for (const r of report.routes) {
    mem.successfulAdapterSelections[r.adapterName] = (mem.successfulAdapterSelections[r.adapterName] || 0) + 1;
    mem.adapterSuccessCounts[r.adapterName] = (mem.adapterSuccessCounts[r.adapterName] || 0) + 1;
  }
  fs.writeFileSync(memoryPath(), JSON.stringify(mem, null, 2), "utf-8");
}

export function recordPromotionEvent(skillId: string, action: string, by?: string) {
  const mem = loadProjectMemory();
  mem.promotionHistory.push({ skillId, action, by, at: new Date().toISOString() });
  fs.writeFileSync(memoryPath(), JSON.stringify(mem, null, 2), "utf-8");
}

export function saveRunReport(report: RunReport, artifactDir?: string): string {
  const dir = artifactDir ? path.resolve(artifactDir) : path.resolve(".codekit/runs");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `run-report.json`;
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, JSON.stringify(report, null, 2), "utf-8");
  return fullPath;
}