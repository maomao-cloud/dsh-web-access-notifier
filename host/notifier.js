import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { FEISHU_WEBHOOK_REF } from './config.js'
import { buildAuthenticatedUrl } from './token-url.js'

function now() { return new Date().toISOString() }
function errorCode(error) { return typeof error?.code === 'string' ? error.code : 'NOTIFIER_ERROR' }

export class Notifier {
  constructor(ctx, { settingsScope, feishuClient, logger = console } = {}) {
    this.ctx = ctx
    this.settingsScope = settingsScope
    this.feishuClient = feishuClient
    this.logger = logger
    this.state = {
      serviceReady: false,
      webhookConfigured: false,
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastErrorCode: null,
      tokenLength: null
    }
  }

  status() {
    return { ...this.state }
  }

  async refreshCredentialState() {
    const credentials = this.ctx.get('credentials')
    if (!credentials) {
      this.state.webhookConfigured = false
      return undefined
    }
    const resolved = await credentials.resolve(credentialRef(FEISHU_WEBHOOK_REF))
    this.state.webhookConfigured = Boolean(resolved?.value)
    return resolved?.value
  }

  async sendNotification({ force = false, type = 'manual' } = {}) {
    const config = this.settingsScope?.get?.() ?? { enabled: true, publicOrigin: '' }
    if (!force && !config.enabled) return { ok: false, skipped: true, reason: 'DISABLED', status: this.status() }
    if (!this.state.serviceReady) throw new Error('DSH Web service is not ready')

    this.state.lastAttemptAt = now()
    this.state.lastErrorCode = null
    try {
      const publicOrigin = String(config.publicOrigin ?? '').trim()
      if (!publicOrigin) throw Object.assign(new Error('publicOrigin is not configured'), { code: 'PUBLIC_ORIGIN_NOT_CONFIGURED' })
      const webhook = await this.refreshCredentialState()
      if (!webhook) throw Object.assign(new Error('Feishu webhook is not configured'), { code: 'WEBHOOK_NOT_CONFIGURED' })
      const baseUrl = `http://127.0.0.1:${String(this.ctx.webServer.port)}`
      const authenticatedUrl = this.ctx.connection.authenticatedUrl(baseUrl)
      const { url, tokenLength } = buildAuthenticatedUrl(authenticatedUrl, publicOrigin)
      this.state.tokenLength = tokenLength
      await this.feishuClient.send(webhook, {
        msg_type: 'text',
        content: { text: `🔐 DSH Web 访问地址已更新\n\n访问地址：\n${url}\n\n更新时间：${new Date().toLocaleString('zh-CN', { timeZoneName: 'short' })}\n通知类型：${type === 'auto' ? '自动启动通知' : '手动发送'}` }
      })
      this.state.lastSuccessAt = now()
      return { ok: true, status: this.status() }
    } catch (error) {
      this.state.lastErrorCode = errorCode(error)
      this.logger.error?.(`dsh-web-access-notifier: notification failed (${this.state.lastErrorCode})`)
      throw Object.assign(new Error(error instanceof Error ? error.message : 'notification failed'), { code: this.state.lastErrorCode })
    }
  }
}
