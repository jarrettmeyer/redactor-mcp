import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { detectPiiEntities, redactText } from "./comprehend.js";
import { checkTextSize, filterEntities } from "./utils.js";
import {
  DetectPiiParamsSchema,
  RedactPiiParamsSchema,
  type DetectPiiParams,
  type RedactPiiParams,
  type DetectedPiiEntity,
} from "./types.js";

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROMPT_PATH = join(__dirname, "prompts", "pii_redaction_guide.md");

// Initialize MCP server
const server = new Server(
  {
    name: "redactor-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "detect_pii",
        description:
          "Detect PII entities in the provided text. Returns list of detected entities with type, text, score, and character offsets.",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "The text content to analyze" },
            pii_types: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific PII entity types to detect (e.g. ['NAME', 'EMAIL']). If omitted, detect all types.",
            },
            confidence_threshold: {
              type: "number",
              minimum: 0,
              maximum: 1,
              default: 0.0,
              description:
                "Minimum confidence score to include an entity. Defaults to 0.0 (include everything).",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "redact_pii",
        description:
          "Redact PII entities in the provided text by replacing them with tags like [NAME], [SSN], [ADDRESS], etc.",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "The text content to redact" },
            pii_types: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific PII entity types to redact (e.g. ['NAME', 'EMAIL']). If omitted, redact all types.",
            },
            confidence_threshold: {
              type: "number",
              minimum: 0,
              maximum: 1,
              default: 0.0,
              description:
                "Minimum confidence score to redact an entity. Defaults to 0.0 (redact everything).",
            },
          },
          required: ["text"],
        },
      },
    ],
  };
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "detect_pii") {
      // Validate and parse parameters
      const params = DetectPiiParamsSchema.parse(
        request.params.arguments
      ) as DetectPiiParams;

      // Validate text size
      checkTextSize(params.text);

      // Call AWS Comprehend
      const entities = await detectPiiEntities(params.text);

      // Filter entities
      const filtered = filterEntities(
        entities,
        params.pii_types,
        params.confidence_threshold
      );

      // Map to output format
      const result: DetectedPiiEntity[] = filtered.map((e) => ({
        type: e.Type || "",
        text: params.text.slice(e.BeginOffset || 0, e.EndOffset || 0),
        score: e.Score || 0.0,
        begin_offset: e.BeginOffset || 0,
        end_offset: e.EndOffset || 0,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (request.params.name === "redact_pii") {
      // Validate and parse parameters
      const params = RedactPiiParamsSchema.parse(
        request.params.arguments
      ) as RedactPiiParams;

      // Validate text size
      checkTextSize(params.text);

      // Call AWS Comprehend
      const entities = await detectPiiEntities(params.text);

      // Filter entities
      const filtered = filterEntities(
        entities,
        params.pii_types,
        params.confidence_threshold
      );

      // Redact text
      const redacted = redactText(params.text, filtered);

      return {
        content: [
          {
            type: "text",
            text: redacted,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  } catch (error) {
    // Transform error to user-friendly message
    const message = error instanceof Error ? error.message : "Unknown error";

    // Check if it's a credential error for special messaging
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
            type: "text",
            text: `AWS credentials are invalid or expired. If using SSO, run: aws sso login --profile ${profile}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Register list prompts handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "pii_redaction_guide",
        description:
          "A guided prompt that walks the user through PII redaction, including file selection, PII types, and confidence threshold.",
      },
    ],
  };
});

// Register get prompt handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "pii_redaction_guide") {
    const promptText = readFileSync(PROMPT_PATH, "utf-8");
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${request.params.name}`);
});

// Main function
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
