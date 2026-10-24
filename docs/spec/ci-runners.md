---
type: spec
status: Accepted
updated: 2026-10-24
---

# CI runner 分工

## 范围与确认依据

适用于本仓库当前检查任务及未来镜像/客户端任务。项目负责人已确认[按任务分配 runner](../adr/0002-runner-placement.md)：Registry 位于 BJ1，Docker build 使用网络条件更好的 StuHelper 自建 runner。当前还没有镜像构建或发布工作流。

## 调度规则

| 任务 | 默认或固定 runner | 规则 |
| --- | --- | --- |
| 文档、格式、静态检查、不依赖私有 Registry 的测试 | GitHub 标准托管 `ubuntu-26.04` | 受信 develop/main 可手动选择 ARC |
| Docker/OCI 镜像构建 | StuHelper ARC | 使用 `stuhelper-arc` 组与 `stuhelper-arc-sh-k8s` 标签，不允许普通检查变量改到托管 runner |
| BJ1 Registry 拉取/推送/缓存及官方镜像原样复制 | StuHelper ARC | 保持制品 digest，凭据仅在受控任务使用 |
| 官方 Casdoor 部署制品 | 无本项目构建任务 | 直接消费官方镜像；复制和部署不等于重新构建 |
| Web/Android/小程序普通编译 | 平台支持的标准 runner，可按需要用自建 | 若包含 Docker build，镜像部分拆成自建 job |
| iOS 原生编译 | macOS + Xcode | 不能调度到现有 Linux ARC；签名与上架独立授权 |
| HarmonyOS 原生编译 | 已验证支持的 SDK 环境 | 环境与签名需实际验证，必要时专用 runner |

免费使用范围以 GitHub [当前计费说明](https://docs.github.com/en/billing/concepts/product-billing/github-actions)为准；标准公共仓库计算、存储与大规格 runner 不混为同一种资源。

## 当前检查工作流的配置

权威实现为 [ci.yml](https://github.com/StuHelper/stuhelper-next/blob/develop/.github/workflows/ci.yml)。PR 在该维护版本中使用托管 runner；develop/main push 只有仓库变量 `CI_RUNNER=stuhelper` 才使用 ARC，省略或其他值均使用托管 runner；手动 dispatch 使用 `runner=github` 或 `runner=stuhelper`，覆盖普通检查变量。

手动请求自建检查只支持 develop/main，其他 ref 明确失败。初始化默认值为 `CI_RUNNER=github`。上述变量和输入只控制普通检查，不是未来镜像任务的通用调度开关。

自建 runner 保留现有组名与标签。项目负责人计划手动升级到 Ubuntu 26.04，升级完成后再记录实际操作系统与检查结果。

## 版本与存储

Actions 使用明确的发行 tag，例如 `actions/checkout@v7.0.1`。部署镜像也使用明确的版本 tag，并按 tag 拉取，使服务器上的本地镜像保留可识别名称。digest 和 checksum 留作完整性核验记录，源码提交留作追溯依据。若同一镜像 tag 对应的 digest 改变，先核查差异并重新验收，不能沿用原来的通过记录。

当前文档检查不使用 GitHub Actions 依赖缓存：`setup-node` 设置 `package-manager-cache: false`，`setup-uv` 设置 `enable-cache: false`，不添加 `actions/cache`。文档站只在 job 中构建，不上传为 artifact。

Docker/BuildKit 缓存只放在任务专属自建 builder 或 BJ1 Registry，禁止使用 `type=gha`。缓存 tag 按项目和构建用途复用，不为每次提交永久增加一份。应设置大小或保留数量与过期清理规则，同时保留运行、回退和其他任务仍需使用的镜像。

新增 GitHub 缓存或 artifact 时，在 PR 中说明用途、估计大小、大小上限、保留期和清理方式。artifact 默认最多保留 3 天，只上传定位故障所需的小文件。不得自动提高缓存限额或启用付费存储；依赖安装缓存、构建缓存和 Actions artifact 分别核算。GitHub 当前缓存默认限额为每仓库 10 GB，超过免费额度的扩容可能计费，见[官方缓存说明](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#usage-limits-and-eviction-policy)。

## 信任与失败

不受信公共 PR 不直接执行需要内部网络、Registry 凭据或自建环境的镜像任务；由审查后的可信分支/受信调度入口承接。工作流条件不能代替组织级权限隔离。现有共享 ARC 组权限的观察与待处理事项记录在[开发计划](../development/rewrite-roadmap.md)，不能宣称公共 fork 已获得完整隔离验证。

自建容量不足或网络失败时保持排队/失败状态并定位原因，不自动切换到 GitHub 托管 runner 执行镜像构建，不关闭检查或更换制品制造成功。

## 验收场景

| 场景 | 操作 | 预期结果 |
| --- | --- | --- |
| CI-01 | 默认 push/PR 运行普通检查 | GitHub 标准托管 runner 执行检查 |
| CI-02 | develop 手动选择 stuhelper | 相同检查在目标 ARC 组执行，实际 job 标签可核实 |
| CI-03 | 将普通检查变量恢复 github 后执行镜像任务 | 镜像 job 仍固定自建；本项在镜像流水线实现时验收 |
| CI-04 | 自建 runner 不可用 | 保留排队/失败，不隐式改到托管构建 |
| CI-05 | 更新官方 Casdoor 候选 | 不出现自编译或重新打包 Casdoor 的任务 |
| CI-06 | 执行当前文档检查 | npm、uv 不写入 Actions cache，文档站不上传为 artifact |
| CI-07 | 添加 Docker 构建缓存 | 使用自建 builder 或 BJ1 Registry，配置中没有 `type=gha` |
| CI-08 | 按版本拉取部署镜像 | 本地保留版本 tag，核验摘要与本次候选记录一致 |

操作方法见 [CI 指南](../guide/ci-runners.md)，实际检查结果见[文档工作记录](../guide/repository-checks.md)。
