# StuHelper Next

StuHelper 的重构工程，采用 Go 平台、Vue Web、stuhelper-admin 和按业务划分的独立仓库。Next 是过渡名称。Casdoor 使用官方发行版本，各业务通过 OIDC 和官方 API 接入。

**当前阶段：候选实现与集成验收。** platform 提供应用框架，课程目录、评价、审核、存储、贡献和学习资料已有独立仓库实现。Web 与 stuhelper-admin 提供八语言页面，backend 装配各模块并使用独立数据库身份。

资料分类及字段由管理员配置，课程只引用统一分类。上传、审核、当前权限下载和目录打包已有候选实现。状态见[资料模块](docs/development/resources.md)、[存储模块](docs/development/storage-module.md)与[评课社区](docs/development/academic-community.md)。真实身份、资格供应方和生产接入分别验收。

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

主机安装 Git、Mani、Go、Node.js、pnpm 和 actionlint。文档预览按需使用 uv。精确版本由 [toolchains.yaml](architecture/toolchains.yaml) 维护，当前统一 Go 1.27.3、Node.js 24.22.1 和 pnpm 10.33.4。JavaScript 依赖统一使用 pnpm-lock.yaml。

```bash
make setup
make check
mani sync
mani run setup --tags code
mani run check --tags code
node scripts/workspace.mjs contracts
pnpm run test:e2e
```

根仓库 `make check` 独立检查架构、工具链清单、工作区配置、文档和 Actions。已检出模块的版本与锁文件由跨仓 `toolchains` 检查严格验证。运行 `make hooks` 启用 Lefthook 暂存区检查，本地可多次提交后批量推送，同一任务持续更新同一 PR。

各代码仓库独立构建与检查，通用工具由 stuhelper-tooling 发行。公开应用联调使用 platform 示例与 Web/Admin，候选输入采用完整提交 SHA，并记录实际组合。私有 backend 按 go.mod 单独构建正式应用。

`mani.yaml` 统一登记模块仓库及主检出路径。公开与私有区分源码和文档的可见性，GitHub 管理仓库访问权限。任务工作树位于 `workspace/worktrees/<任务>/<仓库名>`，主检出位于 `workspace/<仓库名>`。

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
mani.yaml            统一工作区配置
workspace.lock.json  按需生成的实际源码组合记录
```

文档组织参考 [project-docs-starter](https://github.com/lihaotong0712/project-docs-starter/tree/1c4c6bb1bd401b803ea986b404932926cfc95eb0)。项目代码和文档使用 [AGPL-3.0-only](LICENSE)，第三方组件保留原许可证。沟通与写作遵循 [AGENTS.md](AGENTS.md)。
