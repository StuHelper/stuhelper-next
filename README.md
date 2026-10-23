# StuHelper Next

现有 StuHelper 的重构版本。Next 是过渡名称，未来以 StuHelper 的名称继续维护。项目采用独立官方 Casdoor SSO，各业务模块通过公开接口协作，当前开发 Web 与 Admin，微信小程序、Android、iOS 和 HarmonyOS 暂时搁置。

**当前阶段：工程框架。** 公共文档与私有模块文档已整理，正在搭建 Go 平台运行时、Web 和 Vben Admin 应用。业务 API、真实身份接入、SSO 部署和数据迁移尚未实施。详见[框架工作记录](docs/development/framework-bootstrap.md)。

## 已确定的方向

- `StuHelper/stuhelper-next` 是公共仓库；默认使用 GitHub 标准托管 runner，可手动选用 StuHelper ARC。
- Casdoor 直接使用官方未经修改的发行镜像，独立数据库、运行环境与更新生命周期；不得依赖主站后台、主站数据库或主站发布。
- 保留现有 SSO 数据、issuer、用户标识和消费方绑定；AI、Store 等已有应用独立接入同一身份提供方。
- 采用按业务模块划分的多仓库，各模块拥有自己的接口、数据、版本与生命周期，详见[仓库划分](docs/design/module-repositories.md)。
- Web 与 Admin 共享 API 和领域术语，原生端参考设计保留，恢复实施时再安排各端工作。
- 已确认课程与评课、认证、资料共享、课表、内容运营、开放平台和存储贡献等业务。机器人功能分为群聊管理、信息查询和娱乐功能。完整范围见[业务设计](docs/design/business-scope.md)，确认结果见[业务确认结果与延期事项](docs/development/business-decisions.md)。

## 文档入口

采用 [project-docs-starter](https://github.com/lihaotong0712/project-docs-starter/tree/1c4c6bb1bd401b803ea986b404932926cfc95eb0) 的五类文档架构，从[文档导航](docs/README.md)进入。

| 分类 | 内容 |
| --- | --- |
| [design](docs/design/README.md) | 重构业务范围、身份与货币概念、系统架构、独立 SSO 与原生端机制 |
| [spec](docs/spec/README.md) | 各业务行为、资料权益、积分与余额、身份兼容和验收场景 |
| [development](docs/development/README.md) | 调研、实施任务、实际进度与验证证据 |
| [guide](docs/guide/README.md) | 本地检查、文档预览、CI 操作与候选解析 |
| [adr](docs/adr/README.md) | 官方镜像、runner 分工和文档架构的已确认决策 |

## 开发工作区

使用 Mani 管理公开与可选私有检出。各代码仓库有独立的构建和检查入口，完整操作见[开发工作区](docs/guide/development-workspace.md)。Admin 固定 Vben Admin v5.7.0 官方默认 web-antd 应用。

## 本地检查

需要 Git、Python 3.11+、Node.js 24 和 uv 0.12.18。依赖通过 lockfile 固定，检查不需要数据库或生产凭据：

```bash
npm ci
python3 scripts/check.py
python3 -m unittest discover -s scripts -p "test_*.py"
npm run check:docs
npm run test:docs
uv run --locked mkdocs build --strict
```

完整命令、预览与限制见[检查指南](docs/guide/repository-checks.md)。CI 还运行固定版本的 actionlint。普通检查默认 GitHub 托管 runner；Docker/OCI 构建与 BJ1 Registry 拉取、推送、缓存固定使用 StuHelper 自建 runner。Casdoor 直接消费官方原件，不在本项目构建。

普通开发从最新 `origin/develop` 建短期分支并通过 PR squash 合入。正式发行经 `develop -> main` merge commit，项目负责人授权后才创建不可变 CalVer tag。

## 目录

```text
architecture/modules.json   模块仓库与依赖设计清单
docs/                      design / spec / development / guide / adr
scripts/                   仓库检查与 CI 工具
.github/workflows/         默认托管、可选 ARC 的基础 CI
.github/check-docs/        文档元信息、链接与锚点检查
mkdocs.yml                 本地文档站与严格构建配置
```

业务代码的目录提案见架构文档，实际实现与验证进度记录在 development 分类中。沟通和技术文档写作遵循 [AGENTS.md](AGENTS.md)。

代码与文档延续 StuHelper 的 [AGPL-3.0-only](LICENSE) 许可；Casdoor 是单独部署的第三方软件，保留其自己的官方许可证。
