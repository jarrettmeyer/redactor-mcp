---
name: version
description: Update package.json and manifest.json to a new version. Use when updating the version of the procurement contract negotiation MCP server.
---

# Version Update

This skill updates version numbers across all package files for the procurement contract negotiation MCP server.

## Instructions

When the user requests a version update (e.g., `/version 0.2.0`), follow these steps:

### Step 1: Update package.json

Manually update the `version` field in package.json:

```json
{
  "version": "NEW_VERSION",
  ...
}
```

### Step 2: Update manifest.json

Manually update the `version` field in manifest.json:

```json
{
  "version": "NEW_VERSION",
  ...
}
```

## Process

1. Update package.json version field
2. Update manifest.json version field
3. Verify both updates completed successfully

## Notes

- Always update both files to keep versions synchronized
- Version format: semver (e.g., `0.1.0`, `1.0.0`, `1.2.3`)
- The MCP server reads version from `manifest.json` at runtime
- Bun uses `bun.lock` for dependency locking (not `package-lock.json`)
