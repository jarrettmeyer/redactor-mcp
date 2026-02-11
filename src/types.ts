import type {
  PiiEntity,
  PiiEntityType,
  DominantLanguage,
} from "@aws-sdk/client-comprehend";
import { z } from "zod";

// Zod schemas for MCP tool parameter validation
export const DetectLanguageParamsSchema = z.object({
  text: z.string(),
});

export const DetectPiiParamsSchema = z.object({
  text: z.string(),
  pii_types: z.array(z.string()).optional(),
  confidence_threshold: z.number().min(0).max(1).default(0.0),
  language_code: z.string().optional(),
});

export const RedactPiiParamsSchema = z.object({
  text: z.string(),
  pii_types: z.array(z.string()).optional(),
  confidence_threshold: z.number().min(0).max(1).default(0.0),
  language_code: z.string().optional(),
});

// Inferred TypeScript types from Zod schemas
export type DetectLanguageParams = z.infer<typeof DetectLanguageParamsSchema>;
export type DetectPiiParams = z.infer<typeof DetectPiiParamsSchema>;
export type RedactPiiParams = z.infer<typeof RedactPiiParamsSchema>;

// Tool output interfaces
export interface DetectedLanguage {
  language_code: string;
  language_name: string;
  score: number;
}

export interface DetectedPiiEntity {
  type: string;
  text: string;
  score: number;
  begin_offset: number;
  end_offset: number;
}

// Re-export AWS SDK types for convenience
export type { PiiEntity, PiiEntityType, DominantLanguage };
