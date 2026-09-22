# npm 首次发布与合并修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复仓库合并冲突，将 `dsh-web-access-notifier` 固定为 `0.3.2`，完成可发布包验证并从 DSH Pod 首次发布到 npmjs.org。

**Architecture:** 保留现有 Host Plugin 与 Client Plugin 结构。`client/index.js` 是客户端源码，`scripts/build-client.mjs` 生成发布用的 `client/client.js`，`package.json` 的 `prepack` 确保 npm tarball 生成前自动构建客户端。首次 npm 发布使用普通 `npm publish`；只有包已经存在后才考虑 `npm stage publish`。代码提交与真实 npm 发布分开，发布只在 DSH Pod 内执行。

**Tech Stack:** Node.js 22、npm、pnpm、ESM、Node `node:test`、tsdown、GitHub Actions、npm Registry。

## Global Constraints

- 版本必须为 `0.3.2`。
- 首次发布必须使用 `npm publish`，不能使用 `npm stage publish`。
- 发布 Registry 必须显式指定 `https://registry.npmjs.org/`。
- 客户端 export 必须指向 `./client/client.js`。
- 发布前必须执行 `pnpm run build:client`、`npm test`、`npm run check`、`npm run check:runtime` 和 `npm pack --dry-run`。
- 不提交 `.pnpm-store/`、`node_modules/`、`.tgz`、npm Token、OTP 或 recovery code。
- 不在聊天、命令参数或仓库文件中暴露 npm 凭据。
- 真实 npm 发布只在 DSH Pod 内执行。
- 发布完成后必须用 `npm view dsh-web-access-notifier version --registry=https://registry.npmjs.org/` 验证。

---

### Task 1: 清理合并状态并统一发布元数据

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `.gitignore`
- Add: `docs/superpowers/specs/2026-09-22-npm-first-publish-design.md`

**Interfaces:**
- Consumes: 当前三方合并文件、客户端构建链、设计文档。
- Produces: 可被 Node/npm 解析的 `package.json`，无冲突标记的 README，已纳入版本控制的设计文档，以及不会追踪本地缓存的 Git 忽略规则。

- [ ] **Step 1: 记录当前冲突和目标版本**

运行：

```bash
git status --short
git ls-files -u
```

预期：只发现已知的 `README.md`、`package.json` 未合并项，以及本地新增但尚未纳入版本控制的构建/测试文件；目标版本为 `0.3.2`。

- [ ] **Step 2: 解析 `package.json` 冲突**

保留以下最终内容要求：

```json
{
  "name": "dsh-web-access-notifier",
  "version": "0.3.2",
  "exports": {
    ".": "./host/index.js",
    "./client": "./client/client.js",
    "./host/config": "./host/config.js",
    "./host/token-url": "./host/token-url.js",
    "./host/feishu-client": "./host/feishu-client.js",
    "./host/notifier": "./host/notifier.js",
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./typert": "./typert.host.js",
    "./remote": "./typert.remote-client.js",
    "./package.json": "./package.json"
  }
}
```

同时保留现有 `repository`、`bugs`、`homepage`、`publishConfig`、`dsh`、dependencies、peerDependencies，并保留以下脚本：

```json
"scripts": {
  "test": "node --test test/*.test.js",
  "build:client": "node scripts/build-client.mjs",
  "check": "node --check host/index.js && node --check host/notifier.js && node --check client/index.js && node --check client/client.js",
  "check:runtime": "node scripts/check-runtime.mjs",
  "prepack": "pnpm run build:client"
}
```

若当前分支已有 `publish:npm` 脚本和 `scripts/publish-npm.sh`，只在脚本内容与上述验证链不冲突时保留；不允许让首次发布脚本默认调用 `npm stage publish`。

- [ ] **Step 3: 合并 `README.md` 内容**

删除全部 `<<<<<<<`、`=======`、`>>>>>>>` 标记，保留以下信息：

- npm 版本示例统一为 `0.3.2`；
- GitHub Release tarball 安装方式；
- `client/client.js` bundle 生成和旧包升级说明；
- DSH Profile 安装与重启要求；
- `check:runtime` 和测试命令；
- 首次 npm 发布使用普通 `npm publish` 的说明；
- `npm stage publish` 仅适用于 Registry 中已存在的包。

- [ ] **Step 4: 忽略本地缓存和归档产物**

确保 `.gitignore` 至少包含：

```gitignore
node_modules/
.pnpm-store/
dist/
build/
coverage/
*.tgz
```

- [ ] **Step 5: 验证 JSON 和冲突标记**

运行：

```bash
node -e "JSON.parse(require('node:fs').readFileSync('package.json', 'utf8')); console.log('package.json: valid')"
if grep -RInE '^(<<<<<<<|=======|>>>>>>>)' --exclude-dir=node_modules --exclude-dir=.pnpm-store .; then exit 1; else echo 'merge markers: none'; fi
```

预期：输出 `package.json: valid` 和 `merge markers: none`，退出码为 0。

- [ ] **Step 6: 暂存并确认合并冲突已清除**

运行：

```bash
git add package.json README.md .gitignore docs/superpowers/specs/2026-09-22-npm-first-publish-design.md
git diff --cached --check
git status --short
git ls-files -u
```

预期：`git ls-files -u` 无输出，且暂存内容没有 whitespace 错误。

---

### Task 2: 构建客户端并验证发布包

**Files:**
- Modify: `client/client.js`
- Verify: `client/index.js`
- Verify: `scripts/build-client.mjs`
- Verify: `scripts/check-runtime.mjs`
- Verify: `test/*.test.js`
- Verify: `package.json`

**Interfaces:**
- Consumes: Task 1 产生的无冲突 `package.json`，客户端源码和构建脚本。
- Produces: 与源码一致的 `client/client.js`，通过测试和运行时依赖检查的 npm 包候选物。

- [ ] **Step 1: 安装锁定依赖**

运行：

```bash
pnpm install
```

预期：命令退出码为 0；不得将 `.pnpm-store/` 或 `node_modules/` 加入 Git 暂存区。

- [ ] **Step 2: 重新生成客户端 bundle**

运行：

```bash
pnpm run build:client
git diff -- client/client.js
```

预期：构建退出码为 0；`client/client.js` 以 `window.__ModuleLoader__.load` 开始，并导出 `apply` 与 `inject`；差异仅反映当前 `client/index.js` 的最终实现。

- [ ] **Step 3: 运行测试**

运行：

```bash
npm test
```

预期：所有已配置测试通过；任何失败必须停止并根据错误定位根因，不得带着失败继续发布。

- [ ] **Step 4: 运行语法和运行时依赖检查**

运行：

```bash
npm run check
npm run check:runtime
```

预期：两个命令均退出码为 0。

- [ ] **Step 5: 预览 npm tarball**

运行：

```bash
npm pack --dry-run
```

预期：输出包名 `dsh-web-access-notifier-0.3.2.tgz` 的候选信息，并包含：

```text
client/client.js
client/index.js
host/
cordis.patch.yml
package.json
README.md
```

不应包含：

```text
node_modules/
.pnpm-store/
.tgz
```

- [ ] **Step 6: 复核 Git 差异**

运行：

```bash
git diff --cached --stat
git diff --cached --check
git status --short --ignored | sed -n '1,120p'
```

预期：提交内容只包含源码、测试、锁文件、构建脚本、文档和配置；本地依赖缓存显示为 ignored 或不显示，不在 staged 区域。

---

### Task 3: 提交代码

**Files:**
- Commit: Task 1 和 Task 2 的全部预期文件

**Interfaces:**
- Consumes: 通过 Task 2 全部验证的 staged 内容。
- Produces: 一个可部署到 DSH Pod 的 Conventional Commit，版本为 `0.3.2`。

- [ ] **Step 1: 暂存剩余的受控文件**

运行：

```bash
git add package.json README.md .gitignore client/client.js client/index.js scripts/build-client.mjs scripts/check-runtime.mjs test package-lock.json pnpm-lock.yaml docs/superpowers/specs/2026-09-22-npm-first-publish-design.md docs/superpowers/plans/2026-09-22-npm-first-publish.md
```

如果 `package-lock.json` 不存在，跳过该路径；不得使用 `git add -A`，避免误加入缓存文件。

- [ ] **Step 2: 确认没有未合并文件和敏感文件**

运行：

```bash
git ls-files -u
if git diff --cached --name-only | grep -E '(^|/)(\.npmrc|.*\.tgz)$|\.pnpm-store|node_modules'; then exit 1; else echo 'sensitive and cache files: none'; fi
```

预期：无未合并文件，无敏感认证文件，无缓存或 tarball。

- [ ] **Step 3: 提交**

运行：

```bash
git commit -m "fix: prepare npm first release"
```

预期：生成一个提交，提交信息为 `fix: prepare npm first release`。

- [ ] **Step 4: 验证提交状态**

运行：

```bash
git status --short
git show --stat --oneline HEAD
node -p "require('./package.json').version"
```

预期：版本输出 `0.3.2`；工作区不再有未合并状态；若仍有未跟踪的本地缓存，只允许是已被 `.gitignore` 覆盖的缓存目录。

---

### Task 4: DSH Pod 内首次发布到 npm

**Files:**
- No repository file changes.
- Runtime only: DSH Pod npm configuration and authentication already provisioned by the user.

**Interfaces:**
- Consumes: 已提交且部署到 DSH Pod 的 `0.3.2` 代码；Pod 内有效的 npmjs.org 登录或 Token；用户在执行时通过交互提示提供当前 OTP 或 recovery code。
- Produces: npm Registry 中可公开查询的 `dsh-web-access-notifier@0.3.2`。

- [ ] **Step 1: 在 Pod 内确认工作树版本**

运行：

```bash
node -p "require('./package.json').version"
npm config get registry
```

预期：版本为 `0.3.2`；Registry 可以是镜像，但发布命令下一步必须显式指定 npmjs.org。

- [ ] **Step 2: 确认 npmjs.org 上没有目标版本**

运行：

```bash
npm view dsh-web-access-notifier version --registry=https://registry.npmjs.org/
```

预期：首次发布前目标包查询为 404，或查询到的版本不是 `0.3.2`。如果已经显示 `0.3.2`，停止发布，避免重复发布不可覆盖的版本。

- [ ] **Step 3: 检查认证但不输出 Token**

运行：

```bash
npm whoami --registry=https://registry.npmjs.org/
```

预期：输出 npm 用户名；不能使用 `cat ~/.npmrc` 或打印 Token。

- [ ] **Step 4: 执行首次普通发布**

运行：

```bash
npm publish --access public --registry=https://registry.npmjs.org/
```

如果 CLI 提示 OTP，直接在交互提示中输入当前认证器生成的 6 位 OTP。不要把 OTP 写入命令参数、文件或聊天。

如果只有 npm recovery codes，按照 CLI 的验证提示一次输入其中一个未使用的 code；不要一次输入 4 个，也不要把它们写进环境文件。若当前认证配置要求 `NPM_CONFIG_OTP`，使用临时隐藏输入：

```bash
read -r -s NPM_OTP
printf '\n'
NPM_CONFIG_OTP="$NPM_OTP" npm publish --access public --registry=https://registry.npmjs.org/
unset NPM_OTP
```

预期：npm 输出 `+ dsh-web-access-notifier@0.3.2` 或等价成功信息。

- [ ] **Step 5: 通过 Registry 验证**

运行：

```bash
npm view dsh-web-access-notifier version --registry=https://registry.npmjs.org/
npm view dsh-web-access-notifier dist.tarball --registry=https://registry.npmjs.org/
```

预期：第一个命令输出 `0.3.2`，第二个命令输出 npmjs.org tarball URL。

- [ ] **Step 6: 记录发布结果而不记录凭据**

记录包名、版本、Registry URL、Git commit SHA 和验证时间；不得记录 Token、OTP、recovery code 或完整 `.npmrc`。

---

### Task 5: 首次发布后的 Trusted Publishing 迁移（独立后续变更）

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `README.md`
- Verify: npm package settings and GitHub Actions workflow

**Interfaces:**
- Consumes: 已存在的 npm 包 `dsh-web-access-notifier` 和已验证的 GitHub 仓库。
- Produces: 使用 npm OIDC Trusted Publishing 的后续自动发布流程；不在 GitHub Secrets 中保存长期 npm Token。

- [ ] **Step 1: 在 npm 包设置中配置 GitHub Trusted Publisher**

配置仓库、workflow 文件名和发布环境，使 npm 能将 GitHub Actions OIDC 身份映射到该包。

- [ ] **Step 2: 修改 GitHub Actions 发布步骤**

保留测试、版本校验、`npm pack` 和 GitHub Release；将普通 Token 发布替换为 npm Trusted Publishing 所需的 Node/npm 配置，不引入长期 Token。

- [ ] **Step 3: 使用新版本标签触发验证**

先更新版本到下一个未占用版本，再创建匹配的 `vX.Y.Z` tag，观察 workflow 的 npm 发布结果。

- [ ] **Step 4: 验证 Trusted Publishing 结果**

使用：

```bash
npm view dsh-web-access-notifier version --registry=https://registry.npmjs.org/
```

确认新版本可见，并检查 GitHub Actions 日志不包含认证凭据。

## 完成前总验证

运行：

```bash
git status --short
git log -1 --oneline
node -p "require('./package.json').version"
npm view dsh-web-access-notifier version --registry=https://registry.npmjs.org/
```

只有在版本为 `0.3.2`、Git 提交存在、npm Registry 查询返回 `0.3.2` 且没有凭据泄露时，才可以宣布首次发布完成。
