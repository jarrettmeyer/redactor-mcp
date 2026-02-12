import type { PiiEntity } from "@aws-sdk/client-comprehend";
import { detectLanguage } from "./comprehend";

export const MAX_TEXT_BYTES = 100_000;

// Map RFC 5646 language codes to human-readable names
// Covers all languages AWS Comprehend can detect
const LANGUAGE_NAMES: Record<string, string> = {
  af: "Afrikaans",
  sq: "Albanian",
  am: "Amharic",
  ar: "Arabic",
  hy: "Armenian",
  az: "Azerbaijani",
  bn: "Bengali",
  bs: "Bosnian",
  bg: "Bulgarian",
  ca: "Catalan",
  "zh": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  hr: "Croatian",
  cs: "Czech",
  da: "Danish",
  nl: "Dutch",
  en: "English",
  et: "Estonian",
  fi: "Finnish",
  fr: "French",
  "fr-CA": "French (Canadian)",
  ka: "Georgian",
  de: "German",
  el: "Greek",
  gu: "Gujarati",
  ht: "Haitian Creole",
  ha: "Hausa",
  he: "Hebrew",
  hi: "Hindi",
  hu: "Hungarian",
  is: "Icelandic",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  kn: "Kannada",
  kk: "Kazakh",
  ko: "Korean",
  lv: "Latvian",
  lt: "Lithuanian",
  mk: "Macedonian",
  ms: "Malay",
  ml: "Malayalam",
  mt: "Maltese",
  mn: "Mongolian",
  no: "Norwegian",
  ps: "Pashto",
  fa: "Persian",
  pl: "Polish",
  pt: "Portuguese",
  "pt-PT": "Portuguese (Portugal)",
  pa: "Punjabi",
  ro: "Romanian",
  ru: "Russian",
  sr: "Serbian",
  si: "Sinhala",
  sk: "Slovak",
  sl: "Slovenian",
  so: "Somali",
  es: "Spanish",
  sw: "Swahili",
  sv: "Swedish",
  tl: "Tagalog",
  ta: "Tamil",
  te: "Telugu",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  uz: "Uzbek",
  vi: "Vietnamese",
  cy: "Welsh",
  yo: "Yoruba",
};

// AWS Comprehend PII detection supported languages
// Currently English and Spanish according to AWS documentation
const PII_SUPPORTED_LANGUAGES = new Set(["en", "es"]);

/**
 * Get human-readable language name from RFC 5646 language code.
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || `Unknown (${code})`;
}

/**
 * Check if language is supported for PII detection operations.
 */
export function isPiiLanguageSupported(languageCode: string): boolean {
  return PII_SUPPORTED_LANGUAGES.has(languageCode);
}

/**
 * Auto-detect language and validate for PII operations.
 * Returns the detected language code if valid for PII detection.
 * Throws error if detected language is not supported.
 */
export async function detectAndValidateLanguage(text: string): Promise<string> {
  const languages = await detectLanguage(text);

  if (!languages || languages.length === 0) {
    throw new Error(
      "Unable to detect language. Please specify language_code explicitly (e.g., 'en' for English or 'es' for Spanish)."
    );
  }

  const topLanguage = languages[0]!; // Safe: We checked length > 0 above
  const code = topLanguage.LanguageCode || "unknown";
  const score = topLanguage.Score || 0;

  if (!isPiiLanguageSupported(code)) {
    const languageName = getLanguageName(code);
    throw new Error(
      `PII detection only supports English and Spanish. Detected language: ${languageName} (${code}) ` +
        `with ${(score * 100).toFixed(1)}% confidence. Please provide English or Spanish text.`
    );
  }

  return code;
}

/**
 * Check if text size exceeds AWS Comprehend's 100KB limit for synchronous API.
 * @throws {Error} If text exceeds size limit
 *
 * TODO: Support chunking large texts by splitting on sentence/paragraph boundaries,
 * processing each chunk, and merging results with adjusted offsets.
 */
export function checkTextSize(text: string): void {
  const encoder = new TextEncoder();
  const sizeBytes = encoder.encode(text).length;

  if (sizeBytes > MAX_TEXT_BYTES) {
    throw new Error(
      `Text is ${sizeBytes.toLocaleString()} bytes, which exceeds the 100KB limit for AWS Comprehend's synchronous API.`
    );
  }
}

/**
 * Filter PII entities by type and confidence threshold.
 */
export function filterEntities(
  entities: PiiEntity[],
  pii_types: string[] | undefined,
  confidence_threshold: number
): PiiEntity[] {
  let filtered = entities;

  // Filter by PII type if specified
  if (pii_types && pii_types.length > 0) {
    const typeSet = new Set(pii_types.map((t) => t.toUpperCase()));
    filtered = filtered.filter((e) => e.Type && typeSet.has(e.Type));
  }

  // Filter by confidence threshold
  filtered = filtered.filter((e) => (e.Score ?? 0.0) >= confidence_threshold);

  return filtered;
}
