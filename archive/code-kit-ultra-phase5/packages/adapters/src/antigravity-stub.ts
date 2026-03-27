import { BaseAdapter } from "./base";

export class AntigravityStubAdapter extends BaseAdapter {
  constructor() {
    super("antigravity-stub", "stub", ["planning", "skills"]);
  }

  async execute(payload: unknown) {
    return {
      ok: true,
      output: {
        adapter: this.name,
        mode: "stub",
        executed: false,
        payload,
        note: "Structured stub execution."
      },
      classification: "simulated" as const
    };
  }
}