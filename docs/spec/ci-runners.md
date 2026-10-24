---
type: spec
status: Accepted
updated: 2026-10-24
---

# CI 触发、runner 与缓存

## 范围

适用于本仓库检查及后续镜像任务。普通检查使用免费标准托管 runner，Docker/OCI 与 BJ1 Registry 使用自建 runner，依据见[runner 决策](../adr/0002-runner-placement.md)。当前没有镜像构建或发布工作流。

实现见 [ci.yml](https://github.com/StuHelper/stuhelper-next/blob/develop/.github/workflows/ci.yml)，日常操作见 [CI 指南](../guide/ci-runners.md)，本地 hook 见[检查指南](../guide/repository-checks.md)。

## 触发与取消

| 入口 | 检查范围 |
| --- | --- |
| develop/main push | 完整仓库与跨仓集成 |
| 目标为 develop/main 的 PR，包括 draft | 仓库检查，以及完整 PR 差异选中的集成 |
| 其他开发分支 push | 不自动运行 CI，准备共享时创建或更新同一个 PR |
| workflow_dispatch | 完整检查，源码组合默认 latest，可选择 fixed、配套候选或 replay |

当前未启用 release 分支流程，不预设 release 分支触发。tag 不触发这个检查工作流。

并发组包含 workflow、事件类型及 PR 编号或分支 ref，启用 `cancel-in-progress: true`。同一 PR 新提交、同分支新 push、同 ref 再次手动运行都会请求取消旧运行。不同事件、PR 和分支互不取消。

手动比较 runner 或 fixed/latest 组合时顺序执行，同 ref 的新手动运行会取消旧运行。取消需要传播和进程退出时间。后续发布、迁移任务要单独设计并发策略。

## 路径选择与合并条件

路径选择集中在 [workspace.mjs](https://github.com/StuHelper/stuhelper-next/blob/develop/scripts/workspace.mjs)。PR 使用完整 Git 历史计算 base...head 差异，包含早期提交、删除和重命名，不受 API 文件列表截断影响。

普通 docs 文件、根 README/CONTRIBUTING/AGENTS/LICENSE 和文档配置只需仓库检查。`docs/spec/terminology.md` 属于共享工具包，必须运行集成。工具、架构、脚本、工作流、锁文件、固定组合和未知路径也运行集成。差异为空或无法读取时执行完整验证。

develop/main push 始终完整验证，因为前一次 push 可能已被取消。只判断当前 push 的 before/after，会让后续文档提交掩盖前一次尚未验证的代码。手动运行同样完整验证。

Repository validation 执行仓库检查并输出选择结果，Framework integration 按选择执行。最终 Repository checks 沿用分支保护要求的名称，要求仓库成功、选中的集成成功。只有明确未选中的集成允许 skipped，失败、取消、缺失输出和意外 skipped 均不能通过。

工作流不使用顶层 paths-ignore 跳过必需检查，也不使用提交消息跳过检查，避免 PR 长期 Pending。

集成默认使用当前候选与其他仓库最新 develop，先解析并记录完整源码组合，再按 SHA 检出。手动运行支持 fixed、配套候选和 replay，保留客户端契约来源与共享工具版本校验。具体规则见[集成来源](../guide/development-workspace.md#集成来源)。

Mani 0.32.1 普通批量运行的退出码不能表达子任务失败。CI 按锁文件逐个进入项目目录，使用显式配置路径和原生 `--tty` 执行任务，让任务退出码直接决定结果。安装模块依赖前先用失败 fixture 验证这一行为。

## runner 调度

| 任务 | runner 与条件 |
| --- | --- |
| Repository validation | 默认 `ubuntu-26.04`，受信 develop/main 可选择 ARC |
| Framework integration、最终汇总 | 固定 `ubuntu-26.04` |
| Docker/OCI、BJ1 Registry 拉取/推送/缓存 | 固定 `stuhelper-arc` 组、`stuhelper-arc-sh-k8s` 标签 |
| Casdoor | 直接消费官方镜像，无本项目构建任务 |
| iOS 编译 | macOS 与 Xcode，签名和上架独立授权 |
| HarmonyOS 编译 | 实际验证支持的 SDK 环境 |

PR 始终使用托管 runner。develop/main push 的 Repository validation 只有 `CI_RUNNER=stuhelper` 时使用 ARC；手动 `runner` 输入优先于该变量。其他 ref 申请自建检查会失败。开关不影响集成、最终汇总或镜像任务。

自建 runner 保留现有组与标签，操作系统升级由 owner 手动安排。GitHub 托管 runner 支持 Ubuntu 26.04，不表示自建系统已经升级。公共 PR 与共享 ARC 的组织级隔离仍需按[开发计划](../development/rewrite-roadmap.md)处理。

## 版本与存储

StuHelper 使用 Free 组织计划，本仓库公开。按 [GitHub 计费说明](https://docs.github.com/en/billing/concepts/product-billing/github-actions)，公开仓库标准托管计算和自建 runner 使用免费，Actions cache 每仓库 10 GB 免费额度独立于 artifact/Packages 存储。

Free 组织的私有仓库有每月 2,000 分钟，标准托管通常最多并发 20 个 job。公开计算仍受并发限制。实际额度与付费项目以 [Actions limits](https://docs.github.com/en/actions/reference/limits)和组织计费设置为准，不自动扩大额度或启用付费存储。

Actions 使用明确版本 tag，工具链从 `.node-version`、`.go-version` 和统一版本清单读取，依赖以 pnpm/uv 锁文件安装。部署镜像按明确 tag 拉取，摘要和源码提交用于核验。

缓存采用显式 restore/save，setup 工具的自动缓存保持关闭。缓存只保存任务临时目录中的公开依赖，不包含源码检出、node_modules、虚拟环境、凭据或部署产物。

| 缓存 | 用途 | 预计未压缩大小 | 单条上传上限 |
| --- | --- | --- | --- |
| next-repository-v2 | 根 pnpm、uv、Go 检查工具依赖与编译缓存 | 约 0.2–1 GiB | 1 GiB |
| next-framework-v2 | 实际组合的前端 pnpm store | 约 1–2 GiB | 2 GiB |
| next-go-v2 | 实际组合的 Go module 和编译缓存 | 约 0.5–2 GiB | 2 GiB |

缓存键包含环境、统一工具版本和锁文件摘要。集成先解析实际源码组合，再读取模块锁文件、包配置与 patch 内容生成 key。普通源码提交不生成新 key，不设置宽泛的跨 key 回退。大小以 job summary 为准。

PR、main 和其他 ref 只恢复。仅架构仓库 develop 成功检查后保存未命中的缓存。空缓存或超限缓存不上传。缓存服务异常允许正常安装，只有缓存 restore/save 步骤允许失败后继续；安装和测试仍必须通过。

缓存超过 7 天未访问由 GitHub 删除，达到仓库限额按最近访问时间淘汰。单条上限不等于总量上限。仓库占用超过 8 GiB 时，维护者按 key/ref 和访问时间核实并删除旧缓存，操作见 [CI 指南](../guide/ci-runners.md#查询与清理缓存)。

当前不上传文档或测试 artifact，也不缓存 Playwright 浏览器。新增 artifact 默认最多保留 3 天，只保存故障定位所需的小文件。新增缓存或 artifact 的 PR 说明用途、预计大小、上限、保留期与清理方式。

Docker/BuildKit 缓存固定放在任务专属自建 builder 或 BJ1 Registry，禁止 `type=gha`。按项目和用途复用 tag，限制大小、保留数量与过期时间，保留运行、回退及其他任务仍需的资源。

## 验收场景

| 场景 | 操作 | 预期结果 |
| --- | --- | --- |
| CI-01 | 默认 push/PR 运行普通检查 | 使用标准托管 runner |
| CI-02 | develop 手动选择 stuhelper | Repository validation 使用 ARC，其余任务托管 |
| CI-03 | 修改普通检查 runner 变量 | 镜像任务仍固定自建 |
| CI-04 | 自建不可用 | 保持排队或失败，不隐式切换镜像环境 |
| CI-05 | 更新 Casdoor 候选 | 不出现本项目重建任务 |
| CI-06 | PR 恢复依赖缓存 | 按锁文件安装和检查，不保存共享缓存 |
| CI-07 | 添加 Docker 缓存 | 使用自建 builder 或 BJ1 Registry |
| CI-08 | 按版本拉取镜像 | 保留 tag 并核验摘要 |
| CI-09 | 同一 PR 连续提交 | 新运行取消旧运行，判断整个 PR 差异 |
| CI-10 | develop 代码 push 后紧接文档 push | 后一次运行仍执行完整回归 |
| CI-11 | 文档 PR 或共享术语变更 | 普通文档跳过集成，共享术语执行集成 |
| CI-12 | 选中的集成失败、取消或 skipped | 最终 Repository checks 失败 |
| CI-13 | 缓存为空、缺失或超限 | 正常安装和检查，空或超限内容不上传 |
| CI-14 | hook 检查部分暂存或非 HEAD 推送 | 保留实际历史和日期，只检查目标快照 |
| CI-15 | 任一模块安装或检查返回非零 | CI 保留失败退出码，停止后续项目与汇总放行 |
