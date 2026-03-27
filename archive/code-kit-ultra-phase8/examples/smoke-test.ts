import fs from "node:fs";
import path from "node:path";

const envExample = path.resolve(".env.example");
const readme = path.resolve("README.md");
const bootstrap = path.resolve("scripts/bootstrap.sh");
const ci = path.resolve(".github/workflows/ci.yml");

if (!fs.existsSync(envExample)) throw new Error(".env.example missing");
if (!fs.existsSync(readme)) throw new Error("README.md missing");
if (!fs.existsSync(bootstrap)) throw new Error("bootstrap script missing");
if (!fs.existsSync(ci)) throw new Error("CI workflow missing");

console.log("Smoke test passed");