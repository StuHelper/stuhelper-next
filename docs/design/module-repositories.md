---
type: design
status: Accepted
updated: 2026-10-29
---

# 按模块划分仓库

## 划分原则

项目采用 multi repo。一个业务模块拥有自己的代码、规格、数据、公开接口和版本，其他模块通过接口或事件使用它。仓库按业务职责划分，不能只把前端与后端拆开后继续共享内部数据结构。

可插拔表示模块可以启停、替换或独立升级，并且缺失时有明确的功能表现。仓库边界与运行进程分别设计。公开和私有业务 Go module 都可静态编译进私有 backend；独立进程由实际运行需求决定。官方 Casdoor 与 Koishi 独立部署。platform 的公开检查不读取私有源码。

本仓库保留跨模块架构、公共业务规格、接口目录和迁移进度。模块开始实现时，其详细设计、实现、模块内验收与迁移由自己的仓库维护。私有模块的具体设计本轮直接迁入私有仓库，公开页面只说明用户入口及必要对接范围。

完整开发工作区由一份 Mani 清单登记。仓库可见性表达代码和文档的保密范围，GitHub 管理仓库访问权限。业务管理员、学校范围和普通用户权限由运行中的服务管理。各仓库按自身接口依赖独立构建，同进程模块通过 Go 接口与函数协作，独立服务通过网络 API 协作。

## 仓库与数据归属

以下名称确定模块归属。没有实现内容的公开模块先登记，开始实现时建立仓库，避免把空仓库当成交付。

| 模块 | 仓库 | 可见性 | 拥有的数据与职责 |
| --- | --- | --- | --- |
| platform | stuhelper-platform | public | 模块注册、接口发现、动作资格配置、授权范围、组合 API 与通用运行能力 |
| identity | stuhelper-backend | private | 本应用 OIDC 接入、身份映射与会话适配 |
| 应用装配 | stuhelper-backend | private | main 入口、模块连接、正式二进制与镜像 |
| 工程工具 | stuhelper-tooling | public | 共享 CLI、action、workflow 与 Lefthook 预设 |
| profiles | stuhelper-profiles | public | 昵称、头像引用、简介、隐私偏好与业务账号生命周期 |
| verification | stuhelper-verification | private | 学生资格、独立实名、审核材料与具体认证流程 |
| campus-adapters | stuhelper-campus-adapters | private | 学校认证协议、学校数据适配与来源映射 |
| storage | stuhelper-storage | public | 存储实例、准入与容量预占、副本账本、校验修复、可靠任务、清理，以及用户账号托管申请流程 |
| storage-contribution | stuhelper-storage-contribution | public | 贡献同意、额度与保留空间、期限、暂停退出、撤权及核验统计 |
| storage-bhpan | stuhelper-storage-bhpan | public | BHpan 登录、稳定身份、目录与文件传输协议；由 storage 的 adapter 桥接使用 |
| catalog | stuhelper-catalog | public | 学校、院系、学期、课程、教师、开课与个人课表 |
| reviews | stuhelper-reviews | public | 课程评价、导师评论、评分、回复、投票、收藏与草稿 |
| resources | stuhelper-resources | public | 统一分类及字段、课程关联、资料版本、作品许可、审核、访问授权、目录与交付状态 |
| billing | stuhelper-billing | private | 积分、Ivory、收费、会员售卖、奖励、退款与交易权益凭据 |
| moderation | stuhelper-moderation | public | 内容审核、举报、申诉与处置决定，内容模块执行状态变化 |
| community | stuhelper-community | public | 动态、分区、关注、屏蔽及动态内互动 |
| media | stuhelper-media | public | 通用文件、不可变版本、上传会话、业务引用、当前权限下载与文件清理协调 |
| groups | stuhelper-groups | public | QQ 绑定业务接入、群准入、名片、消息治理与娱乐命令 |
| information-query | stuhelper-information-query | public | 授权范围内的跨模块关联查询、批量与导出 |
| open-platform | stuhelper-open-platform | public | 开发者应用审批、业务授权与撤回 |
| search | stuhelper-search | public | 可重建搜索索引、热度与发现查询 |
| notifications | stuhelper-notifications | public | 站内通知、发送意图、渠道投递与偏好 |
| 运维仓库 | stuhelper-ops | private | Compose、部署组合、官方 SSO/Koishi 运维与恢复 |

campus-adapters 负责学校认证与教务数据接入。BHpan 存储协议归 storage-bhpan，存储根、容量与副本归 storage。调用方向为业务 → media → storage → adapter；media 不直接调用 BHpan 协议，也不保管供应商凭据。

media、storage、storage-contribution 与 storage-bhpan 已分别建仓并有实现，Mani 与模块清单均已登记。backend 已装配文件、存储、贡献、凭据托管及独立 worker。通用模块不读取课程或账务表，首期实际供应商为 BHpan，S3/COS adapter 后续接入。

未来在线阅读器、加密容器与溯源见[文件保护设计](file-protection-and-delivery.md)，明确暂不实现。media、storage 和 storage-contribution 分别拥有文件、放置与贡献规格，不共用模块内数据表。

## 存储架构与代码归属

[通用存储设计](storage-architecture.md#模块职责)中的框表示职责，不要求每个框都有独立仓库。当前首期实现按下表归属；精确源码组合与测试结果见[存储实施状态](../development/storage-module.md)。

| 架构中的职责 | 当前模块或仓库 | 边界 |
| --- | --- | --- |
| 课程资料业务 | resources；调用 catalog、moderation 等公开接口 | 课程关联、业务审核、访问权益、展示和目录由使用方维护 |
| 其他业务或文件系统 | 相应业务模块 | 使用 media 的文件引用，不直接操作副本、供应商账号或凭据 |
| 通用文件服务 | media / stuhelper-media | 管理逻辑文件、版本和业务引用，通过 storage 接口使用物理存储 |
| 通用存储服务 | storage / stuhelper-storage | 管理实例、容量、物理副本、放置、校验、修复及清理 |
| 平台存储账号管理 | storage + 私有 backend；Admin 提供运营界面 | storage 保存实例、准入、额度和操作账本；backend 保管凭据并登录供应商 |
| 用户账号托管 | storage 的 custody + 私有 backend | custody 保存同意、申请、归属及恢复状态；backend 执行加密保管、登录和凭据轮换 |
| 用户容量贡献 | storage-contribution / stuhelper-storage-contribution | 选择已托管实例，管理贡献条件，通过 storage 公开接口协调生效和退出 |
| BHpan adapter | storage 的 drivers/bhpan + stuhelper-storage-bhpan | 前者将通用存储端口映射到后者的供应商协议，backend 负责装配 |
| S3/COS 等 adapter | 后续协议实现与桥接 | 当前尚未实现，沿用通用存储端口 |
| 激励与账务 | 奖励规则后续独立实现，记账归 billing | 贡献榜、奖励计算与贡献到账务接入延期，不阻塞存储和文件能力 |

“平台账号”在此指平台持有的网盘或对象存储账号。它与 StuHelper 用户身份、个人资料分开；后两者分别归 identity 和 profiles。当前没有独立的 storage-accounts 后端模块，不能把 Admin 的同名页面当成新的模块或仓库。

平台实例目前通过 backend 的凭据管理命令和 storage 注册接口接入，再由 Admin 管理额度、暂停、排空与撤销。用户在线托管由 storage/custody 接入，初始实例暂停且贡献额度为零；storage-contribution 在用户另行同意贡献条件后协调使用。

backend 的 credentials 与 bhpancustody 保存和使用敏感凭据，公共 storage 只保存凭据引用及修订。media 不持有账号密码，storage-contribution 不处理登录，也不因用户提交账号就自动取得贡献授权。

上述划分区分逻辑文件、物理存储、账号接入和容量贡献。将来更换供应商时，业务文件引用保持稳定，只替换对应 adapter 和托管适配；是否进一步拆分账号托管仓库或进程，按实际复用及部署需要决定。

## 客户端与既有系统

现有私有 `stuhelper-payment` 保留支付网关职责，账务模块通过其接口对接，不把积分、会员与资料业务塞入支付网关。现有 AI、Store 和 `stuhelper-docs` 均保留自己的用途，不因本次重构重新归属或被覆盖。

当前只推进 `stuhelper-web` 与 `stuhelper-admin`。微信小程序、Android、iOS 与 HarmonyOS 暂时搁置，对应仓库名称规划为 `stuhelper-wechat`、`stuhelper-android`、`stuhelper-ios` 和 `stuhelper-harmony`。

客户端按模块组合界面并使用版本化 SDK，服务端执行业务规则。新建仓库前检查同名项目，保留已有项目。

运维仓库维护部署组合与恢复操作，模块运行时清单单独登记可启停模块。

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

模块分别发布版本，兼容修改不要求所有仓库同步升级。破坏接口兼容的修改提供迁移期并进行提供方、使用方契约测试。同一后端二进制的 Go 依赖由 go.mod/go.sum 固定。部署组合使用 Compose 覆盖文件选择明确 tag 与 digest，配置所属 ops 提交记录在发布结果中。

## 文档与当前状态

私有模块的详细规格分别放在对应仓库，公共规格仅保留必要的使用与对接说明。主架构仓库按负责人决定建立新的 Git 基线；有效业务规格、源码和第三方来源继续保留，其他代码仓库保留既有历史。

platform、Web 和 stuhelper-admin 的框架已实现，通用文件、存储、BHpan 托管及容量贡献已有代码与隔离验收。当前候选由配套 PR 和 workspace.lock.json 固定，合并、正式发行与生产部署分别报告，不能把主分支未合并的旧文档当成候选实现清单。

[模块清单](https://github.com/StuHelper/stuhelper-next/blob/develop/architecture/modules.yaml)登记模块与依赖，[框架工作记录](../development/framework-bootstrap.md)维护平台状态，[存储实施状态](../development/storage-module.md)维护文件、存储、账号托管和贡献的实现及验收。职责归属与完成状态分别记录。
