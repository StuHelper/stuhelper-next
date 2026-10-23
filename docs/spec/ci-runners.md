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
| 文档、格式、静态检查、不依赖私有 Registry 的测试 | GitHub 标准托管 `ubuntu-24.04` | 受信 develop/main 可手动选择 ARC |
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

操作方法见 [CI 指南](../guide/ci-runners.md)，实际检查结果见[文档工作记录](../development/documentation-bootstrap.md)。
