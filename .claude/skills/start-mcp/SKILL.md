---
name: start-mcp
description: Start the MCP Inspector in the background to test the redactor-mcp server
model: haiku
context: fork
---

# start-detector

Start the MCP Inspector in the background to test the redactor-mcp server.

## Steps

1. Run the MCP Inspector in the background:

```bash
npx @modelcontextprotocol/inspector uv run redactor-mcp 2>&1
```

2. Wait a few seconds for startup, then read the background task output to get the Inspector URL and auth token.

3. Open the Inspector URL in the browser using `browser_navigate`.

4. Click **Connect** to connect to the MCP server over stdio.

5. Collapse the **Environment Variables** panel (it overlaps the tabs when expanded).

6. Navigate to the **Tools** tab and click **List Tools** to verify both `detect_pii` and `redact_pii` are registered.

The Inspector is now ready for testing. Use the Tools tab to run `detect_pii` or `redact_pii` with test input like:

```
My name is Jane Doe and I have worked at AwesomeCorp, Inc for 10 years. If you have any questions, I can be reached at (987) 555-4321 or jane.doe@awesomecorp.com.
```
