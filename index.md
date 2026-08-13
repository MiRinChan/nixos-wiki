<style>
  .autoInject {
    display: none !important;
  }
</style>

<img
  src="photo_2026-05-14_19-41-31.jpg"
  alt="NixOS Logo"
  align='right'
  width="100px"
/>

# <sup style="font-size: small;">米凛的</sup>NixOS中文维基

[NixOS](https://wikipedia.org/wiki/NixOS)一个基于[Nix包管理器](https://wikipedia.org/wiki/Nix_(package_manager))的[GNU/Linux](https://wikipedia.org/wiki/GNU/Linux)发行版，具有独特的包管理和系统配置方式。

## 词条

你可以用`Control + F`来快速的搜索。

{{entries}}

没有你想要的词条？何不动手新建：{{AddEntry}}

---

## 子站点

### [Is it built on Hydra yet?](https://yet.nixoscn.org/) - `yet.nixoscn.org`

这个网站提供NixOS Hydra上的`nixos-unstable`和`nixpkgs-unstable`的编译进度，可以让你方便的决定什么时候可以更新你的实例。网站没有 JavaScript，便利特殊人士使用。

#### 使用技巧

```bash
# 返回最新且编译完毕的 commit hash
echo "$(curl -s https://yet.nixoscn.org/l)"
# output: `867dcbc30bafe3c862ef88620f2e7a109d7d3be5`
```

---

你是一个了不起的人物！

> 注意：[`nixos-cn.org`](https://nixos-cn.org) 为另一个网站。本站点独立于NixOS基金会以及NixOS中文运行。本站旨在提供方便NixOS用户的内容。

{{BadgeWithShare}}
