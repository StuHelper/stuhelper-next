---
type: spec
status: Accepted
updated: 2026-11-11
---

# SSO 接入与应用会话

应用继续通过标准 OIDC 与官方 API 接入身份服务。按 issuer、subject 标识账号并保存消费方绑定，不以业务账号注销替代共享 SSO 账号删除。

注册、登录与找回由独立 SSO 提供。本应用当前设备和全部设备退出撤销本应用会话，其他应用按自身规则管理。原生公有客户端不保存 client secret。

身份服务使用官方发行原件。SSO 接入配置与运行维护见[私有接入规格](https://github.com/StuHelper/stuhelper-ops/blob/develop/docs/spec/sso-compatibility.md)。旧系统的 SSO、学生认证和 QQ 绑定数据在新系统完成后另行转换导入，开发阶段不提供兼容或导入结构。

## 应用会话验收

| 场景 | 预期结果 |
| --- | --- |
| SSO-01 | 登录回调只消费一次，写操作校验 CSRF 与当前学校范围，撤权后下一次操作拒绝 |
| SSO-02 | 本应用令牌在服务端加密保存，身份服务故障明确返回，全部设备退出撤销所有本应用会话 |
| SSO-03 | 应用重启保留有效会话，运行账号不能 DDL 或读取其他模块数据 |
