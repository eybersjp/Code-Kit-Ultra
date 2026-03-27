export function handleVote(raw: string): string {
  const payload = JSON.parse(raw);
  return JSON.stringify(
    {
      ok: true,
      received: payload,
      note: "Use this handler as a pass-through or validation stub before wiring to live agent outputs.",
    },
    null,
    2,
  );
}
