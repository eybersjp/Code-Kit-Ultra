# Manual Smoke Test

## 1. Diff Preview
Run `/ck-diff` with `examples/trusted-batch.json`.
Confirm:
- `.ck/artifacts/run_trust1234/build-diff-preview.md` exists
- markdown shows line-level file diffs

## 2. Provenance + Signing
Use `prepareTrustedBatch()` with:
- workspaceRoot = your repo root
- signingSecret = CK_SIGNING_SECRET

Confirm:
- `.ck/provenance/run_trust1234/build-provenance.json`
- `.ck/signatures/run_trust1234/build-signed-batch.json`

## 3. Verification
Set `CK_SIGNING_SECRET`.
Run `/ck-verify <signed envelope JSON>`.
Confirm valid signature.

## 4. Backups
Before overwriting a file, call `backupFile()`.
Confirm:
- `.ck/backups/run_trust1234/.../*.bak`
- `.ck/backups/run_trust1234/build-backup-manifest.json`

## 5. Restore
Run `restoreFromManifest(workspaceRoot, "run_trust1234", "build")`.
Confirm:
- overwritten files restored
- newly created files removed where manifest indicates they did not exist before
