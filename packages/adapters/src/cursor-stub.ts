import { BaseAdapter } from "./base";

export class CursorStubAdapter extends BaseAdapter {
  constructor() {
    super("cursor-stub", "stub", ["planning", "implementation"]);
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