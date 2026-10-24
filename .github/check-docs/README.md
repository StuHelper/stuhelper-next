# 文档检查

检查器使用锁文件固定的 Markdown、YAML 和标题解析工具。Markdownlint 与链接检查共享 `.markdownlint-cli2.yaml` 的文件范围，跳过符号链接、依赖与构建输出。

```bash
npm run check:docs
npm run test:docs
```

检查覆盖文档元信息、真实日期、状态、正文占位符、统一术语、本地链接与图片、标题锚点、分类索引和显式 MkDocs 导航。文档站链接使用 MkDocs 标题规则，同仓库 GitHub develop 链接映射回本地文件并按 GitHub 标题规则检查。

主题文档使用真实更新日期，模板可以保留占位日期。格式入口调用 Markdownlint library，并按配置应用文件覆盖。依赖版本与完整性由 `package-lock.json` 维护。

外部站点可用性、HTML 链接、代码示例执行结果和技术结论由对应任务核验。检查器回归覆盖术语漂移、坏链接、重复标题、模板例外、目录越界和导航遗漏。完整入口见[检查指南](../../docs/guide/repository-checks.md)。
