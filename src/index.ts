import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { detectPiiEntities, redactText } from "./comprehend.js";
import { checkTextSize, filterEntities } from "./utils.js";
import {
  DetectPiiParamsSchema,
  RedactPiiParamsSchema,
  type DetectedPiiEntity,
} from "./types.js";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROMPT_PATH = join(__dirname, "prompts", "pii_redaction_guide.md");

// Initialize MCP server
const server = new McpServer({
  name: "redactor-mcp",
  version: "0.1.0",
});

function handleToolError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const errorStr = String(error).toLowerCase();
  if (
    errorStr.includes("credential") ||
    errorStr.includes("sso") ||
    errorStr.includes("token") ||
    errorStr.includes("expired")
  ) {
    const profile = process.env.AWS_PROFILE || "<your-profile>";
    return {
      content: [
        {
          type: "text" as const,
          text: `AWS credentials are invalid or expired. If using SSO, run: aws sso login --profile ${profile}`,
        },
      ],
      isError: true,
    };
  }
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// Register detect_pii tool
server.registerTool(
  "detect_pii",
  {
    description:
      "Detect PII entities in the provided text. Returns list of detected entities with type, text, score, and character offsets.",
    inputSchema: DetectPiiParamsSchema,
  },
  async (params) => {
    try {
      checkTextSize(params.text);
      const entities = await detectPiiEntities(params.text);
      const filtered = filterEntities(
        entities,
        params.pii_types,
        params.confidence_threshold
      );
      const result: DetectedPiiEntity[] = filtered.map((e) => ({
        type: e.Type || "",
        text: params.text.slice(e.BeginOffset || 0, e.EndOffset || 0),
        score: e.Score || 0.0,
        begin_offset: e.BeginOffset || 0,
        end_offset: e.EndOffset || 0,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  }
);

// Register redact_pii tool
server.registerTool(
  "redact_pii",
  {
    description:
      "Redact PII entities in the provided text by replacing them with tags like [NAME], [SSN], [ADDRESS], etc.",
    inputSchema: RedactPiiParamsSchema,
  },
  async (params) => {
    try {
      checkTextSize(params.text);
      const entities = await detectPiiEntities(params.text);
      const filtered = filterEntities(
        entities,
        params.pii_types,
        params.confidence_threshold
      );
      const redacted = redactText(params.text, filtered);
      return {
        content: [{ type: "text", text: redacted }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  }
);

// Register pii_redaction_guide prompt
server.registerPrompt(
  "pii_redaction_guide",
  {
    description:
      "A guided prompt that walks the user through PII redaction, including file selection, PII types, and confidence threshold.",
  },
  async () => {
    const promptText = readFileSync(PROMPT_PATH, "utf-8");
    return {
      messages: [
        {
          role: "user",
          content: { type: "text", text: promptText },
        },
      ],
    };
  }
);

// Main function
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
