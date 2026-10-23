---
type: guide
status: Accepted
updated: 2026-10-24
---

# 选择普通检查的 CI runner

## 适用范围与前置条件

用于当前 CI 工作流的普通仓库与文档检查，需要仓库 Actions 操作权限和已认证 GitHub CLI。Docker/OCI 构建与 BJ1 Registry 任务的固定自建规则见[runner 规格](../spec/ci-runners.md)，不使用本指南的开关覆盖。

## 操作步骤

1. 确认目标为已有的受信 develop/main；日常变更先通过 PR 进入 develop。
2. 选择运行方式并发起：

   ```bash
   gh workflow run ci.yml --repo StuHelper/stuhelper-next --ref develop -f runner=github
   gh workflow run ci.yml --repo StuHelper/stuhelper-next --ref develop -f runner=stuhelper
   ```

   两条命令是两种可选运行方式；需要比较两种环境时才都运行。网页入口是 Actions → CI → Run workflow。

3. 查询对应提交和事件的运行，检查 job 的 runner 标签、步骤与最终结论：

   ```bash
   gh run list --repo StuHelper/stuhelper-next --workflow ci.yml --limit 10
   ```

4. 需要改变以后可信分支 push 的普通检查默认值时，设置仓库变量：

   ```bash
   gh variable set CI_RUNNER --repo StuHelper/stuhelper-next --body stuhelper
   ```

   恢复托管默认值使用同一命令的 `--body github`。变量不改变 PR 路由，也不覆盖手动选择。

## 查询缓存占用

当前检查关闭 Actions 依赖缓存，也不上传文档构建产物。可用只读命令核实仓库占用：

```bash
gh api repos/StuHelper/stuhelper-next/actions/cache/usage
gh cache list --repo StuHelper/stuhelper-next
gh api repos/StuHelper/stuhelper-next/actions/artifacts --jq '{count: .total_count}'
```

发现历史缓存或 artifact 时，先确认所属任务与保留需求，再按精确 ID 清理。不要为消除告警直接扩大付费额度。Docker 缓存与 artifact 的新增规则见[版本与存储](../spec/ci-runners.md#版本与存储)。

## 结果与失败检查

托管 job 应为 `ubuntu-26.04`；自建 job 应选择 `stuhelper-arc` 组与 `stuhelper-arc-sh-k8s` 标签。不要固定临时 Pod 名。pending、queued 和 in_progress 都不算通过，以相同提交的完整 job 结论为准。

自建排队时检查 scale set 容量和组访问配置，网络错误检查精确失败步骤；不能通过改 runner 来掩盖镜像任务问题。普通 runner API 列表为空可能不包含 ARC scale set，需查看实际组/scale set 和任务证据。

当前工作流只使用读取权限，不持久化 checkout 凭据。公共 PR 与共享 ARC 的组织级隔离限制见[规格](../spec/ci-runners.md#信任与失败)。本次不修改其他项目共用的 runner 组。
