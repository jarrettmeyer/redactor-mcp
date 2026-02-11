# redactor-mcp

MCP server that wraps AWS Comprehend for PII detection and redaction. Upload a plain text file in Claude Desktop, ask it to remove the PII, and get back a redacted version.

This is a **demo project**, not production software.

## Prerequisites

- Node.js 18+ or Bun 1.0+
- AWS credentials with `comprehend:DetectPiiEntities` and `comprehend:DetectDominantLanguage` permissions

## AWS Credentials Setup

### Option A: AWS Access Portal (SSO)

```bash
aws configure sso
# Profile name: your-profile
# SSO start URL: https://your-org.awsapps.com/start
# SSO region: us-east-1
# Account and role: select from browser

aws sso login --profile your-profile
export AWS_PROFILE=your-profile
```

### Option B: Static Credentials

```bash
aws configure
# Enter Access Key ID, Secret Access Key, region (us-east-1)
```

### Required IAM Permissions

```json
{
  "Effect": "Allow",
  "Action": [
    "comprehend:DetectPiiEntities",
    "comprehend:DetectDominantLanguage"
  ],
  "Resource": "*"
}
```

## Installation

```bash
bun install
```

## Type Checking

```bash
bun run typecheck
```

## Building

Build the project to `dist/`:

```bash
bun run build
```

## Running the Server

For development:

```bash
bun run dev
```

For production (after building):

```bash
bun run start
```

## Testing with MCP Inspector

Launch the Inspector UI to test tools interactively:

```bash
bun run inspector
```

1. Click **Connect**
2. Go to **Tools** tab, click **List Tools**
3. Test the tools:

### Language Detection

```json
{"text": "Bonjour, je m'appelle Marie."}
```

Returns detected language(s) with confidence scores:

```json
[
  {
    "language_code": "fr",
    "language_name": "French",
    "score": 0.9876
  }
]
```

### PII Detection

Test `detect_pii` with: `{"text": "My name is Jane Doe and my SSN is 123-45-6789."}`

Returns two entities: NAME ("Jane Doe") and SSN ("123-45-6789")

### PII Redaction

Test `redact_pii` with the same text

Returns: `"My name is [NAME] and my SSN is [SSN]."`

### Language Support

- **Language Detection**: Supports 100+ languages
- **PII Detection/Redaction**: Currently supports **English and Spanish** only

You can optionally specify the language code:

```json
{"text": "Mi nombre es Juan García", "language_code": "es"}
```

Or let the system auto-detect:

```json
{"text": "My name is Jane Doe"}
```

**Note**: If non-English/non-Spanish text is provided to PII tools, you'll receive a clear error message with the detected language.

## Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

### Option 1: Development Mode (run from source)

```json
{
  "mcpServers": {
    "redactor-mcp": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/redactor-mcp/src/index.ts"],
      "env": {
        "AWS_PROFILE": "your-profile",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

### Option 2: Production Mode (run compiled version)

```json
{
  "mcpServers": {
    "redactor-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/redactor-mcp/dist/index.js"],
      "env": {
        "AWS_PROFILE": "your-profile",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

**Important:** Replace:
- `/absolute/path/to/redactor-mcp` with the actual path to this project
- `your-profile` with your AWS profile name

For production mode, make sure to run `bun run build` first.

## Packaging for Distribution

Create an MCPB package for easy distribution:

```bash
bun run pack
```

This creates a `.mcpb` file that can be installed directly in Claude Desktop.

## Usage

Upload a `.txt`, `.md`, or `.csv` file in Claude Desktop and try prompts like:

- "What language is this document?"
- "Detect the language in this file"
- "Detect the PII in this file"
- "Remove the PII from this file" (language auto-detected)
- "Find all the email addresses in this file"
- "Redact only names and phone numbers"
- "Redact PII but only high-confidence matches"
- "Detect PII using Spanish language code"

Sample files are in `docs/samples/` for testing:
- `sample-001.md` - English text with PII
- `sample-002.csv` - English CSV with multiple employee records
- `sample-003-spanish.txt` - Spanish text with PII (tests Spanish PII detection)
- `sample-004-french.txt` - French text (tests language detection and unsupported language handling)
