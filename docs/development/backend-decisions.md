---
type: development
status: Accepted
updated: 2026-11-01
---

# 业务决定的后端实施

## 目标与当前状态

本主题列出 2026-11-01 前端审查后需要后端完成的工作，由 Codex 负责实施。规则以[确认结果](business-decisions.md)和各规格为准，本主题只说明范围、顺序和完成条件。

当前进度：第 1 至 7 阶段已实现并形成候选提交，已通过模块检查、真实 PostgreSQL、后端组合及 GOWORK=off 检查。范围包括教师认证、内容准入、本人记录、文件访问、公开主页和本人实名脱敏。

第 8 阶段流程与提供方已实现并通过候选工作区检查，正式固定依赖检查通过。授权撤销需在第 11 阶段装配。第 9、10 阶段已实现并通过固定依赖检查，第 11 阶段待实施。第 8 阶段仅实现注销所需的资产核对与结清接口，无法核实时禁止完成注销，其他账务功能延后。

## 工作规则

- 从各仓库最新 `origin/develop` 建立专用分支和工作树，工作树放在 `workspace/worktrees/backend-decisions/<仓库名>`。
- 先改 OpenAPI，再用生成命令更新 SDK 和类型，不手改生成文件。
- 持久化变更使用真实 PostgreSQL 和模块运行身份测试，并验证迁移。
- 新场景登记到 `architecture/modules.yaml` 的 `scenario_tests`，写明实际测试函数。
- 跨仓改动在 PR 中写明依赖、合并顺序和实际验证的提交组合。
- 不操作生产数据，不发行版本，不部署。合并和发行由负责人授权。
- 不修改前端候选工作树 `worktrees/frontend-rewrite/web`。Web 和 Admin 的接口接入另行处理，只在 PR 中列出客户端需要的变化。

## 遇到冲突时

规格没有覆盖的产品选择，以及前后端或文档之间的冲突，必须停下来逐个询问负责人，不能自行决定。每个问题写明冲突位置、可选方案和影响。

## 实施顺序

| 阶段 | 模块 | 工作 | 完成条件 |
| --- | --- | --- | --- |
| 1 | verification、backend | 提供有效教师认证事实和账号到教师档案的绑定，由管理员人工审核 | 教师认证通过内容准入，不能从昵称或普通登录推断 |
| 2 | reviews、catalog、resources、backend | 服务端读接口、搜索和统计执行内容准入 | AE-ACCESS-05 至 AE-ACCESS-07、ACAD-04、ACAD-16 |
| 3 | reviews、moderation | 新增点赞、点踩、收藏和举报要求内容准入，本人已有记录可管理 | 认证失效后可取消已有收藏和投票，不能新增 |
| 4 | reviews | 删除预览字段、预览配置和相关接口用例，保留评分展示配置 | ACAD-40，接口不再返回 `preview`、`guest_preview`、`member_preview`、`preview_ratio` |
| 5 | catalog、reviews、resources | 本人记录所需的对象名称查询只按登录和归属授权，不开放公共内容 | 认证失效后本人记录能显示名称，公共详情仍被拒绝 |
| 6 | resources | 预览与下载同权；区分具体缺失条件和服务不可用；投诉只要求登录 | 未解锁资料读不到文件内容，投诉不返回资料内容 |
| 7 | profiles、backend、verification | 20 字符昵称和回退流程、主页开关、基础主页游客可见、脱敏身份字段 | PC-05、PC-10、PC-11 |
| 8 | profiles、billing | 注销 7 天冷静期、撤销和管理员处理 | PC-07、PC-09 |
| 9 | favorites | 教师和资料收藏、收藏夹 | 鉴权、幂等和跨设备结果一致 |
| 10 | moderation | 修正 OpenAPI 缺少的 `appeal` 和 `previous_task_id`，并对齐依赖版本 | 提供方和消费者的契约与行为测试通过 |
| 11 | open-platform | 按决定扩展信息范围，使用稳定权限标识 | OP-05 |

第 2 阶段依赖第 1 阶段，否则教师会被拒绝。第 4、5 阶段依赖第 2 阶段。其余阶段可以并行。

## 已确认的实施范围

- 第 9 阶段采用独立 favorites 模块，拥有课程、教师、资料收藏及收藏夹，通过公开接口校验业务目标。
- 第 11 阶段本轮实现 open-platform 后端模块。
- 新增点赞、点踩、收藏和举报必须通过内容准入；本人已有收藏和投票仍可查看、取消。

教师本人提交申请和材料。管理员可以要求补充材料，审核通过后绑定教师档案。自动核验后补。

## 本轮检查

教师本人发起申请和材料提交；一个账号可绑定多份经人工确认属于本人的档案。目录合并后使用规范 ID，同一有效教师档案只归属一个账号。

verification 与 backend 的 make check 在隔离 PostgreSQL 18.6 中通过，使用模块运行身份及合成材料。backend 同时通过候选工作区和 GOWORK=off 检查。verification 固定版本通过空模块缓存下载核验。

## 已知代码位置

以下位置来自 2026-11-01 的只读检查，开工时重新核对。

| 位置 | 现状 |
| --- | --- |
| reviews `reading.go`、`management.go` | 游客和登录用户的预览处理，`Presentation` 的预览配置 |
| backend 业务装配 `PublicFacts` | 已提供当前教师认证及获准属性，内容准入使用独立事实 |
| resources `Get` | 资格不足和权益不足都返回 `access_required` |
| moderation `882877fbefeb` | 代码已实现 `appeal`，OpenAPI 的 Submission 枚举未声明 |
| profiles | 昵称按 Unicode 码点计数，前端目前按 UTF-16 计数，统一到码点后由前端跟进 |
| 登录回调 | 优先使用 SSO DisplayName，空值时使用用户名 |

## 交付要求

每个 PR 说明实际执行的检查、结果和剩余限制，并列出 Web 和 Admin 需要的接口变化。未执行的真实账号验收和部署明确标记为待验证。

本主题依赖 `claude/beihang-content-access` 分支的规格改动。前端缺陷和审查结果见[前端审查处理](frontend-review.md)。

## 第 1 阶段交付

| 仓库 | 候选提交 | PR |
| --- | --- | --- |
| verification | a3df0632e9b4f6fcc8f6533fd5957b9a2115ad03 | [教师人工认证](https://github.com/StuHelper/stuhelper-verification/pull/8) |
| backend | 084583dd33785af8d08ae9a31104eedaf0d93260 | [教师事实装配](https://github.com/StuHelper/stuhelper-backend/pull/17) |

先合入 verification，再把 backend 依赖更新到 squash 后可拉取的提交并重跑组合检查，随后合入 backend 和架构记录。本轮不合并 PR。候选工作区源码由 workspace.lock.json 记录，正式依赖以 backend/go.mod 为准。

客户端需要更新 verification 候选 SDK，接入教师申请、拍摄、补充材料、审核、当前资格、公开字段授权和撤销操作，并读取 summary.teacher_verified。本轮不修改 Web/Admin。

真实教师账号和材料、客户端联调、生产迁移与部署尚未验收。隔离测试容器已清理，保留共享测试镜像和其他任务资源。

## PostgreSQL 检查配置

负责人要求开发与 CI 跟随最新稳定 PostgreSQL，不再固定 18.6 的发行包版本。10 个使用 PostgreSQL 的仓库已改用稳定元包，并由检查脚本识别已安装主版本。2026-11-01 官方最新稳定版仍为 18.6，19 为预发布版本。

本地已重新拉取官方 postgres:18-alpine，并完成 10 个仓库的 make check。各仓使用 GOWORK=off、独立数据库和模块运行身份，临时容器全部清理。10 个仓库的原生安装配置已由对应提交的 CI 验证通过。规则见[CI 规格](../spec/ci-runners.md)。

| PostgreSQL 检查仓库 | PR |
| --- | --- |
| verification | [最新稳定版检查](https://github.com/StuHelper/stuhelper-verification/pull/8) |
| backend | [最新稳定版检查](https://github.com/StuHelper/stuhelper-backend/pull/17) |
| catalog | [最新稳定版检查](https://github.com/StuHelper/stuhelper-catalog/pull/2) |
| reviews | [最新稳定版检查](https://github.com/StuHelper/stuhelper-reviews/pull/2) |
| resources | [最新稳定版检查](https://github.com/StuHelper/stuhelper-resources/pull/2) |
| media | [最新稳定版检查](https://github.com/StuHelper/stuhelper-media/pull/2) |
| moderation | [最新稳定版检查](https://github.com/StuHelper/stuhelper-moderation/pull/4) |
| storage | [最新稳定版检查](https://github.com/StuHelper/stuhelper-storage/pull/2) |
| storage-contribution | [最新稳定版检查](https://github.com/StuHelper/stuhelper-storage-contribution/pull/2) |
| profiles | [最新稳定版检查](https://github.com/StuHelper/stuhelper-profiles/pull/2) |

## 第 2 阶段交付

目录、课程评价、导师评论、搜索、统计和资料分类在读取前执行当前内容准入。未登录返回 401，资格不足返回 403，所需事实不可用返回 503。本人记录保留登录和归属授权，目录管理使用独立维护入口。

| 仓库 | 候选提交 | PR |
| --- | --- | --- |
| platform | 02b01a19a307eb61313c506a639d528ae070cece | [候选 PR](https://github.com/StuHelper/stuhelper-platform/pull/10) |
| catalog | 906bb58beb3a180176daf89d3b6662bbdee4ab3e | [候选 PR](https://github.com/StuHelper/stuhelper-catalog/pull/2) |
| reviews | ef445b6dbd76c03299f5cfe69ad1be2ae7dd3aa4 | [候选 PR](https://github.com/StuHelper/stuhelper-reviews/pull/2) |
| resources | fabb6ba811d514f0f97ed578aa877254ed56f181 | [候选 PR](https://github.com/StuHelper/stuhelper-resources/pull/2) |
| backend | d061357471ca92f6216107349f413d9f97bb405d | [候选 PR](https://github.com/StuHelper/stuhelper-backend/pull/17) |

platform、catalog、reviews、resources 和 backend 完整 make check 通过，包括真实 PostgreSQL、模块运行身份、竞态和正式入口构建。backend 同时通过候选工作区和 GOWORK=off 检查，五个提供方固定版本通过空模块缓存下载核验。架构检查及实际场景到测试函数的映射检查通过。

我的投票原接口泄露目标正文，已在旧提交复现。OwnVote 回执仅保留目标标识和本人投票值；读取他人正文继续要求内容准入。导师评论与跨学校教师统计已加入回归场景。

客户端需同步 catalog 0.2.0、reviews 0.3.0、resources 0.2.0 候选契约与生成类型。目录管理读取改用 /catalog/admin；投票记录改读 OwnVote；内容页按 401、403、503 分别处理。旧预览字段已由第 4 阶段删除。

先合入 verification、platform 与业务提供方，再把 backend 更新到合并后可拉取的提交并重验，最后合入 backend 和架构记录。本轮不合并。真实账号、Web/Admin、生产迁移与部署均未验收，测试容器已清理。

本候选 PR 的公共集成明确使用 workspace.lock.json 中的源码。Web 与 Admin 固定为当前 develop 基线，只用于发现兼容性差异；本任务不修改客户端。候选登记修复后的集成已执行契约比较，因旧 Web 契约仍允许匿名目录读取而失败。当前保留全部检查和草稿状态，等待后续客户端契约与行为接入。

## 第 3 阶段进度

新增点赞、点踩和课程收藏要求内容准入。本人已有投票与收藏可以查看和取消，取消不依赖资格服务或目录可用性。取消操作的并发重试、同键不同内容、数据库结果与其他账号隔离已通过真实 PostgreSQL 检查。

旧实现因资格或目录不可用拒绝本人取消操作，已用新增回归场景复现并修正。reviews 完整检查、后端候选组合和 GOWORK=off 固定依赖检查均通过。

负责人已确认：认证失效后仍可补充本人处理中举报的证据，新建举报要求内容准入。补证只更新本人待审核记录，不读取目标正文；结案后的新举报重新检查准入。

投票与收藏候选：reviews 411001e34731a18432d1dcfcd428feb27819ee29（PR #2），backend a5d4f6deac6306ac7f4219d39cff78c8463647e6（PR #17）。举报部分已按确认结果实现，检查结果随本阶段更新。

举报候选：moderation 2504e5729cabb6b55b3aa0c7c6d7f287410f5951（PR #4），backend 7bd4eb149765eb4d430f9377489cf9e3c320c730（PR #17）。新建举报拒绝、本人补证、并发幂等及与管理决定竞争均有真实 PostgreSQL 回归测试。两个原问题均已先复现再修复。

第 3 阶段客户端需按 moderation 0.3.0 契约区分新建举报与本人补证：新建可能返回 403 或 503，补证仍只返回本人回执；管理决定已经提交时，补证返回 409。合并顺序为 moderation → backend 更新到合并后版本并重验 → 架构记录。真实账号和前端接入未验收。

## 第 4 阶段交付

reviews 45496ae00210bd9b7136a0ef5145567c29e2c3c9（PR #2）与 backend f7f9cd7cc799f6968e2cffc5092dbb74f48fb0dd（PR #17）已提交。契约 0.4.0 不再包含四个旧预览字段，评分文案继续使用学校覆盖和全局默认。

真实 PostgreSQL 迁移可重复执行，当前配置清理旧键，评分文案、学校、修订和历史记录保留。HTTP 拒绝旧字段写入，详情、列表和配置读取不返回旧键。reviews 完整检查、后端候选组合与 GOWORK=off 检查通过。

客户端需删除预览状态判断和预览配置控件，并同步 0.4.0 生成类型。先合入 reviews，再更新 backend 到合并后版本并重验，最后合入 backend 与架构记录。真实账号、前端联调及生产迁移未验收。

## 第 5 阶段交付

catalog 14a3bcb620facc5400e5fec7daf5a9f2fa2ee032（PR #2）、reviews 00f3ecca25a6d47d5b80fe281a5bdf7c9db31b56（PR #2）。

resources 674fb6fee171aa7db2de10c00248b6d78c28580f（PR #2）已提交，backend 839d47b9cf227cce3639e363191ecffd8a45132f（PR #17）固定三个候选版本。

三个模块分别提供 /me/references，只按登录和本模块持有的归属依据返回必要名称，每批最多 100 个 ID。任一关联无归属依据则整批返回 404。接口不返回简介、评分或文件，公共内容继续执行当前准入。

草稿文字仍可保存。服务端验证过的关联保存在 reference_ids 中，更换关联移除旧依据，无法验证的关联不能查询名称。reference_state 区分已验证、未验证和暂不可用。历史草稿没有依据时，恢复资格后保存以重新验证。

负责人将投诉回执标题规则改为选项 1：只在提交投诉时通过内容准入且目标可见时保存标题，其他回执只显示资料 ID 与处理状态。保存后的标题不随资料版本、资格变化或同键重试改变，历史无依据回执不补发标题。

三个提供方完整 make check 通过，包括真实 PostgreSQL、模块运行身份、归属隔离、资格撤回、旧数据读取、并发与竞态。后端候选工作区和 GOWORK=off 固定依赖的完整检查通过，真实模块 HTTP 组合覆盖名称与投诉标题规则。

客户端需更新 catalog 0.3.0、reviews 0.5.0 和 resources 0.3.0，使用所属模块名称接口并处理 missing_ids、404 和 503。草稿仅用 reference_ids 查询名称，投诉标题按可选 resource_title 展示。本轮不修改 Web/Admin。

先合入三个提供方，再更新 backend 到合并后可拉取的提交并重验，最后合入 backend 和架构记录。真实账号、Web/Admin、生产迁移与部署尚未验收。公共集成仍等待客户端适配第 2 阶段准入变化。

## 第 6 阶段交付

resources 475124111480dd550d7fbdb9e3c4674aaa48bf73（PR #2）提供 0.4.0 契约，moderation 9583d2d0e32bdc8a18d250dda3a8035657de72c7（PR #4）提供 0.3.1 契约。

backend 29f7246fda83751ed1697ed4b50dd385dc4d0bf1（PR #17）固定两者版本。

预览与下载共用当前准入、配置资格、权益和资料状态检查，拒绝时不读取文件。响应分别列出 missing_conditions 和 unavailable_conditions，购买延期通过 purchase_available=false 和 purchase_unavailable 明确表达。本人元数据在资格故障时仍可读取，文件暂停访问。

原登录投诉在后台交付时被公共内容准入拦截，已先复现再修复。resources 校验已保存的投诉和目标，经 moderation 模块接口登记，不读取或返回正文。模块接口不对 HTTP 开放，原举报幂等键与载荷保留，旧请求重试返回同一任务。

模块完整检查、真实 PostgreSQL/运行身份、预览下载权限一致性、实际文件交付、旧请求并发重放和上传者证据隔离通过。后端候选组合与 GOWORK=off 完整检查通过，覆盖投诉进入审核、管理员决定、执行结果与本人回执。

客户端需同步 resources 0.4.0，预览调用 /items/{id}/preview，按实际缺失条件提示，事实不可用时提供重试。购买入口继续关闭，投诉入口不依赖下载权限。先合入提供方，再更新 backend 到合并后版本并重验，最后合入 backend 和架构记录。

本轮检查均使用隔离环境与合成身份。真实投诉材料、管理员客户端、浏览器预览和生产交付未验收，不修改前端，不合并、不发行、不部署。

## 第 7 阶段交付

profiles f665ae6ca26c6b46c834d8521b55fcd5dcb4f257（PR #2）、verification be5dbdd273969c498a8241f5748ce1e02d45598a（PR #8）、backend ad9a178cacbfc3972ddac530797d9d31476f89b7（PR #17）已提交。

昵称与简介分别限制为 20 和 120 个 Unicode 码点。学校、认证徽章、学院、署名评价和资料默认公开，年级默认关闭。基础主页允许游客读取，学校事实再次按开关筛选，事实故障明确返回不可用状态。

本人已实名摘要返回服务端生成的 identity_masked.name 与 document_number。姓名保留末字、证件号保留首尾位，星号数量反映原始长度。极短输入被拒绝，缺失或损坏的脱敏依据返回服务错误。资格事实与公开主页不返回这些字段。

profiles、verification 完整检查与后端组合通过，最新固定依赖通过 GOWORK=off 完整检查。真实 PostgreSQL 覆盖运行身份、并发幂等、迁移和字段隔离，正式模块组合覆盖实名核验、本人隔离与重试。实际学校来源的学院字段也有回归测试。

SSO 长显示名使回调返回 503 的问题已先复现再修复。CI 缺少生成器依赖下载的问题已修正，生成器通过全新模块缓存下载后进行离线一致性检查。最新 CI 结果由对应提交的运行记录确认。

客户端需同步会话 0.3.0 和 verification 0.4.0，使用生成 SDK，接入 nickname_required、公开 id、简介、展示偏好、affiliations、facts_state 和冲突 current。实名展示改读服务端脱敏字符串，停止拼接固定数量星号。

先合入 profiles 与 verification，再更新 backend 到合并后可拉取版本并重验，最后合入 backend 和架构记录。头像与公开关联内容列表未包含在本阶段。真实账号、Web/Admin 和生产迁移未验收，不合并、不发行、不部署。

## 第 8 阶段进度

注销申请明确确认积分处置，7 天内可撤销，截止后由当前管理员处理。资产核实前保留使用能力，结清后停止普通访问。流程持久保存资产、会话、授权和内容进度，故障后继续原操作。

负责人确认正式注销时清零长期积分、限时积分与待抵扣记录，不兑换现金或 Ivory。原作者、来源、许可证、正文与文件保留，仅移除账号公开关联。完成后同一 SSO 身份不能自动重建业务账号。

profiles、billing、reviews、resources 和后端候选工作区已通过真实 PostgreSQL 检查。覆盖时间边界、并发重试、未知结算结果、本人及管理员隔离、会话撤销、延迟回调和公开匿名化。后端 GOWORK=off 完整检查通过，私有 billing 候选通过空模块缓存下载核验。CI 结果随实际提交查询。

真实账务来源未接入，不能完成真实账号结清。业务授权撤销端口等待第 11 阶段，缺失时明确阻止继续处理。Web/Admin、真实账号与生产迁移未验收。

候选提交：profiles 36ae2136670e0c284ba0e51623746dac9c7e9349，billing 82dd3633f0c119e6d79d819c106d8ce2e452f651（PR #7）。

reviews 7e0e162f40a955701de7dcf58091d13d16d44829、resources aa88c9c3f50db6c0338e38bf949d6e7a9cf03a82、backend cb8950c2d7eb2060e2270edde4ff32e5cf7c6875。

## 第 9 阶段交付

favorites 434fe2a8c892f746fb349139ec616bef8f21e666（PR #1）、reviews fd0becdd9a49e28708119d7bced8f8179d50ebfe（PR #2），后端 e443fc5d3c806860784c7973cf9086e3ce888415（PR #17）已提交。

favorites 独立拥有课程、教师和资料收藏。每个目标一条记录且只在一个夹内；删除普通夹移回默认夹，默认夹可改名不能删除。名称去首尾空白后在本人范围唯一，数据库约束覆盖并发创建和改名。

列表只显示必要名称快照、标识、归属和时间。当前准入控制新增收藏，本人管理不依赖资格事实。旧 reviews 收藏按账号封存并分页迁移，旧入口转发到当前模块，历史重试不重新新增已取消记录。

模块完整检查和 CI 通过。后端候选组合与 GOWORK=off 完整检查通过，真实 PostgreSQL 覆盖目录、评价、资料与收藏组合、权限撤回、旧记录恢复、运行身份和越界访问。测试容器已清理。

客户端需接入 favorites 0.1.0，使用收藏夹 ID、修订、幂等键、item_count 与分页游标。默认夹空名称使用本地化标签，名称限制按 Unicode 码点。旧 reviews 0.5.1 入口在客户端迁移完成后另行移除。

先合入 favorites 与 reviews，再更新后端到合并后版本并重验，最后合入架构记录。没有修改 Web/Admin，真实账号、生产迁移、发行与部署尚未执行。

## 第 10 阶段交付

当前固定 moderation 9583d2d0e32bdc8a18d250dda3a8035657de72c7 已包含 appeal、previous_task_id 和生成 SDK，契约版本为 0.3.1。后端装配已使用该版本。

后端增加实际生成客户端的 HTTP 组合场景，验证字段保留、缺失原任务拒绝、他人拒绝、幂等重试和原审核人不能复审。该场景随 e443fc5 的 GOWORK=off 完整检查通过。提供方契约回归也登记到架构场景。

第 8 阶段固定后端 cb8950c 的 CI 已在私有模块读取权限调整后全部通过。公共集成仍因旧 Web 契约允许匿名目录读取而失败，共四处差异；客户端构建与浏览器阶段未执行。
