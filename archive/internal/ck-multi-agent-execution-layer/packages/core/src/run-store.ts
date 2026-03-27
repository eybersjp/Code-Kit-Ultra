import fs from "fs";
import path from "path";
import type { CKMode, RunRecord, RunPhase } from "./types";

const RUNS_DIR = path.resolve(process.cwd(), ".ck", "runs");

function ensureRunsDir() {
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }
}

function getRunFilePath(runId: string): string {
  return path.join(RUNS_DIR, `${runId}.json`);
}

function randomId() {
  return "run_" + Math.random().toString(36).slice(2, 10);
}

export function createRun(mode: CKMode, idea: string): RunRecord {
  ensureRunsDir();
  const id = randomId();
  const record: RunRecord = {
    id,
    mode,
    idea,
    approvedGates: [],
    currentPhase: "init",
    status: "idle",
    context: { idea },
    agentSelections: {},
    outputs: {},
    history: [{
      timestamp: new Date().toISOString(),
      phase: "init",
      status: "created",
      message: `Run created for idea: ${idea}`,
    }],
  };
  fs.writeFileSync(getRunFilePath(id), JSON.stringify(record, null, 2));
  return record;
}

export function getRun(runId: string): RunRecord {
  ensureRunsDir();
  const filePath = getRunFilePath(runId);
  if (!fs.existsSync(filePath)) throw new Error(`Run not found: ${runId}`);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

export function savePhaseOutput(runId: string, phase: RunPhase, agent: string, output: unknown, message = "Phase completed"): RunRecord {
  const run = getRun(runId);
  run.outputs[phase] = output;
  run.currentPhase = phase;
  run.history.push({
    timestamp: new Date().toISOString(),
    phase,
    agent,
    status: "completed",
    message,
  });
  fs.writeFileSync(getRunFilePath(runId), JSON.stringify(run, null, 2));
  return run;
}

export function setRunStatus(runId: string, status: RunRecord["status"], message: string, phase?: RunPhase): RunRecord {
  const run = getRun(runId);
  run.status = status;
  run.history.push({
    timestamp: new Date().toISOString(),
    phase: phase ?? run.currentPhase,
    status,
    message,
  });
  fs.writeFileSync(getRunFilePath(runId), JSON.stringify(run, null, 2));
  return run;
}

export function approveGate(runId: string, gate: string): RunRecord {
  const run = getRun(runId);
  if (!run.approvedGates.includes(gate)) {
    run.approvedGates.push(gate);
  }
  run.history.push({
    timestamp: new Date().toISOString(),
    phase: run.currentPhase,
    status: "approved",
    message: `Gate approved: ${gate}`,
  });
  fs.writeFileSync(getRunFilePath(runId), JSON.stringify(run, null, 2));
  return run;
}

export function listRuns(): RunRecord[] {
  ensureRunsDir();
  const files = fs.readdirSync(RUNS_DIR);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const runId = f.replace(".json", "");
      return getRun(runId);
    });
}
