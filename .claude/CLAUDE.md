# redactor-mcp

## Project Overview

MCP (Model Context Protocol) server that wraps AWS Comprehend for PII detection and redaction. Users work in Claude Desktop: they upload a plain text file, give a prompt like "Remove the PII from this file," and get back a redacted version.

This is a **demo project**, not production software.

## Architecture

### Tools

Three MCP tools:

**`detect_language`** — Detects the dominant language in the provided text.

- `text` (string, required) — The text content to analyze.
- Returns: Array of detected languages sorted by confidence score (highest first), each with `language_code` (RFC 5646 code), `language_name` (human-readable), and `score` (confidence 0-1).
- Supports 100+ languages including English, Spanish, French, German, Chinese, Japanese, Arabic, Hindi, and more.

**`detect_pii`** — Detects PII entities in the provided text.

- `text` (string, required) — The text content to analyze.
- `pii_types` (list of strings, optional) — Specific PII entity types to detect (e.g., `["NAME", "EMAIL"]`). If omitted, detect all types.
- `confidence_threshold` (float, optional, default `0.0`) — Minimum confidence score to include an entity. Default is aggressive (include everything).
- `language_code` (string, optional) — Language code (e.g., 'en' for English or 'es' for Spanish). If omitted, language will be auto-detected. **Note: Only English ('en') and Spanish ('es') are currently supported.**
- Returns: List of detected entities with type, text, score, and character offsets.

**`redact_pii`** — Redacts PII entities in the provided text by replacing them with tags like `[NAME]`, `[SSN]`, `[ADDRESS]`, etc.

- `text` (string, required) — The text content to redact.
- `pii_types` (list of strings, optional) — Specific PII entity types to redact. If omitted, redact all types.
- `confidence_threshold` (float, optional, default `0.0`) — Minimum confidence score to redact an entity.
- `language_code` (string, optional) — Language code (e.g., 'en' for English or 'es' for Spanish). If omitted, language will be auto-detected. **Note: Only English ('en') and Spanish ('es') are currently supported.**
- Returns: The redacted text with PII replaced by entity type tags.

Both tools accept text content directly. Claude Desktop handles file I/O — the tools don't read or write files.

### Prompt

**`pii_redaction_guide`** — A guided prompt template that walks the user through:

- What file to redact
- All PII or specific types
- Confidence threshold (with explanation)

The prompt is a UX convenience. The tools work fine without it via free-form conversation.

### AWS Comprehend Integration

- Uses synchronous APIs: `DetectPiiEntities` and `DetectDominantLanguage`.
- **100KB text limit** (Comprehend's sync API constraint). Async/batch operations are out of scope.
- **Language Support**:
  - Language detection: 100+ languages via `DetectDominantLanguage`
  - PII detection: English and Spanish only ([AWS Documentation](https://docs.aws.amazon.com/comprehend/latest/dg/how-pii.html))
- Auto-detection determines language before PII operations when `language_code` not provided.
- Language codes follow RFC 5646 standard (e.g., "en", "es", "fr", "zh-TW").
- Entity type tags (e.g., `NAME`, `SSN`, `DATE_OF_BIRTH`, `PHONE`, `EMAIL`, `ADDRESS`, `BANK_ACCOUNT_NUMBER`) come directly from Comprehend — no custom mapping.
- AWS authentication uses the standard credential chain (env vars, `~/.aws/credentials`, IAM role, etc.).

## Project Structure

```
redactor-mcp/
├── .claude/
│   └── CLAUDE.md              # This file
├── dist/                      # Build output (generated)
├── docs/
│   └── samples/
│       ├── sample-001.md      # Sample markdown with fake PII (English)
│       ├── sample-002.csv     # Sample CSV with fake PII (English)
│       ├── sample-003-spanish.txt  # Spanish text with PII
│       └── sample-004-french.txt   # French text (language detection demo)
├── src/
│   ├── index.ts               # MCP server entry point
│   ├── comprehend.ts          # AWS Comprehend wrapper with retry logic
│   ├── types.ts               # Type definitions and Zod schemas
│   ├── utils.ts               # Helper functions
│   └── prompts/
│       └── pii_redaction_guide.md
├── manifest.json              # MCPB packaging metadata
├── package.json
├── README.md
└── tsconfig.json
```

## Dependencies

- `@modelcontextprotocol/sdk` — MCP TypeScript SDK
- `@aws-sdk/client-comprehend` — AWS SDK v3 for Comprehend (`DetectPiiEntities`, `DetectDominantLanguage`, `ComprehendClient`)
- `@smithy/property-provider` — For credential error handling
- `dotenv` — Environment variable loading
- `zod` — Runtime schema validation

## Key Design Decisions

- **Aggressive redaction by default** — confidence threshold defaults to 0.0 so nothing is missed. Users can raise it if they want only high-confidence matches.
- **Auto-detection with explicit override** — Language is auto-detected for convenience, but users can specify `language_code` to skip detection.
- **Clear error messages for unsupported languages** — When non-English/non-Spanish text is detected, users receive informative errors with detected language name and confidence.
- **Future-ready architecture** — Designed to easily support additional languages when AWS Comprehend expands PII detection capabilities.
- **Text in, text out** — Tools receive and return text. Claude Desktop handles file reading/writing.
- **Plain text files only** — `.txt`, `.md`, `.csv`. Other file types are a future problem.
- **Demo scope** — No async operations, no custom entity mappings.

## Implementation Details

### Module Structure

- **src/index.ts** — MCP server using `@modelcontextprotocol/sdk`, registers tools and prompts, handles tool execution
- **src/comprehend.ts** — AWS Comprehend client wrapper with sophisticated credential error detection and automatic retry logic, provides `detectLanguage()` and `detectPiiEntities()` functions
- **src/types.ts** — Zod schemas for parameter validation, TypeScript type definitions, AWS SDK type re-exports
- **src/utils.ts** — Text size validation (100KB limit enforcement), entity filtering by type/confidence, language code mapping (~100 languages), and language validation helpers

### Credential Retry Logic

The TypeScript implementation maintains the sophisticated credential error handling from the Python version:

- Detects credential errors via multiple strategies:
  - `CredentialsProviderError` instance check (AWS SDK v3 Smithy provider)
  - Error name matching (ExpiredTokenException, InvalidToken, UnrecognizedClientException, etc.)
  - HTTP status codes (401 Unauthorized, 403 Forbidden)
  - Error message keyword matching (sso, credential, token)
- Automatically resets the cached ComprehendClient on credential errors
- Retries once with a fresh client to handle expired SSO tokens
- Provides helpful SSO login instructions with profile name on persistent failures

### Tool Parameter Validation

Uses Zod schemas to validate tool parameters at runtime:
- Type-safe parameter parsing with automatic coercion
- Default values (confidence_threshold: 0.0)
- Range validation (confidence between 0 and 1)
- Ensures type safety beyond TypeScript's compile-time checks

## How to Run

```bash
bun install
bun run dev
```

## How to Build

```bash
bun run build
```

## Type Checking

```bash
bun run typecheck
```

## How to Test

### Type checking

```bash
bun run typecheck
```

### MCP Inspector

Launch the Inspector to test tools interactively:

```bash
bun run inspector
```

1. Click **Connect**.
2. Go to **Tools** tab, click **List Tools**.
3. Test the tools:

**Language Detection:**
```json
{"text": "Bonjour, je m'appelle Marie."}
```
Returns: `[{"language_code": "fr", "language_name": "French", "score": 0.9876}]`

**PII Detection (English):**
```json
{"text": "My name is Jane Doe and my SSN is 123-45-6789."}
```
Returns two entities: NAME ("Jane Doe") and SSN ("123-45-6789")

**PII Detection (Spanish):**
```json
{"text": "Mi nombre es Juan García y mi número es 123-45-6789"}
```
Returns PII entities detected in Spanish text

**PII Redaction:**
```json
{"text": "My name is Jane Doe and my SSN is 123-45-6789."}
```
Returns: `My name is [NAME] and my SSN is [SSN].`

### Claude Desktop

Use the sample files in `docs/samples/` to test both tools. Upload them in Claude Desktop and try prompts like:

- "What language is this document?"
- "Detect the language in this file"
- "Detect the PII in this file"
- "Remove the PII from this file"
- "Find all the email addresses in this file"
- "Redact only names and phone numbers"
- "Redact PII but only high-confidence matches"
- "Detect PII using Spanish language code"
