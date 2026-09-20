window.__ModuleLoader__.load({
  id: 'dsh-web-access-notifier',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const { useEffect, useState } = React

    const SETTINGS_NAMESPACE = 'dsh-web-access-notifier'
    const FEISHU_WEBHOOK_REF = 'feishuWebhookUrl'
    const REMOTE_NAMESPACE = 'dsh-web-access-notifier'

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
          credentials.describe([FEISHU_WEBHOOK_REF]),
          remote.status()
        ]).then(([credentialState, nextStatus]) => {
          if (!active) return
          setWebhookConfigured(Boolean(credentialState[FEISHU_WEBHOOK_REF]?.configured))
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
            await credentials.set(FEISHU_WEBHOOK_REF, webhook.trim())
            setWebhook('')
            setWebhookConfigured(true)
          }
          setMessage('配置已保存')
        } catch (error) {
          setMessage(error?.message ?? '保存失败')
        } finally { setBusy(false) }
      }

      async function sendNow() {
        setBusy(true); setMessage('')
        try {
          const result = await remote.send()
          setStatus(result.status)
          setMessage('已发送当前 Token')
        } catch (error) {
          setMessage(error?.message ?? '发送失败')
          try { setStatus(await remote.status()) } catch { /* ignore refresh failure */ }
        } finally { setBusy(false) }
      }

      const statusText = status?.serviceReady ? 'ready' : 'not ready'
      return React.createElement('section', { style: { display: 'grid', gap: 12, padding: 16 } },
        React.createElement('h3', null, 'DSH Web Access Notifier'),
        React.createElement('label', null,
          React.createElement('input', { type: 'checkbox', checked: enabled, onChange: (event) => setEnabled(event.target.checked) }),
          ' 启用自动通知'
        ),
        React.createElement('label', { style: { display: 'grid', gap: 4 } },
          React.createElement('span', null, `Feishu Webhook：${webhookConfigured ? '已配置' : '未配置'}`),
          React.createElement('input', { type: 'password', value: webhook, placeholder: webhookConfigured ? '留空表示保持现有凭据' : '请输入飞书群机器人 Webhook', onChange: (event) => setWebhook(event.target.value), autoComplete: 'new-password' })
        ),
        React.createElement('label', { style: { display: 'grid', gap: 4 } },
          React.createElement('span', null, '外部访问地址'),
          React.createElement('input', { type: 'url', value: publicOrigin, placeholder: 'https://dsh.example.com', onChange: (event) => setPublicOrigin(event.target.value) })
        ),
        React.createElement('div', null, `当前服务状态：${statusText}`),
        status && React.createElement('div', { style: { fontSize: 12, opacity: 0.8 } },
          `Webhook：${status.webhookConfigured ? '已配置' : '未配置'}；最近成功：${status.lastSuccessAt ?? '暂无'}；错误：${status.lastErrorCode ?? '无'}`
        ),
        React.createElement('div', { style: { display: 'flex', gap: 8 } },
          React.createElement('button', { type: 'button', disabled: busy, onClick: save }, busy ? '处理中…' : '保存配置'),
          React.createElement('button', { type: 'button', disabled: busy || !status?.serviceReady, onClick: sendNow }, '立即发送当前 Token')
        ),
        message && React.createElement('div', { role: 'status' }, message)
      )
    }

    const inject = [
      'slots',
      'settingsScope',
      'remote',
      'remote.credentials',
      'remote.dsh-web-access-notifier'
    ]

    function apply(ctx) {
      const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE })
      const remote = ctx.remote[REMOTE_NAMESPACE]
      const credentials = ctx.remote.credentials
      ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        key: SETTINGS_NAMESPACE,
        order: 100,
        inject: () => ({})
      }, (props) => React.createElement(Card, { ...props, scope, remote, credentials })))
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  }
})
