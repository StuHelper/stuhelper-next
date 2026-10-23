# 文档检查

本项目按指定模板的文档规则实现检查器，使用 `package-lock.json` 中固定的 Markdown/YAML 解析器和 GitHub 标题 slugger；不导入上游示例或 vendor 代码。

```bash
npm ci
npm run check:docs
npm run test:docs
```

markdownlint 与检查器共享 `.markdownlint-cli2.yaml` 的 globs/ignores。检查器不遍历符号链接，排除依赖/构建目录，检查 `docs/` 元信息、真实日期、生命周期状态、正文占位符、本地 Markdown 链接/图片及标题锚点。分类直属文件 type 与目录一致，总入口/authoring 为 index；模板可保留占位日期与提示。

格式入口直接调用固定 markdownlint library，支持根配置的规则及 `combine: merge` 文件覆盖；不安装 CLI2 的 glob 依赖链。picomatch 固定 4.0.7，间接 KaTeX 固定修复版 0.18.2，原因与审计结果见[工作记录](../../docs/development/documentation-bootstrap.md)。

本地相对路径须留在仓库内，引用式链接和重复/中文标题使用 Markdown 解析器与 GitHub slugger。外部 URL、HTML 链接、代码示例可执行性及技术结论不在检查范围；MkDocs 严格构建另外验证站点导航与链接。

修改检查器或依赖后执行回归测试，覆盖元信息、移动后的坏链接、锚点、模板例外与越界路径。完整流程见[操作指南](../../docs/guide/repository-checks.md)。
