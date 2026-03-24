import { selectBestAdapter } from "../../adapters/src";
import type { AdapterExecutionRequest, AdapterExecutionResult } from "../../adapters/src/types";

/**
 * High-level function to run an agentic prompt against the most suitable adapter.
 * Implementation replaces old monolithic runAgentPrompt with modular adapter routing.
 */
export function runAgentPrompt(request: AdapterExecutionRequest): AdapterExecutionResult {
  const adapter = selectBestAdapter(request);
  
  // In v1.1.0, we use executeMock to demonstrate governance and auditability 
  // without incurring uncontrolled API costs during development.
  return adapter.executeMock(request);
}

/**
 * Asynchronous version for future real API integration
 */
export async function runAgentPromptAsync(request: AdapterExecutionRequest): Promise<AdapterExecutionResult> {
  const adapter = selectBestAdapter(request);
  
  // Placeholder for real API calls (OpenAI/Gemini/Claude)
  return adapter.executeMock(request);
}
