# StuHelper Next

面向校园的模块化内容与社交平台。独立官方 Casdoor SSO，共享业务契约，Web、微信小程序、Android、iOS、HarmonyOS 各自原生实现。

**当前阶段：架构提案与工程初始化。** 本仓库尚无业务 API 或客户端产品；SSO 部署、数据迁移和真实账号验收尚未执行。CI 通过只证明仓库检查通过。

## 已确定的方向

- `StuHelper/stuhelper-next` 是公共仓库；默认使用 GitHub 标准托管 runner，可手动选用 StuHelper ARC。
- Casdoor 直接使用官方未经修改的发行镜像，独立数据库、运行环境与更新生命周期；不得依赖主站后台、主站数据库或主站发布。
- 保留现有 SSO 数据、issuer、用户标识和消费方绑定；AI、Store 等已有应用独立接入同一身份提供方。
- 先实现有明确边界的模块化后端，模块通过公开接口和事件协作；有实际隔离需求时再拆服务。
- 客户端共享 API、领域术语、设计规范和验收用例，原生 UI 与平台生命周期分别实现。

## 设计入口

| 文档 | 内容 |
| --- | --- |
| [系统架构](docs/architecture.md) | 业务模块、数据所有权、扩展方式与运行拓扑 |
| [内容模型](docs/domain-model.md) | 课程、开课、教师、评价、资料和社交关联 |
| [SSO 独立化与迁移](docs/sso-migration.md) | 官方 v4、数据保留、一键更新、切换与恢复 |
| [登录兼容验收](docs/sso-compatibility.md) | AI、Store、旧站及新客户端的验收矩阵 |
| [原生多端](docs/native-clients.md) | 各端技术路线、登录和渐进交付 |
| [CI 与 runners](docs/ci.md) | 免费托管 runner、自建 runner、信任边界 |
| [实施路线](docs/roadmap.md) | 分阶段成果和完成条件 |
| [事实与来源](docs/research.md) | 2026-10-23 核查范围及官方资料 |

## 本地检查

需要 Python 3.11+、Git。基础检查不需要数据库或生产凭据：

```bash
python3 scripts/check.py
```

CI 还通过固定版本的 actionlint 校验工作流。首次引导提交建立空仓库的 `develop` 和 `main`；此后普通开发从最新 `origin/develop` 建短期分支并通过 PR squash 合入。正式发行经 `develop -> main` merge commit，owner 授权后才创建不可变 CalVer tag。

## 目录

```text
architecture/modules.json   模块依赖的设计清单（不是运行时插件加载器）
docs/                      架构、契约、迁移与验收设计
ops/sso/                   无业务依赖的官方镜像候选解析工具
scripts/                   仓库检查与 CI 工具
.github/workflows/         默认托管、可选 ARC 的基础 CI
```

未来业务代码目录见架构文档；不以空项目、假 API 或通过的占位测试表示功能已完成。

代码与文档延续 StuHelper 的 [AGPL-3.0-only](LICENSE) 许可；Casdoor 是单独部署的第三方软件，保留其自己的官方许可证。
