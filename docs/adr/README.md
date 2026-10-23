---
type: adr
status: Accepted
updated: 2026-10-23
---

# 决策记录

只记录需要独立追溯的重要取舍。编号递增且不复用，后续替代需双向链接。

| 决策 | 状态 | 范围 |
| --- | --- | --- |
| [0001：使用官方 Casdoor 镜像](0001-official-casdoor-image.md) | Accepted | 身份服务制品与运维边界 |
| [0002：按任务选择 runner](0002-runner-placement.md) | Accepted | 普通检查用托管 runner，镜像任务用自建 runner |
| [0003：采用五类文档架构](0003-documentation-architecture.md) | Accepted | 分类、导航、状态、模板与检查方式 |

新增主题使用[决策模板](TEMPLATE.md)，遵循[维护约定](../authoring.md)。

- [ADR-0004：按模块采用多仓库](0004-modular-multi-repository.md)
