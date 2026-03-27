/**
 * Unified Release Control Center Manifest/Data Model
 */
export interface ReleaseManifest {
  identity: {
    milestoneName: string;
    releaseName: string;
    version: string;
    tag: string;
    branch: string;
    commitHash: string;
    previousVersion: string;
    previousTag: string;
    releaseDate: string;
  };
  content: {
    summary: string;
    changelogReference: string;
    releaseNotesReference: string;
    classifiedChanges: Array<{
      type: string;
      title: string;
      count: number;
    }>;
  };
  verification: {
    dashboardReference?: string;
    readinessReportReference?: string;
    status: "PASS" | "FAIL" | "PARTIAL" | "PENDING";
    stats: {
      typecheck: "PASS" | "FAIL" | "PENDING";
      unitTests: "PASS" | "FAIL" | "PENDING";
      build: "PASS" | "FAIL" | "PENDING";
      lint: "PASS" | "FAIL" | "PENDING";
    };
    verificationSummary: string;
  };
  governance: {
    decision: "GO" | "GO WITH RISKS" | "NO-GO";
    score: number; // 0-100
    blockers: string[];
    risks: string[];
    rollbackNotes: string;
    artifactChecklist: Array<{
      task: string;
      done: boolean;
      notes?: string;
    }>;
  };
  metadata: {
    generatedAt: string;
    generatorVersion: string;
  };
}
