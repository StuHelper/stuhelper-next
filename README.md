# StuHelper Next

StuHelper 的重构工程，采用 Go 平台、Vue Web、stuhelper-admin 和按业务划分的独立仓库。Next 是过渡名称。Casdoor 使用官方发行版本，各业务通过 OIDC 和官方 API 接入。

**当前阶段：框架可运行，业务按规格实施。** platform 提供模块依赖、生命周期、能力发现、HTTP 访问边界和远程服务降级。Web 与 stuhelper-admin 提供八语言应用入口和服务状态。真实身份、数据库、校园业务与生产迁移仍在后续实施范围，见[框架状态](docs/development/framework-bootstrap.md)。

## 工程入口

| 入口 | 用途 |
| --- | --- |
| [文档导航](docs/README.md) | design、spec、development、guide、adr 五类文档 |
| [开发工作区](docs/guide/development-workspace.md) | Mani、独立仓库和任务工作树 |
| [检查指南](docs/guide/repository-checks.md) | 本地检查、联调和检查器说明 |
| [依赖维护](docs/guide/dependency-maintenance.md) | 工具链升级、Dependabot 和 Vben 更新 |
| [业务范围](docs/design/business-scope.md) | 当前实施与延期范围 |
| [术语](docs/spec/terminology.md) | 领域概念、API 名称与翻译约定 |

## 本地开发

主机安装 Git、Mani、Go、Node.js、pnpm 和 uv。精确版本由 [toolchains.json](architecture/toolchains.json) 维护，当前统一 Go 1.27.3、Node.js 24.22.1 和 pnpm 10.33.4。JavaScript 依赖统一使用 pnpm-lock.yaml。

```bash
make setup
make check
mani sync
mani run setup --tags code
mani run check --tags code
node scripts/workspace.mjs contracts
pnpm run test:e2e
```

根仓库 `make check` 检查架构、工具链清单、工作区配置、文档和 Actions。运行 `make hooks` 启用本地提交与推送检查，本地可多次提交后批量推送，同一任务持续更新同一 PR。

各代码仓库独立构建与检查。普通 PR 的跨仓集成使用自身候选和其他仓库的最新 develop，配套 PR 可以明确覆盖候选。每轮检查记录完整源码组合，发布候选与排障可以选择固定组合或重放。客户端声明所消费的契约版本。

`mani.yaml` 统一登记八个模块仓库。公开与私有区分源码和文档的可见性，GitHub 管理仓库访问权限。任务工作树统一放在 `workspace/worktrees/<任务>/<仓库名>`，主检出位于 `workspace/<仓库名>`。

## 技术约定

- 模块拥有自己的接口和数据，通过公开接口协作。必需依赖决定模块基础可用性，可选依赖通过能力级规则影响具体操作。
- Casdoor 独立部署，保持既有 issuer、subject、用户标识和消费方绑定。
- Web 和 stuhelper-admin 默认中文，提供八种界面语言。国际化检查覆盖消息键、插值、复数和区域格式，翻译质量由人工审阅，阿拉伯语使用 RTL 布局。
- 普通 CI 默认使用 GitHub 托管 runner。Docker/OCI 与 BJ1 Registry 任务使用 StuHelper 自建 runner，版本和验证规则见 [runner 规格](docs/spec/ci-runners.md)。
- 短期分支通过 PR squash 合入 develop。正式发行由 develop 向 main 合并，经负责人授权后创建版本 tag、镜像和生产晋级。

## 目录

```text
architecture/        模块、语言和工具链清单
docs/                五类工程文档
scripts/             架构与跨仓工作区检查
tests/e2e/           跨仓浏览器联调
tooling/             各仓库共用的工程工具包
mani.yaml            统一工作区配置
workspace.lock.json  工具发行版本与固定候选组合
```

文档组织参考 [project-docs-starter](https://github.com/lihaotong0712/project-docs-starter/tree/1c4c6bb1bd401b803ea986b404932926cfc95eb0)。项目代码和文档使用 [AGPL-3.0-only](LICENSE)，第三方组件保留原许可证。沟通与写作遵循 [AGENTS.md](AGENTS.md)。
