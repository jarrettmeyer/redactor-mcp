# Claude Code Automation Recommendations

Generated: 2026-02-12

## Codebase Profile

- **Type**: TypeScript/Node.js (Bun runtime)
- **Purpose**: MCP server development (AWS Comprehend wrapper)
- **Key Dependencies**: `@modelcontextprotocol/sdk`, `@aws-sdk/client-comprehend`, `zod`
- **Infrastructure**: AWS SDK integration, MCPB packaging

---

## 🔌 MCP Servers

### context7

**Why**: You're developing an MCP server using the `@modelcontextprotocol/sdk`. When questions arise about the MCP SDK API, AWS Comprehend features, or Zod v4 validation, context7 provides live documentation lookup instead of relying on potentially outdated training data.

**Install**: `claude mcp add context7`

**Usage**: Ask questions like "How do I register a tool in MCP SDK?" or "What are the AWS Comprehend language codes?"

### mcp-builder (Plugin)

**Why**: Since you're actively building an MCP server, the mcp-builder plugin provides specialized skills for MCP development workflows, testing, and packaging.

**Install**: `claude plugin add mcp-builder`

---

## 🎯 Skills

### test-mcp-tools

**Why**: Your project has sample files in `docs/samples/` for manual testing. A skill that automates testing all three tools (`detect_pii`, `redact_pii`, `summarize_pii`) against these samples would speed up validation.

**Create**: `.claude/skills/test-mcp-tools/SKILL.md`

**Invocation**: User-only (side effects: runs commands)

```yaml
---
name: test-mcp-tools
description: Test all MCP tools against sample files
disable-model-invocation: true
---

Run all three MCP tools against sample files in docs/samples/:

1. Start the MCP inspector: `bun run inspector`
2. Test each sample file (sample-001.md, sample-002.csv, etc.) against:
   - detect_pii (with various pii_types)
   - redact_pii (with different confidence thresholds)
   - summarize_pii
3. Report any errors or unexpected behavior
4. Validate redaction tags match expected PII entity types
```

### publish-to-mcpb

**Why**: You have `manifest.json` and MCPB packaging configured. A skill to handle the full release workflow (validate manifest, build, pack, version bump) would reduce manual steps.

**Create**: `.claude/skills/publish-to-mcpb/SKILL.md`

**Invocation**: User-only (destructive: publishes package)

**Also available in**: The `version` skill you have handles version bumps, but a publish skill would complete the workflow.

```yaml
---
name: publish-to-mcpb
description: Build, validate, and pack the MCP server for distribution
disable-model-invocation: true
---

Package the MCP server for MCPB distribution:

1. Run typecheck: `bun run typecheck`
2. Validate manifest: `bun run validate`
3. Build: `bun run build`
4. Pack: `bun run pack`
5. Display packaging output location
6. Verify dist/index.js exists and is minified
```

---

## ⚡ Hooks

### PostToolUse: Auto-typecheck on TypeScript edits

**Why**: You have TypeScript configured and a `typecheck` script. Running type checks automatically after editing `.ts` files catches type errors immediately.

**Where**: `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "id": "auto-typecheck",
        "name": "Type check TypeScript files",
        "command": "if [[ \"$TOOL_NAME\" == \"Edit\" || \"$TOOL_NAME\" == \"Write\" ]]; then if [[ \"$FILE_PATH\" == *.ts ]]; then echo '🔍 Running type check...'; bun run typecheck; fi; fi",
        "continueOnError": false
      }
    ]
  }
}
```

### PreToolUse: Block manifest.json edits

**Why**: Your `manifest.json` follows MCPB's strict schema. Accidental manual edits could break packaging. The `version` skill should be the only way to update it.

**Where**: `.claude/settings.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "id": "protect-manifest",
        "name": "Protect manifest.json from direct edits",
        "command": "if [[ \"$TOOL_NAME\" == \"Edit\" || \"$TOOL_NAME\" == \"Write\" ]]; then if [[ \"$FILE_PATH\" == */manifest.json ]]; then echo '⛔ Use /version skill to update manifest.json'; exit 1; fi; fi"
      }
    ]
  }
}
```

---

## 🤖 Subagents

### aws-credential-reviewer

**Why**: Your `comprehend.ts` has sophisticated AWS credential retry logic. A subagent that reviews AWS SDK integration code for credential handling, error recovery, and SSO edge cases would catch issues before deployment.

**Where**: `.claude/agents/aws-credential-reviewer.md`

```markdown
---
name: aws-credential-reviewer
description: Review AWS SDK credential handling and error recovery
tools: [Read, Grep, Glob]
---

Review AWS SDK integration for credential handling best practices:

1. Check for proper credential error detection patterns
2. Verify retry logic handles all credential error types
3. Ensure helpful error messages guide users to fix SSO issues
4. Look for credential caching edge cases
5. Validate lazy credential resolution (SDK v3 pattern)

Focus on src/comprehend.ts and credential-related code.
```

---

## 🎁 Plugins

### commit-commands

**Why**: You already have git permissions configured in settings.json. The `commit-commands` plugin provides `/commit`, `/commit-push-pr`, and `/clean_gone` skills for streamlined git workflows.

**Install**: `claude plugin add commit-commands`

**Usage**: Instead of manually committing changes, use `/commit` for guided commit creation.

---

## Next Steps

**Want to implement these?** Here's a suggested order:

1. **Quick wins (Hooks)**: Add the typecheck and manifest protection hooks to `.claude/settings.json` - immediate benefits
2. **Skills**: Create the `test-mcp-tools` skill for faster validation during development
3. **MCP Servers**: Install context7 for documentation lookup
4. **Plugins**: Add commit-commands and mcp-builder for workflow automation
5. **Subagents**: Create the aws-credential-reviewer for code review workflows

**Need help implementing?** Ask Claude to help set up any of these recommendations. For example:
- "Add the typecheck hook to my settings"
- "Create the test-mcp-tools skill"
- "Install the context7 MCP server"
