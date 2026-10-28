---
type: development
status: Accepted
updated: 2026-10-29
---

# 框架实施状态

## 当前实现

platform 提供公共模块接口、依赖校验、能力降级、Fx 生命周期、HTTP 授权边界和可选远程连接。模块描述由其仓库的 `module.yaml` 生成，主仓库验证规格归属和公开能力一致性。

私有 backend 承载正式程序入口。verification 与 campus-adapters 已提供候选装配，Web/Admin 提供认证页面。真实身份、学校与邮件接入分别验收，具体实现与数据规则保存在私有模块。billing 仍待实施。

storage-bhpan 独立提供 BHpan Go 存储适配库，其公开协议与脱敏验证记录由本仓维护。公共运行示例仍位于 platform 的 `examples/server`。

Web 与 stuhelper-admin 提供状态展示、错误恢复和八语言入口。国际化检查覆盖消息键、占位符、复数、数字、金额、日期、时区、相对时间和 RTL。

共享检查器、GitHub action、reusable workflow 与 Lefthook 预设已迁至 stuhelper-tooling。主仓库保留架构、Mani、工作区工具和应用联调。SSO 官方制品资料归 ops，后端身份实现归 backend。

## 验证入口

| 范围 | 检查 |
| --- | --- |
| 工具库 | 检查器、暂存快照、日志与失败路径测试 |
| 架构 | 模块依赖、规格归属、工具链、文档与 Actions |
| platform | Go race、vet、构建、生成一致性、契约和导入边界 |
| backend | GOWORK=off 的正式依赖构建与检查 |
| verification | 私有接口、数据库、权限、幂等、材料和历史导入测试 |
| campus-adapters | 学校证据、输入校验、协议夹具与 race 检查 |
| storage-bhpan | 独立 Go 存储适配库、协议夹具、race、vet 与场景映射 |
| Web/Admin | 类型、lint、国际化、客户端用例与应用构建 |
| 公开组合 | 契约来源、兼容性与八语言桌面/移动浏览器测试 |
| ops | Compose、镜像引用、官方 SSO 候选与部署工具测试 |

当前认证候选在 WSL 使用合成资料执行数据库与 Web/Admin 浏览器联调，覆盖八语言、桌面、手机和 RTL。源码检查、实际候选组合与剩余接入见[私有认证实施记录](https://github.com/StuHelper/stuhelper-verification/blob/develop/docs/development/implementation.md)。

platform v0.1.0 与 tooling v0.1.0/v0.1.1 已建立不可变版本。已切换消费者的远端检查逐仓验收。真实账号、Registry 发行授权、部署环境接入和生产迁移仍由相应任务处理。

## 剩余实施

真实身份接入、校园数据导入、评价、文件、账务和查询继续按各自规格推进。认证候选的真实账号、历史数据与生产部署单独验收。评价资格使用选课记录，教师选项来自本人任课记录，具体行为见[评价规格](../spec/academic-content.md)。

首次持久化业务写入同时落实幂等、数据访问身份和必要事件；首次身份查询落实查看审计。真实账号、SSO 生产迁移和生产部署继续由相应任务授权和验收。
