---
type: development
status: Accepted
updated: 2026-11-11
---

# 前端审查处理

## 当前状态

本主题记录 Web 候选 `candidate/ui-a-apple` 的审查缺陷和接口差异。15 个前端缺陷已修复并有回归测试。接口差异需要后端配合，尚未完成。业务规则见[当前规则](business-decisions.md)。

## 已修复的缺陷

| 编号 | 问题 | 回归测试 |
| --- | --- | --- |
| F01 | 切换语言丢失未保存评价 | `tests/demo/prototype.spec.mjs` |
| F02 | 认证路由切换保留错误流程 | `tests/e2e/page-state-regressions.spec.mjs` |
| F03、F14 | 课程列表不跟随地址，忽略教师条件 | `tests/demo/prototype.spec.mjs` |
| F04 | 同一教师评分来源不一致 | `src/demo/server.test.ts` |
| F05 | 游客可打开模拟通知 | `tests/demo/prototype.spec.mjs` |
| F06 | 无访问权入口误接投诉 | 代码移除入口，未单独加测试 |
| F07 | 超时不覆盖响应正文 | `src/shared/api/http.test.ts` |
| F08 | 重试成功后未应用结果 | `tests/e2e/page-state-regressions.spec.mjs` |
| F09 | 切换标签丢失草稿输入 | `tests/demo/prototype.spec.mjs` |
| F10 | 切换编辑对象后写入旧对象 | `tests/e2e/page-state-regressions.spec.mjs` |
| F11 | 切换标签丢失未决申请恢复入口 | `tests/e2e/custody.spec.mjs` |
| F12 | 退出登录不清理最近浏览 | `src/shared/session.test.ts` |
| F13 | 动态选项字段绑定错误 | `tests/e2e/page-state-regressions.spec.mjs` |
| F15 | 手机课程详情横向溢出 | `tests/demo/prototype.spec.mjs` |

## 待完成的后端与接口工作

后端和接口工作由 Codex 按[后端实施](backend-decisions.md)完成。Web 随后接入这些接口，并替换仍使用模拟数据的原型页面。

## 未验证事项

全部页面的人工视觉复核、屏幕阅读器实机验收、真实后端联调、真实账号验收和大文件内存基准都还未执行。
