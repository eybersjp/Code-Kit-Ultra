export function redactSecrets(input: string): string {
  return input
    .replace(/(API_KEY=)([^\s]+)/g, "$1***REDACTED***")
    .replace(/(Bearer\s+)([^\s]+)/g, "$1***REDACTED***");
}