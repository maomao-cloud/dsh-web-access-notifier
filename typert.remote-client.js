import { z } from 'zod'

const statusSchema = z.object({
  serviceReady: z.boolean(),
  webhookConfigured: z.boolean(),
  lastAttemptAt: z.string().nullable(),
  lastSuccessAt: z.string().nullable(),
  lastErrorCode: z.string().nullable(),
  tokenLength: z.number().nullable()
})

const sendResultSchema = z.object({ ok: z.literal(true), status: statusSchema })
const configurationSchema = z.object({
  enabled: z.boolean(),
  hostName: z.string(),
  publicOrigin: z.string(),
  webhookUrl: z.string()
})
const descriptor = (method, schema, typeSymbol) => ({
  id: `dsh-web-access-notifier#dsh-web-access-notifier/${method}`,
  service: 'dshWebAccessNotifier',
  namespace: 'dsh-web-access-notifier',
  method,
  invocation: { kind: 'direct' },
  parameters: [],
  result: { mode: 'strict', typeSymbol, schema },
  sourceLocation: { file: 'host/index.js', line: 1, column: 1 }
})

export const TYPERT_REMOTE = {
  package: 'dsh-web-access-notifier',
  descriptors: [
    descriptor('status', statusSchema, 'dsh-web-access-notifier#NotifierStatus'),
    descriptor('configuration', configurationSchema, 'dsh-web-access-notifier#NotifierConfiguration'),
    descriptor('send', sendResultSchema, 'dsh-web-access-notifier#SendResult')
  ]
}

export default TYPERT_REMOTE
