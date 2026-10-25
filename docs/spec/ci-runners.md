---
type: spec
status: Accepted
updated: 2026-10-25
---

# CI 与 runner 约定

## 工作流职责

各仓使用职责明确的工作流。架构仓库检查清单和文档，platform 检查公共 Go 框架，backend 检查正式依赖装配，Web/Admin 检查各自应用，ops 检查部署配置与镜像组合。

普通检查覆盖 develop/main push 和面向这两个分支的 PR。同一 workflow、事件及分支或 PR 的新运行取消旧运行。实际检查 job 直接作为 required check，不增加仅用于显示结果的汇总 job。

跨仓浏览器联调独立运行，验证契约与界面组合，不重复各仓全部测试。PR 描述记录配套提交，检查结果只证明本次实际提交组合。公开 PR 不在能够读取私有源码的环境执行。

| 仓库 | 必需检查 |
| --- | --- |
| stuhelper-next | Architecture checks |
| stuhelper-tooling | Tooling checks |
| stuhelper-platform | Platform checks |
| stuhelper-backend | Backend checks |
| stuhelper-web | Web checks |
| stuhelper-admin | Admin checks |
| verification、campus-adapters、billing | Documents checks |
| ops | Documents checks、Deployment configuration |

GitHub 对 reusable workflow 显示调用 job 与实际 job 的组合名称，分支规则使用远端实际产生的 check 名称。当前 GitHub API 对五个私有仓库的分支保护返回套餐限制，无法启用强制门禁。它们仍执行独立 CI，合并前核对完整结果；公开仓库按实际 check 名称启用保护。

## runner 与权限

普通检查使用 GitHub `ubuntu-26.04`。Docker/OCI、镜像组合和 BJ1 Registry 任务使用 `stuhelper-arc` 组、`stuhelper-arc-sh-k8s` 标签。自建系统升级由 owner 手动安排，不随托管 runner 标签改变。

默认权限为 `contents: read`。制品推送和部署工作流按任务增加最小权限，受保护环境控制晋级。跨私有仓库拉取优先使用按仓授权的 GitHub App 短期凭据，公开 PR 不接触这些凭据。

Actions 使用明确版本 tag。共享 action 提供 Node、pnpm 与校验 checksum 的 actionlint 安装；完整 Go 与 Node 检查使用工具仓库的 reusable workflow。应用专用命令继续留在各仓。

## 依赖与存储

依赖按锁文件安装。当前普通工作流不上传 artifact，也不启用共享依赖缓存。后续增加缓存时只保存公开依赖，并明确用途、单条及总量上限、保留期和清理方式；PR 只恢复，可信 develop 检查成功后保存。

不自动扩大付费额度。Docker/BuildKit 缓存使用任务专属 builder 或 BJ1 Registry，不使用 Actions cache。构建和测试完成、失败或中断后清理本任务容器、builder 和闲置镜像，保留其他任务与持久数据。

## 验收场景

| 场景 | 操作与预期结果 |
| --- | --- |
| CI-01 | 普通 push/PR 使用标准托管 runner |
| CI-02 | 修改公开 PR 不获得私有源码凭据 |
| CI-03 | 镜像任务固定使用自建 runner |
| CI-04 | 自建 runner 不可用时排队或失败，不切换环境 |
| CI-05 | 更新 Casdoor 候选只验证官方制品，不重新编译 |
| CI-06 | 安装按锁文件执行，依赖失败使检查失败 |
| CI-07 | Docker 缓存使用本任务 builder 或 BJ1 Registry |
| CI-08 | 发布组合保留版本 tag 并核验 digest |
| CI-09 | 同一 PR 连续提交取消旧运行 |
| CI-10 | develop 文档提交仍执行本仓基础检查 |
| CI-11 | 组合检查报告实际参与的源码提交 |
| CI-12 | 实际检查失败或取消时不得宣称通过 |
| CI-13 | 新存储明确上限、保留期和清理方式 |
| CI-14 | hook 只检查暂存快照，失败和中断不改动索引 |
| CI-15 | 子命令非零退出码保留到检查结果 |
