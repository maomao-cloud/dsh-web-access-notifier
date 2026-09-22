import { createRequire } from 'node:module'

export const HOST_RUNTIME_DEPENDENCIES = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-credentials',
  '@deepseek-ai/dsh-settings',
  '@deepseek-ai/dsh-typert-protocol',
  '@deepseek-ai/schemastery'
]

export function getMissingRuntimeDependencies(
  dependencies = HOST_RUNTIME_DEPENDENCIES,
  resolveDependency = (name) => createRequire(import.meta.url).resolve(name)
) {
  return dependencies.filter((name) => {
    try {
      resolveDependency(name)
      return false
    } catch {
      return true
    }
  })
}

export function formatRuntimeDependencyError(missing) {
  return [
    'dsh-web-access-notifier: missing host runtime dependencies:',
    ...missing.map((name) => `  - ${name}`),
    '',
    'Install them from the plugin directory with:',
    '  pnpm install --prod',
    '',
    'For a DSH profile installation, run:',
    '  dsh plugin --profile web add /absolute/path/to/dsh-web-access-notifier'
  ].join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const missing = getMissingRuntimeDependencies()
  if (missing.length > 0) {
    console.error(formatRuntimeDependencyError(missing))
    process.exitCode = 1
  } else {
    console.log('dsh-web-access-notifier: host runtime dependencies are installed')
  }
}
