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
      const url = `https://github.com/MiRinChan/nixos-wiki/new/main/entries/${encodedEntryName}?filename=index.md`; window.open(url, "_blank");
    }

  button.addEventListener("click", createEntry);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { createEntry(); } } );
</script>
