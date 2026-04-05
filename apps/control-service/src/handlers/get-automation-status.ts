import type { Request, Response } from "express";
import { getAutomationOrchestrator } from "../services/automation-orchestrator";
import {
  extractAuthContext,
  sendForbidden,
  sendInternalError,
  validateTenantAccess,
} from "../lib/handler-utils";
import { AuditEventBuilder, AuditActions } from "../lib/audit-builder";

export async function getAutomationStatusHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const orchestrator = getAutomationOrchestrator();

    // Log access in audit trail
    await new AuditEventBuilder(AuditActions.AUDIT_VIEW, context)
      .withDetails({ action: "get_automation_status" })
      .emit();

    const status = orchestrator.getStatus();
    res.json(status);
  } catch (err: any) {
    return sendInternalError(res, err, "get_automation_status");
  }
}

export async function setAutomationModeHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const { mode } = req.body;

    // Validate mode
    if (!["safe", "balanced", "aggressive"].includes(mode)) {
      return res.status(400).json({
        error: "invalid_mode",
        message: "Mode must be one of: safe, balanced, aggressive",
      });
    }

    // Get orchestrator and set mode
    const orchestrator = getAutomationOrchestrator();
    orchestrator.setMode(mode);

    // Log change in audit trail
    await new AuditEventBuilder(AuditActions.SETTINGS_UPDATED, context)
      .withDetails({ setting: "automation_mode", value: mode })
      .emit();

    res.json({ mode, status: "updated" });
  } catch (err: any) {
    return sendInternalError(res, err, "set_automation_mode");
  }
}

export async function getAutoApprovalRulesHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const orchestrator = getAutomationOrchestrator();

    // Log access
    await new AuditEventBuilder(AuditActions.AUDIT_VIEW, context)
      .withDetails({ action: "get_auto_approval_rules" })
      .emit();

    const engine = orchestrator.getAutoApprovalEngine();
    const rules = engine.getAllRules();

    res.json({ rules, count: rules.length });
  } catch (err: any) {
    return sendInternalError(res, err, "get_auto_approval_rules");
  }
}

export async function getAlertAcknowledgmentRulesHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const orchestrator = getAutomationOrchestrator();

    // Log access
    await new AuditEventBuilder(AuditActions.AUDIT_VIEW, context)
      .withDetails({ action: "get_alert_ack_rules" })
      .emit();

    const service = orchestrator.getAlertAcknowledgmentService();
    const rules = service.getAllRules();

    res.json({ rules, count: rules.length });
  } catch (err: any) {
    return sendInternalError(res, err, "get_alert_ack_rules");
  }
}

export async function getHealingStrategiesHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const orchestrator = getAutomationOrchestrator();

    // Log access
    await new AuditEventBuilder(AuditActions.AUDIT_VIEW, context)
      .withDetails({ action: "get_healing_strategies" })
      .emit();

    const engine = orchestrator.getHealingEngine();
    const strategies = engine.getAllStrategies();

    res.json({ strategies, count: strategies.length });
  } catch (err: any) {
    return sendInternalError(res, err, "get_healing_strategies");
  }
}

export async function getRollbackStrategiesHandler(req: Request, res: Response) {
  try {
    const context = extractAuthContext(req);
    const orchestrator = getAutomationOrchestrator();

    // Log access
    await new AuditEventBuilder(AuditActions.AUDIT_VIEW, context)
      .withDetails({ action: "get_rollback_strategies" })
      .emit();

    const service = orchestrator.getRollbackService();
    const strategies = service.getAllStrategies();

    res.json({ strategies, count: strategies.length });
  } catch (err: any) {
    return sendInternalError(res, err, "get_rollback_strategies");
  }
}
