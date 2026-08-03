# Custom MCP Server (Fastify + TypeScript)

This is a custom MCP server built as a REST API using [Fastify](https://fastify.dev/) and TypeScript. It utilizes the `@modelcontextprotocol/sdk` to provide MCP connectivity over Server-Sent Events (SSE).

## 1. Install Dependencies

Ensure you have Node.js installed. Navigate into this folder and install the dependencies:

```bash
cd custom-mcp-server
npm install
```

## 2. Run the Server

To start the server in development mode (using `tsx` to run TypeScript directly):

```bash
npm run dev
```
*(Ensure your `package.json` has `"dev": "tsx server.ts"` in the scripts section, or you can just run `npx tsx server.ts` directly)*

You should see the following output indicating the server is running:
```
Custom MCP Server (Fastify) listening at http://127.0.0.1:3001
Streamable HTTP URL: http://127.0.0.1:3001/mcp
```

## 3. Connect MCP Configuration

To use this server in your LLM Client (like Claude Desktop or an AI IDE), you need an MCP client that supports Streamable HTTP or SSE transport. You can connect it using the URL `http://localhost:3001/mcp`.

## 4. Usage / Testing the `read` Tool

Once connected:
1. **Resource (`lorem-ipsum.md`)**: You can request the resource `file:///lorem-ipsum.md?word_count=50` to get 50 words from the lorem ipsum file.
2. **Tool (`read`)**: Ask the AI: *"Use the read tool to get 20 words from the lorem ipsum source."* It will execute the `read` tool with the argument `{"word_count": 20}` and return the expected content.
