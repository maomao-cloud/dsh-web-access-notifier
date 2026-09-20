import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePublicOrigin } from '../host/validation.js'
import { buildAuthenticatedUrl } from '../host/token-url.js'
import { FeishuClient } from '../host/feishu-client.js'

function response(status, body = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

test('normalizes a public origin and rejects path/query/credentials', () => {
  assert.equal(normalizePublicOrigin('https://dsh.example.com/'), 'https://dsh.example.com')
  assert.equal(normalizePublicOrigin('http://dsh.example.com:3080/'), 'http://dsh.example.com:3080')
  for (const value of ['ftp://dsh.example.com', 'https://user:pass@dsh.example.com', 'https://dsh.example.com/path', 'https://dsh.example.com/?token=x']) {
    assert.throws(() => normalizePublicOrigin(value))
  }
})

test('rewrites only the origin and preserves the current process token', () => {
  const result = buildAuthenticatedUrl('http://127.0.0.1:3080/?token=process-token', 'https://dsh.example.com')
  assert.equal(result.url, 'https://dsh.example.com/?token=process-token')
  assert.equal(result.tokenLength, 13)
  assert.throws(() => buildAuthenticatedUrl('http://127.0.0.1:3080/', 'https://dsh.example.com'), /token/)
})

test('retries transient Feishu failures and succeeds', async () => {
  let attempts = 0
  const waits = []
  const client = new FeishuClient({
    delaysMs: [0, 5, 30],
    sleep: async (ms) => waits.push(ms),
    fetchImpl: async () => {
      attempts += 1
      return attempts < 3 ? response(503) : response(200, { code: 0 })
    }
  })
  await client.send('https://open.feishu.cn/hook/opaque', { msg_type: 'text' })
  assert.equal(attempts, 3)
  assert.deepEqual(waits, [5, 30])
})

test('does not expose webhook or token in status-shaped state', async () => {
  const client = new FeishuClient({ fetchImpl: async () => response(200) })
  assert.deepEqual(await client.send('https://open.feishu.cn/hook/opaque', {}), { ok: true })
  const state = { serviceReady: true, webhookConfigured: true, tokenLength: 40, lastErrorCode: null }
  assert.equal(JSON.stringify(state).includes('opaque'), false)
  assert.equal(JSON.stringify(state).includes('process-token'), false)
})
