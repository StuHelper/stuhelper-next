---
type: spec
status: Accepted
updated: 2026-10-24
---

# 账户与交易的公共对接说明

## 用户体验

个人中心提供积分与 Ivory 入口，展示本人可查看的账户摘要、明细及申请进度。业务页面展示服务返回的可选交易方式、需支付内容和实际结果。用户确认后才提交交易请求。

重复点击或请求重试不得重复收费。页面区分已提交、处理中、成功和失败，不能将请求受理显示成已完成付款或退款。未配置或不可用的交易能力不向用户提供可执行入口。

## 权限与接入

余额、交易与收款资料仅按本人或获授权管理员的权限返回。公开模块不读取私有账务数据库，不把交易载荷写入通用事件或日志。服务不可用时保留既有事实，明确返回当前不可执行。

具体货币、计价、奖励、购买与退款规则维护在 [私有账务规格](https://github.com/StuHelper/stuhelper-billing/blob/develop/docs/spec/wallet-and-points.md)，资料交易关系见 [私有权益规格](https://github.com/StuHelper/stuhelper-billing/blob/develop/docs/spec/resource-entitlements.md)。
