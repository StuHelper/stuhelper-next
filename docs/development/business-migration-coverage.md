---
type: development
status: InReview
updated: 2026-10-24
---

# 旧业务文档迁移覆盖

## 目标与进度

进度：进行中。将旧仓库中仍需要的业务整理到 Next，逐项确认有实际产品取舍的规则，并为每组来源记录维护位置。迁移完成需要同时满足来源覆盖、业务决定和文档检查三项条件。

旧仓库基线为 `a0a998688a623da7811d04037efe0829c0783267`，于 2026-10-24 刷新 `origin/develop` 后核对。已盘点 `docs/` 和机器人目录中的 167 份 Markdown：9 份产品规格、32 份设计、26 份指南、18 份 ADR、3 份参考、75 份内部记录、2 份机器人说明，以及 2 份文档根入口。目录盘点用于发现来源，正文核对按下面的业务主题继续进行。

本轮沿用已确认的业务迁移范围。旧部署、权限框架、数据库锁、后台任务和数据清理实现作为技术参考保留在原仓库，具体实现由新架构决定。旧历史文档中的批准状态不直接成为 Next 的业务决定。

## 产品规格的去向

| 旧来源 | 抽取内容 | Next 维护位置与剩余工作 |
| --- | --- | --- |
| [课程与评课](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/course-review.md) | 查询、评分、评价、回复、投票、收藏、草稿、举报、运营和排行 | [评价](../spec/academic-content.md)、[内容管理](../spec/content-management.md)、[发现与统计](../spec/discovery-and-statistics.md)。继续确认细则 |
| [教务数据](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/academics-data-integration.md) | 学期、课程、教师、开课、课表与导入 | [我的课程](../spec/my-courses.md)、[目录维护](../spec/catalog-operations.md)。继续确认维护和同步体验 |
| [资料共享](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/resource-sharing.md) | 上传、版本、检索、归属、可见性与下载 | [资料共享](../spec/resource-sharing.md)。采用已确认的原创授权、下架申请和付费权益规则，继续确认上传与交付细则 |
| [存储贡献](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/storage-contribution.md) | 申请、容量、期限、暂停、退出、榜单、透明度与目录下载 | [存储贡献](../spec/storage-contribution.md)及资料规格。继续确认服务商、退出、奖励和公开字段 |
| [用户系统](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/user-system.md) | 账号资料、认证摘要、手机和 QQ 绑定 | [个人中心](../spec/personal-center.md)、[学生认证](../spec/student-verification.md)。继续确认换绑、解绑、找回与注销 |
| [学生认证与群准入](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/student-verification-and-group-admission.md) | 学校方法、人工审核、学籍资格、新生、学习经历、入群和配置 | [学生认证](../spec/student-verification.md)、[QQ 群服务](../spec/qq-group-services.md)、[信息查询](../spec/information-query.md)。逐校和逐类资格确认 |
| [通知](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/notification.md) | 通知类型、未读、已读与内容跳转 | [通知](../spec/notifications.md)。继续确认默认开关、聚合、免打扰和外部渠道 |
| [审计日志](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/audit-logging.md) | 管理员查看谁在何时做了什么、处理原因和结果 | 后台操作记录的业务界面待确认。日志技术、表结构和保留期不直接迁移 |
| [产品索引](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/index.md) | 业务覆盖与产品范围 | [业务范围](../design/business-scope.md)和本表。旧索引保留为来源 |

## 散落在设计和机器人文档中的业务

| 来源主题 | 需要核对的业务 | 处理方式 |
| --- | --- | --- |
| [产品概览](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/product-overview.md)、[目标范围](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/target-scope.md) | 使用者、校园信息平台定位、教务与作业业务范围 | 与已确认重构定位核对，产品边界有变化时单独确认 |
| [认证与会话](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/auth-and-session.md)、[IAM](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/iam-architecture.md) | 登录、注册、找回、账号设置、当前设备与全部设备退出 | SSO 机制已整理。用户可见账号操作仍需补充确认 |
| [授权模型](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/authorization-model.md) | 平台、学校、群及业务模块管理员各能做什么 | 结合已确认信息查询范围，继续形成业务角色表 |
| [开放平台](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/open-platform-v1.md)、[原生 Casdoor 消费](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/native-casdoor-consumer.md) | 应用审批、资料补全、授权、撤回、暂停应用与开放字段 | [开放平台](../spec/open-platform.md)。字段、使用者及收费继续确认 |
| [入群流程](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/admission-flow.md)、[历史成员资格检查](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/admission-membership-reconciliation.md) | 入群模式、现有成员检查、提醒、资格失效与处理结果 | [QQ 群服务](../spec/qq-group-services.md)。范围内确认后补齐 |
| [群名片](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/koishi-group-card-governance.md) | 格式、自由昵称、检查、自动修改、提醒、次数与豁免 | [QQ 群服务](../spec/qq-group-services.md)。配置和处罚规则继续确认 |
| [成员黑名单](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/member-blacklist-unification.md) | 单群或跨群限制、原因、期限、解除和重新入群 | [QQ 群服务](../spec/qq-group-services.md)。作用范围与使用者继续确认 |
| [群操作结果](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/governance-execution-convergence.md)、[保留与清理](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/governance-retention-lifecycle.md) | 举报处理、人工决定、执行结果、历史查看和成员限制 | 提取可见行为。重试、消息队列和清理算法由新技术设计决定 |
| [举报图片证据](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/koishi-case-image-evidence.md) | 管理员查看并保存与举报有关的图片 | 保留范围、查看者和用户体验待确认，不直接复制存储方案 |
| [管理配置](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/admin-configuration-concurrency.md) | 管理员改配置、查看影响和处理别人同时修改的情况 | 后台配置的业务体验待确认，不复制旧审批和等待时长 |
| [存储架构](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/storage-architecture.md)、[分布式存储](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/distributed-storage-fabric.md) | 上传、扫描、审核、文件与目录下载、容量和管理员面板 | 补查资料及存储规格中的用户可见行为。副本调度和驱动实现单独设计 |
| [机器人说明](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/bots/koishi/README.md) | 群聊管理、信息查询、娱乐命令与管理入口 | 三个业务菜单已确认，具体规则在相应规格继续确认 |

## 历史与技术文档的处理

历史设计快照用于寻找当前文档遗漏的功能。例如[早期群管中心](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/internal/design-snapshots/koishi/2026-04-19-koishi-moderation-center-design.md)提到欢迎提示、群规则模板、批量操作和 AI 自动动作。这些属于候选业务，先与现行文档核对，再提交项目负责人确认。旧的菜单结构、权限模型和技术归属不直接采用。

已经废弃的入群入口、身份迁移与清理方案只保留历史链接。特别是旧学生认证文档中的一次性清空规则，与后续保留既有身份的记录存在历史差异。Next 的旧数据迁移范围必须单独确认。

工程原则、前后端分层、错误处理、部署、备份、发布和 CI 文档分别由 Next 已有工程文档承接，后续按选定实现补充。旧系统的实际运行结果和故障记录保留在旧仓库，不改写成 Next 的验证结果。品牌规范和资产作为产品展示事项，在确认品牌是否沿用后决定迁移位置。

## 完成条件

- [x] 固定旧仓库提交，盘点产品、设计、指南、参考、ADR 与历史记录入口。
- [x] 建立主要业务来源与 Next 文档的对应关系。
- [ ] 补查历史记录中的功能，与现行文档核对是否仍适用。
- [ ] 每项候选业务都有明确结果：保留、舍弃，或由项目负责人明确延期。
- [ ] 保留业务的关键规则全部确认，并写入对应规格。
- [ ] 所有剩余数值都有明确配置规则或已确认默认值，避免把技术参数误当产品决定。
- [ ] 同步业务范围、索引、路线和待确认清单，清除互相矛盾或已过时的说明。
- [ ] 执行文档与仓库检查，提交 PR 并核对当前提交的 CI。

已确认的 USDT 接入细节和云实人认证产品选型留待后续，不反复要求立即决定。其他问题按[业务清单](business-decisions.md)逐批确认，确认结果直接更新规格。
