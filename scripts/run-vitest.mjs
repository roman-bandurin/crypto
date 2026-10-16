import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
// Канонический регистр пути предотвращает двойную загрузку ESM на Windows.
const entry = realpathSync.native(
  join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'),
)
const result = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], {
  stdio: 'inherit',
})

if (result.error) {
  console.error(result.error)
}
process.exit(result.status ?? 1)
