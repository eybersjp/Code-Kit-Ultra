/**
 * Centralized Structured Logger for SaaS Observability.
 * Includes correlation and tenant context.
 */

export interface LogContext {
  correlationId?: string;
  actorId?: string;
  orgId?: string;
  projectId?: string;
  runId?: string;
  error?: string;
}

export class Logger {
  private static drainUrl = process.env.LOG_DRAIN_URL;

  static info(message: string, context: LogContext = {}) {
    this.log("INFO", message, context);
  }

  static warn(message: string, context: LogContext = {}) {
    this.log("WARN", message, context);
  }

  static error(message: string, context: LogContext = {}, error?: any) {
    this.log("ERROR", message, { ...context, error: error?.message || error });
  }

  private static log(level: string, message: string, context: LogContext) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      env: process.env.NODE_ENV || "development"
    };

    // Console output for local/container logs
    console.log(JSON.stringify(payload));

    // Async drain to remote platform if configured
    if (this.drainUrl) {
      this.drain(payload);
    }
  }

  private static async drain(payload: any) {
    try {
      await fetch(this.drainUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Don't crash on logging failure, but log to stderr
      process.stderr.write(`Log drain failure: ${err}\n`);
    }
  }
}
