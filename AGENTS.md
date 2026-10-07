# 仓库说明

这是NixOS中文维基，使用Deno将Markdown构建为静态站点。

## 目录

- `entries/`：词条，每篇使用`index.md`，附件放在对应词条目录。
- `categories/`：分类页面。`template/`：可复用的Markdown模板。
- `scripts/`：构建与开发服务。`test/`：测试及输出基线。
- `template.html`、`styles-*.css`和根目录JavaScript文件：页面布局、样式与交互。
- `out/`：构建产物，不直接修改或提交。

## 常用命令

通过Nix开发环境运行：

```sh
nix develop --command bash -c 'deno task dev'
nix develop --command bash -c 'deno task build'
nix develop --command bash -c 'deno task lint && deno task test'
```

## 修改约定

- 开始前检查`git status`，保留无关改动。
- 翻译前阅读`TRANSLATION.md`和`AGENT.TRANSLATION.md`。站点配置参考`WIKI-SETUP.md`。
- 查询Nix相关事实时优先使用`mcp-nixos`，保留命令、配置、路径和标识符原文。
- 中文文档沿用现有写法，尽量不在中文与英文字母或数字之间加空格。
- 内容修改后运行构建；程序修改后运行lint和test。
- 测试会比较`out/`与`test/golden.manifest.json`。仅在确认输出变化符合预期后，用`test/update-golden.mjs`更新基线，并说明原因。
