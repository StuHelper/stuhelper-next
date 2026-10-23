---
type: development
status: InReview
updated: 2026-10-24
---

# 旧业务整理与确认

## 目标、范围与进度

进度：进行中。已整理项目负责人确认保留的业务，补充实名、作品授权、资料权益、货币、后台运营和机器人功能。待决定的问题集中在[业务清单](business-decisions.md)，实际检查结果见文末。

Next 是现有 StuHelper 的重构版本，未来改名与旧仓库退役的方向见[业务范围](../design/business-scope.md)。本次在现有独立文档工作树继续更新 [PR #1](https://github.com/StuHelper/stuhelper-next/pull/1)，不修改旧工作树内容或生产系统。

## 来源与提取范围

只读核对旧仓库 `origin/develop` 的固定提交 `a0a998688a623da7811d04037efe0829c0783267`。旧文档存在历史冲突，下面的来源用于了解业务，最终目标以已确认的 Next 规格为准。

| 旧资料 | 提取后的维护位置 |
| --- | --- |
| [课程与评课](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/course-review.md) | [课程与评价](../spec/academic-content.md)、[内容运营](../spec/content-management.md)、[排行与趋势](../spec/discovery-and-statistics.md) |
| [学生认证与入群](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/student-verification-and-group-admission.md) | [认证](../spec/student-verification.md)及[QQ 群服务](../spec/qq-group-services.md) |
| [用户系统](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/user-system.md) | [个人中心](../spec/personal-center.md) |
| [资源共享](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/resource-sharing.md) | [资料共享](../spec/resource-sharing.md)，版权和删除采用本轮新决定 |
| [通知](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/notification.md) | [通知中心](../spec/notifications.md) |
| [教务数据集成](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/academics-data-integration.md) | [我的课程与课表](../spec/my-courses.md)及[目录维护与导入](../spec/catalog-operations.md) |
| [群名片治理](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/koishi-group-card-governance.md) | QQ 群服务中的名片检查与提醒 |
| [黑名单统一](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/member-blacklist-unification.md) | QQ 群服务中的黑名单与管理员处理 |
| [机器人业务说明](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/bots/koishi/README.md) | 群消息管理、[信息查询](../spec/information-query.md)与[娱乐功能](../spec/bot-entertainment.md)，查询范围采用本次确认的新规则 |
| [开放平台](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/design/open-platform-v1.md) | [第三方开放平台](../spec/open-platform.md) |
| [存储贡献](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/docs/product-specs/storage-contribution.md) | [存储贡献](../spec/storage-contribution.md) |

北航代码证据包括 [VerifyRealName](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/server/internal/modules/studentverification/service.go#L507) 对学号、姓名、证件信息及学籍候选的比对，以及[旧实名服务](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/server/internal/modules/user/service_identity.go)中优先匹配已绑定学籍的路径。这些证据不表示 Next 已建立学校数据库连接，也不能把旧代码存在推断为当前生产路由仍在使用。

五级文案另外核对[旧中文文本](https://github.com/StuHelper/StuHelper/blob/a0a998688a623da7811d04037efe0829c0783267/clients/web/src/i18n/locales/zh-CN/review.ts)。原创授权存续参考[知乎协议第三部分](https://www.zhihu.com/term/zhihu-terms)的思路；不复制其所有条款，也不声称已经完成正式法律文本审查。

## 已确认的变更

2026-10-23 项目负责人明确同意写入已确认内容，并先后确认以下规则：

- 评课沿用游客和未认证用户看预览、学生看全文并发布的限制，继续五级文字与表情展示。
- 课程和教师评价默认匿名，也允许使用平台昵称和头像署名。导师评论沿用评课的发布条件，不要求系统提供对应选课证明。2026-10-24 增补可配置的短时撤回重编窗口，超时修改与删除由管理员处理。
- 发布前绑定手机号；学生认证本身不强制绑手机；发布不额外要求独立实名，但用户可以完成实名。
- 北航实名信息校验沿用学籍比对，通过后同时完成学生认证和实名；单独实名也优先学籍比对，未覆盖用户的云实人认证以后接入。
- 学生认证只允许用户申请撤销或删除，由管理员处理。
- 原创资料授权覆盖著作权保护期，包含商业使用及再授权，普通下架、删除不当然撤销许可；资料不提供普通删除，允许编辑、更正及申请下架。
- 公开资料供已认证学生免费；受限资料支持范围内管理员、逐用户授权、可配置群体权益及购买解锁。普通用户仍需保持有效学生资格，管理员仅在管理范围内例外；资格失效暂停下载而不抹去长期解锁权益。
- QQ 群资格失效后提醒并进入管理员可配置宽限期，可延长或豁免，到期仍不符合且无豁免则自动移出。
- 本轮同时讨论积分与余额两套账户、余额购买积分、平台收取消费、贡献奖励、长期和限时积分及原路或人工退款，规则集中在[货币规格](../spec/wallet-and-points.md)。
- 余额采用 Ivory 计价，CNY 充值按 1 CNY = 1 Ivory；支持 USDT 充值的方向已确认，汇率和接入规则留待后续讨论。
- 积分先扣最早到期的限时积分，再扣长期积分；退款保留原类型与有效期，按实际到账时判断，已过期部分不恢复为可用积分，不续期或增加宽限期。
- 纳入内容运营、课程和教师维护、教务导入、热门课程与教师、评价趋势和我的投票。资料支持整目录和多包下载，存储贡献增加透明度页面。
- 机器人按群聊管理、信息查询和娱乐功能组织。群聊管理包含警告、禁言、关键词、防复读、防撤回和 AI 举报分析。信息查询覆盖身份、认证、内容、群记录、会员权益、积分、Ivory、消费及退款。
- 平台管理员可查全站，其他管理员按负责学校、群和业务模块授权。管理后台提供完整查询入口，机器人查询能力另行按权限配置。

2026-10-24 继续确认评价阅读和互动条件、不限制评价条数、课程五维评分、导师评论推荐模板、讨论内身份一致性、短时撤回重编，以及管理员主动编辑、复核与删除恢复。完整规则在[评价规格](../spec/academic-content.md)和[内容管理](../spec/content-management.md)维护。新增[来源覆盖表](business-migration-coverage.md)，记录 28 个固定来源引用及后续补查项目。

## 沟通与写作规范

已按项目负责人提供的原文更新仓库根目录 [AGENTS.md](https://github.com/StuHelper/stuhelper-next/blob/docs/adopt-project-docs-starter/AGENTS.md#沟通与回复)，并把相同原文加入本机主工作区的 AGENTS.md。规范直接存放在 AGENTS.md 中。

本轮审阅现有 Markdown，简化重复的状态声明和含糊表述，并解释 OIDC、Outbox、schema、PKCE、HMAC 等必要概念。修正路线图中已过时的署名待确认项，保留已确认业务规则、SSO 数据保留要求和失败恢复条件。

## 未继承的旧约束

旧评课要求独立实名的门槛已被本轮明确决定替代。旧学生认证文档“不再设独立实名域”的描述不用于否定本轮确认的可选实名能力。旧资料“不要求版权声明”和允许普通删除的规则由本轮新规则替代。

旧积分实现只允许零价格，不能作为完整货币系统已经实现的证据。本次重新确认产品行为，不复制旧权限投影、锁、加密、审计保留期或存储调度来扩大业务文档。

## 任务与验证

- [x] 阅读旧业务文档并核对固定 develop 提交及北航相关代码。
- [x] 取得写入授权，分清已确认规则与未决项。
- [x] 按主题形成业务设计和行为规格。
- [x] 同步分类索引、总览、实施路线和 MkDocs 导航。
- [x] 执行文档与仓库检查，记录实际结果。

| 检查 | 本次结果 |
| --- | --- |
| `python3 scripts/check.py` | 通过，覆盖仓库语法、13 个原有模块声明和候选元数据 |
| `npm run check:docs` | 通过，57 份 Markdown 的格式、元信息、本地链接和锚点 |
| `npm run test:docs` | 7 项检查器回归通过 |
| `python3 scripts/lint_workflows.py` | actionlint 1.7.12 通过 |
| `uv run --locked mkdocs build --strict` | 通过，新增页面与分类导航纳入严格构建 |
| 固定旧来源检查 | 14 个引用路径均存在于记录的旧提交中 |

当前提交的远端结果见 [PR #1 checks](https://github.com/StuHelper/stuhelper-next/pull/1/checks)。课程关系图已调整为允许直接评价课程，并在本地浏览器中确认成功生成 SVG。文档、链接、工具与静态站点构建的结果按当前提交记录。

学校方法清单、资格期限、会员套餐等问题保留在对应规格，并汇总到业务清单。课程评分、导师模板、短时撤回重编与讨论身份规则已在 2026-10-24 继续确认并写入。

本次修改范围为文档。规格中的验收表用于指导未来实现，业务测试和生产验收的结果在实施后记录。
