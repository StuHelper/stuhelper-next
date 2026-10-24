---
type: guide
status: Accepted
updated: 2026-10-24
---

# CI 运行与缓存操作

## 日常验证

本地可多次提交后批量推送，同一任务持续更新同一个 PR。普通开发分支 push 不自动运行 CI，面向 develop/main 的 PR 执行相关检查，合并后的 push 执行完整回归。触发和 runner 规则见 [CI 规格](../spec/ci-runners.md)。

```bash
gh run list --repo StuHelper/stuhelper-next --workflow ci.yml --limit 10
gh pr checks --repo StuHelper/stuhelper-next PR_NUMBER
```

`PR_NUMBER` 替换为实际编号。查看最新源码提交、事件、runner 和最终 Repository checks。summary 记录集成选择的原因。旧运行被新提交取消后，继续查看新运行，不重新启动旧提交的检查。

普通文档 PR 的集成可按规则 skipped。已选中的集成必须成功，失败、取消和意外 skipped 都会导致汇总失败。不使用 `[skip ci]` 跳过必需检查。

## 手动运行与 runner

使用 Actions 权限和已认证 GitHub CLI，先选择受信 develop/main：

```bash
gh workflow run ci.yml --repo StuHelper/stuhelper-next --ref develop -f runner=github -f combination=fixed
```

`runner=stuhelper` 只将 Repository validation 切到 ARC，集成和汇总仍使用托管 runner。默认 `combination=latest` 解析当前候选与最新 develop 并记录 SHA，`fixed` 使用锁文件组合。候选与重放见[开发工作区](development-workspace.md#集成来源)。

同 ref 的新手动运行会取消旧运行。比较两个 runner 或组合时顺序执行。其他 ref 可手动运行托管检查，申请自建检查会明确失败。

需要改变后续 develop/main push 的 Repository validation runner 时：

```bash
gh variable set CI_RUNNER --repo StuHelper/stuhelper-next --body stuhelper
```

恢复默认使用 `--body github`。变量不改变 PR、手动输入、集成、汇总或镜像任务的 runner。

## 查询与清理缓存

```bash
gh api repos/StuHelper/stuhelper-next/actions/cache/usage
gh cache list --repo StuHelper/stuhelper-next --limit 100
gh api repos/StuHelper/stuhelper-next/actions/artifacts --jq '{count: .total_count}'
```

restore 日志记录实际 key 和 hit/miss，保存前的 summary 记录大小与是否允许上传。PR 只恢复，develop 成功检查后保存未命中的缓存。需要主动补充缓存时，在 develop 手动运行完整检查。

保持每仓库默认 10 GB 免费额度。超过 8 GiB 时，核对 key、ref 和最近访问时间，选择本仓库不再使用的旧缓存，按精确 ID 删除：

```bash
gh cache delete CACHE_ID --repo StuHelper/stuhelper-next
```

`CACHE_ID` 替换为刚查询的实际值。不要全量清理组织缓存或其他任务的 artifact。7 天未访问的缓存由 GitHub 淘汰。单条超限时先调查依赖体积，不直接扩大额度。

## 故障处理

| 现象 | 检查与处理 |
| --- | --- |
| 普通分支 push 没有 CI | 按设计由 PR 触发，准备审阅时创建或更新 PR |
| PR 长期 Pending | 核对最新运行、fork 审批、必需状态名称和提交消息 |
| Mani 批量输出出现失败但返回 0 | 使用 CI 的逐项目原生退出码检查，不能把批量退出码作为通过依据 |
| 选中的集成未通过 | 修复原失败步骤，重跑相同输入的检查 |
| 缓存未命中 | 核对 develop 保存结果、工具版本和实际锁文件，不跳过安装 |
| 缓存超限 | 本次验证继续，跳过上传，按目录调查占用 |
| 自建排队或网络失败 | 查看实际组容量和失败步骤，不改变镜像任务的 runner 或权限 |

当前工作流使用读取权限，不持久化 checkout 凭据。公共 PR 与共享 ARC 的组织级访问限制仍需单独核实，本次不修改其他项目共用的 runner 组。
