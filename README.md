# redactor-mcp

MCP server that wraps AWS Comprehend for PII detection and redaction. Upload a plain text file in Claude Desktop, ask it to remove the PII, and get back a redacted version.

This is a **demo project**, not production software.

## Prerequisites

- Python 3.14+
- [uv](https://docs.astral.sh/uv/)
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
uv sync
```

## Running the Server

```bash
uv run redactor-mcp
```

## Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "redactor-mcp": {
      "command": "/Users/YOUR_USERNAME/.local/bin/uv",
      "args": ["run", "--directory", "/absolute/path/to/redactor-mcp", "redactor-mcp"],
      "env": {
        "AWS_PROFILE": "your-profile",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

**Important:** Replace:
- `/Users/YOUR_USERNAME/.local/bin/uv` with the full path to `uv` (find it with `which uv`)
- `/absolute/path/to/redactor-mcp` with the actual path to this project
- `your-profile` with your AWS profile name

**Why the full path?** Claude Desktop runs with a limited PATH (`/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`) that doesn't include `~/.local/bin` where `uv` is typically installed. Using the full path ensures Claude Desktop can find the `uv` executable.

## Usage

Upload a `.txt`, `.md`, or `.csv` file in Claude Desktop and try prompts like:

- "Detect the PII in this file"
- "Remove the PII from this file"
- "Find all the email addresses in this file"
- "Redact only names and phone numbers"
- "Redact PII but only high-confidence matches"

Sample files are in `docs/samples/` for testing.
