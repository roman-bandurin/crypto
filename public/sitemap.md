# Sitemap

A structured map of every agent-readable surface published by this site.

## Application

- [Crypto playground (app)](/): algorithm select, key generation, encryption, decryption, signing, verification, guided tour, AI chat.

## Discovery files

- [llms.txt](/llms.txt): short LLM-facing directory
- [llms-full.txt](/llms-full.txt): full documentation in llmstxt.org format
- [AGENTS.md](/AGENTS.md): agent instructions (configuration, usage, architecture, testing)
- [index.md](/index.md): markdown mirror of the application page
- [sitemap.md](/sitemap.md): this file
- [sitemap.xml](/sitemap.xml): XML sitemap with lastmod dates

## API and agent protocols

- [openapi.json](/openapi.json): OpenAPI 3.1 contract for the client-side crypto surface
- [agent-permissions.json](/agent-permissions.json): allowed client-side operations
- [.well-known/agent-card.json](/.well-known/agent-card.json): A2A agent card (a2a.proto v1.0.0)
- [.well-known/agents.json](/.well-known/agents.json): wildcard agents manifest (agents.json v0.1.0)
- [.well-known/mcp.json](/.well-known/mcp.json): MCP server card describing the in-page WebMCP surface
- [.well-known/api-catalog](/.well-known/api-catalog): RFC 9727 API catalog
- [.well-known/agent-skills/index.json](/.well-known/agent-skills/index.json): agent skills discovery index

## Documentation sections

- [Overview](/llms-full.txt#overview): what the app does and how agents interact with it
- [Supported algorithms](/llms-full.txt#supported-algorithms): methods, key lengths, generation flags
- [Data formats](/llms-full.txt#data-formats): hex encoding, IV prefixes, key import formats
- [Agent tools](/llms-full.txt#agent-tools-webmcp-and-openai-function-calling): the five registered tools and their schemas
- [AI chat configuration](/llms-full.txt#ai-chat-configuration): LM Studio, Ollama, OpenAI-compatible endpoints
