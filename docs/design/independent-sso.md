---
type: design
status: InReview
updated: 2026-10-23
---

# 独立官方 Casdoor SSO

## 目标与范围

保留现有身份数据与各系统账号绑定，使用官方镜像运行可独立维护的 StuHelper SSO。官方镜像路线已由 owner 确认，见[ADR-0001](../adr/0001-official-casdoor-image.md)；更新控制器和切换机制属于尚待实施的设计。精确数据与验收要求由[SSO 规格](../spec/sso-compatibility.md)维护。

## 系统边界

- SSO 由官方镜像、独立配置/secret、自己的数据库、需要时独立 Redis/session 存储和独立反代组成。
- 固定既有公共 issuer `https://sso.stuhelper.com`。主站、Next、AI、Store 各自是独立 OIDC client，各自管理本地会话和业务账号。
- SSO 的启动、健康、备份、更新和恢复不调用 StuHelper 业务 API，不查询主站数据库，不依赖主站 Admin 可用。
- 运维入口独立于业务网站，可由受保护工作流或部署主机上的运维命令启动。业务管理员不因此获得 Docker/SSH/数据库凭据。
- 不 fork Casdoor、不重新编译、不打补丁、不把业务代码挂进官方镜像；品牌配置通过官方主题、应用配置和支持的定制入口维护。
- 更新 SSO 不强制发布业务应用；发布业务应用也不能覆盖/降级 SSO 镜像或执行 SSO bootstrap。

官方文档说明 v3 → v4 主要更换前端，数据结构在启动时自动补充；这不构成对 StuHelper 历史配置、扩展或会话的兼容证明。必须用现有数据的隔离副本演练。参考 [v3 → v4](https://casdoor.ai/docs/deployment/upgrade-v3-to-v4/) 与 [数据库迁移](https://casdoor.ai/docs/deployment/db-migration/)。

## 制品与更新入口

直接消费官方 `casbin/casdoor` 镜像，固定 release、源码提交、镜像 index 与目标平台 digest。候选锁只表示已经解析，独立来源交叉验证、消费资格与生产批准分别记录。需要在 BJ1 Registry 缓存原件时按[runner 规则](../spec/ci-runners.md)使用自建 runner，保持 digest 一致。

用户通过独立维护命令或受保护工作流发起一次更新，流程自动推进版本解析、资格检查、备份恢复演练、维护切换与验收；业务 Admin 不持有 Docker、SSH 或数据库凭据。Casdoor 镜像不挂载宿主 Docker socket。

官方 v4.23.0 的内置升级按钮适用于官方 release 二进制；本项目采用 Docker，因此一键更新由独立运维入口实现。该工具当前尚不存在，现有能力只有[候选解析](../guide/sso-candidate.md)。见[官方升级说明](https://casdoor.ai/docs/deployment/upgrade/)。

## 更新协作与资源生命周期

```mermaid
stateDiagram-v2
  [*] --> Resolved: 发现并固定官方候选
  Resolved --> Qualified: 来源与合成消费者验证通过
  Qualified --> Rehearsed: 隔离数据升级和恢复演练通过
  Rehearsed --> Prepared: 停写 / 最终备份及恢复验证
  Prepared --> CommitStarted: 记录首次生产启动边界
  CommitStarted --> Verified: 运行与消费者验收通过
  Verified --> [*]
  Resolved --> Blocked: 校验失败
  Qualified --> Blocked: 演练失败
  Prepared --> Aborted: 候选访问生产库前中止
  CommitStarted --> RecoverForward: 状态不确定或验证失败
  RecoverForward --> Verified: 同一候选恢复与重新验收
```

自动发现只生成固定候选，后续步骤始终使用同一制品身份。演练在受控主机隔离网络运行，禁止真实短信、邮件、支付、webhook、syncer 和外部 provider 副作用。停所有写入者后取得最终一致备份，实际恢复并复核，再记录候选首次接入线上库的提交边界。

只有一个协调器持有迁移锁，重复执行恢复同一事务，结果未知时先核对实际运行状态。当前与上一已验证镜像、足够的备份和审计有独立保留策略；清理不能删除恢复所需材料。首次大版本或兼容性变化不能未经审查自动上线。

## 失败与恢复

候选尚未访问生产库时可以中止并恢复旧运行路径。候选首次在线启动后可能立即迁移 schema 和产生后台写入，不能用“还没放流量”当作未写入证明；之后优先保持数据向前修复。旧版本运行于新 schema 必须有明确兼容证据；绝不自动用旧备份覆盖切换后新增的账号、绑定或令牌事实。

隔离备份演练应比较稳定主键、身份集合与受保护字段的受控摘要；原始值不离开受控环境。只比较表数量或只启动成功不足以证明保留了全部事实，完整清单见规格。

## 实施衔接与待确认事项

当前主仓库已有部分官方原件适配和迁移工具，提取前要确认其调用、secret、控制状态与业务依赖。新的 SSO 运维入口不依赖旧主站请求账本；正式交接须停用旧更新/版本指针写入者，避免两个控制面并发。

实际生产拓扑、消费者配置、维护窗口、旧会话差异及独立运维包的权限边界需要完成[迁移任务](../development/sso-migration.md)后确定。本文不表示部署或真实登录验收已经完成。
