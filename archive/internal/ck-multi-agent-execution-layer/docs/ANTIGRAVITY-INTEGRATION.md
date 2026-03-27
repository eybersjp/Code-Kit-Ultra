# Antigravity Integration Notes

## What to replace
Replace `runAgentPrompt()` with your Antigravity execution adapter.

## Expected contract
Input:
- agent role
- run id
- mode
- phase
- prior outputs
- run context

Output:
- summary
- payload
- recommendations

## Suggested adapter shape
```ts
export async function runAgentPrompt(agent, context) {
  const response = await antigravity.chat({
    system: SYSTEM_PROMPTS[agent],
    user: JSON.stringify(context),
  });

  return {
    agent,
    phase: context.phase,
    summary: response.summary,
    payload: response.payload,
    recommendations: response.recommendations ?? [],
  };
}
```
