export interface AdapterExecuteResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface ProviderAdapter {
  id: string;
  description: string;
  validate(input: unknown): Promise<boolean>;
  execute(input: unknown): Promise<AdapterExecuteResult>;
  rollback?(input: unknown): Promise<void>;
}
