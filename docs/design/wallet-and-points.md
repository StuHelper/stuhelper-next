---
type: design
status: Accepted
updated: 2026-10-25
---

# 私有账务模块与业务接入

账务模块拥有积分、Ivory、收费、奖励、会员交易与退款。公开业务模块通过授权接口提交业务请求，展示账务返回的价格、状态与必要的权益凭据，不自行计算余额、兑换或退款结果。

完整规则迁至 [私有账务设计](https://github.com/StuHelper/stuhelper-billing/blob/develop/docs/design/wallet-and-points.md)。现有私有 Payment 保留支付网关职责，billing 负责平台业务账务，两者通过明确接口协作。

资源模块继续管理文件、作品许可、可见性与交付。收费能力未启用时，免费资料仍可按访问规则使用。涉及收费的操作须确认所需服务可用，不能以本地改状态代替实际交易结果。
