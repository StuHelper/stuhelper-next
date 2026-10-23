---
type: design
status: InReview
updated: 2026-10-24
---

# 原生多端设计

项目负责人于 2026-10-24 确定当前只交付 Web 与 Admin，其他端全部搁置。下文保留原生端参考设计，恢复实施前重新确认平台版本与交付安排。

## 目标与范围

Web、小程序、Android、iOS、HarmonyOS 使用适合各平台的 UI、导航、生命周期和系统能力，跨端共享协议与产品定义。当前没有客户端产品；交付优先级和最低系统版本仍待确定。可观察行为见[客户端规格](../spec/native-clients.md)。

## 技术路线与理由

| 平台 | 建议技术 | 登录与平台能力 |
| --- | --- | --- |
| Web / Admin | TypeScript + Vue 3；公开内容需要 SEO 时采用 SSR/预渲染 | BFF HttpOnly/Secure cookie、CSRF、服务端会话，审核权限不在浏览器决定 |
| 微信小程序 | TypeScript + WXML/WXSS 原生组件 | 微信平台登录只建立平台身份；通过明确绑定接入 StuHelper SSO |
| Android | Kotlin + Jetpack Compose | 系统浏览器/Custom Tabs + PKCE、App Links、系统安全存储和推送 |
| iOS | Swift + SwiftUI | ASWebAuthenticationSession + PKCE、Universal Links、Keychain、APNs |
| HarmonyOS | ArkTS + ArkUI，面向 HarmonyOS 原生能力 | 平台支持的浏览器授权/回跳、应用安全存储和华为推送 |

多套 UI 和发行流程会增加维护工作，因此建议分阶段交付。具体最低系统版本、SDK 和开发者账号在各端开始实现时确定。

## 共享边界

- OpenAPI、错误码、分页/过滤语义、事件定义和版本策略；生成 TS/Kotlin/Swift/ArkTS 的 API 类型与客户端适配。
- 设计 token、图标源、信息架构和交互验收规则；各端用原生组件落实平台习惯。
- 契约 fixtures 与端到端用户旅程；学生资格、可见性、权限、评分等业务规则统一留在服务端。
- 链接协议，例如课程、教师、资料和动态的稳定 URL，映射到 App Links/Universal Links/小程序页面。

共享 SDK 负责 API 类型和传输适配，界面及平台状态由各客户端维护。生成器对 ArkTS 等目标的支持需要先通过编译验证。不支持自动生成时，可编写小型传输适配器，继续复用生成的数据结构定义。

## 登录与平台适配机制

移动端通过系统浏览器进行授权码（code）+ PKCE 登录，各端注册独立公有客户端（public client）。公有客户端无法安全保存长期 secret，PKCE 用于防止被截获的授权码遭他人兑换。浏览器可使用 BFF（供浏览器使用的后端）保存 OIDC 会话，并由后端检查 cookie、跨站请求伪造（CSRF）和业务权限。移动 API 使用本应用会话，还是接受面向特定应用（audience）的 Casdoor token，在首个客户端实现时确认。

微信平台身份由服务端用登录 code 换取。小程序需要在平台支持的 web-view 或跨设备流程中完成已有 SSO 账号的明确绑定；绑定意图短时、一次性并关联发起端。原型先验证业务域名、回跳、取消、过期和审核限制，再确定正式 UX。

未知 capability 与深链接目标由服务端提供可解释结果，客户端按支持范围呈现。离线草稿或收藏意图本地保存，联网后由服务端按幂等规则确认；业务授权不依赖本地缓存。

## 构建与发行

普通 Web、小程序、Android 编译可以使用标准 Linux runner；Docker 镜像构建及 BJ1 Registry 操作遵循[runner 规格](../spec/ci-runners.md)，使用自建 runner。iOS 需要 macOS + Xcode，现有 Linux ARC 无法承担原生 iOS 编译。HarmonyOS 的 SDK、Hvigor、签名和支持环境需先验证，必要时专用 runner。

每端完成登录、课程详情、教师详情、发布评价和资料下载的完整旅程后再扩展；模拟器、真机、签名和商店发布分别验收。原生功能包随平台发行，服务端开关只控制已有能力的可见性，不能替代原生发布。

## 风险与确认范围

各端排期、SDK 最低版本、签名账号和小程序绑定体验尚待确认，ArkTS SDK 生成能力也需要通过实际编译验证。相关任务见[重写计划](../development/rewrite-roadmap.md)。

官方参考：[Android Compose](https://developer.android.com/compose)、[SwiftUI](https://developer.apple.com/swiftui/)、[ArkUI](https://developer.huawei.com/consumer/cn/arkui/devstart/)、[微信小程序](https://developers.weixin.qq.com/miniprogram/dev/framework/)、[RFC 8252](https://www.rfc-editor.org/rfc/rfc8252)。
