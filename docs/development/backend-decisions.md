---
type: development
status: Accepted
updated: 2026-11-01
---

# 业务决定的后端实施

## 目标与当前状态

本主题列出 2026-11-01 前端审查后需要后端完成的工作，由 Codex 负责实施。规则以[确认结果](business-decisions.md)和各规格为准，本主题只说明范围、顺序和完成条件。

当前进度：第 1、2 阶段已形成候选提交。教师认证、内容读取、搜索和统计的服务端准入已实现，模块检查、候选组合和 GOWORK=off 固定依赖检查通过。第 3 阶段投票与收藏部分已通过本地检查，举报补证的失效后权限待确认。第 4 至 11 阶段待实施。

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

客户端需同步 catalog 0.2.0、reviews 0.3.0、resources 0.2.0 候选契约与生成类型。目录管理读取改用 /catalog/admin；投票记录改读 OwnVote；内容页按 401、403、503 分别处理。旧预览字段在第 4 阶段删除。

先合入 verification、platform 与业务提供方，再把 backend 更新到合并后可拉取的提交并重验，最后合入 backend 和架构记录。本轮不合并。真实账号、Web/Admin、生产迁移与部署均未验收，测试容器已清理。

本候选 PR 的公共集成明确使用 workspace.lock.json 中的源码。Web 与 Admin 固定为当前 develop 基线，只用于发现兼容性差异；本任务不修改客户端。候选登记修复后的集成已执行契约比较，因旧 Web 契约仍允许匿名目录读取而失败。当前保留全部检查和草稿状态，等待后续客户端契约与行为接入。

## 第 3 阶段进度

新增点赞、点踩和课程收藏要求内容准入。本人已有投票与收藏可以查看和取消，取消不依赖资格服务或目录可用性。取消操作的并发重试、同键不同内容、数据库结果与其他账号隔离已通过真实 PostgreSQL 检查。

旧实现因资格或目录不可用拒绝本人取消操作，已用新增回归场景复现并修正。reviews 完整检查、后端候选组合和 GOWORK=off 固定依赖检查均通过。

InReview：认证失效后能否给本人处理中举报补充证据。规格只明确新建举报要求内容准入，没有明确补证是否同样受限。已向负责人提供两项选择：允许继续补证，或仅允许查看原回执。答复前保留既有举报行为，不推进相关实现。

投票与收藏候选：reviews 411001e34731a18432d1dcfcd428feb27819ee29（PR #2），backend a5d4f6deac6306ac7f4219d39cff78c8463647e6（PR #17）。举报部分待确认，因此第 3 阶段尚未完成。
