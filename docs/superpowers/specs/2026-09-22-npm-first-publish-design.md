# dsh-web-access-notifier npm 首次发布与合并修复设计

## 背景

`dsh-web-access-notifier` 当前尚未存在于 npm Registry，因此不能直接使用 `npm stage publish`。npm staged publishing 要求目标包已经存在；首次发布必须使用普通 `npm publish`。当前工作区的 `README.md` 与 `package.json` 处于未完成的三方合并状态，且工作区目标版本确定为 `0.3.2`。

## 目标

1. 修复 `README.md` 与 `package.json` 的合并冲突。
2. 将包版本统一为 `0.3.2`。
3. 保留新版客户端构建链：`client/index.js` 为源码入口，`client/client.js` 为发布 bundle，`prepack` 自动构建 bundle。
4. 在提交前完成源码、打包和运行时验证。
5. 代码提交后，由 DSH Pod 内执行一次普通 `npm publish` 完成 npm 包首次注册。
6. 首次发布成功后，再规划 GitHub Actions Trusted Publishing；本次不使用 `npm stage publish` 完成首次发布。

## 非目标

- 本次不把 npm Token 或 2FA 恢复码写入仓库、聊天、日志或 Kubernetes 清单。
- 本次不修改 DSH 源码。
- 本次不直接代替用户执行真实 npm 发布，避免在错误版本或错误 Registry 上误发布。
- 本次不把 `npm stage publish` 作为首次发布方案。

## 合并策略

`package.json` 采用新版构建实现，并保留上游发布元数据与扩展 exports：

- 版本：`0.3.2`
- 客户端 export：`./client` 指向 `./client/client.js`
- 保留 `repository`、`bugs`、`homepage`、`publishConfig`
- 保留 `./typert`、`./remote`、`./package.json` exports
- 保留 `build:client`、`check:runtime`、`prepack`
- 保留测试与语法检查脚本

`README.md` 合并为无冲突标记的单一版本，发布示例统一使用 `0.3.2`，同时保留客户端 bundle、运行时依赖和插件重启说明。

本地依赖缓存 `.pnpm-store/`、`node_modules/` 和生成的 `.tgz` 不进入提交；必要时补充 `.gitignore` 规则。

## 验证策略

提交前依次执行：

```bash
pnpm install
pnpm run build:client
npm test
npm run check
npm run check:runtime
npm pack --dry-run
```

验证重点：

- `package.json` 可以被解析；
- 不存在 `<<<<<<<`、`=======`、`>>>>>>>` 冲突标记；
- bundle 可以重新生成；
- npm 包内容包含 `client/client.js` 与 Host 代码；
- 运行时依赖可解析；
- 测试、语法检查和打包预览通过。

## Pod 内首次发布流程

代码提交并部署到 Pod 后，先确认 npmjs.org 上包仍不存在或版本不是目标版本：

```bash
npm view dsh-web-access-notifier version --registry=https://registry.npmjs.org/
```

首次发布使用：

```bash
npm publish --access public --registry=https://registry.npmjs.org/
```

若 npm 账号启用 2FA，CLI 会要求一次性验证码；也可以通过环境变量传入当前验证码，避免写入 shell 历史：

```bash
read -r -s NPM_OTP
printf '\n'
NPM_CONFIG_OTP="$NPM_OTP" npm publish --access public --registry=https://registry.npmjs.org/
unset NPM_OTP
```

不在聊天或命令行参数中粘贴恢复码。若所谓的“4 个 key”是 npm 生成的 recovery codes，它们是账号恢复码，不是普通发布时连续输入的 4 个值；只有在无法使用认证器时，按照 npm 登录/验证页面提示使用其中一个，并用后即失效。若是认证器当前生成的 6 位 OTP，则每次发布只使用当下有效的一个验证码。

发布后验证：

```bash
npm view dsh-web-access-notifier version --registry=https://registry.npmjs.org/
```

预期结果为 `0.3.2`。

## 后续发布策略

首次包注册完成后，GitHub Actions 迁移到 npm Trusted Publishing（OIDC），不长期保存 npm Token。若确实需要人工批准的 staged publishing，再用于后续已存在包的版本：

```text
npm stage publish -> npm stage approve <stage-id>
```

## 验收标准

- Git 工作区不再存在未解决的合并冲突。
- `package.json` 版本为 `0.3.2`。
- 本地验证命令全部通过，或明确记录真实环境阻塞原因。
- 生成的 npm 包可被 `npm pack --dry-run` 正确识别。
- 代码以 Conventional Commit 提交。
- Pod 内首次发布命令和 2FA 使用方式清晰，且没有泄露凭据。
- npm Registry 发布后可以查询到 `dsh-web-access-notifier@0.3.2`。

## 风险与处理

- **错误版本发布**：发布前读取 `package.json` 和 `npm pack --dry-run`；Pod 发布前再次确认版本。
- **错误 Registry**：所有发布和验证命令显式指定 `https://registry.npmjs.org/`。
- **2FA 凭据泄露**：不使用 `--otp` 明文参数，不把 OTP 或 recovery code 写入文件和聊天；优先使用交互式提示或临时环境变量。
- **构建产物不一致**：通过 `prepack` 和 `npm pack --dry-run` 验证最终 tarball，而不是只检查源码目录。
- **本地缓存误提交**：提交前检查 Git 状态，并确认 `.pnpm-store/`、`node_modules/`、`.tgz` 未进入暂存区。
