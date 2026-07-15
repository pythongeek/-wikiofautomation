---
title: Model Context Protocol (MCP)
category: protocols
tags: [protocol, ai-agents, open-standard]
created: '2026-07-15'
updated: '2026-07-15'
summary: The open standard that lets AI models securely connect to tools, files, and live data sources.
sources:
  - title: Model Context Protocol spec
    url: https://modelcontextprotocol.io/
infobox:
  kind: Open protocol
  first_release: 2024-11
  license: MIT
  repo: https://github.com/modelcontextprotocol/specification
---

# Model Context Protocol (MCP)

The **Model Context Protocol (MCP)** is an open standard that defines how AI models and agents discover, authenticate, and call external tools, files, and data sources. Maintained by Anthropic alongside a growing community of implementers, MCP is what makes an agent truly *agentic*: capable of acting on the world instead of just generating text.

## What it solves

LLMs are powerful but sealed. Without a standard way to give them tools, every product team writes a custom integration for every model they support. MCP is the layer that turns that into a shared interface — the USB-C of agentic tools, as Anthropic describes it.

A model that speaks MCP can:

- Discover available tools via a typed schema
- Negotiate capabilities (e.g. read-only vs read-write)
- Invoke tools with structured input/output
- Stream resources (files, database rows, API responses) through the same connection

## How it works

An MCP server exposes JSON-RPC endpoints. A host (e.g. Claude Desktop, an IDE plugin, an in-app agent runtime) connects to one or more servers and merges their tools into the model's context. The model picks the right tool, the host executes the call, and the result returns into the model's working memory.

```
┌────────────┐       JSON-RPC        ┌──────────────┐
│  LLM host  │ ◄───────────────────► │  MCP server  │
│ (agent)    │   tools + resources   │ (your data)  │
└────────────┘                       └──────────────┘
```

The protocol is transport-agnostic — it runs over stdio (for local tools), HTTP+SSE (for remote tools), and recently streamable HTTP for higher-throughput scenarios.

## Adoption signal

- Public servers from Anthropic, OpenAI, Cloudflare, Notion, Replit, Sourcegraph, Zapier, Linear, JetBrains, and dozens of community projects
- Cross-vendor implementations in Claude, GPT-class models via tool bridges, and most agent frameworks
- Adoption tracked monthly at <https://mcpservers.org> and on leaderboards (varies by ecosystem)

## When to use MCP

Use MCP when:

- You have a data source or tool you want *every* model or agent to reach without writing per-model adapters
- You want runtime safety (typed schemas, capability negotiation) over prompt-engineering
- You expect an ecosystem of third-party clients to integrate against your service

Skip MCP when:

- You're shipping a single-vendor product (just call the model SDK directly)
- Latency is critical and you can fit a tighter custom channel
- The interaction is stateless and one-shot (HTTP + JSON is fine)

## See also

- [[n8n]] — n8n exposes MCP servers out of the box
- [[agentic-workflows]] — the conceptual layer MCP enables
- [[function-calling]] — the lower-level alternative most non-MCP agents use

## Sources

- https://modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/specification
- Anthropic announcement: https://www.anthropic.com/news/model-context-protocol
