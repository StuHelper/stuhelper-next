---
type: development
status: InReview
updated: 2026-10-24
---

# 官方 Casdoor 独立迁移

## 目标、范围与进度

进度：进行中。已确认官方镜像路线，已完成初始来源调查和候选元数据解析；生产只读清点、完整消费者配置核实、数据演练、独立更新器和正式切换均未完成。

以[SSO 兼容规格](../spec/sso-compatibility.md)作为验收依据，[独立 SSO 设计](../design/independent-sso.md)解释机制。本记录保存调查和任务，不重复维护数据保留清单。

## 调研问题与已知依据

2026-10-23 初始调查确认官方稳定候选为 [v4.23.0](https://github.com/casdoor/casdoor/releases/tag/v4.23.0)，发布于 2026-10-21，tag commit 为 `1b91d9d319a127e9b1af88fa7a20bb35c052b9d8`。完整 digest 记录在[候选记录](https://github.com/StuHelper/stuhelper-next/blob/develop/ops/sso/candidate.json)，状态为 `candidate-not-deployed`；之后实施需重新确认目标版本，不把历史核查日期当作当前 latest 保证。

公开 discovery 当时返回 issuer `https://sso.stuhelper.com`，authorize/token/userinfo/JWKS 同源，声明 S256；版本接口要求认证，因此未据此推断生产版本。没有读取生产凭据或原始用户数据。

主仓库已刷新的 `origin/develop`（`a0a998688a623da7811d04037efe0829c0783267`）中的 ADR-0016 与原生 Casdoor 消费文档已采纳官方原件路线。初始本地旧分支仍有历史补丁，不能据它描述最新维护状态。代码与设计存在不代表生产迁移完成。

AI 工作副本检查基线为 `5c6064b120f69b38c4af63a92030499881cde133`，Store 为 `5f14cdbc9d439a925702af3a45aa6a9c298d1e9e`；这些不是生产镜像身份：

| 消费者 | 已检查的代码路径所体现的契约 | 仍需实际核实 |
| --- | --- | --- |
| stuhelper-ai | 存在内置 OIDC 和可配置 Generic OAuth 两条路径；Generic 根据配置的用户标识/username/email selector 映射账号 | 生产使用哪条 provider、selector、userinfo 包装/字段类型、访问条件，以及既有绑定稳定性 |
| stuhelper-store 客户 | OIDC code + state/nonce/PKCE、issuer/client 校验、subject 绑定、refresh 后 subject 一致性 | 生产 client 配置、存量账号登录/续期/重登、布尔字段形态、依赖故障 |
| stuhelper-store 管理端 | 从本地有效会话调用官方 get-account，核对 subject、目标组织、IsAdmin、forbidden/deleted | 候选原生 API 策略下普通与管理员账号行为，降权和禁用 |
| 当前 StuHelper | 已有官方 Casdoor 适配设计；账号补全与开放平台授权代次在业务侧 | 已部署版本与实际配置；已有开放平台客户端是否依赖 resource 交换或历史扩展 |
| Payment / 机器人 / 其他应用 | 待清点，不因用户举例 AI/Store 而漏掉现有应用 | 全量已注册 application 与实际消费清单的对应关系 |
| Next 原生客户端 | 新 client 独立注册，Authorization Code + S256 PKCE | 每端 redirect、设备存储、取消/恢复、退出和 refresh 策略 |

以上代码检查针对工作副本，实际生产配置与镜像版本仍待核实。尤其 AI 的自定义 claim selector 不可根据字段名猜值；应在限制访问且不输出敏感值的进程中比对旧/新结果和原绑定。

## 决策与确认

项目负责人已确认[官方镜像](../adr/0001-official-casdoor-image.md)，并说明 Registry 在 BJ1，镜像相关任务使用自建 runner。尚无本次正式切换时间、生产实际拓扑或完整消费者验收结果。

## 验收准备与实施任务

- [x] 固定初始官方 release、commit 与镜像 index/platform digest；依据候选记录。
- [x] 区分数据保留、会话连续性和真实消费者验收；定义兼容规格。
- [ ] 确认实际运行镜像、数据库、持久化资源、全部写入者及已登记消费应用，不公开敏感参数。
- [ ] 逐项核实 AI selector、Store get-account 策略和其他消费者配置，准备旧/新环境下同一组验收场景。
- [ ] 实现可独立运行的运维包与更新状态记录，证明主站停止时 SSO 仍可启动、更新和恢复。
- [ ] 在隔离生产副本演练 old → candidate、数据核对与 restore → old，验证必需备份可恢复。
- [ ] 准备精确候选、维护窗口、最终停写备份与恢复边界，完成切换前所需决定。
- [ ] 执行正式切换并完成全量消费者真实登录、刷新、退出、权限与数据验收。
- [ ] 停用旧主站 SSO bootstrap/更新/版本指针写入者，证明只剩一个维护控制面。

## 拟实施顺序

以下为待实施方案，不是已经可运行的生产操作指南：

1. **只读清点**：确认实际运行 image digest、版本、数据库类型/版本、持久化路径、writer 清单、issuer、应用清单、认证方法、反代/CDN 静态路径。既有文档不能代替当前容器和配置事实。
2. **消费者先适配**：按 [兼容规格](../spec/sso-compatibility.md) 检查旧站、AI、Store；原始绑定保持不变。当前业务依赖的官方 API、claims 类型与 token policy 都须明确，不从通用“支持 OIDC”推断通过。
3. **隔离演练**：生产快照仅在限制访问的主机和隔离网络中恢复；禁止候选访问真实短信、邮件、支付、webhook、syncer 和外部身份提供方。用可控测试账号/合成 provider 完成 old → candidate、数据核对与 restore → old 演练。其他真实 provider 另做获授权的验收。
4. **准备维护窗口**：提前准备好镜像和全部恢复材料；确认受影响登录、注册、refresh 和实时身份校验的短时中断，确定上线负责人和恢复步骤。当前提案不自行安排停机。
5. **停所有 SSO 写入者**：包含旧进程、后台任务、syncer、管理员修改和旧站账号写 API。冻结身份写入，不能只关闭登录页面。取得最终一致备份，在隔离库实际恢复、启动并重复关键验证。
6. **提交边界**：候选首次连接生产库前持久化迁移事务记录（旧/新 digest、备份摘要、状态、操作者、时间）。仅一个部署协调器持有锁；候选从锁定制品启动，不能临时解析 latest。
7. **验证与放行**：检查实际运行 digest、健康、discovery/JWKS、登录 UI、数据不变量，再完成 AI/Store 等真实消费者的登录、刷新、退出、账号归属和权限验收。
8. **交接旧控制面**：停止旧主站的 SSO 自动更新、bootstrap、版本指针写入及迁移任务；确认只剩独立运维入口可变更 SSO，主站部署不再触碰它。

## 实际验证与限制

初始候选解析器已真实查询官方 GitHub 与 Docker Hub 元数据，固定 tag/commit/digest，非法 `latest` 参数与 v5 参数被拒绝。解析器不会拉镜像层、构建镜像或部署。哈希一致性不能单独证明同名镜像由对应 commit 构建，镜像与源码之间的来源核验仍待实现。

尚未执行生产快照备份/恢复、实际部署、AI/Store 真实账号登录、外部 provider 和旧会话验收。后续每个结果必须绑定精确候选、消费方版本、测试项和匿名结果；pending/skipped 保持未完成。

## 交接与资料

下一步先做生产事实与消费者配置清点，再实现独立运维包；不需要等待业务端重写。原始数据、token、cookie、截图与备份不得进入公共仓库或 Actions artifacts。

来源：[官方 v3 → v4](https://casdoor.ai/docs/deployment/upgrade-v3-to-v4/)、[数据库迁移](https://casdoor.ai/docs/deployment/db-migration/)、[Docker 部署](https://casdoor.ai/docs/basic/try-with-docker/)。可重复的候选查询方法见[操作指南](../guide/sso-candidate.md)。
