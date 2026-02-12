import {
  ComprehendClient,
  DetectDominantLanguageCommand,
  DetectPiiEntitiesCommand,
  type DominantLanguage,
  type PiiEntity,
} from "@aws-sdk/client-comprehend";
import { CredentialsProviderError } from "@smithy/property-provider";

// Cached client singleton
let _client: ComprehendClient | null = null;

/**
 * Get AWS region from environment variables with fallback.
 */
function getRegion(): string {
  return (
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1"
  );
}

/**
 * Check if an error is credential-related (matches Python implementation logic).
 */
function isCredentialError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  // Check Smithy credential provider errors (AWS SDK v3)
  if (error instanceof CredentialsProviderError) {
    return true;
  }

  // Check error name for known credential error types
  if ("name" in error) {
    const credentialErrors = new Set([
      "ExpiredTokenException",
      "ExpiredToken",
      "InvalidToken",
      "InvalidClientTokenId",
      "UnrecognizedClientException",
      "CredentialsProviderError",
      "ProviderError",
    ]);
    if (credentialErrors.has(error.name as string)) {
      return true;
    }
  }

  // Check HTTP status codes (401/403 typically auth failures)
  if ("$metadata" in error) {
    const metadata = (error as any).$metadata;
    if (metadata?.httpStatusCode === 401 || metadata?.httpStatusCode === 403) {
      return true;
    }
  }

  // Check error message for SSO/credential keywords
  const errorStr = error.toString().toLowerCase();
  if (
    errorStr.includes("sso") ||
    errorStr.includes("credential") ||
    errorStr.includes("token")
  ) {
    return true;
  }

  return false;
}

/**
 * Get the cached Comprehend client or create a new one.
 * SDK v3 resolves credentials lazily on first API call, so construction never throws.
 */
function getClient(): ComprehendClient {
  if (_client === null) {
    _client = new ComprehendClient({ region: getRegion() });
  }
  return _client;
}

/**
 * Clear the cached client to force recreation on next access.
 */
function resetClient(): void {
  _client = null;
}

/**
 * Call AWS Comprehend DetectDominantLanguage and return the list of detected languages.
 * Automatically retries once with a fresh client if credential errors are detected.
 */
export async function detectLanguage(text: string): Promise<DominantLanguage[]> {
  const client = getClient();

  try {
    const command = new DetectDominantLanguageCommand({ Text: text });
    const response = await client.send(command);
    return response.Languages || [];
  } catch (error) {
    // If it's a credential error, reset the client and retry once
    if (isCredentialError(error)) {
      resetClient();

      // Retry with fresh client
      try {
        const freshClient = getClient();
        const command = new DetectDominantLanguageCommand({ Text: text });
        const response = await freshClient.send(command);
        return response.Languages || [];
      } catch (retryError) {
        throw retryError;
      }
    }

    // Not a credential error or retry failed - propagate exception
    throw error;
  }
}

/**
 * Call AWS Comprehend DetectPiiEntities and return the list of entities.
 * Automatically retries once with a fresh client if credential errors are detected.
 */
export async function detectPiiEntities(
  text: string,
  languageCode: string = "en"
): Promise<PiiEntity[]> {
  const client = getClient();
  const langCode = languageCode || "en";

  try {
    const command = new DetectPiiEntitiesCommand({
      Text: text,
      LanguageCode: langCode as "en",
    });
    const response = await client.send(command);
    return response.Entities || [];
  } catch (error) {
    // If it's a credential error, reset the client and retry once
    if (isCredentialError(error)) {
      resetClient();

      const freshClient = getClient();
      const command = new DetectPiiEntitiesCommand({
        Text: text,
        LanguageCode: languageCode as "en",
      });
      const response = await freshClient.send(command);
      return response.Entities || [];
    }

    // Not a credential error - propagate exception
    throw error;
  }
}

/**
 * Replace each entity span with [TYPE]. Processes in reverse offset order
 * to maintain correct positions during replacement.
 */
export function redactText(text: string, entities: PiiEntity[]): string {
  // Sort entities by offset in reverse order
  const sortedEntities = [...entities].sort(
    (a, b) => (b.BeginOffset ?? 0) - (a.BeginOffset ?? 0)
  );

  let result = text;
  for (const entity of sortedEntities) {
    const begin = entity.BeginOffset ?? 0;
    const end = entity.EndOffset ?? 0;
    const tag = `[${entity.Type ?? "UNKNOWN"}]`;
    result = result.slice(0, begin) + tag + result.slice(end);
  }

  return result;
}
