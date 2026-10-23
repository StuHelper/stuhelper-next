---
type: guide
status: Accepted
updated: 2026-10-24
---

# 开发工作区

## 准备

需要 Git、Go 1.27.2、Node.js 24、Corepack、uv，以及 GitHub 仓库访问权限。公开框架不需要私有仓库权限。架构与模块仓库的开发工作区统一检出 develop，正式发行组合单独固定版本 tag。

```bash
git clone --branch develop https://github.com/StuHelper/stuhelper-next.git
cd stuhelper-next
make tools
make setup
make workspace
.tools/bin/mani --user-config scripts/mani-user.yaml run setup --all
```

工具安装在本工作区 .tools/bin，不修改全局 Git 或 shell 配置。Mani 的开发清单位于 mani.yaml，项目分别检出到 workspace/platform、workspace/web 和 workspace/admin。

## 日常操作

```bash
.tools/bin/mani --user-config scripts/mani-user.yaml run status --all
.tools/bin/mani --user-config scripts/mani-user.yaml run fetch --all
make workspace-check
```

`sync` 克隆缺失仓库。`fetch` 只获取远端引用，两者均不承担已有分支的版本更新。修改代码前按仓库约定，从最新 origin/develop 创建专用分支和独立 worktree；保留当前任务的未提交内容。不要把批量 checkout、reset 或 rebase 混入常规检查任务。

`make workspace-check` 调用各仓库自己的 make check，再核对接口快照。任何仓库失败都必须修复，不使用 ignore-errors 或 ignore-non-existing 跳过问题。可用 `--tags backend` 或 `--tags frontend` 缩小任务范围。

## 本地启动

在三个终端分别执行：

```bash
cd workspace/platform
make run
```

```bash
cd workspace/web
make dev
```

```bash
cd workspace/admin
make dev
```

API 默认监听 127.0.0.1:8080，Web 为 127.0.0.1:5173，Admin 为 127.0.0.1:5174。浏览器请求通过开发代理访问 API。需要使用其他 API 地址时，为客户端进程设置 STUHELPER_API_TARGET。Admin 的 setup 只在缺失时从 .env.example 生成被 Git 忽略的本地文件，不覆盖已有配置。

框架页面可以打开。管理接口尚未接入真实身份服务，页面会显示相应状态；它不会建立演示管理员会话。使用 Ctrl+C 停止本任务的进程。

## 可选私有检出

```bash
make workspace-private
.tools/bin/mani --user-config scripts/mani-user.yaml --config mani.private.yaml run status --all
```

私有配置目前检出相关文档仓库，不会启动 SSO、认证、学校适配、支付或生产部署，也不连接真实数据源。具体检查按每个私有仓库的 README 执行。

## 接口更新和来源记录

先修改 platform/contracts/platform.openapi.yaml，运行 platform 的 make generate，再更新两个客户端的契约与生成类型快照并重跑工作区检查。Admin 的生成工具独立使用兼容的 TypeScript 5，不改变 Vben 自身的 TypeScript 工具链。

```bash
make contracts-check
python3 scripts/workspace.py snapshot
```

snapshot 只在三个代码仓库均干净时输出源码提交和契约摘要，供本次验收追溯。它不充当部署版本清单。生产仍使用私有 ops 维护的版本 tag 与镜像核验记录。

## 故障处理

检出失败先确认仓库可见性、网络及现有 Git 凭据。已有目录不是目标仓库时，先确认归属，不能覆盖目录。接口快照漂移时重新生成并同步快照，不能改检查器来接受不一致文件。

Admin 基于官方 Vben 的 pnpm workspace。使用 Corepack 读取其 packageManager 指定版本，不用 npm 安装 Admin 的 workspace 依赖。
