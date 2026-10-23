# 系统架构提案

日期：2026-10-23。本文描述目标设计，不表示这些服务已经实现。

## 1. 总体选择

采用“独立身份服务 + 模块化业务后端 + 原生多端”。模块化指代码、数据、契约、权限和生命周期边界清楚；不要求第一天把所有模块做成独立微服务。

首期业务后端建议 Go + PostgreSQL，Redis 仅用于缓存/限流等可重建状态，文件放兼容 S3 的对象存储。沿用团队现有能力，但不复制旧仓库的整体工程与部署复杂度。具体依赖版本在实现阶段固定受支持版本和 lockfile。

```mermaid
flowchart TB
  WEB[Web / Admin] --> API[StuHelper Next API]
  MINI[微信原生小程序] --> API
  ANDROID[Android 原生] --> API
  IOS[iOS 原生] --> API
  HARMONY[HarmonyOS 原生] --> API
  WEB -. OIDC .-> SSO[官方 Casdoor / StuHelper SSO]
  ANDROID -. OIDC + PKCE .-> SSO
  IOS -. OIDC + PKCE .-> SSO
  HARMONY -. OIDC + PKCE .-> SSO
  API -. 身份验证 / 小程序绑定适配 .-> SSO
  AI[StuHelper AI] -. 独立 OIDC 应用 .-> SSO
  STORE[StuHelper Store] -. 独立 OIDC 应用 .-> SSO
  SSO --> IDDB[(SSO 独立数据库)]
  API --> MOD[模块公开接口 / 业务规则]
  MOD --> APPDB[(业务 PostgreSQL)]
  MOD --> OUTBOX[事务 Outbox / Workers]
  OUTBOX --> SEARCH[搜索投影 / 通知]
  MOD --> OBJECTS[对象存储]
```

SSO 不向 StuHelper Next 请求许可才能登录、启动、更新或恢复。AI、Store、Payment 的业务、账号映射和数据继续由各自系统维护。SSO 不承载课程、校园认证资料、社交图谱、订单或支付账本。

## 2. 模块与数据所有权

| 模块 | 拥有的事实 | 对外接口 / 事件 |
| --- | --- | --- |
| identity | `(issuer, subject) -> user_id`、本应用会话；不拥有密码或 Casdoor 用户表 | 当前身份、会话撤销、IdentityLinked |
| access | 校园/版块授权与审核权限账本；Casdoor 组织管理员事实的投影 | 检查 capability 和 scope、GrantChanged |
| profiles | 昵称、简介、头像引用、用户偏好、隐私设置 | 用户名片；不自动披露学号/手机 |
| campus | 学校、院系、学期、学生资格及证据索引 | 学校范围、资格查询与变化事件 |
| catalog | 课程目录、开课批次、教师、授课关联 | 课程/教师详情、OfferingChanged |
| reviews | 课程评价、教师评价、版本与评分 | 发布/编辑评价、ReviewPublished |
| resources | 往年题、笔记、资料元数据、来源和使用权限 | 授权下载、ResourcePublished |
| social | 动态、关注、屏蔽、点赞、收藏、评论/回复 | 内容互动、FollowChanged |
| moderation | 审核案件、举报、处置、申诉和审计 | 发布决策、VisibilityChanged |
| media | 上传、扫描、文件状态、对象存储引用 | 创建上传、检查文件可用、MediaReady |
| search | 可重建的搜索文档和游标 | 跨模块搜索；不是业务权威 |
| notifications | 站内通知、发送意图、投递记录与偏好 | 订阅领域事件、通知已读 |
| integrations | AI/Store/机器人/外部学校系统的窄适配器 | 稳定契约、幂等 webhook |

学生资格是 StuHelper 业务事实，与 Casdoor“登录账号存在”分开。已有组织管理员权威不改成 token 的泛化 roles：Casdoor 目标组织有效 `IsAdmin` 决定全局管理员身份；学校/版块权限由业务授权账本维护，敏感操作服务端复核。OpenFGA 可作以后复杂资源关系的可重建投影，第一版是否需要由授权用例决定。

## 3. 解耦如何落实

1. 每个模块按 `domain / application / ports / adapters` 组织。HTTP handler 和数据库 repository 均为适配器；组合根统一注入依赖。目录数量可随模块大小缩减，禁止空层层转发。
2. 初期同一个 PostgreSQL 实例内每模块独立 schema 与迁移目录，业务数据与 SSO 库绝不混用。写入只能由所属模块负责；跨模块不直接读写对方表，也不共享 ORM entity。
3. 同步调用走公开应用接口。查询组合通过 API 聚合层或可重建读模型完成，避免让客户端发十余次请求组装一页。模块间 ID 是稳定、不透明的标识。
4. 所属模块的业务写入、审计和 outbox 在同一数据库事务提交。异步消费采用至少一次投递、event ID 去重、aggregate revision 排序/防倒退、有界重试与死信处理。不得声称消息系统提供端到端 exactly-once。
5. 只对真实跨模块原子不变量定义显式协调事务；否则用意图/补偿状态，避免隐含跨库事务。文件上传先进入隔离区，业务引用确认后发布，孤儿文件由有界后台任务清理。
6. 搜索、计数和 feed 是投影，允许明确的短暂延迟。撤权、屏蔽、审核下架和下载权限在返回结果时实时过滤，不等待索引最终一致。
7. Web BFF 可持有服务端 OIDC 会话，移动 API 提供面向公有客户端的认证契约；BFF 只编排展示与会话，不复制课程/审核等业务规则。
8. 模块可独立测试；后续 CI 增加禁止跨模块私有 import、schema 访问和契约破坏的自动检查。当前清单校验仅检查设计依赖图，不能替代实现约束。

## 4. 可插拔的明确含义

内置模块使用编译时注册 + 启动时启用配置。模块清单声明版本、required/optional dependencies、提供的 API/capabilities/events、schema 版本范围、健康检查和关闭方式。启动时拓扑排序；缺少必需模块或版本不兼容直接给出配置错误。

| 操作 | 预期行为 |
| --- | --- |
| 不安装 social | 课程、评价、资料继续可用；关注/评论入口从服务端 capability 清单消失 |
| 关闭 resources | 禁止新上传/下载，保留数据和审计；已签发下载 URL 的有限有效期须明确 |
| 关闭依赖模块 | 明确拒绝，或按审核过的计划连带关闭依赖方；不静默退化 |
| 更新模块 | 校验 schema/API 兼容范围，先迁移，再切换，不按开关自动 down migration |
| 卸载模块 | 先停入口和 worker，排空/保留任务；数据清理单独授权 |
| 接入外部扩展 | 独立进程或 webhook，经 scope、超时、限流、签名、重放保护和审计 |

首期不开放上传任意代码在主进程热加载的能力，不采用 Go `.so` 插件作为业务扩展 ABI。原生客户端的功能包随各自商店审核发行；服务端模块启停不能凭空下发新原生 UI。

接口有 `/api/v1` 版本与明确弃用期；事件包含 `id/type/version/occurred_at/aggregate_id/revision/trace_id`，敏感数据不放入通用事件。客户端支持版本范围和 capability 协商，未知可选字段可忽略，未知权限或必需能力须明确拒绝。

## 5. 运行和拆分策略

最初运行两个业务进程 `api`、`worker`，同一代码库、独立扩容；SSO 自身单独部署。对象存储、备份与监控也有独立运维责任。首次部署优先 Compose，已有容量和调度需求时再采用 Kubernetes。

只有出现独立扩缩容、故障隔离、团队所有权或数据隔离需求时再提取服务。优先候选是搜索、媒体处理、通知和后续实时消息。课程与开课、教师的关联查询先留在同一 catalog 模块，减少无收益的网络调用。

运行质量要求：结构化脱敏日志、OpenTelemetry trace、就绪/存活分离、后台任务可取消、有界队列、幂等 API、数据库 PITR 与实际恢复演练。容量/SLO 和 RPO/RTO 在基准测试与业务优先级确定后填写，不先编造数字。

## 6. 未来代码布局

```text
apps/web/                 Web 原生浏览器应用
apps/admin/               管理端（共享 Web 工具，不共享权限判断）
apps/wechat/              微信原生小程序
apps/android/             Kotlin / Jetpack Compose
apps/ios/                 Swift / SwiftUI
apps/harmony/             ArkTS / ArkUI
server/cmd/api/            API 组合根
server/cmd/worker/         Worker 组合根
server/modules/<module>/  业务模块及其 migration
contracts/openapi/        HTTP 契约
contracts/events/         事件 schema
sdks/                     生成的 TS / Kotlin / Swift / ArkTS 客户端
design/                   设计 token、图标源与跨端交互规范
ops/sso/                  可独立导出、独立版本化的 SSO 运维包
ops/app/                  业务系统部署
```

SSO 运维包初期放在本仓库便于审查，但不得导入 server、使用业务数据库或要求业务服务在线；发布独立 SSO 运维制品，之后需要仓库权限隔离时再迁出。其源码始终来自 `casdoor/casdoor`，不是另建产品 fork。
