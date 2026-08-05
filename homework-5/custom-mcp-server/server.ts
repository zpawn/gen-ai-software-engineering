import { createMcpFastifyApp } from '@modelcontextprotocol/fastify';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'custom-mcp-server', version: '1.0.0' });

    // 1. Setup Resource
    server.registerResource(
        'lorem-ipsum',
        'file:///lorem-ipsum.md',
        { mimeType: "text/markdown" },
        async (uri) => {
            const urlObj = new URL(uri.href);
            const wordCountStr = urlObj.searchParams.get('word_count');
            const wordCount = wordCountStr ? parseInt(wordCountStr, 10) : 30;
            
            const text = fs.readFileSync(path.join(__dirname, 'lorem-ipsum.md'), 'utf-8');
            const words = text.split(/\s+/).slice(0, wordCount).join(' ');
            
            return {
                contents: [{
                    uri: uri.href,
                    text: words,
                    mimeType: "text/markdown"
                }]
            };
        }
    );

    // 2. Setup Tool
    server.registerTool(
        'read',
        {
            description: "Reads lorem-ipsum content with an optional word_count limit",
            inputSchema: {
                word_count: z.number().optional().describe("Number of words to return. Default is 30.")
            }
        },
        async (args) => {
            try {
                const wordCount = args.word_count ?? 30;
                const text = fs.readFileSync(path.join(__dirname, 'lorem-ipsum.md'), 'utf-8');
                const words = text.split(/\s+/).slice(0, wordCount).join(' ');
                
                return {
                    content: [{ type: "text", text: words }]
                };
            } catch (err) {
                console.error("TOOL ERROR:", err);
                throw err;
            }
        }
    );

    return server;
});

// 3. Setup Fastify API — use toNodeHandler to adapt the McpHttpHandler
const app = createMcpFastifyApp({ logger: true });
const nodeHandler = toNodeHandler(handler, {
    onerror: (err) => console.error('NODE_HANDLER ERROR:', err),
});

app.all('/mcp', async (request, reply) => {
    try {
        reply.hijack();
        await nodeHandler(request.raw, reply.raw, request.body);
    } catch (err) {
        console.error('ROUTE ERROR:', err);
    }
});

app.listen({ port: 3001 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Custom MCP Server (Fastify) listening at ${address}`);
    console.log(`Streamable HTTP URL: ${address}/mcp`);
});
