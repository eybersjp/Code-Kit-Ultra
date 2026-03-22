import fs from "node:fs";
import path from "node:path";
import { runVerticalSlice } from "../packages/orchestrator/src";

type SmokeCase = {
  label: string;
  idea: string;
  mode?: "safe" | "balanced" | "god";
  dryRun?: boolean;
};

type PersistedReport = {
  summary?: string;
  intakeResult?: unknown;
  plan?: unknown[];
  selectedSkills?: unknown[];
  gates?: unknown[];
  overallGateStatus?: string;
};

const smokeCases: SmokeCase[] = [
  {
    label: "web-app",
    idea: "Build a CRM for solar installers",
    mode: "balanced",
    dryRun: true,
  },
  {
    label: "website",
    idea: "Create a landing page for a solar company",
    mode: "balanced",
    dryRun: true,
  },
  {
    label: "automation",
    idea: "Automate invoice reminders for overdue clients",
    mode: "balanced",
    dryRun: true,
  },
  {
    label: "agent-system",
    idea: "Build an AI agent that triages support tickets",
    mode: "balanced",
    dryRun: true,
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFileExists(filePath: string, label: string): void {
  assert(fs.existsSync(filePath), `[${label}] Expected file to exist: ${filePath}`);
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function assertNonEmptyArray(value: unknown, message: string): void {
  assert(Array.isArray(value), message);
  assert(value.length > 0, message);
}

function printSection(title: string): void {
  console.log(`\n=== ${title} ===`);
}

async function runCase(testCase: SmokeCase): Promise<void> {
  printSection(`Smoke case: ${testCase.label}`);
  console.log(`Idea: ${testCase.idea}`);

  const result = runVerticalSlice({
    idea: testCase.idea,
    mode: testCase.mode ?? "balanced",
    dryRun: testCase.dryRun ?? true,
  });

  const { artifactDirectory, artifactReportPath, memoryPath, report } = result;

  assert(typeof artifactDirectory === "string" && artifactDirectory.length > 0, `[${testCase.label}] Missing artifactDirectory`);
  assert(typeof artifactReportPath === "string" && artifactReportPath.length > 0, `[${testCase.label}] Missing artifactReportPath`);
  assert(typeof memoryPath === "string" && memoryPath.length > 0, `[${testCase.label}] Missing memoryPath`);

  assertFileExists(artifactReportPath, testCase.label);
  assertFileExists(memoryPath, testCase.label);
  assert(path.dirname(artifactReportPath) === artifactDirectory, `[${testCase.label}] Artifact report path is not inside artifact directory`);

  assert(report && typeof report === "object", `[${testCase.label}] Missing report payload`);
  assert(typeof report.summary === "string" && report.summary.length > 0, `[${testCase.label}] Missing report summary`);
  assert(report.intakeResult, `[${testCase.label}] Missing intakeResult`);
  assertNonEmptyArray(report.plan, `[${testCase.label}] Expected non-empty plan`);
  assertNonEmptyArray(report.selectedSkills, `[${testCase.label}] Expected non-empty selectedSkills`);
  assertNonEmptyArray(report.gates, `[${testCase.label}] Expected non-empty gates`);
  assert(
    report.overallGateStatus === "pass" ||
      report.overallGateStatus === "needs-review" ||
      report.overallGateStatus === "blocked",
    `[${testCase.label}] Invalid overallGateStatus`,
  );

  const persistedReport = readJson<PersistedReport>(artifactReportPath);
  assert(typeof persistedReport.summary === "string" && persistedReport.summary.length > 0, `[${testCase.label}] Persisted report missing summary`);
  assertNonEmptyArray(persistedReport.plan, `[${testCase.label}] Persisted report missing plan`);
  assertNonEmptyArray(persistedReport.selectedSkills, `[${testCase.label}] Persisted report missing selectedSkills`);
  assertNonEmptyArray(persistedReport.gates, `[${testCase.label}] Persisted report missing gates`);

  const memory = readJson<Record<string, unknown>>(memoryPath);
  assert(Array.isArray(memory.runs), `[${testCase.label}] Memory file missing runs array`);
  assert((memory.runs as unknown[]).length > 0, `[${testCase.label}] Memory runs array is empty`);

  console.log(`Gate status: ${report.overallGateStatus}`);
  console.log(`Plan tasks: ${(report.plan ?? []).length}`);
  console.log(`Selected skills: ${(report.selectedSkills ?? []).length}`);
  console.log(`Artifact: ${artifactReportPath}`);
}

async function main(): Promise<void> {
  console.log("Starting Code-Kit-Ultra smoke test suite...");

  for (const testCase of smokeCases) {
    await runCase(testCase);
  }

  printSection("Smoke test result");
  console.log(`Completed ${smokeCases.length} smoke cases successfully.`);
}

main().catch((error: unknown) => {
  console.error("Smoke test failed.");
  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error(error);
  }
  process.exit(1);
});