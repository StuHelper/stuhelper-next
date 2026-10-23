# StuHelper Next 工程约定

先读 [README](README.md)、[文档导航](docs/README.md)和当前任务相关主题。文档遵循 [authoring](docs/authoring.md)，按 design/spec/development/guide/adr 分工；使用分类模板，更新索引和元信息，区分文档状态、工作进度和实际验证。

- 不修改旧 StuHelper、AI、Store 的工作树或生产系统来完成本仓库的普通任务。
- 新仓库只有首次引导可创建 `develop` / `main`；后续先刷新 `origin/develop`，短期分支 PR squash 到 develop。正式发布 develop → main 使用 merge commit。tag、镜像发行、生产晋级需 owner 授权。
- 大功能使用专用分支和独立 worktree，一个主要写入者；保留其他工作树的未提交内容。
- Casdoor 使用官方原件，不维护源码 fork，不把 StuHelper 补丁、页面或业务逻辑注入镜像。
- 普通检查默认 GitHub 标准托管 runner。Docker/OCI build 与 BJ1 Registry 拉取、推送、缓存固定使用 StuHelper 自建 runner；普通检查的 CI_RUNNER 变量不能覆盖镜像任务。Casdoor 不设本项目构建 job。完整规则见 [runner 规格](docs/spec/ci-runners.md)。
- SSO 只通过 OIDC/官方 API 集成；业务模块不得访问 Casdoor 数据库。保留 issuer、subject 和外部绑定；不按邮箱或手机号猜测合并身份。
- 不把生产数据、配置、DSN、token、证书私钥、备份或原始身份信息提交到公共仓库、日志和 Actions artifacts。
- 原生客户端不嵌入 client secret；私钥、服务管理凭据仅留在服务端。
- API 契约先行。实现业务后使用 OpenAPI 生成各端 SDK，禁止手改生成文件。
- 后端 Handler → Service → Repository；模块只写自己的数据，只调用依赖模块公开接口。
- 模块启停必须校验依赖；关闭模块不得删除数据。公共授权、审核、审计约束不能由插件绕过。
- 记录每次验证的实际范围。静态检查、合成登录、生产真实账号验收分别报告；pending/skipped 不算完成。
- 修复失败先重跑原检查，再复验受影响阶段；不得删检查、伪造回执或扩大权限来获得通过。

SSO 行为与数据保留以[兼容规格](docs/spec/sso-compatibility.md)为准，实施状态见[迁移工作](docs/development/sso-migration.md)。候选第一次访问生产库前是最后可安全中止的边界，之后不得用旧快照覆盖新写入。

提交前按[检查指南](docs/guide/repository-checks.md)执行相关检查。明确的既有授权直接沿用，不为每篇文档重复请求确认；未决产品细节保留 InReview，不虚构采纳或部署结果。
