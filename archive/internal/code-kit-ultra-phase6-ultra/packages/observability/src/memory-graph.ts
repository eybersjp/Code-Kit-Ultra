import fs from "node:fs";
import path from "node:path";
import type { MemoryGraphEvent } from "../../shared/src/phase6-types";

const graphFile = path.resolve(".ck/learning/memory/graph-events.jsonl");

export function appendMemoryGraphEvent(event: MemoryGraphEvent): void {
  fs.mkdirSync(path.dirname(graphFile), { recursive: true });
  fs.appendFileSync(graphFile, `${JSON.stringify(event)}\n`, "utf-8");
}
