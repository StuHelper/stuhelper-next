---
type: design
status: InReview
updated: 2026-10-23
---

# 项目设计

## 目标与范围

学生需要把课程、教师、历次开课、评价和学习资料放在一起查询，并围绕这些内容开展交流。StuHelper Next 负责这套业务体验；独立 SSO 提供统一登录，使现有 AI、Store 等系统继续识别原账号。

Next 是原 StuHelper 的重构版本和过渡名称。重写目标是保留需要的业务及身份连续性，明确模块边界，支持原生多端；已确认业务见[范围总览](business-scope.md)。首个闭环与各模块顺序仍是实施提案，当前仓库尚未提供这些业务功能，进度见[重写计划](../development/rewrite-roadmap.md)。

## 方案概览

采用独立官方 Casdoor SSO、模块化业务后端和原生客户端。后端首先按模块组织，出现独立容量、故障或团队边界时再提取服务。业务技术建议为 Go、PostgreSQL、按需 Redis 与兼容 S3 的对象存储；具体依赖版本在实施时固定。

官方镜像及镜像任务 runner 分工已由 owner 确认，见[决策记录](../adr/README.md)。后端模块化实现细节、社交首期边界和各端排期仍属于待审阅设计。

## 主题索引

| 主题 | 内容 |
| --- | --- |
| [重构定位与业务范围](business-scope.md) | 十组已确认旧业务、相关新方向与提取边界 |
| [学生资格与实名身份](student-identity.md) | 发布门槛、北航学籍比对与可选实名之间的关系 |
| [积分、Ivory 与资料解锁](wallet-and-points.md) | 两套账户、获取奖励、购买权益与退款的业务关系 |
| [平台架构](platform-architecture.md) | 模块职责、数据所有权、协作与部署单元 |
| [课程、教师与内容关系](academic-content.md) | 课程、开课、教师、评价、资料和社交引用 |
| [独立 SSO](independent-sso.md) | 官方镜像、独立运维、迁移和恢复机制 |
| [原生多端](native-clients.md) | 技术路线、共享边界、登录和平台限制 |

新增主题使用[设计模板](TEMPLATE.md)，遵循[维护约定](../authoring.md)。
