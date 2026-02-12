import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import "dotenv/config";
import manifest from "../manifest.json";
import { detectPiiEntities, redactText } from "./comprehend.js";
import {
  DetectPiiParamsSchema,
  RedactPiiParamsSchema,
  SummarizePiiParamsSchema,
  type DetectedPiiEntity,
} from "./types.js";
import { checkTextSize, filterEntities } from "./utils.js";

// Initialize MCP server
const server = new McpServer({
  name: manifest.name,
  version: manifest.version,
});

function handleToolError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const errorStr = String(error).toLowerCase();
  if (errorStr.includes("credential") || errorStr.includes("sso") || errorStr.includes("token") || errorStr.includes("expired")) {
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
      "Detect PII entities in text. Use this when the user wants to see what PII exists before deciding what to do. Returns entity type, matched text, confidence score, and character offsets. Supports filtering by specific PII types and minimum confidence threshold.",
    inputSchema: DetectPiiParamsSchema,
  },
  async (params) => {
    try {
      checkTextSize(params.text);
      const entities = await detectPiiEntities(params.text, params.language);
      const filtered = filterEntities(entities, params.pii_types, params.confidence_threshold);
      const result: DetectedPiiEntity[] = filtered.map((e) => ({
        type: e.Type ?? "",
        text: params.text.slice(e.BeginOffset ?? 0, e.EndOffset ?? 0),
        score: e.Score ?? 0.0,
        begin_offset: e.BeginOffset ?? 0,
        end_offset: e.EndOffset ?? 0,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  },
);

// Register redact_pii tool
server.registerTool(
  "redact_pii",
  {
    description:
      "Redact PII in text by replacing matches with type tags like [NAME], [SSN], [ADDRESS]. Use this when the user wants a cleaned version of their text with PII removed. Supports filtering by specific PII types and minimum confidence threshold.",
    inputSchema: RedactPiiParamsSchema,
  },
  async (params) => {
    try {
      checkTextSize(params.text);
      const entities = await detectPiiEntities(params.text, params.language);
      const filtered = filterEntities(entities, params.pii_types, params.confidence_threshold);
      const redacted = redactText(params.text, filtered);
      return {
        content: [{ type: "text", text: redacted }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  },
);

// Register summarize_pii tool
server.registerTool(
  "summarize_pii",
  {
    description:
      "Count PII entities in text by type. Use this as a quick triage step to understand what PII exists without exposing the actual sensitive values. Returns counts per entity type and a total count.",
    inputSchema: SummarizePiiParamsSchema,
  },
  async (params) => {
    try {
      checkTextSize(params.text);
      const entities = await detectPiiEntities(params.text, params.language);
      const filtered = filterEntities(entities, params.pii_types, params.confidence_threshold);
      const counts: Record<string, number> = {};
      for (const entity of filtered) {
        const type = entity.Type ?? "UNKNOWN";
        counts[type] = (counts[type] ?? 0) + 1;
      }
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      return {
        content: [{ type: "text", text: JSON.stringify({ ...counts, total }, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  },
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
