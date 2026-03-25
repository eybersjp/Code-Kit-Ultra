import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

const APPROVAL_DIR = path.resolve(".ck/approvals");

export interface GateApproval {
  id: string;
  runId: string;
  title: string;
  gate: string;
  riskLevel: string;
  reason: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

export function createGateApproval(params: Omit<GateApproval, "id" | "createdAt" | "status">): string {
  if (!fs.existsSync(APPROVAL_DIR)) fs.mkdirSync(APPROVAL_DIR, { recursive: true });
  
  const id = `appr-${Date.now()}`;
  const approval: GateApproval = {
    ...params,
    id,
    createdAt: new Date().toISOString(),
    status: "pending"
  };

  fs.writeFileSync(path.join(APPROVAL_DIR, `${id}.json`), JSON.stringify(approval, null, 2));
  return id;
}

export async function waitForApproval(approvalId: string, timeoutMs: number = 300000): Promise<boolean> {
  const approvedSignal = path.join(APPROVAL_DIR, `${approvalId}.approved`);
  const rejectedSignal = path.join(APPROVAL_DIR, `${approvalId}.rejected`);
  
  const start = Date.now();
  console.log(chalk.yellow(`\n[GATE] Waiting for human approval: ${approvalId}`));
  console.log(chalk.dim(`Check the IDE Control Plane or manually create ${approvedSignal}\n`));

  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(approvedSignal)) {
      console.log(chalk.green(`[GATE] Approved signal received.`));
      return true;
    }
    if (fs.existsSync(rejectedSignal)) {
      console.log(chalk.red(`[GATE] Rejected signal received.`));
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(chalk.red(`[GATE] Approval timed out after ${timeoutMs/1000}s.`));
  return false;
}
