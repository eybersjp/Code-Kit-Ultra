import type { BuilderActionBatch } from "../../agents/src/action-types";
import { writeDiffPreview } from "./diff-preview";
import { createBatchProvenance, writeBatchProvenance } from "../../security/src/batch-provenance";
import { signBatch, writeSignedBatch } from "../../security/src/batch-signing";

export function prepareTrustedBatch(params: {
  workspaceRoot: string;
  batch: BuilderActionBatch;
  sourcePhase: string;
  sourceArtifact?: string;
  actor?: string;
  signingSecret: string;
}) {
  const diff = writeDiffPreview(params.workspaceRoot, params.batch);
  const provenance = createBatchProvenance({
    batch: params.batch,
    sourcePhase: params.sourcePhase,
    sourceArtifact: params.sourceArtifact,
    actor: params.actor,
  });
  const provenancePath = writeBatchProvenance(params.workspaceRoot, provenance);
  const envelope = signBatch({
    batch: params.batch,
    provenance,
    secret: params.signingSecret,
  });
  const signaturePath = writeSignedBatch(params.workspaceRoot, envelope);

  return {
    diffArtifactPath: diff.artifactPath,
    provenancePath,
    signaturePath,
    envelope,
  };
}
