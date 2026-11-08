---
type: development
status: Accepted
updated: 2026-11-09
---

# 后端候选实施状态

## 当前实现

教师认证、内容准入、本人记录、资料访问、个人主页、注销、收藏与开放平台候选已实现、待合并。favorites 与 open-platform 为独立模块，各自拥有仓库、数据和接口。实际源码组合由 workspace.lock.json 记录，正式后端依赖由 backend/go.mod 固定。

| 模块 | 当前能力 |
| --- | --- |
| verification | 教师本人申请、补充材料、人工审核与多档案绑定；档案只能属于一个账号；本人实名字段由服务端脱敏 |
| catalog | 当前内容准入、本人记录名称、结构化排课、学校学期作息、周课表查询与 iCalendar 导出 |
| reviews | 当前内容准入、本人记录与经过验证的草稿关联；课程与教师评分统计、课程对比的数据来源 |
| moderation | 新举报要求内容准入；认证失效后仍可补充本人处理中举报的证据，只返回本人回执 |
| resources | 预览与下载同权；投诉只需登录，提交时通过准入才保存标题快照；购买延期 |
| profiles | 昵称 20 和简介 120 个 Unicode 码点；主页展示开关、7 天注销冷静期与可恢复处理进度 |
| favorites | 课程、教师与资料收藏、按目标集合查询本人收藏状态，以及收藏夹管理 |
| qq-binding | 三项独立验证、私聊一次性码、直接 QQ OAuth、解绑与注销、审计及 outbox；私有仓库 StuHelper/stuhelper-qq-binding |
| open-platform | 应用审批、逐项同意、PKCE、短期令牌、撤回和通知反馈 |
| billing | 积分与 Ivory 分账、余额和明细、奖励与追回、用户支付指引、充值确认、取消与到期、购买积分、退款和注销结清；真实支付未接入 |
| platform | 模块生命周期、公共资格规则与安装历史；管理角色、范围授予与撤销；平台管理员拥有全部能力；汇总各模块操作记录 |
| notifications | 站内通知、未读数、已读管理与互动偏好；当前目标权限检查；inbox 去重、旧修订忽略与多收件人原子写入 |
| information-query | 按查询域和范围授权、敏感结果审计；backend 已接入本人账号键的 catalog 选课查询，缺失域明确返回不可用 |
| search | 可重建索引、关键词搜索、热门与我的投票；backend 已装配 catalog 快照、事件投影及当前权限复核 |
| groups | 群准入、宽限期、豁免、群规则、消息与娱乐功能的独立模块实现；backend 暂未装配 |

学校、认证徽章、学院、署名评价和资料默认公开，年级默认关闭。姓名显示末字，证件号显示首尾位，星号数量等于遮住的码点数。姓名少于 2 个码点或证件号少于 3 个码点时拒绝提交。

## 客户端接入

Web 已接入收藏、QQ 三项绑定、账号与安全、个人资料、积分与 Ivory、授权应用、开放平台开发者页、OAuth 授权页和教师认证页。授权页要求 PKCE S256，用户逐项勾选后才可同意。钱包只展示服务端启用的充值渠道。

Web 已接入通知、周课表与日历导出、搜索、热门、我的投票和评分对比页面。评分对比从 reviews 读取各课程统计，search 提供搜索与发现入口。课表缺少结构化时间或作息时，页面保留已有信息，日历导出提示 schedule_incomplete。

Admin 已接入角色授权、操作记录和信息查询，以及 QQ 绑定处理、开放平台应用审核、教师认证审核与资格撤销、账务管理。操作记录汇总九个模块的公开审计接口，信息查询明确展示不可用域。

账务管理包括退款审核与人工打款登记、按账号查询余额与明细、积分购买退款、奖励发放与撤销，以及渠道、积分方案和奖励规则配置。支付自动查询耗尽后订单进入 needs_review，由管理员登记结果或安排再次查询。

## 事件与操作记录

backend 已装配 moderation、verification 到 notifications，以及 catalog 到 search 的 relay。业务事务提交后通过 pg_notify 唤醒，启动、重连与每 60 秒扫描补读。投递按主题保序，读取前排除退避主题，首次失败满 24 小时转人工处理。

notifications 对完整收件人集合一次消费，全部通知、inbox 与修订同事务保存。search 同事务保存 inbox 与投影。重复事件返回原结果，旧修订不覆盖新状态。完整行为见[模块通信与一致性](../spec/module-protocol.md)。

平台操作记录已接入 catalog、reviews、moderation、resources、verification、billing、qq-binding、open-platform 与 storage。提供方可用时返回完整结果，故障时通过 missing_modules 标记部分结果；运行身份仍按模块隔离。

## 验证与剩余工作

实际候选提交由 workspace.lock.json 固定，模块场景与测试函数登记在 architecture/modules.yaml。提供方的数据库验证使用隔离 PostgreSQL 与模块运行身份，正式 backend 依赖由 go.mod 固定。源码检查、客户端接入和真实环境验收分别记录。

search 的 module.yaml 使用 DS-HEAT、DS-TRANSACTION、DS-PROJECTION 场景标识，已原样登记。工作区场景检查要求数字后缀，因此 search 的完整场景检查仍不通过，需提供方统一编号后同步登记。information-query、groups 与 notifications 的声明和场景引用核对通过。

下表与 [backend 当前缺口表](https://github.com/StuHelper/stuhelper-backend/blob/0285928a157e10ba5ba3f0013489f16f0397c696/README.md#事件-relay-与新查询模块) 对应。

| 当前缺口 | 影响与剩余工作 |
| --- | --- |
| notifications 旧 inbox 升级 | 迁移拒绝含单收件人历史数据的旧 inbox 并保留数据，需提供方补充收件人重建与转换，不能清空 inbox 或修订绕过 |
| catalog 课表通知 | 封闭标题目录没有课表变更通知，relay 不发送该类通知；上课提醒尚未接入 |
| reviews/resources discovery | 缺少搜索 discovery 事件与完整快照，尚未接入搜索投影，不生成虚构热门统计事件 |
| information-query 关联查询 | profiles、verification、reviews、resources、billing、groups 缺少可靠关联与范围查询适配，返回 unavailable_domains |
| 认证操作目标 | 部分事件缺少可解析的 operation 引用，通知保留且目标显示 inaccessible |
| groups 装配 | 独立模块已实现，backend 暂不装配 |
| 信息查询审计保留 | 提供方尚无有界保留期清理接口 |

catalog 信息查询当前仅支持指定学校内按本人完整账号键查询选课，姓名、学号、QQ 与跨账号查询返回 unavailable。机器人信息查询默认关闭。个人日程编辑、真实学校数据、真实 QQ 互联、机器人与支付流程仍待验收。

会员交易、会员权益与资料购买未提供。公开主页限流采用各进程独立计数。真实账号、发行、部署与恢复演练未验收。

## 合并依赖

先合入提供方，再将 backend 固定到可拉取的合并提交并验证正式组合。Web/Admin 完成契约与行为接入后验证公共应用组合。所有候选为草稿，合并、发行与部署另行授权。

充值返回公开支付指引，只有提供方查询或验签回调确认成功才入账。取消先核实付款状态并关闭未付款支付单。开发环境提供模拟付款与失败入口，生产配置拒绝启用。

qq-binding 的模块检查在本仓库 CI 中使用隔离 PostgreSQL 运行。QQ 登录、真实机器人、真实 QQ 互联与群服务事件投递未验收。

账务管理读取提供退款列表、包含停用项的渠道、方案与最新规则，以及按账号查询的钱包、最近订单和明细。读取要求 billing.manage，分页上限 100，账号数据与审计同事务返回。billing 独立检查和 backend 固定远程依赖的 GOWORK=off 完整检查通过。接口由私有 billing 仓库的 OpenAPI 定义。
