export function isoNow(): string {
  return new Date().toISOString();
}

export function slugTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function round(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
