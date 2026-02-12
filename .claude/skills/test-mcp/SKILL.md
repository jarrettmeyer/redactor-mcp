---
name: test-mcp
description: Test all MCP tools interactively against sample files using the MCP inspector
metadata:
  user-invocable: true
  model-invocable: false
---

# Test MCP Tools

This skill launches the MCP inspector and tests all three PII tools against the sample files in `docs/samples/`.

## Instructions

When the user invokes `/test-mcp`, follow these steps:

### Step 1: Verify samples exist

Check that sample files exist in `docs/samples/`:
- sample-001.md (English markdown with PII)
- sample-002.csv (English CSV with PII)
- sample-003-spanish.txt (Spanish text with PII)
- sample-004-french.txt (French text for language detection)

### Step 2: Read sample content

Read one of the sample files (e.g., sample-001.md) to understand the content and expected PII entities.

### Step 3: Launch inspector

Tell the user:

```
🧪 MCP Inspector Test Instructions

I'll guide you through testing all three tools. First, launch the inspector:

    bun run inspector

Then:
1. Click "Connect" in the inspector
2. Go to the "Tools" tab
3. Click "List Tools" - you should see: detect_pii, redact_pii, summarize_pii
```

### Step 4: Test detect_pii

Provide the user with test cases for `detect_pii`:

```json
Test 1 - Basic detection (paste sample-001.md content):
{
  "text": "[content from sample-001.md]"
}

Expected: Should detect NAME, SSN, EMAIL, etc.

Test 2 - Specific types:
{
  "text": "[content from sample-001.md]",
  "pii_types": ["NAME", "EMAIL"]
}

Expected: Should only return NAME and EMAIL entities

Test 3 - Confidence threshold:
{
  "text": "[content from sample-001.md]",
  "confidence_threshold": 0.9
}

Expected: Should only return high-confidence matches
```

### Step 5: Test redact_pii

Provide test cases for `redact_pii`:

```json
Test 1 - Full redaction:
{
  "text": "[content from sample-001.md]"
}

Expected: Should replace PII with tags like [NAME], [SSN], [EMAIL]

Test 2 - Selective redaction:
{
  "text": "[content from sample-001.md]",
  "pii_types": ["SSN", "CREDIT_DEBIT_NUMBER"]
}

Expected: Should only redact SSNs and credit card numbers
```

### Step 6: Test summarize_pii

Provide test cases for `summarize_pii`:

```json
Test 1 - Count all PII:
{
  "text": "[content from sample-001.md]"
}

Expected: JSON with counts per type, e.g. {"NAME": 2, "SSN": 1, "total": 3}

Test 2 - Count specific types:
{
  "text": "[content from sample-001.md]",
  "pii_types": ["NAME", "EMAIL"]
}

Expected: Only NAME and EMAIL counts
```

### Step 7: Test language detection

Test the language detection with sample-004-french.txt:

```json
{
  "text": "[content from sample-004-french.txt]"
}
```

Expected: Should auto-detect French and handle appropriately

### Step 8: Report results

After the user completes testing, ask them to report:
- Which tools worked correctly?
- Any unexpected behavior?
- Were redaction tags correct?
- Did language detection work as expected?

## Notes

- The inspector must be run manually - we can't automate browser interaction
- Each test should verify the response format and content
- Look for edge cases: empty text, very long text, invalid PII types
- Spanish and French samples test language detection edge cases
