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

# 米凛的 NixOS 中文维基

欢迎你来到我的维基看！

NixOS一个基于Nix包管理器的Linux发行版，具有独特的包管理和系统配置方式。

你可以用`Control + F`来快速的搜索。

## 词条

{{entries}}

> 警告：这不是`nixos-cn`组织的网页，他们的网站是[`nixos-cn.org`](https://nixos-cn.org)，望知悉。

---

[<img alt="NixOS Unofficial Zh Wiki" src="https://nixoscn.org/NixOS Unofficial Chinese Wiki Badge.png">](https://nixoscn.org)

```markdown
分享给别人
[<img alt="NixOS Unofficial Zh Wiki" src="https://nixoscn.org/NixOS Unofficial Chinese Wiki Badge.png">](https://nixoscn.org)
```

<input id="newEntryInput" placeholder="词条名字"></input>
<button id="newEntryCreate">在 GitHub 新建词条</button>

注意：GitHub 不设草稿箱，请务必在其他地方写好。并阅读[站务/贡献者指南](站务/贡献者指南)

<script>
  const input = document.getElementById("newEntryInput");
  const button = document.getElementById("newEntryCreate");

  function createEntry() {
    const entryName = input.value.trim();
    if (!entryName) { return; }
      const encodedEntryName = encodeURIComponent(entryName);
      const url = `https://github.com/MiRinChan/nixos-wiki/new/main/entries/${encodedEntryName}?filename=README.md`; window.open(url, "_blank");
    }

  button.addEventListener("click", createEntry);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { createEntry(); } } );
</script>
