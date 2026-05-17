# 新建站点指南

这个仓库可以作为静态 Markdown wiki 生成器复用。新站点需要做两件事：替换内容文件，设置站点参数。

## 快速开始

安装依赖：

```sh
npm ci
```

初始化一个新站点的首页和首个词条：

```sh
npm run init-site -- --title "Example Wiki" --origin "https://wiki.example.com" --entry "Getting Started"
```

脚本默认不会覆盖已有文件。需要重写脚手架文件时显式加 `--force`：

```sh
npm run init-site -- --title "Example Wiki" --origin "https://wiki.example.com" --entry "Getting Started" --force
```

本地构建：

```sh
npm run build
```

本地开发预览：

```sh
npm run dev
```

使用 Nix 开发环境时：

```sh
nix develop --command bash -c 'npm run build'
```

## 站点参数

构建器默认保留本仓库当前站点的参数。新站点应该通过环境变量或 GitHub Repository Variables 覆盖这些值。

最小配置：

```sh
WIKI_SITE_TITLE="Example Wiki"
WIKI_SITE_ORIGIN="https://wiki.example.com"
WIKI_HTML_LANG="en"
WIKI_ENTRY_URL_PREFIX="wiki"
WIKI_EDIT_URL_TEMPLATE="https://github.com/OWNER/REPO/edit/main/{encodedPath}"
WIKI_EDIT_LINK_LABEL="Edit this page"
WIKI_FAVICON_PATH=""
WIKI_CNAME=""
```

GitHub CLI 设置示例：

```sh
gh variable set WIKI_SITE_TITLE --body "Example Wiki"
gh variable set WIKI_SITE_ORIGIN --body "https://wiki.example.com"
gh variable set WIKI_HTML_LANG --body "en"
gh variable set WIKI_ENTRY_URL_PREFIX --body "wiki"
gh variable set WIKI_EDIT_URL_TEMPLATE --body "https://github.com/OWNER/REPO/edit/main/{encodedPath}"
gh variable set WIKI_EDIT_LINK_LABEL --body "Edit this page"
gh variable set WIKI_FAVICON_PATH --body ""
gh variable set WIKI_CNAME --body ""
```

如果发布分支不是默认的 `pages`：

```sh
gh variable set WIKI_PUBLISH_BRANCH --body "pages"
```

## 需要手动修改的文件和目录

| 路径 | 要做什么 | 对应脚本或命令 |
| --- | --- | --- |
| `index.md` | 改成新站首页内容。需要词条列表时保留 `{{entries}}`。 | `npm run init-site -- --title "Example Wiki" --origin "https://wiki.example.com" --force` |
| `entries/` | 删除示例词条，添加新站词条。每个词条目录用 `index.md` 作为页面入口。 | `mkdir -p entries/Example && $EDITOR entries/Example/index.md` |
| `entries/**/FOLD` | 需要首页折叠某个词条树时创建空文件。 | `touch entries/Example/FOLD` |
| `entries/**/HIDE` | 需要从词条列表隐藏某个词条树时创建空文件。 | `touch entries/Example/HIDE` |
| `template/` | 放可复用 Markdown 模板，例如 `template/Notice.md`，页面中用 `{{Notice}}` 调用。 | `mkdir -p template && $EDITOR template/Notice.md` |
| 根目录图片/视频等静态资源 | 替换站点 logo、favicon、共享图片等资源。构建时会复制常见静态扩展名。 | `cp path/to/favicon.png ./favicon.png` |
| `styles-base.css` | 修改站点基础样式。 | `$EDITOR styles-base.css` |
| `styles-code-light.css` / `styles-code-dark.css` | 修改代码高亮样式。 | `$EDITOR styles-code-light.css styles-code-dark.css` |
| `toc.js` | 修改目录交互行为或目录按钮默认文案。 | `$EDITOR toc.js` |
| `README.md` | 改成新仓库的项目说明。 | `$EDITOR README.md` |
| `LICENSE-for-content` | 内容许可证变化时修改。 | `$EDITOR LICENSE-for-content` |
| `LICENSE-for-code` | 代码许可证变化时修改。 | `$EDITOR LICENSE-for-code` |
| `package.json` / `package-lock.json` | 需要改包名或 npm 脚本时修改。 | `npm install` 或手动编辑后运行 `npm install --package-lock-only` |
| `flake.nix` / `flake.lock` | 需要改 Nix shell 描述或依赖时修改。 | `$EDITOR flake.nix && nix flake update` |
| `.github/workflows/pages.yml` | 需要改 Pages 发布流程时修改。站点参数优先用 GitHub Variables。 | `$EDITOR .github/workflows/pages.yml` |
| `.github/workflows/pr-build.yml` | 需要改 PR 构建检查时修改。 | `$EDITOR .github/workflows/pr-build.yml` |

不要手写根目录 `CNAME`。自定义域名通过 `WIKI_CNAME` 设置，构建器会生成 `out/CNAME`。

## 常用脚本

创建或补齐新站点初始内容：

```sh
npm run init-site -- --title "Example Wiki" --origin "https://wiki.example.com" --entry "Getting Started"
```

构建输出：

```sh
npm run build
```

开发预览：

```sh
npm run dev
```

## 升级程序但保留词条

新站点后续可以从上游更新静态生成器程序，同时保留自己的内容。升级脚本只同步固定的程序文件 allowlist，不会写入：

- `entries/`
- `index.md`
- `template/`
- `README.md`
- `LICENSE-for-content`
- 根目录图片、视频等静态资源

先添加上游仓库并获取更新：

```sh
git remote add upstream https://github.com/OWNER/REPO.git
git fetch upstream
```

查看升级会修改哪些程序文件：

```sh
npm run upgrade-program -- --from upstream/main
```

确认后应用：

```sh
npm run upgrade-program -- --from upstream/main --apply
```

也可以从本地目录升级：

```sh
npm run upgrade-program -- --from ../nixos-wiki --apply
```

查看脚本会同步哪些程序文件、哪些路径会保留：

```sh
npm run upgrade-program -- --list
```

清空输出后重建：

```sh
rm -rf out
npm run build
```

检查当前站点默认输出是否仍能构建：

```sh
npm run build
test -f out/index.html
```
