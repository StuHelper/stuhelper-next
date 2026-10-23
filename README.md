# StuHelper Next

现有 StuHelper 的重构版本，Next 是过渡名称，未来以 StuHelper 的名称继续维护。重新实现已确认保留的校园业务，采用独立官方 Casdoor SSO、模块化业务契约，以及 Web、微信小程序、Android、iOS、HarmonyOS 原生客户端。

**当前阶段：架构提案与工程初始化。** 本仓库尚无业务 API 或客户端产品；SSO 部署、数据迁移和真实账号验收尚未执行。CI 通过只证明仓库检查通过。

## 已确定的方向

- `StuHelper/stuhelper-next` 是公共仓库；默认使用 GitHub 标准托管 runner，可手动选用 StuHelper ARC。
- Casdoor 直接使用官方未经修改的发行镜像，独立数据库、运行环境与更新生命周期；不得依赖主站后台、主站数据库或主站发布。
- 保留现有 SSO 数据、issuer、用户标识和消费方绑定；AI、Store 等已有应用独立接入同一身份提供方。
- 先实现有明确边界的模块化后端，模块通过公开接口和事件协作；有实际隔离需求时再拆服务。
- 客户端共享 API、领域术语、设计规范和验收用例，原生 UI 与平台生命周期分别实现。
- 保留课程与评课、学生认证与可选实名、资料共享、个人中心、通知、课表、QQ 入群与群管理、开放平台及存储贡献；积分、余额和资料权益采用本轮确认的业务规则，见[业务范围](docs/design/business-scope.md)。

## 文档入口

采用 [project-docs-starter](https://github.com/lihaotong0712/project-docs-starter/tree/1c4c6bb1bd401b803ea986b404932926cfc95eb0) 的五类文档架构，从[文档导航](docs/README.md)进入。

| 分类 | 内容 |
| --- | --- |
| [design](docs/design/README.md) | 重构业务范围、身份与货币概念、系统架构、独立 SSO 与原生端机制 |
| [spec](docs/spec/README.md) | 各业务行为、资料权益、积分与余额、身份兼容和验收场景 |
| [development](docs/development/README.md) | 调研、实施任务、实际进度与验证证据 |
| [guide](docs/guide/README.md) | 本地检查、文档预览、CI 操作与候选解析 |
| [adr](docs/adr/README.md) | 官方镜像、runner 分工和文档架构的已确认决策 |

## 本地检查

需要 Git、Python 3.11+、Node.js 24 和 uv 0.12.18。依赖通过 lockfile 固定，检查不需要数据库或生产凭据：

```bash
npm ci
python3 scripts/check.py
npm run check:docs
npm run test:docs
uv run --locked mkdocs build --strict
```

完整命令、预览与限制见[检查指南](docs/guide/repository-checks.md)。CI 还运行固定版本的 actionlint。普通检查默认 GitHub 托管 runner；Docker/OCI 构建与 BJ1 Registry 拉取、推送、缓存固定使用 StuHelper 自建 runner。Casdoor 直接消费官方原件，不在本项目构建。

普通开发从最新 `origin/develop` 建短期分支并通过 PR squash 合入。正式发行经 `develop -> main` merge commit，owner 授权后才创建不可变 CalVer tag。

## 目录

```text
architecture/modules.json   模块依赖的设计清单（不是运行时插件加载器）
docs/                      design / spec / development / guide / adr
ops/sso/                   无业务依赖的官方镜像候选解析工具
scripts/                   仓库检查与 CI 工具
.github/workflows/         默认托管、可选 ARC 的基础 CI
.github/check-docs/        文档元信息、链接与锚点检查
mkdocs.yml                 本地文档站与严格构建配置
```

未来业务代码目录见架构文档；不以空项目、假 API 或通过的占位测试表示功能已完成。

代码与文档延续 StuHelper 的 [AGPL-3.0-only](LICENSE) 许可；Casdoor 是单独部署的第三方软件，保留其自己的官方许可证。
