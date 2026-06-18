# 人类翻译指南

这篇文档是专门写给想帮忙翻译 <https://wiki.nixos.org> 的朋友们的。**动手之前一定要先读读** [TRANSLATION.md](TRANSLATION.md)。

### 如何开始翻译

1. 选好你要翻译的页面，把它的原始 URL 记下来。
2. 先去 [TRANSLATION.md](TRANSLATION.md) 查查词汇表，看看哪些词已经有大家约定好的固定译法。
3. 新建一个词条就放在 `entries/<词条名>/index.md` 这个路径。
4. 如果是子页面，就放在 `entries/<父词条>/<子词条>/index.md`。
5. 图片、视频或者其他资源文件，都放在对应词条的文件夹里就行。

### 写正文的时候要注意

- 标题和主要内容要翻译成**自然流畅的中文**。
- 但**命令、代码、配置、路径、URL、选项名、包名、属性路径**这些东西请**保持英文原样**，不要翻译。
- 把原来的 MediaWiki 语法改成我们这里支持的 Markdown、HTML 或模板格式。
- 碰到不确定的术语，不要翻译。第一次出现时可以写成 `暂用译法（English term）`，后面在同一篇文章里保持统一就好了。
- 如果你觉得某个词值得大家一起定个固定译法，可以去 [issue #1](https://github.com/MiRinChan/nixos-wiki/issues/1) 提出来讨论。在定下来之前，词汇表里就先标 `待定`。
- 原文里有些内容明显过时，或者不太适合中文读者，你可以在旁边加点补充说明，但要让读者看出来这是你加的，不是原文内容。
- 中文和英文之间不用特意加空格，正常写就行。

### 本地预览效果

```sh
deno task build
 # 或者 nix develop --command bash -c 'deno task build'
```

编译测试：

```sh
nix develop --command bash -c 'deno task test'
```

### 提交之前

- 确定按照 [TRANSLATION.md](TRANSLATION.md)。
- 所有命令、代码、路径、URL 等关键内容都是原样复制的。
- 站内链接、外部链接、图片、脚注、分类、模板都能编译。
- 资源文件放在对应词条目录了吗。
- 本地构建跑过了。
- PR 描述的最后记得加上 **这是我的翻译** 这句话。
