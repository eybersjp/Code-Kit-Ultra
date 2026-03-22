import type { Mode, RunReport } from "../../shared/src";

export type AdapterCapability =
  | "planning"
  | "scaffolding"
  | "code-editing"
  | "refactoring"
  | "fullstack-build"
  | "prompt-driven-build"
  | "contextual-iteration"
  | "repo-navigation";

export interface AdapterExecutionRequest {
  projectIdea: string;
  mode?: Mode;
  report?: RunReport;
  preferredAction?:
    | "plan"
    | "generate-files"
    | "refactor"
    | "ship-mvp"
    | "review-repo";
}

export interface AdapterRecommendation {
  adapterId: string;
  adapterName: string;
  fitScore: number;
  recommended: boolean;
  reason: string;
  capabilities: AdapterCapability[];
}

export interface AdapterExecutionResult {
  adapterId: string;
  adapterName: string;
  accepted: boolean;
  mockAction: string;
  summary: string;
  nextSteps: string[];
}

export interface PlatformAdapter {
  id: string;
  name: string;
  capabilities: AdapterCapability[];
  canHandle(input: AdapterExecutionRequest): boolean;
  recommend(input: AdapterExecutionRequest): AdapterRecommendation;
  executeMock(input: AdapterExecutionRequest): AdapterExecutionResult;
}
