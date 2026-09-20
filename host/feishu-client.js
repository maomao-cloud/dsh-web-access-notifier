const DEFAULT_DELAYS_MS = [0, 5_000, 30_000]

export class FeishuSendError extends Error {
  constructor(code, message, options = {}) {
    super(message, options)
    this.name = 'FeishuSendError'
    this.code = code
    this.retryable = options.retryable ?? false
  }
}

function classifyError(error) {
  if (error instanceof FeishuSendError) return error
  if (error?.name === 'AbortError') return new FeishuSendError('FEISHU_TIMEOUT', 'Feishu request timed out', { retryable: true, cause: error })
  return new FeishuSendError('FEISHU_NETWORK_ERROR', 'Feishu request failed', { retryable: true, cause: error })
}

export class FeishuClient {
  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 8_000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), delaysMs = DEFAULT_DELAYS_MS } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch is required')
    this.fetchImpl = fetchImpl
    this.timeoutMs = timeoutMs
    this.sleep = sleep
    this.delaysMs = delaysMs
  }

  async send(webhookUrl, payload) {
    if (!webhookUrl) throw new FeishuSendError('WEBHOOK_NOT_CONFIGURED', 'Feishu webhook is not configured')
    let lastError
    for (let attempt = 0; attempt < this.delaysMs.length; attempt += 1) {
      if (this.delaysMs[attempt] > 0) await this.sleep(this.delaysMs[attempt])
      try {
        return await this.sendOnce(webhookUrl, payload)
      } catch (error) {
        const classified = classifyError(error)
        lastError = classified
        if (!classified.retryable || attempt === this.delaysMs.length - 1) throw classified
      }
    }
    throw lastError ?? new FeishuSendError('FEISHU_SEND_FAILED', 'Feishu request failed')
  }

  async sendOnce(webhookUrl, payload) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchImpl(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      if (!response.ok) {
        throw new FeishuSendError(`FEISHU_HTTP_${response.status}`, `Feishu returned HTTP ${response.status}`, { retryable: response.status >= 500 || response.status === 429 })
      }
      let body
      try { body = await response.json() } catch { body = undefined }
      if (body && typeof body === 'object' && Number(body.code ?? 0) !== 0) {
        throw new FeishuSendError('FEISHU_BUSINESS_ERROR', 'Feishu rejected the message', { retryable: false })
      }
      return { ok: true }
    } finally {
      clearTimeout(timer)
    }
  }
}
