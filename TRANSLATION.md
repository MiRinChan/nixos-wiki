# 翻译指南

本文是把 <https://wiki.nixos.org> 内容翻译到本仓库时共同遵守的指南。
`AGENT.TRANSLATION.md` 和 `HUMAN.TRANSLATION.md` 都以本文为准。

## 来源与原则

- 主要源站是 <https://wiki.nixos.org>。
- 译文应忠实反映源文的技术含义，不要把翻译改写成另一篇原创教程。
- 可以补充必要的中文说明，但补充内容应和源文内容区分清楚，不要伪装成源站原文。
- 命令、代码、选项名、包名、属性路径、文件路径、URL、环境变量、配置字面量保持原样。
- 优先使用通用中文技术术语。Nix/Guix 生态已有稳定中文译法时，可以参考 Guix 中文翻译的用词。
- 无须在中英文之间额外加空格，除非原文代码、命令或排版确实需要。
- 未定术语在同一篇文章内必须保持一致，并在 [issue #1](https://github.com/MiRinChan/nixos-wiki/issues/1) 讨论后再改成固定译法。

## 词汇表

状态说明：

- `已定`：本仓库已有明确译法，翻译时应遵守。
- `待定`：暂未确定中文译法。正文中第一次出现时可保留英文或写作 `暂用译法（English term）`，但同一篇文章内要一致。

| English term | 中文译法 | 状态 | 备注 |
| --- | --- | --- | --- |
| `generation` | `代` / `一代` | 已定 | 名词语境，例如系统或 profile 的一代。 |
| `build the new configuration to produce a new generation` | `迭代` | 已定 | 指通过构建新配置产生新 generation 的动作语境。 |
| `flake` | `flake 函数` | 已定 | 命令、文件名和代码里的 `flake` 保持原样。 |
| `channel` | `频道` | 已定 | 指 Nix channel。 |
| `user` | `人` / `你` | 已定 | 按语境翻译，避免和 userspace 的“用户”混淆。明确指系统账户时可另行判断。 |
| `derivation` | 待定 | 待定 | 暂不要自行固定译法。 |
| `closure` | 待定 | 待定 | 暂不要自行固定译法。 |
| `profile` | 待定 | 待定 | 暂不要自行固定译法。 |
| `store path` | 待定 | 待定 | `/nix/store/...` 路径本身保持原样。 |
| `module` | 待定 | 待定 | 特别注意区分 NixOS module 和普通程序模块。 |
| `option` | 待定 | 待定 | NixOS/Home Manager option 名称保持原样。 |
| `Nix expression` | 待定 | 待定 | 暂不要自行固定译法。 |
| `attribute set` | 待定 | 待定 | 暂不要自行固定译法。 |
| `attribute` | 待定 | 待定 | 暂不要自行固定译法。 |
| `package set` | 待定 | 待定 | 暂不要自行固定译法。 |
| `substitution` | 待定 | 待定 | 暂不要自行固定译法。 |
| `substitute` | 待定 | 待定 | 指 binary cache 中取回构建产物时，先保持待定。 |
| `binary cache` | 待定 | 待定 | 暂不要自行固定译法。 |
| `realisation` / `realization` | 待定 | 待定 | 英式/美式拼写都按同一术语处理。 |
| `evaluation` | 待定 | 待定 | 暂不要自行固定译法。 |
| `overlay` | 待定 | 待定 | 暂不要自行固定译法。 |
| `override` | 待定 | 待定 | 暂不要自行固定译法。 |
| `rollback` | 待定 | 待定 | 暂不要自行固定译法。 |
| `garbage collection` | 待定 | 待定 | 暂不要自行固定译法。 |
| `specialisation` / `specialization` | 待定 | 待定 | 英式/美式拼写都按同一术语处理。 |
| `userspace` | 待定 | 待定 | 用来和 `user` 区分，暂不要自行固定译法。 |

## 格式与内容

- 源站是 MediaWiki，落到本仓库时应转换成仓库支持的 Markdown、HTML 和模板写法。
- 不支持的 MediaWiki 模板不要原样硬塞；改写成等价 Markdown/HTML，或用本仓库 `template/` 中已有模板替代。
- 代码块、行内代码、命令输出和配置片段不做意译。必要说明写在代码块外。
- 源站内部链接可以改成仓库内链接，例如 `[贡献者指南](站务/贡献者指南)`。目标页还不存在或不确定时，保留完整上游 URL。
- 图片、视频等资源放在对应词条目录内。会发布的资源类型以贡献者指南为准。
- 分类使用本仓库支持的 `[[Category:Name]]` 语法。分类名是否翻译，应和已有分类保持一致。
- GFM alert、脚注、Mermaid、文件名代码块等写法应符合 `CLAUDE.md` 记录的构建器能力。

## 翻译检查清单

- 词汇表中的 `已定` 术语已经按本文处理。
- `待定` 术语在同一篇文章内保持一致，没有被擅自定译。
- 命令、代码、选项名、包名、路径、URL、环境变量没有被翻译坏。
- 链接、图片、模板、脚注、分类在本仓库语法下可用。
- 译文没有新增未经核实的技术事实。
- PR 描述包含 `这是我的翻译`。

