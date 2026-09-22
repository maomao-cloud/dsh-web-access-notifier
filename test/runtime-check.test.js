import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRuntimeDependencyError, getMissingRuntimeDependencies } from '../scripts/check-runtime.mjs'

test('reports missing runtime dependencies with the profile install command', () => {
  const missing = getMissingRuntimeDependencies(['@deepseek-ai/schemastery', '@deepseek-ai/dsh-typert-protocol'], (name) => {
    if (name === '@deepseek-ai/schemastery') throw new Error('missing')
    return name
  })

  assert.deepEqual(missing, ['@deepseek-ai/schemastery'])
  assert.match(formatRuntimeDependencyError(missing), /pnpm install --prod/)
  assert.match(formatRuntimeDependencyError(missing), /dsh-web-access-notifier/)
})
