import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";

import dotenv from "dotenv";

dotenv.config(); // load environment variables from .env

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS credentials are not set");
}

// Define the Tool interface since we're no longer importing it from Anthropic
interface Tool {
  name: string;
  description: string | undefined;
  input_schema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
}

// Define the MessageParam interface since we're no longer importing it from Anthropic
interface MessageParam {
  role: "user" | "assistant";
  content: string | any[];
}

class MCPClient {
  private mcp: Client;
  private bedrock: BedrockRuntimeClient;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    // Initialize AWS Bedrock client and MCP client
    this.bedrock = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID!,
        secretAccessKey: AWS_SECRET_ACCESS_KEY!,
        sessionToken: AWS_SESSION_TOKEN,
      },
    });
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }

  async connectToServer(serverScriptPath: string) {
    /**
     * Connect to an MCP server
     *
     * @param serverScriptPath - Path to the server script (.py or .js)
     */
    try {
      // Determine script type and appropriate command
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");
      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;

      // Initialize transport and connect to server
      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      this.mcp.connect(this.transport);

      // List available tools
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        } as Tool;
      });
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name),
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    /**
     * Process a query using Claude via Bedrock and available tools
     *
     * @param query - The user's input query
     * @returns Processed response as a string
     */
    const messages: MessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    // Initial Bedrock API call
    const response = await this.invokeBedrockModel(messages);
    
    // Process response and handle tool calls
    const finalText = [];
    const toolResults = [];

    // Check if the response has content
    if (response.content) {
      for (const content of response.content) {
        if (content.type === "text") {
          finalText.push(content.text);
        } else if (content.type === "tool_use") {
          // Execute tool call
          const toolName = content.name;
          const toolArgs = content.input as { [x: string]: unknown } | undefined;
          const toolId = `tool_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          const result = await this.mcp.callTool({
            name: toolName,
            arguments: toolArgs,
          });
          toolResults.push(result);
          finalText.push(
            `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`,
          );

          //let messages2: MessageParam[] = [];
          // Continue conversation with tool results
          // First add assistant message with tool use
          messages.push({
            role: "assistant",
            content: [
              {
                type: "tool_use",
                id: toolId,
                name: toolName,
                input: toolArgs || {},
              }
            ]
          });
          
          // Then add tool result as a user message with proper formatting
          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolId,
                content: typeof result.content === 'string'
                  ? result.content
                  : Array.isArray(result.content) && result.content[0]?.text
                    ? result.content[0].text
                    : JSON.stringify(result.content),
              }
            ]
          });

          // Get next response from Claude via Bedrock
          const response = await this.invokeBedrockModel(messages);
          
          if (response.content && response.content[0] && response.content[0].type === "text") {
            finalText.push(response.content[0].text);
          }
        }
      }
    }

    return finalText.join("\n");
  }

  private async invokeBedrockModel(messages: MessageParam[]) {
    /**
     * Invoke Claude model via AWS Bedrock
     * 
     * @param messages - Array of message objects
     * @returns Claude response
     */
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: messages,
      tools: this.tools.length > 0 ? this.tools : undefined,
    };

    const b = JSON.stringify(payload);
    const command = new InvokeModelCommand({
      modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0", // Using Claude 3.5 Sonnet
      contentType: "application/json",
      accept: "application/json",
      body: b,
    });

    try {
      console.log("invoking " + b);
      const response = await this.bedrock.send(command);
      
      // Parse the response body
      const responseBody = new TextDecoder().decode(response.body);
      return JSON.parse(responseBody);
    } catch (error) {
      console.error("Error invoking Bedrock model:", error);
      throw error;
    }
  }

  async chatLoop() {
    /**
     * Run an interactive chat loop
     */
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") {
          break;
        }
        const response = await this.processQuery(message);
        console.log("\n" + response);
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    /**
     * Clean up resources
     */
    await this.mcp.close();
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node build/index.js <path_to_server_script>");
    return;
  }
  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);
    await mcpClient.chatLoop();
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
