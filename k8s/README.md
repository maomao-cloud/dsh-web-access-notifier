# Git 提交身份持久化

用于解决容器内执行 `git commit` 时出现 `Git 提交身份未配置` 的问题。
Git 全局配置写入 PVC，Pod 重建或容器升级后仍然保留。

## 使用方式

1. 编辑 `git-identity-config.yaml`，把 `GIT_USER_EMAIL` 改成实际邮箱。`GIT_USER_NAME` 也可按需修改。
2. 将 `git-identity-config.yaml` 与 `git-identity-init-configmap.yaml` 应用到集群：

   ```bash
   kubectl apply -f k8s/git-identity-config.yaml
   kubectl apply -f k8s/git-identity-init-configmap.yaml
   ```

3. 把 `deployment-git-identity-patch.yaml` 合并到实际 Deployment：
   - 修改 `metadata.name`；
   - 将 `containers[].name: app` 改为实际业务容器名；
   - 保留业务容器已有的 `env`、`volumeMounts` 和其他字段；
   - 如果业务容器以非 root 用户运行，请确认该用户对 `/git-home/.gitconfig` 有读取权限。
4. 应用 Deployment，使 initContainer 执行一次初始化：

   ```bash
   kubectl apply -f your-deployment.yaml
   kubectl rollout status deployment/<deployment-name>
   ```

5. 验证身份：

   ```bash
   kubectl exec deploy/<deployment-name> -c <container-name> -- \
     git config --global --get-regexp '^user\\.(name|email)$'
   ```

## 持久化说明

- `PersistentVolumeClaim` 默认申请 `1Gi`，未指定 `storageClassName` 时使用集群默认 StorageClass。
- `ReadWriteOnce` 适用于单副本或同一节点挂载。若 Deployment 需要多副本同时写入，应改为 `ReadWriteMany` 并使用支持 RWX 的存储后端，或为每个副本使用独立 PVC。
- 身份配置通过 ConfigMap 提供，不包含密码、Token 或 SSH 私钥；PVC 只保存 `.gitconfig`。
- 修改姓名或邮箱后，重启 Pod 即可由 initContainer 更新 PVC 中的配置。
- `git-identity-init.sh` 是同等逻辑的独立脚本，便于制作自定义镜像；当前清单通过 `git-identity-init-configmap.yaml` 注入脚本。

## 本地临时修复

如果当前是在本地仓库直接提交，而不是 Pod 内执行，可运行：

```bash
git config user.name "你的名字"
git config user.email "你的邮箱"
```

这里的 PVC 方案只解决运行在 Kubernetes 中的容器；GitHub/GitLab 认证仍需使用既有 SSH 或 Token 配置。
