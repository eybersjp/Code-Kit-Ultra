import type { CKMode, RunPhase } from "./types";

export interface ModeConfig {
  name: CKMode;
  label: string;
  autoPhases: RunPhase[];
  manualPhases: RunPhase[];
  requireApprovalFor: string[];
  primaryFlow: string[];
  exposeAdvancedCommands: boolean;
}

export const MODE_CONFIGS: Record<CKMode, ModeConfig> = {
  turbo: {
    name: "turbo",
    label: "Turbo",
    autoPhases: ["clarify", "plan", "skills", "architecture", "build", "review", "qa", "security", "report"],
    manualPhases: ["deploy"],
    requireApprovalFor: ["deploy"],
    primaryFlow: ["/ck-init", "/ck-run", "/ck-report"],
    exposeAdvancedCommands: false,
  },
  builder: {
    name: "builder",
    label: "Builder",
    autoPhases: ["clarify", "skills", "build", "review", "qa", "security", "report"],
    manualPhases: ["plan", "architecture", "deploy"],
    requireApprovalFor: ["plan", "architecture", "deploy"],
    primaryFlow: ["/ck-init", "/ck-plan", "/ck-run", "/ck-report"],
    exposeAdvancedCommands: false,
  },
  pro: {
    name: "pro",
    label: "Pro",
    autoPhases: ["report"],
    manualPhases: ["clarify", "plan", "skills", "architecture", "build", "review", "qa", "security", "deploy"],
    requireApprovalFor: ["plan", "architecture", "build", "deploy"],
    primaryFlow: ["/ck-init", "/ck-clarify", "/ck-plan", "/ck-skills", "/ck-gates", "/ck-approve", "/ck-run", "/ck-report"],
    exposeAdvancedCommands: true,
  },
  expert: {
    name: "expert",
    label: "Expert",
    autoPhases: [],
    manualPhases: ["clarify", "plan", "skills", "architecture", "build", "review", "qa", "security", "deploy", "report"],
    requireApprovalFor: ["plan", "architecture", "build", "review", "qa", "security", "deploy"],
    primaryFlow: ["/ck-init", "/ck-context", "/ck-clarify", "/ck-plan", "/ck-skills", "/ck-gates", "/ck-approve", "/ck-build", "/ck-review", "/ck-qa", "/ck-deploy", "/ck-report"],
    exposeAdvancedCommands: true,
  },
};
