---
title: 'Glossary — Crypto Web Crypto API Playground'
description: 'Terms used in the agent-facing documentation of the crypto playground: algorithms, key formats, agent tools and protocol surfaces.'
last_updated: '2026-10-17'
---

# Glossary

Short definitions of the terms used across the agent-facing surfaces of this
application. The domain-wide glossary lives at
[glossary.md](/../glossary.md); this file covers app-specific vocabulary.

## Cryptography

- **DIGEST** — SHA-1, SHA-256, SHA-384 or SHA-512 hash of arbitrary text, rendered
  as a lowercase hex string.
- **AES-CBC / AES-CTR / AES-GCM** — symmetric ciphers; keys are 128, 192 or 256 bits
  and the ciphertext embeds a random 128-bit IV as a hex prefix.
- **RSA-OAEP** — asymmetric encryption with a public/private key pair, SHA-1..SHA-512,
  512..4096-bit keys.
- **RSASSA-PKCS1-v1_5 / RSA-PSS / ECDSA** — signature schemes; sign with the private
  key, verify with the public key. ECDSA supports curves P-256, P-384, P-521.
- **HMAC** — keyed message authentication code over SHA-1..SHA-512.
- **IV prefix** — the hex initialization vector prepended to AES ciphertext.
- **SPKI / PKCS#8** — ASN.1 key structures used when importing raw-hex asymmetric
  keys into the Web Crypto API.

## Agent surfaces

- **WebMCP** — W3C in-page tool context exposed through `navigator.modelContext`;
  described by [/.well-known/mcp.json](/.well-known/mcp.json).
- **OpenAI function calling** — the tool-calling protocol the in-app chat speaks to
  any OpenAI-compatible endpoint (LM Studio, Ollama, hosted APIs).
- **Agent tools** — the five registered tools: `list_algorithms`, `compute_digest`,
  `generate_keys`, `encrypt_or_sign`, `decrypt_or_verify`.
- **agent-permissions.json** — the allow-list of client-side operations an agent may
  trigger ([/agent-permissions.json](/agent-permissions.json)).
- **A2A agent card** — agent profile per a2a.proto
  ([/.well-known/agent-card.json](/.well-known/agent-card.json)).
- **agents.json** — wildcard manifest of agent and tool chains
  ([/.well-known/agents.json](/.well-known/agents.json)).
- **API catalog** — RFC 9727 resource catalog
  ([/.well-known/api-catalog](/.well-known/api-catalog)).

## Data formats

- **Hex string** — lowercase hexadecimal encoding used for every key, digest,
  ciphertext and signature exchanged with agents.
- **Round trip** — encrypt then decrypt (or sign then verify) with the same inputs,
  required for every new crypto behaviour by the project's tests.

## Sitemap

See [sitemap.md](/sitemap.md) for a structured map of all agent-readable surfaces,
[openapi.json](/openapi.json) for the machine-readable contract, and
[llms-full.txt](/llms-full.txt) for the full documentation.
