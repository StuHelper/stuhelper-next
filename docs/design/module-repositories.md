---
type: design
status: Accepted
updated: 2026-10-24
---

# 按模块划分仓库

## 划分原则

项目采用 multi repo。一个业务模块拥有自己的代码、规格、数据、公开接口和版本，其他模块通过接口或事件使用它。仓库按业务职责划分，不能只把前端与后端拆开后继续共享内部数据结构。

可插拔表示模块可以启停、替换或独立升级，并且缺失时有明确的功能表现。仓库边界和运行进程分别设计：公共模块可由组合服务加载固定版本，也可以独立运行；私有认证、学校适配、账务和 SSO 使用独立服务边界，公开构建不读取其源码。

本仓库保留跨模块架构、公共业务规格、接口目录和迁移进度。模块开始实现时，其详细设计、实现、模块内验收与迁移由自己的仓库维护。私有模块的具体设计本轮直接迁入私有仓库，公开页面只说明用户入口及必要对接范围。

## 仓库与数据归属

以下名称确定模块归属。没有实现内容的公开模块先登记，开始实现时建立仓库，避免把空仓库当成交付。

| 模块 | 仓库 | 可见性 | 拥有的数据与职责 |
| --- | --- | --- | --- |
| platform | stuhelper-platform | public | 模块注册、接口发现、动作资格配置、授权范围、组合 API 与通用运行能力 |
| identity | stuhelper-sso | private | 官方 SSO 运维、本应用身份映射与会话适配；业务通过 OIDC 和最小身份接口接入 |
| profiles | stuhelper-profiles | public | 昵称、头像引用、简介、隐私偏好与业务账号生命周期 |
| verification | stuhelper-verification | private | 学生资格、独立实名、审核材料与具体认证流程 |
| campus-adapters | stuhelper-campus-adapters | private | 学校认证协议、学校数据适配与来源映射 |
| catalog | stuhelper-catalog | public | 学校、院系、学期、课程、教师、开课与个人课表 |
| reviews | stuhelper-reviews | public | 课程评价、导师评论、评分、回复、投票、收藏与草稿 |
| resources | stuhelper-resources | public | 资料目录、版本、作品许可、访问授权与交付状态 |
| billing | stuhelper-billing | private | 积分、Ivory、收费、会员售卖、奖励、退款与交易权益凭据 |
| moderation | stuhelper-moderation | public | 内容审核、举报、申诉与处置决定，内容模块执行状态变化 |
| community | stuhelper-community | public | 动态、分区、关注、屏蔽及动态内互动 |
| media | stuhelper-media | public | 文件上传、可用状态、存储适配与存储贡献 |
| groups | stuhelper-groups | public | QQ 绑定业务接入、群准入、名片、消息治理与娱乐命令 |
| information-query | stuhelper-information-query | public | 授权范围内的跨模块关联查询、批量与导出 |
| open-platform | stuhelper-open-platform | public | 开发者应用审批、业务授权与撤回 |
| search | stuhelper-search | public | 可重建搜索索引、热度与发现查询 |
| notifications | stuhelper-notifications | public | 站内通知、发送意图、渠道投递与偏好 |
| production | stuhelper-ops | private | 部署组合、版本固定、备份恢复与生产迁移文档 |

现有私有 `stuhelper-payment` 保留支付网关职责，账务模块通过其接口对接，不把积分、会员与资料业务塞入支付网关。现有 AI、Store 和 `stuhelper-docs` 均保留自己的用途，不因本次重构重新归属或被覆盖。

当前只推进 Web 与 Admin。微信小程序、Android、iOS 与 HarmonyOS 搁置，以下保留各自未来应用仓库的命名规划。应用仓库分别使用 `stuhelper-web`、`stuhelper-admin`、`stuhelper-wechat`、`stuhelper-android`、`stuhelper-ios` 与 `stuhelper-harmony`。客户端按模块组合界面，使用版本化 SDK，不拥有服务端业务规则。仓库创建前检查同名项目，不能覆盖已有项目。

## 依赖与可替换接口

公共模块只依赖公开的接口定义或 SDK。接口提供方维护 API、事件及兼容范围，使用方固定已验证版本。这里的公开接口表示明确可依赖的契约，不表示互联网匿名访问；运行时仍需身份、权限及范围检查。

模块声明必需依赖与可选能力。必需依赖缺失时该模块不能启用，可选能力缺失只关闭相应功能。动作使用到资格、交易或文件能力时，还要检查相应服务是否可用。例如：

- 不安装 community，课程评价的回复、投票和收藏继续可用，这些属于 reviews。
- 不安装 billing，免费资料继续按访问规则工作，售卖、会员购买与充值入口关闭。
- verification 不可用，需要资格核验的操作返回暂不可用，不自动放宽为未认证也可执行。
- notifications 或 search 不可用，不撤销已经完成的业务写入，投递与索引恢复按事件规则处理。
- 关闭业务模块不影响独立 SSO，也不删除模块数据。

私有模块只向使用方返回动作所需的结论、范围、状态和稳定标识。认证材料、学校方法、数据库结构、支付载荷及生产配置不进入通用事件、公共 SDK、公开 CI 日志或 artifacts。

## 数据、版本与部署

每个模块独立拥有数据库结构、迁移与 Repository，不跨模块读写表，不共享内部 ORM 实体。公共模块可共用数据库实例，但使用独立 schema 与访问身份；私有模块单独管理数据库与访问凭据。任何组合查询都通过 API 或可重建查询记录完成。

事务内保存业务变更、相关处置记录和待发送事件。跨服务事件允许重复，接收方按事件 ID 去重并检查修订号。跨模块流程记录每一步结果和失败补偿，不假定网络调用具有单库事务的原子性。

模块分别发布版本，兼容修改不要求所有仓库同步升级。破坏接口兼容的修改提供迁移期并进行提供方、使用方契约测试。部署组合固定模块版本 tag，镜像摘要另存核验，禁止把多个仓库的默认分支当成可重现的版本组合。

## 文档与当前状态

私有模块的详细规格分别放在对应仓库，公共规格仅保留必要的使用与对接说明。公共仓库继续保持 public，历史提交按项目负责人决定保留，不重写已有公开历史。

本轮完成的是文档及仓库结构迁移。运行时加载器、业务服务、SDK、跨仓库发布和生产部署仍待实现。[模块清单](https://github.com/StuHelper/stuhelper-next/blob/develop/architecture/modules.json)只记录设计状态，不能用清单存在证明模块已经可运行。
