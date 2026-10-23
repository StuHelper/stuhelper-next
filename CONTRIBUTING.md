# 贡献说明

所有日常开发从最新 `origin/develop` 建短期分支，通过 PR squash 合入 develop。main 留作发布晋级；develop → main 使用 merge commit。初始相同提交仅表示仓库已初始化，不是生产版本。

文档采用 [project-docs-starter 五类架构](docs/README.md)，遵循[维护约定](docs/authoring.md)。行为规则放 spec，实现机制放 design，实际进度与证据放 development，可重复操作放 guide，重要取舍放 adr。移动文件时同步修改链接与 MkDocs 导航。

提交前按[检查指南](docs/guide/repository-checks.md)执行仓库检查、Markdown lint、元信息/链接/锚点检查、检查器回归和严格文档构建；工作流使用 actionlint 校验。变更业务实现后增加有实际验证价值的测试。当前 CI 不代表未来业务、移动端或数据迁移验收已经存在。

普通检查默认使用 GitHub 标准托管 runner；Docker/OCI build 和 BJ1 Registry 操作固定使用自建 runner，见[完整规则](docs/spec/ci-runners.md)。本项目直接消费官方 Casdoor 镜像，不添加重建或重新打包 Casdoor 的任务。

新增模块先修改架构清单，定义数据所有权、接口、事件、必需/可选依赖、关闭行为和迁移责任。不得让客户端直接拼接跨模块私有数据，或让模块直接操作另一个模块的表。

禁止在公开 Issue、PR、代码、日志或附件中包含生产身份、账号绑定、凭据、备份及真实测试账号数据。安全问题通过 GitHub 私密漏洞报告提交。

贡献采用 AGPL-3.0-only；不移除第三方许可证。正式发行版本为不可移动的 `vYYYY.MM.DD.REVISION`，发行和生产操作由 owner 明确授权。
