/**
 * scripts/check-agent-ready.mjs
 *
 * Локальный чеклист агентной читаемости по методологии agent-ready.dev:
 * проверяет наличие и минимальную структуру файлов discovery-поверхностей
 * (S-серия), markdown-зеркал (P15–P17), протоколов (C-серия) и ключевых
 * тегов в index.html (P5–P11, P24, P25).
 *
 * Запуск: node scripts/check-agent-ready.mjs
 * Выход: код 0 при полном прохождении, 1 — при отсутствиях.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
let failures = 0

/** Проверка существования файла. */
function checkFile(relativePath, description) {
  const exists = existsSync(join(root, relativePath))
  if (!exists) failures++
  console.log(`${exists ? 'PASS' : 'FAIL'} S: ${relativePath} — ${description}`)
  return exists
}

/** Проверка регулярки в содержимом файла. */
function checkPattern(relativePath, pattern, checkId, description) {
  if (!existsSync(join(root, relativePath))) {
    failures++
    console.log(`FAIL ${checkId}: ${description} (файл ${relativePath} отсутствует)`)
    return
  }
  const content = readFileSync(join(root, relativePath), 'utf8')
  const ok = pattern.test(content)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${checkId}: ${description}`)
}

/* --- S-серия: discovery-файлы --- */
checkFile('public/llms.txt', 'llms.txt существует (S1)')
checkFile('public/llms-full.txt', 'llms-full.txt существует (L10)')
checkFile('public/AGENTS.md', 'AGENTS.md существует (S12)')
checkFile('public/robots.txt', 'robots.txt существует (S7)')
checkFile('public/sitemap.xml', 'sitemap.xml существует (S8)')
checkFile('public/sitemap.md', 'sitemap.md существует (S10)')
checkFile('public/index.md', 'markdown-зеркало index.md существует (P15)')
checkFile('public/glossary.md', 'glossary.md существует (P14)')
checkFile('public/openapi.json', 'OpenAPI спецификация существует (S15)')
checkFile('public/agent-permissions.json', 'agent-permissions.json существует (C7)')
checkFile('public/.well-known/agent-card.json', 'A2A Agent Card существует (C4)')
checkFile('public/.well-known/agents.json', 'agents.json существует (C6)')
checkFile('public/.well-known/mcp.json', 'MCP Server Card существует (C1)')
checkFile('public/.well-known/api-catalog', 'API Catalog существует (C13)')
checkFile('public/.well-known/agent-skills/index.json', 'Agent Skills Index существует (C15)')

/* --- Структура llms.txt (L1–L5) --- */
checkPattern('public/llms.txt', /^# .+/m, 'L2', 'llms.txt начинается с H1')
checkPattern('public/llms.txt', /^> .+/m, 'L4', 'llms.txt содержит блок-цитату-описание')
checkPattern('public/llms.txt', /^## .+/m, 'L5', 'llms.txt содержит H2-разделы')
checkPattern('public/llms.txt', /- \[.+\]\(.+\)/m, 'L6', 'llms.txt содержит markdown-ссылки')

/* --- Структура AGENTS.md (S13) --- */
checkPattern(
  'public/AGENTS.md',
  /^## Configuration/m,
  'S13',
  'AGENTS.md содержит секцию Configuration',
)
checkPattern('public/AGENTS.md', /^## Usage/m, 'S13', 'AGENTS.md содержит секцию Usage')

/* --- index.html: мета-теги и JSON-LD (P5–P11, P24, P25) --- */
checkPattern('index.html', /rel="canonical"/, 'P5', 'index.html содержит canonical-ссылку')
checkPattern('index.html', /name="description"/, 'P6', 'index.html содержит meta description')
checkPattern('index.html', /property="og:title"/, 'P7', 'index.html содержит og:title')
checkPattern('index.html', /property="og:description"/, 'P8', 'index.html содержит og:description')
checkPattern('index.html', /lang="en"/, 'P9', 'index.html содержит html lang')
checkPattern('index.html', /application\/ld\+json/, 'P10', 'index.html содержит JSON-LD')
checkPattern('index.html', /"@type":\s*"WebApplication"/, 'P11', 'JSON-LD описывает WebApplication')
checkPattern(
  'index.html',
  /rel="alternate"[^>]*text\/markdown/,
  'P17',
  'index.html ссылается на markdown-зеркало',
)
checkPattern(
  'index.html',
  /rel="describedby"[^>]*llms\.txt/,
  'P24',
  'index.html содержит llms.txt discovery link',
)
checkPattern(
  'index.html',
  /max-snippet:-1/,
  'P25',
  'index.html разрешает AI-сниппеты (max-snippet:-1)',
)
checkPattern('index.html', /max-image-preview:large/, 'P25', 'index.html разрешает крупные превью')
/* Prerender-блок: богатый статический текст против P23 */
checkPattern('index.html', /<h1>[\s\S]*<\/h1>/, 'P12', 'index.html содержит статический H1')
checkPattern('index.html', /<main[\s>]/, 'A12', 'index.html содержит main landmark')

/* --- sitemap.xml: lastmod (S9) --- */
checkPattern(
  'public/sitemap.xml',
  /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/,
  'S9',
  'sitemap.xml содержит lastmod',
)

/* --- sitemap.md: заголовки и ссылки (S11) --- */
checkPattern('public/sitemap.md', /^# /m, 'S11', 'sitemap.md содержит H1')
checkPattern('public/sitemap.md', /\[[^\]]+\]\([^)]+\)/, 'S11', 'sitemap.md содержит ссылки')

/* --- Секция Sitemap в markdown-зеркалах (P20) --- */
for (const mirror of ['public/index.md', 'public/glossary.md', 'public/AGENTS.md']) {
  checkPattern(mirror, /^## Sitemap/m, 'P20', `${mirror} содержит секцию Sitemap`)
}

/* --- Глоссарий доступен со страницы (P14) --- */
checkPattern('index.html', /href="\/glossary\.md"/, 'P14', 'index.html ссылается на glossary.md')

/* --- YAML frontmatter в markdown-зеркалах (P16) --- */
for (const mirror of ['public/index.md', 'public/glossary.md']) {
  checkPattern(mirror, /^---/, 'P16', `${mirror} начинается с YAML frontmatter`)
  checkPattern(mirror, /^title: /m, 'P16', `${mirror} frontmatter содержит title`)
  checkPattern(mirror, /^description: /m, 'P16', `${mirror} frontmatter содержит description`)
  checkPattern(mirror, /^last_updated: /m, 'P16', `${mirror} frontmatter содержит last_updated`)
}

console.log(failures === 0 ? '\nВсе проверки пройдены.' : `\nПровалено проверок: ${failures}`)
process.exit(failures === 0 ? 0 : 1)
