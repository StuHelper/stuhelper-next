---
type: development
status: Accepted
updated: 2026-10-24
---

# 旧业务文档迁移覆盖

## 目标与进度

进度：业务来源整理与规则确认已完成。将旧仓库中仍需要的业务整理到 Next，逐项确认有实际产品取舍的规则，并为每组来源记录维护位置。迁移完成需要同时满足来源覆盖、业务决定和文档检查三项条件。

旧仓库来源基线为 `a0a998688a623da7811d04037efe0829c0783267`。来源清单记录文档路径、哈希和处理分类，保存在私有 ops 仓库的 `source-inventory.json`。

盘点范围包括 `docs/` 和机器人目录中的 167 份 Markdown，涵盖产品规格、设计、指南、ADR、参考材料、内部记录和入口。下表核对已保留的产品行为，旧实现和旧运行证据保留在原仓库。

本轮沿用已确认的业务迁移范围。旧部署、权限框架、数据库锁、后台任务和数据清理实现作为技术参考保留在原仓库，具体实现由新架构决定。旧历史文档中的批准状态不直接成为 Next 的业务决定。

## 产品规格的去向

| 旧来源 | 抽取内容 | Next 维护位置与剩余工作 |
| --- | --- | --- |
| [课程与评课](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/course-review.md) | 查询、评分、评价、回复、投票、收藏、草稿、举报、运营和排行 | [评价](../spec/academic-content.md)、[内容管理](../spec/content-management.md)、[发现与统计](../spec/discovery-and-statistics.md)。规则已确认 |
| [教务数据](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/academics-data-integration.md) | 学期、课程、教师、开课、课表与导入 | [我的课程](../spec/my-courses.md)、[目录维护](../spec/catalog-operations.md)。人工更正、导入与课表规则已确认 |
| [资料共享](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/resource-sharing.md) | 上传、版本、检索、归属、可见性与下载 | [资料共享](../spec/resource-sharing.md)。采用已确认的原创授权、下架申请和付费权益规则，上传、审核、交付与目录规则已确认 |
| [存储贡献](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/storage-contribution.md) | 申请、容量、期限、暂停、退出、榜单、透明度与目录下载 | [存储贡献](../spec/storage-contribution.md)及资料规格。服务商按实际接入开放，退出、统计及公开字段已确认 |
| [用户系统](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/user-system.md) | 账号资料、认证摘要、手机和 QQ 绑定 | [个人中心](../spec/personal-center.md)、[学生认证](../spec/student-verification.md)。绑定、找回与业务注销规则已确认 |
| [学生认证与群准入](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/student-verification-and-group-admission.md) | 学校方法、人工审核、学籍资格、新生、学习经历、入群和配置 | [学生认证](../spec/student-verification.md)、[QQ 群服务](../spec/qq-group-services.md)、[信息查询](../spec/information-query.md)。详细认证规则迁入私有仓库，群与查询规则已确认 |
| [通知](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/notification.md) | 通知类型、未读、已读与内容跳转 | [通知](../spec/notifications.md)。默认开关、聚合、免打扰与渠道规则已确认 |
| [审计日志](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/audit-logging.md) | 管理员查看谁在何时做了什么、处理原因和结果 | 后台操作记录由管理操作规格承接。日志技术、表结构和保留期不直接迁移 |
| [产品索引](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/index.md) | 业务覆盖与产品范围 | [业务范围](../design/business-scope.md)和本表。旧索引保留为来源 |

## 散落在设计和机器人文档中的业务

| 来源主题 | 需要核对的业务 | 处理方式 |
| --- | --- | --- |
| [产品概览](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/product-overview.md)、[目标范围](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/target-scope.md) | 使用者、校园信息平台定位、教务与作业业务范围 | 与已确认重构定位核对，已确认继续采用校园信息平台边界 |
| [认证与会话](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/auth-and-session.md)、[IAM](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/iam-architecture.md) | 登录、注册、找回、账号设置、当前设备与全部设备退出 | SSO 机制已整理。用户可见账号操作已确认 |
| [授权模型](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/authorization-model.md) | 平台、学校、群及业务模块管理员各能做什么 | 结合已确认信息查询范围，由已确认的管理角色与配置规格承接 |
| [开放平台](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/open-platform-v1.md)、[原生 Casdoor 消费](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/native-casdoor-consumer.md) | 应用审批、资料补全、授权、撤回、暂停应用与开放字段 | [开放平台](../spec/open-platform.md)。字段与授权规则已确认，商业收费明确延期 |
| [入群流程](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/admission-flow.md)、[历史成员资格检查](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/admission-membership-reconciliation.md) | 入群模式、现有成员检查、提醒、资格失效与处理结果 | [QQ 群服务](../spec/qq-group-services.md)。准入、动态口令与既有成员检查已确认 |
| [群名片](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/koishi-group-card-governance.md) | 格式、自由昵称、检查、自动修改、提醒、次数与豁免 | [QQ 群服务](../spec/qq-group-services.md)。模板、性别条件分隔符、提醒和处罚开关已确认 |
| [成员黑名单](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/member-blacklist-unification.md) | 单群或跨群限制、原因、期限、解除和重新入群 | [QQ 群服务](../spec/qq-group-services.md)。单群、多群、全平台范围及默认永久规则已确认 |
| [群操作结果](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/governance-execution-convergence.md)、[保留与清理](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/governance-retention-lifecycle.md) | 举报处理、人工决定、执行结果、历史查看和成员限制 | 提取可见行为。重试、消息队列和清理算法由新技术设计决定 |
| [举报图片证据](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/koishi-case-image-evidence.md) | 管理员查看并保存与举报有关的图片 | 查看与留存规则已确认，不新增撤回查看审计，不直接复制存储实现 |
| [管理配置](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/admin-configuration-concurrency.md) | 管理员改配置、查看影响和处理别人同时修改的情况 | 配置范围、来源、并发冲突与操作记录已确认，不复制旧实现 |
| [存储架构](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/storage-architecture.md)、[分布式存储](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/distributed-storage-fabric.md) | 上传、扫描、审核、文件与目录下载、容量和管理员面板 | 补查资料及存储规格中的用户可见行为。副本调度和驱动实现单独设计 |
| [机器人说明](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/bots/koishi/README.md) | 群聊管理、信息查询、娱乐命令与管理入口 | 三个业务菜单已确认，具体规则在相应规格维护 |

## 历史与技术文档的处理

历史设计快照用于寻找当前文档遗漏的功能。例如[早期群管中心](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/internal/design-snapshots/koishi/2026-04-19-koishi-moderation-center-design.md)提到欢迎提示、群规则模板、批量操作和 AI 自动动作。这些补查项目已与现行文档核对，并由项目负责人确认保留。旧的菜单结构、权限模型和技术归属不直接采用。

已经废弃的入群入口、身份迁移与清理方案只保留历史链接。特别是旧学生认证文档中的一次性清空规则，与后续保留既有身份的记录存在历史差异。Next 已确认仅迁移 SSO 与学生认证数据，并明确不迁移独立实名结果和其他旧业务数据。

工程原则、前后端分层、错误处理、部署、备份、发布和 CI 文档分别由 Next 已有工程文档承接，后续按选定实现补充。旧系统的实际运行结果和故障记录保留在旧仓库，不改写成 Next 的验证结果。品牌沿用 StuHelper 与已确认的纸飞机资产，客户端实现时从核对过的源文件接入。

补查覆盖机器人后台聊天工作台、事件订阅、动态口令、广告与链接检测、频率限制、观察名单、规则预览，以及上传取消的用户可见结果。这些功能由群服务或资料规格维护。

行为来源包括[机器人后台完成记录](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/internal/koishi-webui-refactor-completion-2026-08-23.md)和[上传取消记录](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/internal/exec-plans/completed/2026-09-11-web02-upload-cancellation.md)。Next 的实现结果在对应实施任务中验证。

## 完成条件

- [x] 固定旧仓库提交，盘点产品、设计、指南、参考、ADR 与历史记录入口。
- [x] 建立主要业务来源与 Next 文档的对应关系。
- [x] 补查历史记录中的功能，与现行文档核对是否仍适用。
- [x] 每项候选业务都有明确结果：保留、舍弃，或由项目负责人明确延期。
- [x] 保留业务的关键规则全部确认，并写入对应规格。
- [x] 所有剩余数值都有明确配置规则或已确认默认值，避免把技术参数误当产品决定。
- [x] 同步业务范围、索引、路线和待确认清单，清除互相矛盾或已过时的说明。
- [x] 执行本地文档与仓库检查，并核实修改后的图表实际渲染。

各仓库的提交与远端验证结果记录在对应 PR，最终核对以精确提交的完整 CI 为准。

全部业务选择均已确认或明确延期，结果见[确认清单](business-decisions.md)。私有模块细节在相应仓库维护。当前没有待回答的业务问题。
