import React, { useEffect, useState } from 'react'
import { Button, IconChevronDownOutline14, Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
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
  const value = snapshot.value ?? { enabled: true, hostName: '', publicOrigin: '' }
  const [enabled, setEnabled] = useState(Boolean(value.enabled))
  const [hostName, setHostName] = useState(value.hostName ?? '')
  const [publicOrigin, setPublicOrigin] = useState(value.publicOrigin ?? '')
  const [webhook, setWebhook] = useState('')
  const [webhookConfigured, setWebhookConfigured] = useState(false)
  const [status, setStatus] = useState(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => scope.subscribe(() => {
    const next = scope.getSnapshot().value ?? { enabled: true, hostName: '', publicOrigin: '' }
    setEnabled(Boolean(next.enabled))
    setHostName(next.hostName ?? '')
    setPublicOrigin(next.publicOrigin ?? '')
  }), [scope])

  useEffect(() => {
    let active = true
    Promise.allSettled([
      remote.configuration().then(unwrapRemote),
      remote.status().then(unwrapRemote),
      credentials.describe([FEISHU_WEBHOOK_REF]).then(unwrapRemote)
    ]).then(([configurationResult, statusResult, credentialResult]) => {
      if (!active) return
      if (configurationResult.status === 'fulfilled') {
        const configuration = configurationResult.value
        setEnabled(Boolean(configuration.enabled))
        setHostName(configuration.hostName ?? '')
        setPublicOrigin(configuration.publicOrigin ?? '')
        setWebhook(configuration.webhookUrl ?? '')
        setWebhookConfigured(Boolean(configuration.webhookUrl))
      } else {
        setMessage('插件 Host 尚未加载当前版本，请重启 DSH 后读取 Webhook 地址。')
      }
      if (statusResult.status === 'fulfilled') setStatus(statusResult.value)
      if (configurationResult.status === 'rejected' && credentialResult.status === 'fulfilled') {
        setWebhookConfigured(Boolean(credentialResult.value[FEISHU_WEBHOOK_REF]?.configured))
      } else if (configurationResult.status === 'rejected' && statusResult.status === 'fulfilled') {
        setWebhookConfigured(Boolean(statusResult.value.webhookConfigured))
      }
      if (statusResult.status === 'rejected' && configurationResult.status === 'fulfilled') {
        setMessage(statusResult.reason?.message ?? '读取插件状态失败')
      }
    })
    return () => { active = false }
  }, [credentials, remote])

  async function save() {
    setBusy(true); setMessage('')
    try {
      await scope.mutate([
        { op: 'set', path: ['enabled'], value: enabled },
        { op: 'set', path: ['hostName'], value: hostName.trim() },
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
      let hostCurrent = true
      try {
        const savedConfiguration = unwrapRemote(await remote.configuration())
        setHostName(savedConfiguration.hostName ?? '')
        setWebhook(savedConfiguration.webhookUrl ?? '')
        setWebhookConfigured(Boolean(savedConfiguration.webhookUrl))
      } catch {
        hostCurrent = false
      }
      try { setStatus(unwrapRemote(await remote.status())) } catch { /* keep last known status */ }
      setMessage(hostCurrent ? '配置已保存' : '配置已保存；请重启 DSH 以加载当前 Host 并读取 Webhook 地址。')
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
  return React.createElement('div', {
    style: {
      border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35))',
      background: open ? 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.10))' : 'var(--dsw-alias-bg-layer-3, rgba(127,127,127,0.05))',
      borderRadius: 12,
      transition: 'border-color .16s, background .16s'
    }
  },
  React.createElement('button', {
    type: 'button',
    'aria-expanded': open,
    onClick: () => setOpen(!open),
    style: {
      appearance: 'none', width: '100%', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer',
      background: 'none', border: 0, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px'
    }
  },
  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
    React.createElement('div', { style: { fontSize: 14, fontWeight: 600 } }, 'DSH Web Access Notifier'),
    React.createElement('div', { style: { color: 'var(--dsw-alias-label-tertiary, rgba(127,127,127,0.8))', fontSize: 13, lineHeight: 1.5 } }, 'DSH Web 启动地址与飞书通知配置。')
  ),
  React.createElement(IconChevronDownOutline14, { style: { transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .16s' } })
  ),
  open ? React.createElement('div', { style: { display: 'grid', gap: 16, margin: '0 16px', padding: '4px 0 16px' } },
    React.createElement('div', { style: { display: 'grid', gap: 4 } },
      React.createElement('div', null, `当前服务状态：${statusText}`),
      status && React.createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary, rgba(127,127,127,0.8))' } },
        `Webhook：${status.webhookConfigured ? '已配置' : '未配置'}；最近成功：${status.lastSuccessAt ?? '暂无'}；错误：${status.lastErrorCode ?? '无'}`
      )
    ),
    React.createElement('label', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 } },
      React.createElement('span', null, '启用自动通知'),
      React.createElement(Switch, { checked: enabled, onChange: setEnabled, label: '启用自动通知', disabled: busy })
    ),
    React.createElement('label', { style: { display: 'grid', gap: 6 } },
      React.createElement('span', null, '主机名称'),
      React.createElement(Input, { type: 'text', value: hostName, placeholder: '留空时自动使用启动机器名称', onChange: (event) => setHostName(event.target.value), autoComplete: 'off', disabled: busy })
    ),
    React.createElement('label', { style: { display: 'grid', gap: 6 } },
      React.createElement('span', null, `Feishu Webhook：${webhookConfigured ? '已配置' : '未配置'}`),
      React.createElement(Input, { type: 'url', value: webhook, placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...', onChange: (event) => setWebhook(event.target.value), autoComplete: 'off', disabled: busy })
    ),
    React.createElement('label', { style: { display: 'grid', gap: 6 } },
      React.createElement('span', null, '外部访问地址'),
      React.createElement(Input, { type: 'url', value: publicOrigin, placeholder: 'https://dsh.example.com', onChange: (event) => setPublicOrigin(event.target.value), disabled: busy })
    ),
    message && React.createElement('div', { role: 'status' }, message),
    React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 } },
      React.createElement(Button, { variant: 'outline', disabled: busy || !status?.serviceReady, onClick: sendNow }, '立即发送当前 Token'),
      React.createElement(Button, { variant: 'primary', disabled: busy, onClick: save }, busy ? '处理中…' : '保存')
    )
  ) : null)
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
