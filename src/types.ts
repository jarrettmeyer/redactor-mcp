import { z } from "zod";

// Zod schemas for MCP tool parameter validation
export const DetectPiiParamsSchema = z.object({
  text: z.string(),
  pii_types: z.array(z.string()).optional(),
  confidence_threshold: z.number().min(0).max(1).default(0.0),
});

export const RedactPiiParamsSchema = z.object({
  text: z.string(),
  pii_types: z.array(z.string()).optional(),
  confidence_threshold: z.number().min(0).max(1).default(0.0),
});

// Inferred TypeScript types from Zod schemas
export type DetectPiiParams = z.infer<typeof DetectPiiParamsSchema>;
export type RedactPiiParams = z.infer<typeof RedactPiiParamsSchema>;

// Tool output interface
export interface DetectedPiiEntity {
  type: string;
  text: string;
  score: number;
  begin_offset: number;
  end_offset: number;
}

