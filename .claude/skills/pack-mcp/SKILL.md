---
name: pack-mcp
description: Build, validate, and pack the MCP server for MCPB distribution
metadata:
  user-invocable: true
  model-invocable: false
---

# Pack MCP Server

This skill handles the complete build and packaging workflow for MCPB distribution.

## Instructions

When the user invokes `/pack-mcp`, follow these steps:

### Step 1: Pre-flight checks

Run git status to check for uncommitted changes:

```bash
git status --short
```

If there are uncommitted changes, warn the user:
```
⚠️  You have uncommitted changes. Consider committing before packaging.
```

### Step 2: Type check

Run TypeScript type checking:

```bash
bun run typecheck
```

If type errors are found, STOP and report them to the user. Do not proceed with packaging.

### Step 3: Validate manifest

Validate the manifest.json schema:

```bash
bun run validate
```

If validation fails, STOP and report the errors. The manifest must be valid before packaging.

### Step 4: Build

Build the project:

```bash
bun run build
```

Verify the output:
- Check that `dist/index.js` exists
- Check that the file size is reasonable (should be minified, typically < 100KB)

```bash
ls -lh dist/index.js
```

### Step 5: Pack

Create the MCPB package:

```bash
bun run pack
```

This will create a `.mcp` package file in the current directory.

### Step 6: Report results

Display a summary to the user:

```
✅ MCP Server Packaging Complete

Build artifacts:
- dist/index.js: [size]
- redactor-mcp-[version].mcp: [size]

Next steps:
1. Test the package: claude mcp add ./redactor-mcp-[version].mcp
2. Publish to MCPB registry (when ready)
3. Tag the release: git tag v[version]
```

### Step 7: Optional - Test the package

Ask the user if they want to test the package locally:

```
Would you like to test the packaged MCP server?

To test locally:
1. claude mcp add ./redactor-mcp-[version].mcp
2. Restart Claude Desktop
3. Test the tools in a new conversation
```

## Error Handling

If any step fails:
1. Report the exact error message
2. Suggest fixes based on the error type:
   - Type errors → Fix TypeScript issues in src/
   - Manifest validation errors → Check manifest.json schema
   - Build errors → Check for syntax errors or missing dependencies
   - Pack errors → Ensure all required files are present

## Notes

- Always run typecheck and validate before building
- The pack command uses @anthropic-ai/mcpb
- The .mcp package is a distributable archive
- Version number comes from manifest.json
- The skill does NOT bump version - use `/version` for that
