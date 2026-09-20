import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('client bundle mounts its Remote namespace before using it', async () => {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')
  let plugin
  const window = {
    __ModuleLoader__: {
      load(definition) {
        assert.equal(definition.id, 'dsh-web-access-notifier')
        plugin = definition.factory((request) => {
          assert.equal(request, 'react')
          return { createElement() {}, useEffect() {}, useState(value) { return [value, () => {}] } }
        })
      }
    }
  }
  vm.runInNewContext(source, { window, TypeError, Error })
  assert.ok(plugin)
  assert.equal(plugin.inject.includes('remote.dsh-web-access-notifier'), false)

  let mounted
  const remote = {
    credentials: {},
    async $mount(contribution) {
      mounted = contribution
      this['dsh-web-access-notifier'] = { status() {}, send() {} }
      return async () => {}
    }
  }
  const ctx = {
    remote,
    settingsScope: { bind() { return {} } },
    slots: { inject() {} }
  }
  await plugin.apply(ctx)
  assert.equal(mounted.package, 'dsh-web-access-notifier')
  assert.deepEqual(Array.from(mounted.descriptors, ({ method }) => method), ['status', 'send'])
})
