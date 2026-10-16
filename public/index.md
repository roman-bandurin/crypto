---
title: 'Crypto — Web Crypto API Playground & Agentic Tool Server'
description: 'Browser-based cryptographic playground with 9 Web Crypto algorithms, an AI agent chat with function calling, and W3C WebMCP tools. Everything runs client-side.'
last_updated: '2026-10-15'
---

# Crypto — Web Crypto API Playground & Agentic Tool Server

A browser application for hands-on cryptography: pick an algorithm, generate keys, encrypt, decrypt, sign and verify — all through the native Web Crypto API in the browser. The same operations are exposed to AI agents via W3C WebMCP (`navigator.modelContext`) and an in-app chat that speaks the OpenAI tool-calling protocol.

## Supported Algorithms

The app ships nine algorithms grouped as follows:

```json
{
  "hashing": ["DIGEST"],
  "symmetric": ["AES-CBC", "AES-CTR", "AES-GCM"],
  "asymmetricEncryption": ["RSA-OAEP"],
  "signatures": ["RSASSA-PKCS1-v1_5", "RSA-PSS", "ECDSA"],
  "mac": ["HMAC"]
}
```

- **DIGEST** — SHA-1, SHA-256, SHA-384, SHA-512 hex digests.
- **AES-CBC / AES-CTR / AES-GCM** — 128, 192 or 256-bit keys; ciphertext embeds a hex IV prefix.
- **RSA-OAEP** — asymmetric encryption, SHA-1..SHA-512, 512..4096-bit keys.
- **RSASSA-PKCS1-v1_5 / RSA-PSS / ECDSA** — sign and verify with SHA-1..SHA-512 (ECDSA curves P-256, P-384, P-521).
- **HMAC** — keyed message authentication, SHA-1..SHA-512.

All keys and outputs are lowercase hex strings; asymmetric keys import as raw hex (SPKI public / PKCS#8 private).

## Agent Tools

Five tools are registered for both WebMCP and OpenAI function calling: `list_algorithms`, `compute_digest`, `generate_keys`, `encrypt_or_sign`, `decrypt_or_verify`. Schemas and handlers live in `src/agent/toolRegistry.ts`; every handler is a pure client-side Web Crypto call — read-only, idempotent, no network access.

## AI Chat

The floating chat panel (bottom-right button or Alt+A) connects to any OpenAI-compatible endpoint. Default base URL: `http://localhost:1234/v1` (LM Studio). When the model requests a tool, the browser executes it locally and renders a result card with copyable keys and ciphertext.

## Code Blocks

Key generation example (the tool `generate_keys` with AES-GCM 256):

```json
{ "algorithm": "AES-GCM", "length": 256 }
```

Encryption round-trip (tool calls executed by the browser):

```json
{ "tool": "encrypt_or_sign", "arguments": { "algorithm": "AES-GCM", "text": "hello", "autoGenerateKey": true } }
{ "tool": "decrypt_or_verify", "arguments": { "algorithm": "AES-GCM", "ciphertextOrSignature": "<output>", "key": "<private>" } }
```

## Sitemap

See [sitemap.md](/sitemap.md) for a structured map of all agent-readable surfaces, and [llms-full.txt](/llms-full.txt) for the full documentation.
