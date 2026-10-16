/**
 * Сборка контекстного бандла репозитория для передачи агенту без доступа к коду.
 *
 * Обёртка над repomix: repomix выбирает файлы (gitignore, include/ignore из
 * repomix.config.json, отсечение бинарников, security check), а скрипт
 * применяет жёсткие лимиты размера и собирает предсказуемый markdown-бандл
 * с манифестом. Лимиты — единственная логика, которую нельзя делегировать
 * repomix: они гарантируют, что бандл влезет в контекстное окно агента.
 *
 * Использование:
 *   node scripts/build-context.mjs              # запись в .agentic/context.md
 *   node scripts/build-context.mjs --stdout     # вывод в консоль, без записи
 *
 * История рабочего дерева (2026-10-16): каталоги plans/ и docs/ перемещены
 * из репозитория — флаг --include-plans и OPTIONAL_DIRS удалены вместе с ними;
 * корневой env.d.ts удалён как дубликат src/env.d.ts.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_DIR = '.agentic'
const OUTPUT_FILE = 'context.md'

// Whitelist источников. Каталоги превращаются в glob-паттерны для
// `repomix --include`. Каталоги plans/ и docs/ перемещены из репозитория
// (2026-10-16) и в бандл больше не включаются.
const INCLUDED_DIRS = ['src', 'scripts', 'public']
const INCLUDED_FILES = [
  '.editorconfig',
  '.gitignore',
  'AGENTS.md',
  'index.html',
  'knip.json',
  'package.json',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.mts',
]

// Жёсткие лимиты размера. repomix умеет лишь падать по токен-бюджету
// (--token-budget), а здесь бандл обрезается до гарантированного объёма.
const MAX_FILE_BYTES = 120_000
const MAX_TOTAL_BYTES = 400_000

// Страховка поверх security check repomix: пропуск файлов с секретами
// или локальными переопределениями в имени.
const SECRET_PATTERNS = [
  /\.env(\..+)?$/i,
  /(^|[\\/])[^\\/]*(secret|credential|token|password|apikey|api-key)[^\\/]*$/i,
]

const args = new Set(process.argv.slice(2))
const toStdout = args.has('--stdout')

const includePatterns = [...INCLUDED_DIRS.map((dir) => `${dir}/**`), ...INCLUDED_FILES]

/** Запускает repomix в JSON-режиме и возвращает пары [путь, содержимое]. */
function packWithRepomix() {
  // Пакет repomix экспортирует только публичные subpath, поэтому путь к CLI
  // собирается напрямую от node_modules (bin объявлен в package.json пакета).
  const repomixBin = join(ROOT, 'node_modules', 'repomix', 'bin', 'repomix.cjs')
  if (!existsSync(repomixBin)) {
    throw new Error(`repomix CLI not found at ${repomixBin}; run "npm install" first`)
  }
  const result = spawnSync(
    process.execPath,
    [repomixBin, '--style', 'json', '--stdout', '--quiet', '--include', includePatterns.join(',')],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )

  if (result.error) throw new Error(`repomix failed to start: ${result.error.message}`)
  if (result.status !== 0) {
    throw new Error(`repomix exited with code ${result.status}: ${result.stderr.trim()}`)
  }

  const packed = JSON.parse(result.stdout.replace(/^\uFEFF/, ''))
  return Object.entries(packed.files)
}

const fenceLanguage = (relativePath) => {
  if (relativePath.endsWith('.vue')) return 'vue'
  if (relativePath.endsWith('.json')) return 'json'
  if (relativePath.endsWith('.yml')) return 'yaml'
  if (relativePath.endsWith('.md')) return 'markdown'
  if (relativePath.endsWith('.css')) return 'css'
  if (relativePath.endsWith('.scss') || relativePath.endsWith('.sass')) return 'scss'
  if (relativePath.endsWith('.mjs') || relativePath.endsWith('.js')) return 'javascript'
  if (relativePath.endsWith('.ts')) return 'typescript'
  return ''
}

/** Формирует список файлов бандла с учётом лимитов и секретов. */
function collectBundleFiles(entries) {
  return entries
    .map(([relativePath]) => relativePath)
    .filter((relativePath) => !SECRET_PATTERNS.some((pattern) => pattern.test(relativePath)))
    .sort()
}

function buildBundle() {
  const entries = packWithRepomix()
  const files = collectBundleFiles(entries)
  const contents = new Map(entries)

  const sections = []
  let totalBytes = 0
  const skipped = []

  sections.push('# Repository context bundle')
  sections.push('')
  sections.push(`Generated from the repository root. Files: ${files.length}.`)
  sections.push('')
  sections.push('## File manifest')
  sections.push('')
  for (const relativePath of files) sections.push(`- ${relativePath}`)
  sections.push('')

  for (const relativePath of files) {
    const content = contents.get(relativePath) ?? ''
    const size = Buffer.byteLength(content, 'utf8')
    if (size > MAX_FILE_BYTES) {
      skipped.push(`${relativePath} (too large: ${size} bytes)`)
      continue
    }
    if (totalBytes + size > MAX_TOTAL_BYTES) {
      skipped.push(`${relativePath} (total size limit reached)`)
      continue
    }
    totalBytes += size

    sections.push(`## ${relativePath}`)
    sections.push('')
    sections.push('```' + fenceLanguage(relativePath))
    sections.push(content.replace(/\s+$/, ''))
    sections.push('```')
    sections.push('')
  }

  if (skipped.length > 0) {
    sections.push('## Skipped')
    sections.push('')
    for (const entry of skipped) sections.push(`- ${entry}`)
    sections.push('')
  }

  return { bundle: sections.join('\n'), skipped, totalBytes, fileCount: files.length }
}

const { bundle, skipped, totalBytes, fileCount } = buildBundle()

if (toStdout) {
  console.log(bundle)
  process.exit(0)
}

const outputDirectory = join(ROOT, OUTPUT_DIR)
mkdirSync(outputDirectory, { recursive: true })
const outputPath = join(outputDirectory, OUTPUT_FILE)
writeFileSync(outputPath, bundle, 'utf8')

console.log(`Context bundle written to ${OUTPUT_DIR}/${OUTPUT_FILE}`)
console.log(`Files: ${fileCount}, bytes: ${totalBytes}, skipped: ${skipped.length}`)
