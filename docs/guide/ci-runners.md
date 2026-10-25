---
type: guide
status: Accepted
updated: 2026-10-25
---

# CI 与制品任务

## 普通检查

每个仓库的 `make check` 是本地与 CI 的共同入口。先确认失败 job 的实际提交，再读取失败步骤日志。修复后重跑原检查，并验证受影响的后续阶段。

普通检查由工具仓库的 Node 或 Go 工作流执行，使用 `ubuntu-26.04`。各仓工作流直接设置检查名称，分支保护引用 GitHub 实际产生的 check 名称。架构规则见 [CI 规格](../spec/ci-runners.md)。

## 镜像与部署

Docker/OCI 和 BJ1 Registry 任务固定使用自建 runner。应用仓库构建版本制品，ops 验证和部署已经构建的镜像。生产部署不拉默认分支重新构建。

SSO 使用独立维护流程。更改主站发布组合不会更新 Casdoor。配置、凭据与生产数据通过部署环境提供，日志只记录可公开的提交、版本与结果。

## 存储检查

当前普通工作流没有 Actions cache 或 artifact 上传。可用 `gh cache list --repo StuHelper/<仓库名>` 盘点遗留缓存，删除前核对 key、ref、访问时间与其他任务用途。

Docker 测试使用任务专属 Compose project 和镜像标签。退出时删除本任务容器与闲置镜像，保留持久卷、运行中的部署、回退制品和其他任务资源。
