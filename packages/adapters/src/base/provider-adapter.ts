export type ExecutionRisk = "low" | "medium" | "high";

export interface AdapterSimulationPreview {
  summary: string;
  risk: ExecutionRisk;
  requiresApproval?: boolean;
  blocked?: boolean;
  reasons?: string[];
  previewData?: Record<string, unknown>;
}

export interface AdapterVerificationResult {
  ok: boolean;
  summary: string;
  details?: Record<string, unknown>;
}

export interface AdapterExecuteResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderAdapter {
  id: string;
  description: string;
  validate(input: unknown): Promise<boolean>;
  simulate?(input: unknown): Promise<AdapterSimulationPreview>;
  estimateRisk?(input: unknown): Promise<ExecutionRisk>;
  execute(input: unknown): Promise<AdapterExecuteResult>;
  verify?(input: unknown, result: AdapterExecuteResult): Promise<AdapterVerificationResult>;
  suggestFix?(error: unknown, input: unknown): Promise<string>;
  rollback?(input: unknown): Promise<void>;
}
