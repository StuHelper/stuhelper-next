---
type: guide
status: Accepted
updated: 2026-10-24
---

# 工具链与依赖维护

## 版本来源

Go、Node.js、uv 和 Corepack 的项目版本维护在 `architecture/toolchains.json`。`.node-version`、`.go-version`、Go 模块和包管理器的引擎声明由工作区命令同步，CI 从版本文件读取 Go 与 Node.js。Mani 和 Git 是主机工具，开发者自行安装；集成 CI 使用已验证的 Mani 发行版本。

## 常规依赖

各仓库的 Dependabot 覆盖其实际使用的 npm/pnpm、Go、uv 和 GitHub Actions，每周提出版本更新。兼容补丁和次版本可以归组，主版本分别评估。依赖修改经过锁文件、独立检查与集成组合验证后合入。

安全更新依赖 GitHub 的依赖图、Dependabot alerts 和 security updates 设置。仓库配置进入维护分支后核对这些设置及首次更新结果。新的运行时 LTS 由维护者评估兼容性后统一采用。

Renovate 适合需要共享更新预设、更多版本文件识别和集中更新策略的阶段。采用时统一切换更新机器人，保留现有检查与人工合并流程。任何机器人都需要跨仓版本组合验证。

## 统一升级

在同一任务的模块工作树中修改版本清单，然后运行：

```bash
node scripts/workspace.mjs toolchains --write
mani run setup --tags code
mani run check --tags code
node scripts/workspace.mjs toolchains
node scripts/workspace.mjs contracts
npm run test:e2e
```

代码仓库通过检查并提交后，更新 `workspace.lock.json`。各模块提交推送后，集成 CI 可检出该组合。新的 CVE 先确认受影响版本、调用路径和修复版本，再升级相应依赖及受影响阶段。

## stuhelper-admin 框架升级

上游来源由 `vendor/vben.json` 的 tag、提交和许可证记录。升级时比较该基线、当前应用与新上游，保留 StuHelper 的接口、语言、依赖及工作流设置。重点核对本地国际化、RTL、工具链和框架接入的差异，更新来源记录后执行完整检查及八语言页面验证。

Vben 作为框架来源保留自己的标识和许可证，产品名称使用 stuhelper-admin。
