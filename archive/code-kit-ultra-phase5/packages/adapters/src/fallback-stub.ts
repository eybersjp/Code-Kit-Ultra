import { BaseAdapter } from "./base";

export class FallbackStubAdapter extends BaseAdapter {
  constructor() {
    super("fallback-stub", "stub", ["general", "planning", "implementation", "skills", "automation", "deployment"]);
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