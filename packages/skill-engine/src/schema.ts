import { z } from "zod";

export const GeneratedSkillManifestSchema = z.object({
  skillId: z.string().min(3),
  version: z.string(),
  status: z.enum(["generated", "reviewed", "approved", "installed", "rolled-back"]),
  createdAt: z.string(),
  promotedAt: z.string().optional(),
  rolledBackAt: z.string().optional(),
  review: z.object({
    reviewer: z.string().optional(),
    notes: z.string().optional(),
    approved: z.boolean().optional(),
    reviewedAt: z.string().optional()
  }).optional(),
  auditTrail: z.array(z.object({
    action: z.string(),
    by: z.string().optional(),
    at: z.string(),
    notes: z.string().optional()
  }))
});

export type GeneratedSkillManifestInput = z.infer<typeof GeneratedSkillManifestSchema>;
