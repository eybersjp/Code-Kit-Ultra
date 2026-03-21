import { BaseAdapter } from "./base";
export class WindsurfStubAdapter extends BaseAdapter {
  constructor() { super("windsurf-stub", "stub", ["implementation"]); }
  async execute(payload: unknown) {
    return { ok: true, output: { adapter: this.name, executed: false, payload, note: "Structured stub execution." }, classification: "simulated" as const };
  }
}