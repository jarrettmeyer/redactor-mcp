import { z } from "zod";

// All valid PII entity types supported by AWS Comprehend
export const PII_ENTITY_TYPES = [
  "ADDRESS",
  "AWS_ACCESS_KEY",
  "AWS_SECRET_KEY",
  "BANK_ACCOUNT_NUMBER",
  "BANK_ROUTING",
  "CREDIT_DEBIT_CVV",
  "CREDIT_DEBIT_EXPIRY",
  "CREDIT_DEBIT_NUMBER",
  "DATE_OF_BIRTH",
  "DRIVER_ID",
  "EMAIL",
  "INTERNATIONAL_BANK_ACCOUNT_NUMBER",
  "IP_ADDRESS",
  "LICENSE_PLATE",
  "MAC_ADDRESS",
  "NAME",
  "PASSPORT_NUMBER",
  "PASSWORD",
  "PHONE",
  "PIN",
  "SSN",
  "SWIFT_CODE",
  "URL",
  "USERNAME",
  "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER",
] as const;

export type PiiEntityType = (typeof PII_ENTITY_TYPES)[number];

// Base schema shared by all PII tools
const BasePiiSchema = z.object({
  text: z
    .string()
    .describe("The text content to analyze or redact. Must be under 100KB (AWS Comprehend sync API limit)."),
  pii_types: z
    .array(z.enum(PII_ENTITY_TYPES))
    .optional()
    .describe(
      "Specific PII entity types to target, e.g. ['NAME', 'EMAIL']. Omit to process all types. Valid types: NAME, DATE_OF_BIRTH, ADDRESS, PHONE, EMAIL, SSN, BANK_ACCOUNT_NUMBER, CREDIT_DEBIT_NUMBER, PASSPORT_NUMBER, DRIVER_ID, IP_ADDRESS, URL, USERNAME, PASSWORD, AWS_ACCESS_KEY, AWS_SECRET_KEY."
    ),
  confidence_threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.0)
    .describe(
      "Minimum confidence score (0.0-1.0) to include a match. Default 0.0 includes everything. Use 0.5+ for fewer false positives, 0.8+ for only high-confidence matches."
    ),
  language: z
    .string()
    .default("en")
    .describe("Language code for the text (e.g. 'en', 'es', 'fr'). Defaults to English."),
});

export const DetectPiiParamsSchema = BasePiiSchema;
export const RedactPiiParamsSchema = BasePiiSchema;
export const SummarizePiiParamsSchema = BasePiiSchema;

// Inferred TypeScript types from Zod schemas
export type DetectPiiParams = z.infer<typeof DetectPiiParamsSchema>;
export type RedactPiiParams = z.infer<typeof RedactPiiParamsSchema>;
export type SummarizePiiParams = z.infer<typeof SummarizePiiParamsSchema>;

// Tool output interface
export interface DetectedPiiEntity {
  type: string;
  text: string;
  score: number;
  begin_offset: number;
  end_offset: number;
}
