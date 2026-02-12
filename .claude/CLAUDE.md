# redactor-mcp

## Project Overview

MCP (Model Context Protocol) server that wraps AWS Comprehend for PII detection and redaction. Users work in Claude Desktop: they upload a plain text file, give a prompt like "Remove the PII from this file," and get back a redacted version.

## Architecture

### Tools

Four MCP tools:

**`detect_language`** — Detects the dominant language(s) in text.

- `text` (string, required) — The text content to analyze. Must be under 100KB.
- Returns: List of detected languages with `language_code` (e.g., "en", "es"), `language_name` (e.g., "English", "Spanish"), and `score` (confidence from 0.0 to 1.0).

**`detect_pii`** — Detects PII entities in the provided text.

- `text` (string, required) — The text content to analyze. Must be under 100KB.
- `pii_types` (list of strings, optional) — Specific PII entity types to detect (e.g., `["NAME", "EMAIL"]`). If omitted, detect all types. Must be valid Comprehend types (see list below).
- `confidence_threshold` (float, optional, default `0.0`) — Minimum confidence score to include an entity.
- `language` (string, optional, default `"en"`) — Language code for the text.
- Returns: List of detected entities with type, text, score, and character offsets.

**`redact_pii`** — Redacts PII entities in the provided text by replacing them with tags like `[NAME]`, `[SSN]`, `[ADDRESS]`, etc.

- `text` (string, required) — The text content to redact.
- `pii_types` (list of strings, optional) — Specific PII entity types to redact. If omitted, redact all types.
- `confidence_threshold` (float, optional, default `0.0`) — Minimum confidence score to redact an entity.
- `language` (string, optional, default `"en"`) — Language code for the text.
- Returns: The redacted text with PII replaced by entity type tags.

**`summarize_pii`** — Counts PII entities in the provided text by type.

- `text` (string, required) — The text content to analyze.
- `pii_types` (list of strings, optional) — Specific PII entity types to count. If omitted, count all types.
- `confidence_threshold` (float, optional, default `0.0`) — Minimum confidence score to include an entity.
- `language` (string, optional, default `"en"`) — Language code for the text.
- Returns: JSON object with counts per entity type and a `total` count, e.g. `{"NAME": 2, "SSN": 1, "total": 3}`.

All tools accept text content directly. Claude Desktop handles file I/O — the tools don't read or write files.

### Valid PII Entity Types

Entity types are validated by Zod enum at runtime. Invalid types produce a clear error. Valid types:

```
ADDRESS, AWS_ACCESS_KEY, AWS_SECRET_KEY, BANK_ACCOUNT_NUMBER, BANK_ROUTING,
CREDIT_DEBIT_CVV, CREDIT_DEBIT_EXPIRY, CREDIT_DEBIT_NUMBER, DATE_OF_BIRTH,
DRIVER_ID, EMAIL, INTERNATIONAL_BANK_ACCOUNT_NUMBER, IP_ADDRESS, LICENSE_PLATE,
MAC_ADDRESS, NAME, PASSPORT_NUMBER, PASSWORD, PHONE, PIN, SSN, SWIFT_CODE,
URL, USERNAME, US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER
```

### AWS Comprehend Integration

- Uses synchronous APIs: `DetectPiiEntities` and `DetectDominantLanguage`.
- **100KB text limit** (Comprehend's sync API constraint). Async/batch operations are out of scope.
- Language defaults to `en`. AWS Comprehend's PII detection only supports English for most entity types.
- Entity type tags come directly from Comprehend — no custom mapping.
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
│   ├── types.ts               # Type definitions, Zod schemas, PII_ENTITY_TYPES enum
│   └── utils.ts               # Helper functions
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
- **Demo scope** — No async operations, no multi-language support, no custom entity mappings.
- **Entity type validation** — Zod enum rejects invalid PII types with a clear error message at call time.

## Documentation Guidelines

### When to Update CHANGELOG.md

Document changes in CHANGELOG.md when they meet any of these criteria:

**Always document:**
- New features or tools
- Breaking changes to APIs or behavior
- Security fixes
- Bug fixes that affect user-visible behavior
- Changes to dependencies that impact functionality
- New configuration options or requirements

**Usually document:**
- Performance improvements (if measurable/significant)
- Error message improvements
- Changes to validation logic
- New language support or expanded entity types

**No need to document:**
- Internal refactoring with no external impact
- Code style changes, formatting
- Documentation updates (README, CLAUDE.md)
- Test additions or changes
- Build script tweaks
- Minor typo fixes in comments
- Dependency updates with no functional change

**Rule of thumb:** If a user would notice the change or need to know about it when upgrading, document it in CHANGELOG.md.

## Implementation Details

### Module Structure

- **src/index.ts** — MCP server using `@modelcontextprotocol/sdk`, registers tools, handles tool execution
- **src/comprehend.ts** — AWS Comprehend client wrapper with credential error detection and automatic retry logic
- **src/types.ts** — Zod schemas (with `.describe()` on all fields), `PII_ENTITY_TYPES` const array, TypeScript type definitions
- **src/utils.ts** — Text size validation (100KB limit enforcement) and entity filtering by type/confidence

### Credential Retry Logic

- Detects credential errors via multiple strategies:
  - `CredentialsProviderError` instance check (AWS SDK v3 Smithy provider)
  - Error name matching (ExpiredTokenException, InvalidToken, UnrecognizedClientException, etc.)
  - HTTP status codes (401 Unauthorized, 403 Forbidden)
  - Error message keyword matching (sso, credential, token)
- Automatically resets the cached ComprehendClient on credential errors
- Retries once with a fresh client to handle expired SSO tokens
- Provides helpful SSO login instructions with profile name on persistent failures
- Note: `ComprehendClient` construction never throws — SDK v3 resolves credentials lazily on first API call

### Tool Parameter Validation

Uses Zod schemas to validate tool parameters at runtime:
- All three tools share the same base schema (text, pii_types, confidence_threshold, language)
- `pii_types` validated against `PII_ENTITY_TYPES` enum — invalid types are rejected immediately
- `.describe()` on all fields gives LLM-readable parameter hints
- Default values: `confidence_threshold: 0.0`, `language: "en"`

## SDK Version Notes

- Use `McpServer` (from `@modelcontextprotocol/sdk/server/mcp.js`) — the high-level API with `registerTool`. The low-level `Server` class (from `server/index.js`) is deprecated.
- When editing MCP server code, check for deprecated SDK symbols and update to current equivalents.
- **`LanguageCode` cast is intentional**: `DetectPiiEntitiesCommandInput.LanguageCode` is typed as `"en"` in the SDK, so `as "en"` in `comprehend.ts` is required — do not remove it.
- **Zod v4**: The project uses `zod ^4.3.6` (v4, not v3). Check v4 docs when looking up API details.

## How to Run

```bash
bun install
bun run dev
```

## How to Build

```bash
bun run build
```

## How to Test

### Type checking

```bash
bun run typecheck
```

### Manifest validation

```bash
bun run validate
```

Validates the `manifest.json` schema using `@anthropic-ai/mcpb`.

### MCP Inspector

Launch the Inspector to test tools interactively:

```bash
bun run inspector
```

1. Click **Connect**.
2. Go to **Tools** tab, click **List Tools**.
3. Four tools should appear: `detect_language`, `detect_pii`, `redact_pii`, `summarize_pii`.
4. Select a tool, fill in the `text` field, and click **Run Tool**.

**Example with `detect_language`:**
```json
{"text": "Bonjour, je m'appelle Marie."}
```
Returns: `[{"language_code": "fr", "language_name": "French", "score": 0.9876}]`

**Example with PII tools:**
Input: `"My name is Jane Doe and my SSN is 123-45-6789."`
- `detect_pii` → two entities: NAME ("Jane Doe") and SSN ("123-45-6789")
- `redact_pii` → `My name is [NAME] and my SSN is [SSN].`
- `summarize_pii` → `{"NAME": 1, "SSN": 1, "total": 2}`

### Claude Desktop

Use the sample files in `docs/samples/` to test both tools. Upload them in Claude Desktop and try prompts like:

- "What language is this document?"
- "Detect the language in this file"
- "Detect the PII in this file"
- "Remove the PII from this file"
- "Find all the email addresses in this file"
- "Redact only names and phone numbers"
- "Redact PII but only high-confidence matches"
- "How much PII is in this file?"
