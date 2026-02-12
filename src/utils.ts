import type { PiiEntity } from "@aws-sdk/client-comprehend";

export const MAX_TEXT_BYTES = 100_000;

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
