# dsh-web-access-notifier

DSH Web 访问通知器：DSH Web 服务启动完成后，通过 DSH 原生 `Connection.authenticatedUrl()` 获取当前进程 Token，构造外部访问地址并发送到飞书群机器人 Webhook。

## 特性

- Host Plugin 与 Client Plugin 双端实现；
- 仅依赖 `webServer`、`connection` 和 Loader settle，不解析日志、不读取 Token 文件、不生成 Token；
- 配置写入 DSH `settings` namespace：`dsh-web-access-notifier`；
- Webhook 通过 DSH `credentials` 的 `feishuWebhookUrl` 保存，并在已认证的插件配置页面文本框中直接明文显示和编辑；
- 配置卡片按 DSH 原生插件卡片结构呈现，并复用官方 `Switch`、`Input`、`Button` 与折叠图标 primitives；
- 通知包含主机名称：默认读取启动机器的系统 hostname，也可在设置页填写自定义名称；
- DSH 启动后同一进程只自动发送一次；手动发送始终强制重新获取 Token；
- 飞书请求支持超时、非 2xx、业务错误和有限重试（立即、5 秒、30 秒）；
- 通知失败只记录脱敏错误，不阻断 DSH 主进程；
- 不使用 Kubernetes Secret、CronJob、Kubernetes API、PVC 状态文件或自定义 HTTP 未认证接口。

## 发布与安装

提交符合 `vX.Y.Z` 格式的 Git tag 后，GitHub Actions 会自动：

1. 校验 tag 版本与 `package.json` 的 `version` 一致；
2. 运行 `npm test` 和 `npm run check`；
3. 执行 `npm pack`；
4. 创建 GitHub Release，并附加生成的 `.tgz` 安装包。

例如发布 `0.3.1`：

```bash
git tag v0.3.1
git push origin v0.3.1
```

Release 创建后，其他人可以直接使用 GitHub Release tarball 安装：

```bash
dsh plugin --profile web add \
  https://github.com/maomao-cloud/dsh-web-access-notifier/releases/download/v0.3.1/dsh-web-access-notifier-0.3.1.tgz
```

如果需要手动发布到 npm Registry，先登录 npm，再执行：

```bash
npm login
npm run publish:npm
```

发布前只检查打包内容、不上传时：

```bash
npm run publish:npm -- --dry-run
```

脚本默认发布到 `https://registry.npmjs.org/`，也可以通过 `NPM_REGISTRY` 覆盖 Registry 地址。npm token、组织权限和包名占用情况由 npm Registry 校验。

## 安装与组合

插件现在带有 `dsh.bundle.patch` 声明，可以直接使用 DSH 的插件管理命令安装：

```bash
dsh plugin --profile web add /absolute/path/to/dsh-web-access-notifier
# 或安装已发布的 tarball
dsh plugin --profile web add /absolute/path/to/dsh-web-access-notifier-0.3.1.tgz
```

安装后，Profile 会自动合成 `dsh-web-access-notifier` Host row，Client Plugin 由 `dsh.client` 声明自动进入 Web Client bundle。安装或升级后必须重启 DSH 进程：浏览器端 bundle 可以提前刷新，但已运行的 Host Remote 不会因此替换；未重启时新 Client 调用新 Remote 方法会得到 HTTP 404。建议首次测试使用独立 Profile：

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
    hostName: production-dsh
    publicOrigin: https://dsh.example.com
    timeoutMs: 8000
```

运行时需要已组合 DSH 原生 `settings`、`credentials`、`dsh-api-remotes` 与 Web Client Settings/Plugins UI。若 settings provider 未挂载，插件仍可读取组合配置，但无法持久化页面修改。

## 配置

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 是否发送自动启动通知 |
| `hostName` | `""` | 通知中显示的主机名称；留空时自动使用启动机器的系统 hostname |
| `publicOrigin` | `""` | 仅允许 `http`/`https` origin；不能有路径、query、fragment 或用户信息 |
| `timeoutMs` | `8000` | 飞书单次请求超时 |

Webhook 不进入普通 settings，而是写入凭据引用 `feishuWebhookUrl`。插件通过已认证的专用 Remote 读取当前值并在折叠配置区中明文显示；完整 Token、完整访问 URL 和完整 Webhook 仍不会写入普通日志或状态对象。

## 验证

```bash
npm test
npm run check
```

测试覆盖外部 origin 校验、Token 改写、飞书重试/超时分类以及敏感字段不出现在状态对象。
