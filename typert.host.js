import { z } from 'zod'

const statusSchema = z.object({
  serviceReady: z.boolean(),
  webhookConfigured: z.boolean(),
  lastAttemptAt: z.string().nullable(),
  lastSuccessAt: z.string().nullable(),
  lastErrorCode: z.string().nullable(),
  tokenLength: z.number().nullable()
})

const sendResultSchema = z.object({
  ok: z.literal(true),
  status: statusSchema
})

const method = (name, result, typeSymbol) => ({
  id: `dsh-web-access-notifier#dsh-web-access-notifier/${name}`,
  service: 'dshWebAccessNotifier',
  namespace: 'dsh-web-access-notifier',
  method: name,
  invocation: { kind: 'direct' },
  parameters: [],
  result: {
    mode: 'strict',
    typeSymbol,
    schema: result
  },
  sourceLocation: { file: 'host/index.js', line: 1, column: 1 }
})

export const TYPERT = {
  package: 'dsh-web-access-notifier',
  face: 'host',
  schemas: [],
  model: {
    services: [{
      key: 'dshWebAccessNotifier',
      exportName: 'DshWebAccessNotifier',
      description: 'DSH Web access notification controls.',
      tags: [],
      members: [
        { kind: 'method', name: 'status', signature: 'status(): NotifierStatus' },
        { kind: 'method', name: 'send', signature: 'send(): Promise<SendResult>' }
      ],
      types: [
        { name: 'NotifierStatus', declaration: 'interface NotifierStatus { serviceReady: boolean; webhookConfigured: boolean; lastAttemptAt: string | null; lastSuccessAt: string | null; lastErrorCode: string | null; tokenLength: number | null }' },
        { name: 'SendResult', declaration: 'interface SendResult { ok: true; status: NotifierStatus }' }
      ]
    }],
    events: [],
    objects: []
  },
  invocations: [
    method('status', statusSchema, 'dsh-web-access-notifier#NotifierStatus'),
    method('send', sendResultSchema, 'dsh-web-access-notifier#SendResult')
  ]
}
