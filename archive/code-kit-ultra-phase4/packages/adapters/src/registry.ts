import type { PlatformAdapter } from "../../shared/src/contracts";
import { stubAdapters } from "./mock-adapters";

export function listAdapters(): PlatformAdapter[] {
  return [...stubAdapters];
}

export function getAdapterByName(name: string): PlatformAdapter | undefined {
  return listAdapters().find((adapter) => adapter.name === name);
}
