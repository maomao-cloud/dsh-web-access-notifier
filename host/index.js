import z from '@deepseek-ai/schemastery'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { FeishuClient } from './feishu-client.js'
import { Notifier } from './notifier.js'
import { SETTINGS_NAMESPACE, SettingsSchema, validateSettings } from './config.js'

export const name = 'dsh-web-access-notifier'
export const inject = ['webServer', 'connection']
export const Config = z.object({
  enabled: z.boolean().default(true),
  publicOrigin: z.string().default(''),
  timeoutMs: z.natural().min(100).max(120_000).default(8_000)
})

const SERVICE_KEY = 'dshWebAccessNotifier'
const rootsNotified = new WeakSet()

export class DshWebAccessNotifier extends TypertRemoteService {
  constructor(ctx, config = {}) {
    super(ctx, SERVICE_KEY, { namespace: 'dsh-web-access-notifier' })
    this.ctx = ctx
    this.config = config
    this.settingsScope = ctx.get('settings')?.register(SETTINGS_NAMESPACE, SettingsSchema, {
      base: { enabled: config.enabled ?? true, publicOrigin: config.publicOrigin ?? '' },
      validate: validateSettings
    })
    this.notifier = new Notifier(ctx, {
      settingsScope: this.settingsScope,
      feishuClient: new FeishuClient({ timeoutMs: config.timeoutMs ?? 8_000 }),
      logger: console
    })
  }

  status() {
    return this.notifier.status()
  }

  async send() {
    return this.notifier.sendNotification({ force: true, type: 'manual' })
  }

  async autoNotify() {
    if (rootsNotified.has(this.ctx.root)) return
    rootsNotified.add(this.ctx.root)
    try {
      await this.notifier.sendNotification({ force: false, type: 'auto' })
    } catch (error) {
      // 自动通知是 best-effort，绝不能让 DSH 主进程启动失败。
      console.error(`dsh-web-access-notifier: automatic notification failed (${error?.code ?? 'NOTIFIER_ERROR'})`)
    }
  }
}

export function apply(ctx, config = {}) {
  const serviceConfig = {
    enabled: config.enabled ?? true,
    publicOrigin: config.publicOrigin ?? '',
    timeoutMs: config.timeoutMs ?? 8_000
  }
  ctx.plugin(DshWebAccessNotifier, serviceConfig)
  ctx.inject(['connection', 'webServer'], (readyCtx) => {
    const service = readyCtx.get(SERVICE_KEY)
    const settled = readyCtx.get('loader')?.await()
    const ready = () => {
      if (!service || readyCtx.get('webServer') === undefined || readyCtx.get('connection') === undefined) return
      service.notifier.state.serviceReady = true
      void service.autoNotify()
    }
    if (settled === undefined) ready()
    else settled.then(ready, (error) => {
      console.error(`dsh-web-access-notifier: loader did not settle (${error?.message ?? 'unknown error'})`)
    })
  })
}

export { buildAuthenticatedUrl } from './token-url.js'
export { FeishuClient, FeishuSendError } from './feishu-client.js'
export { normalizePublicOrigin } from './config.js'
