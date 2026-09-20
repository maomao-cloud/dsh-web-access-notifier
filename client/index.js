import React, { useEffect, useState } from 'react'
import { TYPERT_REMOTE } from '../typert.remote-client.js'

const SETTINGS_NAMESPACE = 'dsh-web-access-notifier'
const FEISHU_WEBHOOK_REF = 'feishuWebhookUrl'
const REMOTE_NAMESPACE = 'dsh-web-access-notifier'

function unwrapRemote(result) {
  if (result?.ok === true) return result.value
  if (result?.ok === false) throw result.error
  throw new Error('Invalid DSH Remote response')
}

function Card({ scope, remote, credentials }) {
  const snapshot = scope.getSnapshot()
  const value = snapshot.value ?? { enabled: true, publicOrigin: '' }
  const [enabled, setEnabled] = useState(Boolean(value.enabled))
  const [publicOrigin, setPublicOrigin] = useState(value.publicOrigin ?? '')
  const [webhook, setWebhook] = useState('')
  const [webhookConfigured, setWebhookConfigured] = useState(false)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => scope.subscribe(() => {
    const next = scope.getSnapshot().value ?? { enabled: true, publicOrigin: '' }
    setEnabled(Boolean(next.enabled))
    setPublicOrigin(next.publicOrigin ?? '')
  }), [scope])

  useEffect(() => {
    let active = true
    Promise.all([
      remote.configuration().then(unwrapRemote),
      remote.status().then(unwrapRemote)
    ]).then(([configuration, nextStatus]) => {
      if (!active) return
      setEnabled(Boolean(configuration.enabled))
      setPublicOrigin(configuration.publicOrigin ?? '')
      setWebhook(configuration.webhookUrl ?? '')
      setWebhookConfigured(Boolean(configuration.webhookUrl))
      setStatus(nextStatus)
    }).catch((error) => active && setMessage(error?.message ?? '读取插件状态失败'))
    return () => { active = false }
  }, [credentials, remote])

  async function save() {
    setBusy(true); setMessage('')
    try {
      await scope.mutate([
        { op: 'set', path: ['enabled'], value: enabled },
        { op: 'set', path: ['publicOrigin'], value: publicOrigin }
      ], snapshot.revision)
      if (webhook.trim()) {
        unwrapRemote(await credentials.set(FEISHU_WEBHOOK_REF, webhook.trim()))
        setWebhook(webhook.trim())
        setWebhookConfigured(true)
      } else if (webhookConfigured) {
        unwrapRemote(await credentials.unset(FEISHU_WEBHOOK_REF))
        setWebhookConfigured(false)
      }
      const savedConfiguration = unwrapRemote(await remote.configuration())
      setWebhook(savedConfiguration.webhookUrl ?? '')
      setWebhookConfigured(Boolean(savedConfiguration.webhookUrl))
      setStatus(unwrapRemote(await remote.status()))
      setMessage('配置已保存')
    } catch (error) {
      setMessage(error?.message ?? '保存失败')
    } finally { setBusy(false) }
  }

  async function sendNow() {
    setBusy(true); setMessage('')
    try {
      const result = unwrapRemote(await remote.send())
      setStatus(result.status)
      setMessage('已发送当前 Token')
    } catch (error) {
      setMessage(error?.message ?? '发送失败')
      try { setStatus(unwrapRemote(await remote.status())) } catch { /* ignore refresh failure */ }
    } finally { setBusy(false) }
  }

  const statusText = status?.serviceReady ? 'ready' : 'not ready'
  return React.createElement('section', { style: { display: 'grid', gap: 12, padding: 16 } },
    React.createElement('h3', null, 'DSH Web Access Notifier'),
    React.createElement('div', null, `当前服务状态：${statusText}`),
    status && React.createElement('div', { style: { fontSize: 12, opacity: 0.8 } },
      `Webhook：${status.webhookConfigured ? '已配置' : '未配置'}；最近成功：${status.lastSuccessAt ?? '暂无'}；错误：${status.lastErrorCode ?? '无'}`
    ),
    React.createElement('details', { style: { border: '1px solid rgba(128, 128, 128, 0.3)', borderRadius: 4, padding: '8px 12px' } },
      React.createElement('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, '通知配置'),
      React.createElement('div', { style: { display: 'grid', gap: 12, paddingTop: 12 } },
        React.createElement('label', null,
          React.createElement('input', { type: 'checkbox', checked: enabled, onChange: (event) => setEnabled(event.target.checked) }),
          ' 启用自动通知'
        ),
        React.createElement('label', { style: { display: 'grid', gap: 4 } },
          React.createElement('span', null, `Feishu Webhook：${webhookConfigured ? '已配置' : '未配置'}`),
          React.createElement('input', { type: 'url', value: webhook, placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...', onChange: (event) => setWebhook(event.target.value), autoComplete: 'off' })
        ),
        React.createElement('label', { style: { display: 'grid', gap: 4 } },
          React.createElement('span', null, '外部访问地址'),
          React.createElement('input', { type: 'url', value: publicOrigin, placeholder: 'https://dsh.example.com', onChange: (event) => setPublicOrigin(event.target.value) })
        ),
        React.createElement('button', { type: 'button', disabled: busy, onClick: save, style: { justifySelf: 'start' } }, busy ? '处理中…' : '保存配置')
      )
    ),
    React.createElement('button', { type: 'button', disabled: busy || !status?.serviceReady, onClick: sendNow, style: { justifySelf: 'start' } }, '立即发送当前 Token'),
    message && React.createElement('div', { role: 'status' }, message)
  )
}

export const inject = ['remote']

export async function apply(ctx) {
  await ctx.remote.$mount(TYPERT_REMOTE)
  await ctx.inject([
    'slots',
    'settingsScope',
    'remote',
    'remote.credentials',
    'remote.dsh-web-access-notifier'
  ], (scopeCtx) => {
    const scope = scopeCtx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE })
    const remote = scopeCtx.remote[REMOTE_NAMESPACE]
    const credentials = scopeCtx.remote.credentials
    scopeCtx.slots.inject('settings.plugin.item', () => scopeCtx.slots.register({
      name: 'settings.plugin.item',
      key: SETTINGS_NAMESPACE,
      order: 100,
      inject: () => ({})
    }, (props) => React.createElement(Card, { ...props, scope, remote, credentials })))
  })
}
