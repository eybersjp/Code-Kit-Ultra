import { mkdir, copyFile, access } from "fs/promises";
import { constants } from "fs";
import { resolve } from "path";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env");
const exampleEnvPath = resolve(root, ".env.example");

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("== Code Kit Ultra Bootstrap ==");

  if (!(await exists(envPath))) {
    await copyFile(exampleEnvPath, envPath);
    console.log("Created .env from .env.example");
  } else {
    console.log(".env already exists");
  }

  const dirs = [
    ".codekit/memory",
    ".codekit/audit",
    "artifacts/test-runs",
    "dist",
    "release",
  ];

  await Promise.all(dirs.map((dir) => mkdir(resolve(root, dir), { recursive: true })));
  console.log("Initialized local runtime directories");
  console.log("Bootstrap complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});