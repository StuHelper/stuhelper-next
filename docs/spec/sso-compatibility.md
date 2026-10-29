---
type: spec
status: Accepted
updated: 2026-10-29
---

# SSO 的公共兼容要求

应用继续通过标准 OIDC 与官方 API 接入身份服务。保留既有 issuer、subject、账号及消费方绑定，不以业务账号注销替代共享 SSO 账号删除。

注册、登录与找回由独立 SSO 提供。本应用当前设备和全部设备退出撤销本应用会话，其他应用按自身规则管理。原生公有客户端不保存 client secret。

升级和迁移前须验证各消费方的实际登录、授权与会话行为。完整兼容矩阵和数据保留规则迁至 [私有兼容规格](https://github.com/StuHelper/stuhelper-ops/blob/develop/docs/spec/sso-compatibility.md)，本轮尚未实施 SSO 迁移。

## 应用会话验收

| 场景 | 预期结果 |
| --- | --- |
| SSO-01 | 登录回调只消费一次，写操作校验 CSRF 与当前学校范围，撤权后下一次操作拒绝 |
| SSO-02 | 本应用令牌在服务端加密保存，身份服务故障明确返回，全部设备退出撤销所有本应用会话 |
| SSO-03 | 重复迁移和应用重启保留有效会话，运行账号不能 DDL 或读取其他模块数据 |
