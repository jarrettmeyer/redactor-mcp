# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-02-12

### Added

#### Core MCP Tools
- `detect_pii` — Detects PII entities in text using AWS Comprehend
  - Returns entity type, text, confidence score, and character offsets
  - Supports filtering by specific PII entity types
  - Configurable confidence threshold (default: 0.0 for aggressive detection)
- `redact_pii` — Redacts PII entities by replacing them with type tags (e.g., `[NAME]`, `[SSN]`)
  - Configurable entity type filtering
  - Configurable confidence threshold
- `summarize_pii` — Counts PII entities by type
  - Returns JSON object with counts per entity type and total count

#### AWS Comprehend Integration
- Integration with AWS Comprehend `DetectPiiEntities` API
- Support for 23+ PII entity types (NAME, SSN, EMAIL, PHONE, ADDRESS, etc.)
- Automatic language detection using `DetectDominantLanguage` API
- English language support for PII detection
- 100KB text limit enforcement (AWS Comprehend sync API constraint)

#### Credential Management
- Automatic AWS credential retry logic for expired SSO tokens
- Credential error detection across multiple error types
- Helpful error messages with SSO login instructions
- Support for standard AWS credential chain (env vars, `~/.aws/credentials`, IAM role)

#### Validation & Quality
- Runtime parameter validation using Zod v4 schemas
- Entity type validation with clear error messages
- Confidence threshold validation (0.0 - 1.0 range)
- Text size validation (100KB limit)

#### Developer Experience
- TypeScript implementation with full type safety
- Bun runtime support for fast execution
- MCP Inspector integration for interactive testing
- MCPB packaging support for Claude Desktop distribution
- Sample files for testing (markdown, CSV, Spanish, French)

#### Documentation
- Comprehensive README with usage examples
- CLAUDE.md project documentation
- Sample prompts for Claude Desktop usage
- Architecture and design decision documentation

#### Automation
- GitHub Actions CI/CD pipeline for build and quality checks
- Automated release workflow with MCPB artifact publishing
- Dependabot configuration for automated dependency updates
- Type checking, build validation, and manifest validation in CI

[Unreleased]: https://github.com/jarrettmeyer/redactor-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jarrettmeyer/redactor-mcp/releases/tag/v0.1.0
