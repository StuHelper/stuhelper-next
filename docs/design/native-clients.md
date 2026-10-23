---
type: design
status: InReview
updated: 2026-10-23
---

# 原生多端设计

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

这意味着多套 UI 与发行流水线的维护成本，建议分阶段交付而非同时启动五套完整产品。具体 OS 最低版本、SDK 和开发者账号在各端启动时确定。

## 共享边界

- OpenAPI、错误码、分页/过滤语义、事件定义和版本策略；生成 TS/Kotlin/Swift/ArkTS 的 API 类型与客户端适配。
- 设计 token、图标源、信息架构和交互验收规则；各端用原生组件落实平台习惯。
- 契约 fixtures 与端到端用户旅程；学生资格、可见性、权限、评分等业务规则统一留在服务端。
- 链接协议，例如课程、教师、资料和动态的稳定 URL，映射到 App Links/Universal Links/小程序页面。

不建立包含全部业务状态机的巨大跨端 SDK，也不强迫所有平台复用同一个渲染层。生成器对 ArkTS 等目标的实际支持需先做编译验证；不支持时用小型手写传输适配器消费生成的 schema，不能宣称全部 SDK 已有可用生成器。

## 登录与平台适配机制

移动端通过系统浏览器认证会话进行 code + PKCE 授权，各端注册独立 public client。浏览器 Web 可使用 BFF 保存 OIDC 会话，后端复核 cookie、CSRF 和业务权限。移动 API 使用本应用会话还是直接接受特定 audience 的 Casdoor token，需在首个客户端实现时确认。

微信平台身份由服务端用登录 code 换取。小程序需要在平台支持的 web-view 或跨设备流程中完成已有 SSO 账号的明确绑定；绑定意图短时、一次性并关联发起端。原型先验证业务域名、回跳、取消、过期和审核限制，再确定正式 UX。

未知 capability 与深链接目标由服务端提供可解释结果，客户端按支持范围呈现。离线草稿或收藏意图本地保存，联网后由服务端按幂等规则确认；业务授权不依赖本地缓存。

## 构建与发行

普通 Web、小程序、Android 编译可以使用标准 Linux runner；Docker 镜像构建及 BJ1 Registry 操作遵循[runner 规格](../spec/ci-runners.md)，使用自建 runner。iOS 需要 macOS + Xcode，现有 Linux ARC 无法承担原生 iOS 编译。HarmonyOS 的 SDK、Hvigor、签名和支持环境需先验证，必要时专用 runner。

每端完成登录、课程详情、教师详情、发布评价和资料下载的完整旅程后再扩展；模拟器、真机、签名和商店发布分别验收。原生功能包随平台发行，服务端开关只控制已有能力的可见性，不能替代原生发布。

## 风险与确认范围

原生开发意味着维护多套 UI 与发行流程。各端排期、SDK 最低版本、签名账号和小程序绑定体验尚待确认；ArkTS SDK 生成能力也须实际编译验证。相关任务见[重写计划](../development/rewrite-roadmap.md)。

官方参考：[Android Compose](https://developer.android.com/compose)、[SwiftUI](https://developer.apple.com/swiftui/)、[ArkUI](https://developer.huawei.com/consumer/cn/arkui/devstart/)、[微信小程序](https://developers.weixin.qq.com/miniprogram/dev/framework/)、[RFC 8252](https://www.rfc-editor.org/rfc/rfc8252)。
