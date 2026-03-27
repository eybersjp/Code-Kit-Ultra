import type { SlashCommand } from "./types";

export function parseSlashCommand(input: string): SlashCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/ck-")) return null;
  const body = trimmed.slice(4).trim();
  if (!body) return null;

  const parts = body.split(/\s+/);
  return {
    raw: input,
    name: parts[0].toLowerCase(),
    args: parts.slice(1),
    text: parts.slice(1).join(" "),
  };
}
