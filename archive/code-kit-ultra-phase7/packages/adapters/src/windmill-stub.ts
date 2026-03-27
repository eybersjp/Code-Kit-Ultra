import { BaseAdapter } from "./base";
export class WindmillStubAdapter extends BaseAdapter {
  constructor() { super("windmill-stub", "stub", ["automation", "deployment"]); }
  async execute(payload: unknown) {
    return { ok: true, output: { adapter: this.name, executed: false, payload, note: "Structured stub execution." }, classification: "simulated" as const };
  }
}