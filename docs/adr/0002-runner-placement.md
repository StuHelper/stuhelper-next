---
type: adr
status: Accepted
updated: 2026-10-24
---

# 0002：按任务选择 CI runner

## 背景与决定因素

公共仓库适合使用 GitHub 标准托管 runner 完成普通检查。项目 Registry 位于 BJ1，项目负责人确认自建 runner 的网络条件更好，Docker 构建及镜像传输应与这一网络条件匹配。

## 决策与确认依据

普通文档、静态检查和不依赖私有 Registry 的测试默认使用 GitHub 标准托管 runner，并保留受信分支手动切换到 StuHelper ARC 的能力。

Docker/OCI 镜像构建，以及 BJ1 Registry 的拉取、推送和镜像缓存任务固定使用 StuHelper 自建 runner；不受普通检查的 `CI_RUNNER` 变量覆盖。原生 iOS 编译仍需要 macOS，其他平台按实际 SDK 支持安排。

确认依据：项目负责人于 2026-10-23 指定 Docker build 使用自建 runner，因为 Registry 在 BJ1、自建网络更好。Registry 地址、凭据和实际传输性能没有在本次文档工作中探测或公开。

## 备选与取舍

所有任务都用托管 runner 会让镜像任务受跨网传输影响；所有任务都用自建 runner 会扩大共享资源与信任边界。按任务分工保留免费托管检查的便利，并把镜像工作放在合适的网络中。

## 后果与验证

镜像任务需要可用的自建容量、受控 Registry 凭据与独立信任入口；不受信公共 PR 不能直接触发带内部网络或凭据的镜像任务，应先审查并由可信流程接续。未来镜像工作流需实际验证 runner 和 Registry 行为，本次不创建空构建任务。

完整规则见 [runner 规格](../spec/ci-runners.md)，当前可用操作见 [CI 指南](../guide/ci-runners.md)。
