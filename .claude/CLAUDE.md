# redactor-mcp

## Project Overview

MCP (Model Context Protocol) server that wraps AWS Comprehend for PII detection and redaction. Users work in Claude Desktop: they upload a plain text file, give a prompt like "Remove the PII from this file," and get back a redacted version.

This is a **demo project**, not production software.

## Architecture

### Tools

Two MCP tools:

**`detect_pii`** — Detects PII entities in the provided text.

- `text` (string, required) — The text content to analyze.
- `pii_types` (list of strings, optional) — Specific PII entity types to detect (e.g., `["NAME", "EMAIL"]`). If omitted, detect all types.
- `confidence_threshold` (float, optional, default `0.0`) — Minimum confidence score to include an entity. Default is aggressive (include everything).
- Returns: List of detected entities with type, text, score, and character offsets.

**`redact_pii`** — Redacts PII entities in the provided text by replacing them with tags like `[NAME]`, `[SSN]`, `[ADDRESS]`, etc.

- `text` (string, required) — The text content to redact.
- `pii_types` (list of strings, optional) — Specific PII entity types to redact. If omitted, redact all types.
- `confidence_threshold` (float, optional, default `0.0`) — Minimum confidence score to redact an entity.
- Returns: The redacted text with PII replaced by entity type tags.

Both tools accept text content directly. Claude Desktop handles file I/O — the tools don't read or write files.

### Prompt

**`redact_pii_guide`** — A guided prompt template that walks the user through:

- What file to redact
- All PII or specific types
- Confidence threshold (with explanation)

The prompt is a UX convenience. The tools work fine without it via free-form conversation.

### AWS Comprehend Integration

- Uses the **synchronous** `DetectPiiEntities` API.
- **100KB text limit** (Comprehend's sync API constraint). Async/batch operations are out of scope.
- Language is hardcoded to `en`.
- Entity type tags (e.g., `NAME`, `SSN`, `DATE_OF_BIRTH`, `PHONE`, `EMAIL`, `ADDRESS`, `BANK_ACCOUNT_NUMBER`) come directly from Comprehend — no custom mapping.
- AWS authentication uses the standard credential chain (env vars, `~/.aws/credentials`, IAM role, etc.).

## Project Structure

```
redactor-mcp/
├── .claude/
│   └── CLAUDE.md              # This file
├── docs/
│   └── samples/
│       ├── sample-001.md      # Sample markdown with fake PII
│       └── sample-002.csv     # Sample CSV with fake PII
├── src/
│   └── redactor_mcp/
│       ├── __init__.py
│       ├── server.py          # MCP server definition, tools, prompt
│       └── comprehend.py      # AWS Comprehend wrapper
├── pyproject.toml
└── README.md
```

## Dependencies

- `mcp` — MCP Python SDK
- `boto3` — AWS SDK for Python

## Key Design Decisions

- **Aggressive redaction by default** — confidence threshold defaults to 0.0 so nothing is missed. Users can raise it if they want only high-confidence matches.
- **Text in, text out** — Tools receive and return text. Claude Desktop handles file reading/writing.
- **Plain text files only** — `.txt`, `.md`, `.csv`. Other file types are a future problem.
- **Demo scope** — No async operations, no multi-language support, no custom entity mappings.

## How to Run

```bash
uv sync
uv run redactor-mcp
```

## How to Test

### Type checking

```bash
uv run pyright src/
```

### MCP Inspector

Launch the Inspector to test tools interactively:

```bash
npx @modelcontextprotocol/inspector uv run redactor-mcp
```

1. Click **Connect**.
2. Go to **Tools** tab, click **List Tools**.
3. Select `detect_pii` or `redact_pii`, fill in the `text` field, and click **Run Tool**.

Test input: `My name is Jane Doe and my SSN is 123-45-6789.`

- `detect_pii` should return two entities: NAME ("Jane Doe") and SSN ("123-45-6789").
- `redact_pii` should return: `My name is [NAME] and my SSN is [SSN].`

**Note:** The Inspector spawns the server as a subprocess. The server loads `.env` from the project root via an explicit path, so AWS credentials should resolve automatically. If you get a region error, ensure `AWS_REGION` or `AWS_DEFAULT_REGION` is set in `.env`.

### Claude Desktop

Use the sample files in `docs/samples/` to test both tools. Upload them in Claude Desktop and try prompts like:

- "Detect the PII in this file"
- "Remove the PII from this file"
- "Find all the email addresses in this file"
- "Redact only names and phone numbers"
- "Redact PII but only high-confidence matches"
