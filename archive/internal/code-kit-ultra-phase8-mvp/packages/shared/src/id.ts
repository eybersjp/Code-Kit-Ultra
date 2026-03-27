export function createRunId(now = new Date()): string {
  return now.toISOString().replace(/[.:]/g, "-");
}
