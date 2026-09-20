import z from '@deepseek-ai/schemastery'
import { normalizePublicOrigin } from './validation.js'

export const SETTINGS_NAMESPACE = 'dsh-web-access-notifier'
export const FEISHU_WEBHOOK_REF = 'feishuWebhookUrl'
export const SettingsSchema = z.object({
  enabled: z.boolean().default(true),
  publicOrigin: z.string().default('')
})

export function validateSettings(value) {
  normalizePublicOrigin(value?.publicOrigin)
}

export { normalizePublicOrigin }
