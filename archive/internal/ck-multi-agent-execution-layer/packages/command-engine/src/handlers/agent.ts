import { AGENT_DESCRIPTIONS } from "../../../agents/src/registry";
import type { CommandContext, CommandResult, SlashCommand } from "../types";

export async function handleAgent(command: SlashCommand, _: CommandContext): Promise<CommandResult> {
  const name = command.args[0];
  if (!name) {
    return {
      ok: true,
      message: "Available agents",
      data: AGENT_DESCRIPTIONS,
    };
  }

  const description = (AGENT_DESCRIPTIONS as Record<string, string>)[name];
  if (!description) {
    return { ok: false, message: `Unknown agent: ${name}` };
  }

  return {
    ok: true,
    message: `Agent loaded: ${name}`,
    data: {
      agent: name,
      description,
    },
  };
}
