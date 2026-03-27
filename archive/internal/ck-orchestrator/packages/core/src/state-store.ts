
export interface RunState {
  id: string;
  mode: string;
  data: any;
  approvedGates: string[];
  currentPhase: string;
}

const store: Record<string, RunState> = {};

export function createRun(id: string, mode: string, data: any): RunState {
  const run = { id, mode, data, approvedGates: [], currentPhase: "init" };
  store[id] = run;
  return run;
}

export function getRun(id: string): RunState {
  return store[id];
}

export function approveGate(id: string, gate: string) {
  store[id].approvedGates.push(gate);
}
