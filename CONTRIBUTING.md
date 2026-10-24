# 贡献说明

日常开发从最新 `origin/develop` 建短期分支，通过 PR squash 合入 develop。若依赖尚未合并的工程改动，应先确认该依赖的分支、版本与合并顺序，保留已确认的工程规则。

本地按逻辑单元提交，在需要备份、协作或远端验证时批量推送。同一任务可以多次提交、推送，并持续更新同一个 PR。普通开发分支 push 不自动运行 CI，PR 验证合并结果，develop/main push 执行完整回归。

正式发布通过 develop → main PR，使用 merge commit。仓库初始化状态与生产版本分别记录。

文档采用 [project-docs-starter 五类架构](docs/README.md)，遵循[维护约定](docs/authoring.md)和[沟通与写作规范](AGENTS.md)。行为规则放 spec，实现机制放 design，实际进度与证据放 development，可重复操作放 guide，重要取舍放 adr。移动文件时同步修改链接与 MkDocs 导航。

首次安装依赖后运行 `make hooks`，启用暂存区的轻量检查和推送提交的完整仓库检查。检查过程保留工作树内容与真实 Git 历史，操作见[检查指南](docs/guide/repository-checks.md)。新增业务实现后，为关键行为和失败场景增加测试，分别记录业务、移动端和迁移验收结果。

普通检查默认使用 GitHub 标准托管 runner；Docker/OCI build 和 BJ1 Registry 操作固定使用自建 runner，见[完整规则](docs/spec/ci-runners.md)。本项目直接消费官方 Casdoor 镜像，不添加重建或重新打包 Casdoor 的任务。

新增模块先修改架构清单，定义数据所有权、接口、事件、必需/可选依赖、关闭行为和迁移责任。不得让客户端直接拼接跨模块私有数据，或让模块直接操作另一个模块的表。

禁止在公开 Issue、PR、代码、日志或附件中包含生产身份、账号绑定、凭据、备份及真实测试账号数据。安全问题通过 GitHub 私密漏洞报告提交。

贡献采用 AGPL-3.0-only；不移除第三方许可证。正式发行版本为不可移动的 `vYYYY.MM.DD.REVISION`，发行和生产操作由 项目负责人明确授权。
