export interface AdapterExecutionSummary {
  taskId: string;
  adapter: string;
  status: "success" | "failed" | "rolled-back";
  attempts: number;
  output: string;
}

export interface Task {
  id: string;
  title: string;
  adapterId: string;
  payload: any;
}

export interface PlanTask extends Task {
  requiresApproval?: boolean;
  retryPolicy?: {
    maxAttempts: number;
  };
  rollbackPayload?: any;
}

export interface StepExecutionLog {
  stepId: string;
  title: string;
  adapter: string;
  attempt: number;
  status: "success" | "failed" | "paused" | "rolled-back";
  startedAt: string;
  finishedAt?: string;
  output?: string;
  error?: string;
  rollbackAvailable?: boolean;
  risk?: string;
  simulationSummary?: string;
  verificationStatus?: string;
  verificationSummary?: string;
  fixSuggestion?: string;
}

export interface RunBundle {
  state: {
    runId: string;
    status: "planned" | "running" | "completed" | "failed" | "paused";
    currentStepIndex: number;
    updatedAt: string;
    approved?: boolean;
    approvalRequired?: boolean;
    pauseReason?: string;
    actorId?: string;
    actorType?: string;
    orgId?: string;
    workspaceId?: string;
    projectId?: string;
    correlationId?: string;
  };
  plan: {
    tasks: PlanTask[];
  };
  executionLog: {
    steps: StepExecutionLog[];
  };
  adapters: {
    executions: AdapterExecutionSummary[];
    createdAt: string;
  };
}

export * from "./phase10-types.js";
