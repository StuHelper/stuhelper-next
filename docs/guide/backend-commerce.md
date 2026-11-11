---
type: guide
status: Accepted
updated: 2026-11-11
---

# 后端交易与收款资料配置

## 适用范围

本指南用于配置已接入 billing 与 resources 的后端候选，覆盖资料购买、会员和退款收款资料。配置文件与密钥只保存在获准私有环境。实际源码组合见 workspace.lock.json，正式部署版本由 ops 管理。

行为规则见[资料共享](../spec/resource-sharing.md)、[账户与交易](../spec/wallet-and-points.md)和[动作资格](../spec/action-eligibility.md)。当前实现与尚未验收的环境见[后端候选状态](../development/backend-decisions.md)。

## 账务配置与加密密钥

STUHELPER_BILLING_CONFIG 指向私有 JSON 配置。refund_payee_key_file 为必填项，指向绝对路径的普通文件，权限必须精确为 0600，拒绝符号链接。文件内容是 32 字节随机密钥的 Base64 文本，启动时校验长度。

WalletService 与 Repository 使用同一个 AES-256-GCM 密钥实例，账号查询使用同一 Repository。密钥不得进入源码、日志或客户端。缺失、长度无效或文件权限不符时，启动拒绝启用账务能力。

```json
{
  "environment": "production",
  "database_dsn_file": "/run/stuhelper-secrets/billing-dsn",
  "connections": 8,
  "payment_mode": "disabled",
  "refund_payee_key_file": "/run/stuhelper-secrets/refund-payee-key"
}
```

示例使用占位路径且关闭真实支付。部署时使用获准配置，不能将示例视为生产已启用证明。

## 交易事件与数据库身份

STUHELPER_RELAY_CONFIG 增加 billing_dsn_file，resources_dsn_file 沿用资料配置。两项各自指向对应模块独立运行身份的 0600 DSN 文件。LISTEN 连接另行检查 schema 隔离及 outbox 确认权限。

迁移由独立身份执行，运行身份禁止 DDL 和其他模块 schema 访问。候选库使用提供方最终结构，权限不足时启动检查拒绝继续。

| 身份 | 新增所需权限 |
| --- | --- |
| billing | commerce_outbox SELECT/INSERT/UPDATE 与序列 USAGE；commerce_inbox SELECT/INSERT；commerce_revisions SELECT/INSERT/UPDATE；refund_payees SELECT/INSERT/UPDATE/DELETE |
| resources | coverage、purchases、memberships SELECT/INSERT/UPDATE；inbox 仅 SELECT/INSERT；outbox SELECT/INSERT/UPDATE 与序列 USAGE |

两个 outbox 共用统一 relay，提交后唤醒，启动、重连与每 60 秒补读。按主题保序，读取前排除退避主题，每批最多 100 条。失败从 5 秒退避到最多 1 小时，累计 24 小时进入人工队列，缺少消费者时保留事件。

## 检查与恢复

确认资料订单从 paid 推进到 fulfilled，交付拒绝时退回原账户。会员事件按修订更新，下载按当前有效期判断。管理交易需 billing.manage，查看收款资料还需 billing.refund-payee-read，覆盖写入需全站 resources.coverage.manage。

结果未知时先查询原订单，重试沿用原请求与幂等键。人工事件使用 event-retry --source billing 或 --source resources 查询，附加 --id 按原事件 ID 重试。不要通过重新扣费处理交付积压。

退款收款资料清理与支付核查由单个 worker 串行执行，每 5 秒最多清理 100 条，整轮最多 20 秒，SQL 最多 5 秒。停机先取消并等待任务退出，再关闭连接。

默认至少保留三年，未完成退款及 legal_hold 不清理。实际财务保留期限待负责人确认。真实支付、真实账号、生产部署及恢复演练分别验收，状态见开发主题。
