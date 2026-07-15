---
title: n8n
category: frameworks
tags: [automation, workflow, fair-code, self-host]
created: '2026-07-15'
updated: '2026-07-15'
summary: Fair-code workflow automation that combines no-code flexibility with code extensibility and native AI agent support.
sources:
  - title: n8n.io
    url: https://n8n.io/
  - title: n8n docs
    url: https://docs.n8n.io/
infobox:
  kind: Workflow automation
  first_release: '2019'
  license: Sustainable Use License (fair-code)
  language: TypeScript, Vue
  repo: https://github.com/n8n-io/n8n
  site: https://n8n.io
---

# n8n

**n8n** ("nodemation") is a fair-code workflow automation tool that bridges no-code and full-code. It ships with hundreds of pre-built integrations and a canvas editor, but every node can be opened as JavaScript or Python when you need custom logic. For the automation economy, n8n matters because it is the tool most non-developers adopt to actually run something.

## What it does

- **Visual workflow canvas** with 400+ pre-built nodes (HTTP, SaaS APIs, databases, AI models, message queues)
- **Native AI agent support** — built-in LangChain nodes, MCP servers (since 2024), and custom agent workflows
- **Self-hostable** under the Sustainable Use License, or SaaS-hosted by n8n
- **Credentials vault** that keeps API keys out of workflow JSON
- **Triggers** (webhooks, schedules, pollers, email, queue) and **error workflows** for retries

## Why it matters

For builders, n8n is the lowest-friction way to attach a real workflow to an LLM — wrap an HTTP-call node and a prompt template in a LangChain agent node, point an MCP server at it, and you've shipped a production-grade automation. For non-developers, n8n replaces Zapier/Make when you need code-level control without writing a CLI script.

## Hosting options

| | Self-host | n8n Cloud |
|---|---|---|
| License cost | Sustainable Use License (free for self, paid for resale) | Subscription per execution |
| Operational burden | You run the Docker container + DB + reverse proxy | None |
| Best for | Teams with a platform function; agencies reselling | Most product teams |

## See also

- [[model-context-protocol]] — MCP server implementation in n8n
- [[zapier]] — the main consumer alternative
- [[make]] — visual competitor

## Sources

- https://n8n.io/
- https://docs.n8n.io/
- https://github.com/n8n-io/n8n
