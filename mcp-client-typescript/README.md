# An LLM-Powered Chatbot MCP Client written in TypeScript

This project implements a Model Context Protocol (MCP) client in TypeScript that uses AWS Bedrock to access Claude models.

## Prerequisites

- Node.js (v16 or later)
- AWS account with access to Bedrock
- AWS credentials with permissions to invoke Bedrock models

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure your AWS credentials in the `.env` file:
   ```
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_SESSION_TOKEN=your_aws_session_token  # Required for temporary credentials
   AWS_REGION=us-east-1  # or your preferred region where Bedrock is available
   ```

   Note: The `AWS_SESSION_TOKEN` is required when using temporary credentials (e.g., from AWS SSO, IAM roles, or AWS CLI's `aws sts get-session-token`).

## Building

```
npm run build
```

## Running

```
node .\build\index.js C:\Users\mehdibn\Documents\notes\AI\weather-server-typescript\weather-server-typescript\build\index.js
npm start -- path/to/your/mcp/server/script.js
```

or

```
npm start -- path/to/your/mcp/server/script.py
```

## How it Works

This client connects to an MCP server, which provides tools that can be used by the Claude model via AWS Bedrock. The client:

1. Connects to the specified MCP server
2. Lists available tools from the server
3. Starts an interactive chat loop
4. Processes user queries by sending them to Claude via AWS Bedrock
5. Handles tool calls from Claude and returns results back to the model

See the [Building MCP clients](https://modelcontextprotocol.io/tutorials/building-a-client) tutorial for more information about the Model Context Protocol.
