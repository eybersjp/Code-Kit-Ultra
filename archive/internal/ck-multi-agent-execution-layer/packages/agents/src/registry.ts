import type { RunPhase } from "../../core/src/types";
import type { AgentRole } from "./types";

export const PHASE_AGENT_MAP: Record<RunPhase, AgentRole> = {
  init: "ceo",
  clarify: "clarifier",
  plan: "planner",
  skills: "skillsmith",
  architecture: "architect",
  build: "builder",
  review: "reviewer",
  qa: "qa",
  security: "security",
  deploy: "deployer",
  report: "reporter",
  done: "ceo",
};

export const AGENT_DESCRIPTIONS: Record<AgentRole, string> = {
  ceo: "High-level orchestrator responsible for sequencing and decision framing.",
  clarifier: "Removes ambiguity, identifies constraints, and sharpens the problem statement.",
  planner: "Converts the refined idea into milestones, tasks, dependencies, and acceptance criteria.",
  skillsmith: "Matches or proposes skills, tools, adapters, and execution primitives.",
  architect: "Defines system architecture, boundaries, data model direction, and interfaces.",
  builder: "Produces the implementation artifact plan or code output.",
  reviewer: "Inspects implementation quality, maintainability, and consistency.",
  qa: "Creates or evaluates tests, edge cases, and failure scenarios.",
  security: "Checks auth, secrets, permissions, abuse surfaces, and deployment risks.",
  deployer: "Packages deployment requirements, release notes, and rollout steps.",
  reporter: "Produces the final execution report and summary.",
};
