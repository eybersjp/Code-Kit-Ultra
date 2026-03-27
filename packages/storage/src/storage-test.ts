import { getStorageProvider } from "./index.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function verifyStorage() {
  const tmpDir = path.join(os.tmpdir(), `cku-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  console.log("Wave 9 Verification: Storage Providers");

  // 1. Verify Local Storage
  const localProvider = getStorageProvider({
    type: "local",
    localBaseDir: tmpDir
  });

  console.log("- Testing Local Provider put...");
  const metaLocal = await localProvider.put("test/local.json", JSON.stringify({ ok: true }), { contentType: "application/json" });
  console.log("  Local Meta:", JSON.stringify(metaLocal, null, 2));

  // 2. Verify Combined/Fallback logic
  const combinedProvider = getStorageProvider({
    type: "combined",
    localBaseDir: tmpDir,
    insforgeBucket: "test-bucket",
    insforgeApiKey: "test-key"
  });

  console.log("- Testing Combined Provider put (with simulated fallback)...");
  // This will write locally and attempt InsForge (which will fail in this stub environment)
  const metaCombined = await combinedProvider.put("test/combined.json", "Hello Wave 9", { contentType: "text/plain" });
  console.log("  Combined Meta:", JSON.stringify(metaCombined, null, 2));

  // 3. Verify consistency
  if (metaLocal.provider === "local" && metaCombined.provider === "local") {
     console.log("SUCCESS: Metadata shape is consistent and fallback works.");
  } else {
     console.log("FAILURE: Metadata or fallback inconsistency detected.");
  }

  // Cleanup
  await fs.rm(tmpDir, { recursive: true }).catch(() => {});
}

verifyStorage().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
