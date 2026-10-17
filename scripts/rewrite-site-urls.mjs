/**
 * scripts/rewrite-site-urls.mjs
 *
 * Штампует абсолютный канонический URL сайта в статические артефакты
 * после сборки: sitemap.xml, канонический тег и ссылки в index.html.
 * Вызывается из .github/workflows/deploy-pages.yml:
 *
 *   node scripts/rewrite-site-urls.mjs dist "/<repo>/" "https://owner.github.io/<repo>"
 *
 * Локальные сборки (без скрипта) остаются с относительными URL.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [, , distArg = 'dist', baseArg = '/', siteUrlArg = ''] = process.argv

const base = baseArg.replace(/\/+$/, '') // '/repo' или ''
const siteUrl = siteUrlArg.replace(/\/+$/, '') // 'https://owner.github.io/repo' или ''
const origin = siteUrl || base // база для абсолютных ссылок
const dist = join(process.cwd(), distArg)

/** Рекурсивно собирает все файлы в каталоге. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

let touched = 0

for (const file of walk(dist)) {
  const name = file.replaceAll('\\', '/')
  let content = readFileSync(file, 'utf8')
  const original = content

  if (name.endsWith('/sitemap.xml')) {
    // __SITE_URL__ стоит в начале каждого <loc>, после него идёт /path.
    // Подставляем origin без завершающего слеша: '/repo' + '/llms.txt'.
    content = content.replaceAll('__SITE_URL__', origin)
  }

  if (name.endsWith('/index.html')) {
    if (origin) {
      content = content.replaceAll(
        'href="/" data-canonical-base="1"',
        `href="${origin}/" data-canonical-base="1"`,
      )
      // JSON-LD: относительный url не является валидным Schema.org URL
      // (Agent Ready P11: invalid-url) — штампуем абсолютный.
      content = content.replaceAll('"url": "/"', `"url": "${origin}/"`)
      // Относительные ссылки статических поверхностей превращаем в
      // абсолютные, чтобы сканер гарантированно резолвил их.
      content = content.replaceAll(
        /href="\/(llms\.txt|llms-full\.txt|AGENTS\.md|index\.md|glossary\.md|openapi\.json|sitemap\.md)"/g,
        `href="${origin}/$1"`,
      )
    }
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8')
    touched++
    console.log(`rewrote: ${name}`)
  }
}

console.log(
  `rewrite-site-urls: base="${baseArg}" siteUrl="${siteUrl || '(relative)'}", files touched: ${touched}`,
)
