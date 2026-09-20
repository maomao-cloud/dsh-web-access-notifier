import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('package exposes all DSH discovery entrypoints', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.exports['./client'], './client.js')
  assert.equal(pkg.exports['./typert'], './typert.host.js')
  assert.equal(pkg.exports['./remote'], './typert.remote-client.js')
  assert.equal(pkg.exports['./package.json'], './package.json')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh.client.platform, 'web')
})
