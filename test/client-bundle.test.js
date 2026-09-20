import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('client bundle mounts Remote and consumes it through a child scope', () => {
  const run = async () => {
    const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')
    let plugin
    const window = {
      __ModuleLoader__: {
        load(definition) {
          assert.equal(definition.id, 'dsh-web-access-notifier')
          plugin = definition.factory((request) => {
            if (request === 'react') return { createElement() {}, useEffect() {}, useState(value) { return [value, () => {}] } }
            if (request === '@deepseek-ai/dsh-client-ui-primitives') return {
              Button() {}, IconChevronDownOutline14() {}, Input() {}, Switch() {}
            }
            throw new Error(`unexpected client dependency: ${request}`)
          })
        }
      }
    }
    vm.runInNewContext(source, { window, TypeError, Error })
    assert.ok(plugin)
    assert.match(source, /Promise\.allSettled/)
    assert.match(source, /credentials\.describe\(\[FEISHU_WEBHOOK_REF\]\)/)
    assert.match(source, /请重启 DSH 以加载当前 Host/)
    assert.deepEqual(Array.from(plugin.inject), ['remote'])

    let mounted
    const parentRemote = new Proxy({
      $mount(contribution) {
        mounted = contribution
        return Promise.resolve(async () => {})
      }
    }, {
      get(target, key) {
        if (key === 'dsh-web-access-notifier') throw new Error('parent context cannot read self-mounted namespace')
        return target[key]
      }
    })
    const childRemote = {
      credentials: {},
      'dsh-web-access-notifier': { status() {}, configuration() {}, send() {} }
    }
    const ctx = {
      remote: parentRemote,
      inject(dependencies, activate) {
        assert.equal(dependencies.includes('remote.dsh-web-access-notifier'), true)
        activate({
          remote: childRemote,
          settingsScope: { bind() { return {} } },
          slots: { inject() {} }
        })
      }
    }

    await plugin.apply(ctx)
    assert.equal(mounted.package, 'dsh-web-access-notifier')
    assert.deepEqual(Array.from(mounted.descriptors, ({ method }) => method), ['status', 'configuration', 'send'])
    const contract = ({ package: packageName, descriptors }) => ({
      package: packageName,
      descriptors: Array.from(descriptors, (item) => ({
        id: item.id,
        service: item.service,
        namespace: item.namespace,
        method: item.method,
        invocation: { kind: item.invocation.kind },
        parameters: Array.from(item.parameters),
        result: { mode: item.result.mode, typeSymbol: item.result.typeSymbol },
        sourceLocation: { ...item.sourceLocation }
      }))
    })
    assert.deepEqual(contract(mounted), {
      package: 'dsh-web-access-notifier',
      descriptors: [
        {
          id: 'dsh-web-access-notifier#dsh-web-access-notifier/status',
          service: 'dshWebAccessNotifier',
          namespace: 'dsh-web-access-notifier',
          method: 'status',
          invocation: { kind: 'direct' },
          parameters: [],
          result: { mode: 'strict', typeSymbol: 'dsh-web-access-notifier#NotifierStatus' },
          sourceLocation: { file: 'host/index.js', line: 1, column: 1 }
        },
        {
          id: 'dsh-web-access-notifier#dsh-web-access-notifier/configuration',
          service: 'dshWebAccessNotifier',
          namespace: 'dsh-web-access-notifier',
          method: 'configuration',
          invocation: { kind: 'direct' },
          parameters: [],
          result: { mode: 'strict', typeSymbol: 'dsh-web-access-notifier#NotifierConfiguration' },
          sourceLocation: { file: 'host/index.js', line: 1, column: 1 }
        },
        {
          id: 'dsh-web-access-notifier#dsh-web-access-notifier/send',
          service: 'dshWebAccessNotifier',
          namespace: 'dsh-web-access-notifier',
          method: 'send',
          invocation: { kind: 'direct' },
          parameters: [],
          result: { mode: 'strict', typeSymbol: 'dsh-web-access-notifier#SendResult' },
          sourceLocation: { file: 'host/index.js', line: 1, column: 1 }
        }
      ]
    })
  }
  return run()
})
