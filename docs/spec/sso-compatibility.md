---
type: spec
status: Accepted
updated: 2026-10-25
---

# SSO 的公共兼容要求

应用继续通过标准 OIDC 与官方 API 接入身份服务。保留既有 issuer、subject、账号及消费方绑定，不以业务账号注销替代共享 SSO 账号删除。

注册、登录与找回由独立 SSO 提供。本应用当前设备和全部设备退出撤销本应用会话，其他应用按自身规则管理。原生公有客户端不保存 client secret。

升级和迁移前须验证各消费方的实际登录、授权与会话行为。完整兼容矩阵和数据保留规则迁至 [私有兼容规格](https://github.com/StuHelper/stuhelper-ops/blob/develop/docs/spec/sso-compatibility.md)，本轮尚未实施 SSO 迁移。
