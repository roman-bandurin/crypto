# AGENTS.md

Instructions for AI agents (coding assistants, browser agents, MCP clients) working with this web app.

> Coding agents modifying this repository should follow the root `AGENTS.md` —
> it documents the toolchain, validation workflow and code rules. This file
> documents the deployed web app and its agent-facing contract.

## Configuration

- Package manager: npm (`package-lock.json` committed). Node 22+.
- Framework: Vue 3 (`<script setup>` + TypeScript strict), Vuetify 4.2, VueUse 15, vue-i18n 11, Vite+ 1.2 (Rolldown-powered core).
- Tests: Vitest 5 (`npm test`), environment `node` with happy-dom polyfills via `src/__tests__/setup.ts`.
- Lint/format: Oxlint and Oxfmt, configured in the `lint` and `fmt` blocks of `vite.config.mts` (no `.eslintrc` or `.prettierrc`). Run `npm run lint` and `npm run format:check` before committing.
- Dead code: `npm run knip` must stay clean.
- Build: `npm run build` runs type-check (`vue-tsc --build`) and `vp build` in parallel.
- GitHub Pages: build sets `base` from `VITE_BASE_PATH`; `scripts/rewrite-site-urls.mjs` stamps the canonical site URL (`VITE_SITE_URL`) into `sitemap.xml` and JSON manifests in `dist/`.

## Usage

- `npm run dev` — dev server on port 3000.
- `npm run build && npm run preview` — production build preview.
- The app is a single page: algorithm select, method/key-length selects, sender/recipient columns with key generation, encrypt/decrypt actions, and an optional guided tour (Alt+T).
- AI chat: floating button bottom-right (or Alt+A). Configure base URL, API key and model in the chat settings; defaults target LM Studio at `http://localhost:1234/v1`.

## Architecture

```
src/
├── agent/            # tool registry, WebMCP registration, LLM client, AI settings
├── components/
│   ├── ai/           # floating AI chat dialog (v-bottom-sheet/v-dialog)
│   ├── layout/       # AppLayout (app bar, theme/language switchers, FAB)
│   └── workspace/    # CryptoWorkspace: the crypto form
├── composables/      # useTheme, useLocale, useTour
├── crypto/           # pure Web Crypto providers (no Vue, no i18n)
├── domain/           # algorithm catalog, form model (refs + rules)
├── i18n/locales/     # ru.ts, en.ts — add every user-facing string here
└── plugins/          # vuetify setup
```

Dependency rule (strictly downward): components → domain/crypto; `agent/` may import crypto/domain only; the crypto layer never imports Vue.

## WebMCP Tools

The page registers five tools via `navigator.modelContext.provideContext` when the API is present: `list_algorithms`, `compute_digest`, `generate_keys`, `encrypt_or_sign`, `decrypt_or_verify`. Schemas live in `src/agent/toolRegistry.ts`; do not register tools anywhere else. All handlers are client-side only and must stay read-only and idempotent.

## Testing

- `npm test` — unit tests (components, crypto round-trips, property tests with fast-check, agent tools).
- New crypto or agent behavior requires a round-trip test (encrypt→decrypt, sign→verify) mirroring `src/__tests__/crypto-workspace.spec.ts`.
- Keep `passWithNoTests` off for new suites; name files `*.spec.ts` under `src/__tests__/`.
