export interface MilestoneDashboard {
  identity: {
    milestoneName: string;
    version: string;
    tag: string;
    releaseDate: string;
    branch: string;
    commitHash: string;
    previousVersion?: string;
  };
  verification: {
    status: "PASS" | "FAIL" | "PARTIAL" | "NOT_STARTED";
    stats: {
      typecheck: "PASS" | "FAIL" | "PENDING";
      smokeTests: "PASS" | "FAIL" | "PARTIAL" | "PENDING";
      envValidation: "PASS" | "FAIL" | "PENDING";
    };
    notes?: string;
  };
  content: {
    summary: string;
    changelogHighlights: Array<{ type: string; title: string; count: number }>;
    releaseHighlights: string[];
    breakingChanges?: string[];
  };
  readiness: {
    checklist: Array<{ task: string; done: boolean }>;
    risks: string[];
    blockers: string[];
    rollbackReady: boolean;
    rollbackNotes: string;
  };
  metadata: {
    generatedAt: string;
    generatorVersion: string;
  };
}
