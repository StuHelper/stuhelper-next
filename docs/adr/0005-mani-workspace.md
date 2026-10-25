---
type: adr
status: Accepted
updated: 2026-10-25
---

# 0005：使用 Mani 管理开发工作区

## 背景与决定因素

StuHelper 的模块分别维护代码、接口、版本和 GitHub PR。当前需要统一检出、查看状态和执行仓库自身的检查。生产组合由私有 ops 仓库固定版本，不要求所有模块绑定为同一个源码发行版本。

## 决策与确认依据

使用主机安装的 Mani 统一检出和任务，各仓库独立维护，ops 固定部署组合。仓库保留独立构建和检查入口。

单份 mani.yaml 登记 platform、Web、stuhelper-admin、SSO、认证、学校适配、账务和 ops。公私仓划分决定代码与文档的可见性，GitHub 管理仓库访问权限。

## 备选与取舍

Google Repo 提供完整的 revision manifest 和同步流程，适合需要统一维护整套源码版本的项目。West 也能维护多仓库清单，但其 Python 实现和 YAML 配置不足以构成本项目的决定性优势。

Mani 更贴近当前日常操作，但 `mani sync` 主要克隆缺失仓库，不负责把已有工作树切换到声明版本。源码更新显式使用 Git。发布组合和兼容验证需要继续由依赖文件、接口测试与 ops 版本记录负责。

## 后果与验证

配置保留现有 remotes、工作树和 gitignore。开发者直接运行 Mani 命令，CI 在临时工具目录安装明确版本。

`mani sync` 初始化工作区。`fetch` 任务只更新远端引用，保留当前分支与文件。候选源码组合、契约来源、独立构建和端到端检查共同验证工作区，操作见[开发工作区](../guide/development-workspace.md)。

## 关联

- [模块仓库边界](../design/module-repositories.md)
- [框架实现设计](../design/framework-runtime.md)
- [Mani 官方配置](https://manicli.com/config/)
- [Mani v0.32.1](https://github.com/alajmo/mani/releases/tag/v0.32.1)
