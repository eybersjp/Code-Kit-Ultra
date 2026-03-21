import { BaseAdapter } from "./base";

export class N8nStubAdapter extends BaseAdapter {
  constructor() {
    super("n8n-stub", "stub", ["automation"]);
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