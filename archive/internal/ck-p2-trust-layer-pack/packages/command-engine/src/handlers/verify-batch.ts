import type { CommandContext, CommandResult } from "../../../core/src/types";
import type { SignedBatchEnvelope } from "../../../security/src/batch-signing";
import { verifySignedBatch } from "../../../security/src/batch-signing";

export async function handleVerifyBatch(command: any, context: CommandContext): Promise<CommandResult> {
  void context;

  let envelope: SignedBatchEnvelope;
  try {
    envelope = JSON.parse(command.text);
  } catch {
    return { ok: false, message: "Usage: /ck-verify <JSON signed batch envelope>" };
  }

  const secret = process.env.CK_SIGNING_SECRET;
  if (!secret) {
    return { ok: false, message: "CK_SIGNING_SECRET is required for /ck-verify." };
  }

  const result = verifySignedBatch(secret, envelope);

  return {
    ok: result.valid,
    message: result.reason,
    data: result,
  };
}
