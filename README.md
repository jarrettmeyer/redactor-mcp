# redactor-mcp

MCP server that wraps AWS Comprehend for PII detection and redaction. Upload a plain text file in Claude Desktop, ask it to remove the PII, and get back a redacted version.

This is a **demo project**, not production software.

## Prerequisites

- Node.js 18+ or Bun 1.0+
- AWS credentials with `comprehend:DetectPiiEntities` permission

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
  "Action": "comprehend:DetectPiiEntities",
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
3. Test `detect_pii` with: `{"text": "My name is Jane Doe and my SSN is 123-45-6789."}`
4. Test `redact_pii` with the same text

Expected results:
- `detect_pii` returns two entities: NAME ("Jane Doe") and SSN ("123-45-6789")
- `redact_pii` returns: `"My name is [NAME] and my SSN is [SSN]."`

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

- "Detect the PII in this file"
- "Remove the PII from this file"
- "Find all the email addresses in this file"
- "Redact only names and phone numbers"
- "Redact PII but only high-confidence matches"

Sample files are in `docs/samples/` for testing.
