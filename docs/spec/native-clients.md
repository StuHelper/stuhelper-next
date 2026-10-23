---
type: spec
status: InReview
updated: 2026-10-23
---

# 原生客户端行为

## 范围与适用情况

适用于未来 Web、小程序、Android、iOS 和 HarmonyOS 客户端，当前没有客户端实现。技术机制与各端成本见[原生多端设计](../design/native-clients.md)。

## 身份与会话

移动端使用独立 public client、Authorization Code + S256 PKCE 与系统认证会话，客户端中不包含 secret。校验 state、nonce、redirect、issuer、audience 和令牌有效期；不同 client 的 token 不因同一 issuer 自动互通。取消、过期或进程恢复后必须重新核对授权意图，不能让回调绑定到另一用户。

微信登录只证明对应 appid 下的平台身份。绑定已有 SSO 账号必须有双方身份的有效证明与用户确认；缺失 unionid 时不推断跨应用身份。换绑/解绑需重新认证与审计。绑定凭证短时、一次性并关联发起端，不通过 URL、二维码或 postMessage 明文传递 access token。

Web BFF 的 cookie 使用 HttpOnly/Secure 等适用属性并执行 CSRF 防护；移动端采用系统安全存储。服务端依然是权限、学生资格和可见性规则的执行者。

## 功能与离线

各端依据服务端 capability 与自身支持版本展示功能；深链接指向未启用模块或不支持功能时明确反馈。草稿与收藏意图可本地保存；发布评价、课程编辑、身份绑定只有服务端确认后才展示成功，网络重试使用幂等标识。

端间共享 API 定义、错误语义与验收场景，原生 UI、导航、设备存储、推送和生命周期各自实现。服务端不能靠开关下发客户端尚未包含的原生功能包。

## 验收场景

| 场景 | 初始条件与动作 | 预期结果 |
| --- | --- | --- |
| CLIENT-01 | 在任一原生端完成 SSO 登录与业务请求 | 对应原 subject，验证正确 audience，未内置服务端 secret |
| CLIENT-02 | 授权取消、回调过期或 state/nonce 不匹配 | 不创建会话，不错绑用户，可重新开始 |
| CLIENT-03 | 微信身份尚未关联 SSO，尝试使用受限业务 | 进入明确绑定流程，不凭 email/手机号/openid 猜测 SSO 账号 |
| CLIENT-04 | 发布请求超时后重试 | 只出现一次已确认内容，结果未知时可查询 |
| CLIENT-05 | 旧客户端进入关闭模块的深链接 | 展示明确不可用状态，服务器也拒绝操作 |
| CLIENT-06 | iOS/HarmonyOS 模拟器检查通过 | 仅记录对应测试通过，签名、真机和商店验收仍独立记录 |

各端最低系统版本、原生回调方案、会话形式、小程序绑定体验和 SDK 生成能力需要原型确认。实施顺序见[重写路线](../development/rewrite-roadmap.md)。
