# Homework 5: Configure MCP Servers

**Author:** [Your Name / Author Name]

## Overview
This repository contains the configuration and implementation for Homework 5, which involves setting up various Model Context Protocol (MCP) servers and creating a custom one.

## Deliverables
- **`mcp.json`**: Contains configurations for GitHub, Filesystem, and Notion MCP servers.
- **`custom-mcp-server/`**: A custom MCP server built using **Fastify** and **TypeScript** (fulfilling the REST API requirement via Server-Sent Events MCP transport). *(Note: Per specific requirements, Fastify + TS was used in place of Python's `fastmcp`. The `@modelcontextprotocol/sdk` and `fastify` are included in `package.json` instead of `requirements.txt`.)*
- **`docs/sdd/`**: Software Design Documents detailing the integration steps for each task.
- **`docs/screenshots/`**: Directory meant to store verification screenshots showing the results of interacting with each MCP server.
- **`HOWTORUN.md`**: Instructions for running and testing the custom Fastify MCP server.

## Features
- **GitHub MCP**: Integration to fetch PRs, issues, or commits.
- **Filesystem MCP**: Exposes local directory reading capabilities to the AI.
- **Notion MCP**: Configured to query for project tasks or bugs.
- **Custom Fastify MCP Server**: Exposes a `read` tool and a `file:///lorem-ipsum.md` resource, both accepting a `word_count` parameter to return constrained text.
