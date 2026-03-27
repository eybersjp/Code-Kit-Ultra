import { z } from "zod";

export const userInputSchema = z.object({
  idea: z.string().min(3),
  mode: z.enum(["safe", "balanced", "god"]),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  priority: z.enum(["speed", "quality", "low-cost", "best-ux", "scalability", "business-ready"]).optional(),
  deliverable: z.enum(["app", "automation", "website", "mvp", "internal-tool", "agent-system", "docs", "business-package"]).optional(),
  allowCommandExecution: z.boolean().optional()
});

export type ValidatedUserInput = z.infer<typeof userInputSchema>;
