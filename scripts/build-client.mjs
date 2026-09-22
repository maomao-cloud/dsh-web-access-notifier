import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = new URL('..', import.meta.url)
const tempDir = await mkdtemp(join(tmpdir(), 'dsh-web-access-notifier-client-'))

try {
  const result = spawnSync('pnpm', [
    'exec', 'tsdown', 'client/index.js',
    '--no-config',
    '--format', 'cjs',
    '--platform', 'browser',
    '--out-dir', tempDir,
    '--no-sourcemap',
    '--no-dts',
    '--logLevel', 'error'
  ], { cwd: new URL('.', root), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    process.exit(result.status ?? 1)
  }

  const compiled = await readFile(join(tempDir, 'index.cjs'), 'utf8')
  const body = compiled
    .replace(/^Object\.defineProperty\(exports, Symbol\.toStringTag, \{ value: 'Module' \}\);\n/, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .trimEnd()
  const bundle = `window.__ModuleLoader__.load({\n  id: 'dsh-web-access-notifier',\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n${body}\n    return module.exports;\n  }\n});\n`
  await writeFile(new URL('../client/client.js', import.meta.url), bundle)
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
