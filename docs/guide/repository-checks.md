---
type: guide
status: Accepted
updated: 2026-10-24
---

# 仓库检查与文档预览

## 适用范围与前置条件

适用于本仓库文档与工程检查，需 Git、Node.js 24、npm、Python 3.11+ 和 uv 0.12.18。Linux x86_64 还可运行固定 actionlint 下载器；下载需要访问 GitHub Releases。首次安装依赖需访问公开 npm/PyPI 源。

Node 工具由 `package-lock.json` 固定，MkDocs 工具由 `uv.lock` 固定。本指南不执行 Docker build，不访问 BJ1 Registry，不使用生产凭据。

## 操作步骤

在仓库根目录安装并检查：

```bash
npm ci
python3 scripts/check.py
npm run check:docs
npm run test:docs
python3 scripts/lint_workflows.py
uv run --locked mkdocs build --strict
```

`check:docs` 包含 Markdown 格式、元信息、本地链接、标题锚点和占位符检查；`test:docs` 验证检查器的重要错误处理。文档变更后重跑相关检查，检查器或依赖更新后执行回归测试。实际结果见[工作记录](../development/documentation-bootstrap.md)。

本地预览：

```bash
uv run --locked mkdocs serve --dev-addr 127.0.0.1:8000
```

打开终端给出的本地地址。导航按五类目录组织，Mermaid 支持图表与缩放；图表脚本来自配置中固定版本的 jsDelivr 资源，浏览器需要访问该 CDN。修改图表或相关配置后，在浏览器中确认实际显示结果。

## 结果检查

所有检查应以退出码 0 结束。严格构建生成 `site/`，不自动发布网站。检查分类入口能到达各主题、状态与实现范围表达正确，尤其不能把 `Accepted` 写成已部署。

自动检查不验证外部链接可达性、HTML 链接、业务规则正确性或代码块能否执行。技术事实和生产步骤仍要依据具体证据审查。

## 故障与清理

| 症状 | 判断与操作 | 恢复检查 |
| --- | --- | --- |
| 元信息/日期错误 | 按报错路径修正文档分类、状态与实际日期 | 重跑 check:docs |
| 文件或锚点缺失 | 核对移动后的主题、标题和入站引用 | 重跑链接检查和严格构建 |
| lockfile 不一致 | 明确升级范围并重新生成 lockfile，不跳过锁定 | 重新安装后完整检查 |
| 下载失败 | 区分网络和内容校验错误，不关闭 checksum 或换未知来源 | 重跑原失败步骤 |
| 图表未显示 | 查看浏览器 CDN 加载和 Mermaid 语法 | 在预览页核实图表，确认图表实际显示 |

预览使用 Ctrl+C 停止。`site/`、`node_modules/` 和 `.venv/` 是本地构建/依赖目录，已忽略；不删除源码、lockfile、工作树或其他项目的数据。
