# dsh-web-access-notifier

DSH Web 访问通知器：DSH Web 服务启动完成后，通过 DSH 原生 `Connection.authenticatedUrl()` 获取当前进程 Token，构造外部访问地址并发送到飞书群机器人 Webhook。

## 特性

- Host Plugin 与 Client Plugin 双端实现；
- 仅依赖 `webServer`、`connection` 和 Loader settle，不解析日志、不读取 Token 文件、不生成 Token；
- 配置写入 DSH `settings` namespace：`dsh-web-access-notifier`；
- Webhook 通过 DSH `credentials` 的 `feishuWebhookUrl` 保存，并在已认证的插件配置页面中明文显示和编辑；
- 配置卡片复用 DSH 官方 `DisclosureRow`、`Switch`、`Input` 与 `Button` primitives，交互和设置页保持一致；
- DSH 启动后同一进程只自动发送一次；手动发送始终强制重新获取 Token；
- 飞书请求支持超时、非 2xx、业务错误和有限重试（立即、5 秒、30 秒）；
- 通知失败只记录脱敏错误，不阻断 DSH 主进程；
- 不使用 Kubernetes Secret、CronJob、Kubernetes API、PVC 状态文件或自定义 HTTP 未认证接口。

## 安装与组合

插件现在带有 `dsh.bundle.patch` 声明，可以直接使用 DSH 的插件管理命令安装：

```bash
dsh plugin --profile web add /absolute/path/to/dsh-web-access-notifier
# 或安装已发布的 tarball
dsh plugin --profile web add /absolute/path/to/dsh-web-access-notifier-0.2.0.tgz
```

安装后，Profile 会自动合成 `dsh-web-access-notifier` Host row，Client Plugin 由 `dsh.client` 声明自动进入 Web Client bundle。建议首次测试使用独立 Profile：

```bash
dsh --profile dsh-notifier-test --from-default-profile web
dsh plugin --profile dsh-notifier-test add /absolute/path/to/dsh-web-access-notifier
dsh --profile dsh-notifier-test --no-open
```

默认 `publicOrigin` 为空，因此插件会安全地跳过自动发送，等待用户从设置页面配置外部地址。也可以在 Profile patch 中覆盖：

```yaml
- id: dsh-web-access-notifier
  config:
    enabled: true
    publicOrigin: https://dsh.example.com
    timeoutMs: 8000
```

运行时需要已组合 DSH 原生 `settings`、`credentials`、`dsh-api-remotes` 与 Web Client Settings/Plugins UI。若 settings provider 未挂载，插件仍可读取组合配置，但无法持久化页面修改。

## 配置

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 是否发送自动启动通知 |
| `publicOrigin` | `""` | 仅允许 `http`/`https` origin；不能有路径、query、fragment 或用户信息 |
| `timeoutMs` | `8000` | 飞书单次请求超时 |

Webhook 不进入普通 settings，而是写入凭据引用 `feishuWebhookUrl`。插件通过已认证的专用 Remote 读取当前值并在折叠配置区中明文显示；完整 Token、完整访问 URL 和完整 Webhook 仍不会写入普通日志或状态对象。

## 验证

```bash
npm test
npm run check
```

测试覆盖外部 origin 校验、Token 改写、飞书重试/超时分类以及敏感字段不出现在状态对象。
