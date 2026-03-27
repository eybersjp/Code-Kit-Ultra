import type { AgentProfile } from "../../shared/src/phase6-types";

export const DEFAULT_AGENT_PROFILES: Record<AgentProfile["agent"], AgentProfile> = {
  planner: {
    agent: "planner",
    baseWeight: 1.0,
    reliability: 0.78,
    totalRuns: 0,
    successes: 0,
    failures: 0,
    lastUpdatedAt: new Date(0).toISOString(),
  },
  builder: {
    agent: "builder",
    baseWeight: 1.0,
    reliability: 0.80,
    totalRuns: 0,
    successes: 0,
    failures: 0,
    lastUpdatedAt: new Date(0).toISOString(),
  },
  reviewer: {
    agent: "reviewer",
    baseWeight: 1.1,
    reliability: 0.82,
    totalRuns: 0,
    successes: 0,
    failures: 0,
    lastUpdatedAt: new Date(0).toISOString(),
  },
  security: {
    agent: "security",
    baseWeight: 1.2,
    reliability: 0.88,
    totalRuns: 0,
    successes: 0,
    failures: 0,
    lastUpdatedAt: new Date(0).toISOString(),
  },
};
