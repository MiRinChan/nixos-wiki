本页尝试涵盖在NixOS上使用英伟达显卡相关的内容。

## 启用

### 来自英伟达的内核模块

比起其他选择，来自英伟达的内核模块提供更好的性能，但是它让系统变得不自由，因为提供了专有的用户空间库，使其能与内核模块互动。若你想要完全自由且开源的系统，应当使用Nouveau代替。

要启用他们，添加`"nvidia"`到由`services.xserver.videoDrivers`选项(option)的启用显示驱动列表。

> 注意：自驱动版本 560 开始，你也将要通过选项`hardware.nvidia.open`的布尔值来决定选择开源模块(`true`)还是专有模块(`false`)。
>
> 尽管开源内核模块只支持图灵(Turing)架构以及更新的 GPU（GeForce RTX 20 与 GeForce GTX 16 开始），但开源的比专有的内核模块更受青睐，且计划逐步代替专有的内核模块[^1]。
>
> 即使在使用开放模块时，也要确保允许使用非自由(unfree)软件，因为驱动程序的用户空间部分仍然是专有的。其他非免费的英伟达包有`nvidia-x11`、`nvidia-settings`以及`nvidia-persistenced`。

> **警告**：如果你的笔记本支持混合输出（即有混合核显输出以及独显输出，在 Windows 上称 MSHybird），别忘了配置 PRIME 来让独立显卡和集成显卡正常工作，如果没做的话可能不会正常工作。

```nix configuration.nix
{
  hardware.graphics.enable = true;
  services.xserver.videoDrivers = [ "nvidia" ];
  hardware.nvidia.open = true;  # 见上文“注意”
}
```

#### 传统分支

最新的专有模块不再支持开普勒(Kepler)架构或更早版本的GPU（大多数GeForce 600/700/800M显卡及更早版本）。取而代之的是使用传统分支，只要显卡仍受支持，就能接收更新，可以在英伟达传统驱动支持列表中搜索需要的传统分支。

要用传统分支的驱动，你要把`hardware.nvidia.package`选项对应的包设置为`config.boot.kernelPackages.nvidiaPackages.legacy_<branch>`格式的包。

```nix configuration.nix
{ config, ... }: # ← 用于获取当前配置的内核所使用的软件包（包括驱动程序）
{ 
  # 最后支持开普勒架构的 GPU 的版本
  hardware.nvidia.package = config.boot.kernelPackages.nvidiaPackages.legacy_470;
}
```

[Nixpkgs](https://github.com/NixOS/nixpkgs)并不尽力支持所有传统分支，因为旧或未经维护的传统分支可能会与较新的内核和X服务器版本不兼容，而且在某些情况下，打的补丁不能兼容新的软件。你可以在[Nixpkgs软件源](https://github.com/NixOS/nixpkgs/blob/master/pkgs/os-specific/linux/nvidia-x11/default.nix)中找到受支持的传统分支列表。

#### 测试(beta)/稳定(stable)/生产(production)分支

默认情况下使用稳定分支(stable)的模块，这些模块来自当前架构可用的最新发布版本——而`x86-64`和`aarch64`架构的系统则跟随测试分支(beta)的发布，因为这些系统仍在积极开发中；`x86`和`ARM`架构的系统则保持在生产分支(production)的`390.xx`分支，因为这是最后一个支持32位系统架构的分支。

你也可以选择测试分支(beta)，该分支包含更多新功能和实验性变更，但可能存在更多漏洞；或者选择生产分支(production)，这是一个更加保守、经过充分测试的稳定版本，适合在生产环境中使用。相应的，在新功能上会落后一些。

使用测试分支(beta)和生产分支(production)的方式类似于使用传统分支的方式：

```nix configuration.nix
{ config, ... }:
{ 
  # hardware.nvidia.package = config.boot.kernelPackages.nvidiaPackages.stable; # 默认是这样的
  # hardware.nvidia.package = config.boot.kernelPackages.nvidiaPackages.beta;
  hardware.nvidia.package = config.boot.kernelPackages.nvidiaPackages.production;
}
```

#### [Nouveau](https://zh.wikipedia.org/wiki/nouveau)

Nouveau 是英伟达显卡的免费开源驱动程序，提供所有英伟达显卡的图形加速功能。一般不推荐使用它，因为与 英伟达的官方内核模块相比，其性能明显较差，且对许多英伟达显卡不支持 reclocking（动态调整时钟频率）[^2]。尽管如此，对于希望使用完全免费开源操作系统的人来说，Nouveau 仍然是可行的选择，因为它不包含任何专有组件，这一点与 NVIDIA 的内核模块和用户空间库不同。

当启用图形功能时，Nouveau 默认会被启用，无需额外配置。

```nix configuration.nix
{
  hardware.graphics.enable = true;
}
```

## 配置

### 电源管理

通过配置`hardware.nvidia.powerManagement`的各选项，可以令systemd实验性地管理电源。

#### [`hardware.nvidia.powerManagement.enable`](https://search.nixos.org/options?channel=25.11&query=hardware.nvidia.powerManagement.enable)

令英伟达驱动支持睡眠（挂起至内存）和休眠（挂起至磁盘）的电源管理操作，如x86_64平台上的ACPI S3和S4。[^3]

```nix configuration.nix
{
  # ……
  hardware.nvidia.powerManagement.enable = true;
  # ……
}
```

#### [`hardware.nvidia.powerManagement.finegrained`](https://search.nixos.org/options?channel=25.11&query=hardware.nvidia.powerManagement.finegrained)

实验性功能。令英伟达驱动，在不使用的时候关闭显卡。只支持图灵架构及更现代的英伟达显卡。

```nix configuration.nix
{
  # ……
  hardware.nvidia.powerManagement.finegrained = true;
  # ……
}
```

### PRIME 混合输出

笔记本电脑通常同时配备集成显卡(iGPU)和独立显卡(dGPU)，以便在性能和功耗之间取得平衡——独显用于性能密集型任务，如游戏、视频编辑、三维渲染、计算工作等，而集显则可用于渲染普通二维元素，如应用程序窗口和桌面环境。

因此，PRIME 是一项技术，为了促进两种显卡之间的合作而开发的，且对笔记本电脑的图形性能至关重要。您可以根据自己的需要，配置 PRIME 的工作模式，性能还是节电的权衡之中选择。

#### 常见设置

所有 PRIME 配置都需要设置两个显卡的PCI总线编号（下称 PCI bus ID）。找到它们 ID 的一个简单方法是运行`pciutils`软件包中的`lspci`，然后找到归类为VGA控制器的设备。在仔细检查列出的设备确实是集显和独显后，就可以在每一行的开头找到PCI ID。具体结果可能会有所不同，但输出示例如下：

```shell
    $ nix shell nixpkgs#pciutils -c lspci -D -d ::03xx
    0000:00:02.0 VGA compatible controller: Intel Corporation TigerLake-H GT1 [UHD Graphics] (rev 01)
    0000:01:00.0 VGA compatible controller: NVIDIA Corporation GA106M [GeForce RTX 3060 Mobile / Max-Q] (rev a1)
```

不过，在将它们放入配置之前，必须先重新格式化它们--假设总线地址为`<domain>:<bus>:<device>.<func>`，将所有数字从十六进制转换为十进制，那么格式化后的字符串就是`PCI:<bus>@<domain>:<device>:<func>`。根据显卡制造商的不同，它们可以设置在`hardware.nvidia.prime`选项中的`intelBusId`、`nvidiaBusId`或`amdgpuBusId`下：

```nix configuration.nix
{
  hardware.nvidia.prime = {
    intelBusId = "PCI:0@0:2:0";
    nvidiaBusId = "PCI:1@0:0:0";
    # amdgpuBusId = "PCI:5@0:0:0"; # 如果你有 AMD 集显
  };
}
```

#### 卸载模式(Offload mode)

> 注意：卸载模式自**NixOS 20.09和英伟达驱动程序435.21版**起可用，要求使用图灵一代或更新的英伟达显卡和兼容CPU（Coffee Lake一代或更新的英特尔CPU或AMD Ryzen）。卸载模式与同步模式不兼容。

卸载模式会让独显进入睡眠状态，并让集显处理所有任务，除非您通过将应用程序“卸载”到独显来专门调用它。例如，您可以正常运行笔记本电脑，它会全天使用节能的集显，然后您可以将蒸气平台上的游戏卸载到独显上，让独显专门运行该游戏。对许多用户来说，这是最理想的选择。

要开启卸载模式，将`hardware.nvidia.prime.offload.enable`选项设置为`true`：

```nix configuration.nix
{
  # 对于卸载操作, 还需要用`modesetting`
  # 否则X服务器将始终在英伟达显卡上运行，
  # 从而让 GPU 始终处于开启状态 (参见 `nvidia-smi`)。
  services.xserver.videoDrivers = [
    "modesetting"  # 这是英特尔集显的例子；如果您的集成显卡是 AMD，则此处应使用“amdgpu”代替。
    "nvidia"
  ];

  hardware.nvidia.prime = {
    offload.enable = true;
    
    intelBusId = "PCI:0@0:2:0";
    nvidiaBusId = "PCI:1@0:0:0";
    # amdgpuBusId = "PCI:5@0:0:0"; # 如果你有 AMD 集显
  };
}
```

当您想在独显上运行程序时，只需设置几个环境变量，驱动程序即可识别出应使用卸载模式。如果`hardware.nvidia.prime.offload.enableOffloadCmd`设置为`true`，NixOS将生成一个名为`nvidia-offload`的包装脚本，该脚本会自动为您设置正确的变量：

```sh nvidia-offload
export __NV_PRIME_RENDER_OFFLOAD=1
export __NV_PRIME_RENDER_OFFLOAD_PROVIDER=NVIDIA-G0
export __GLX_VENDOR_LIBRARY_NAME=nvidia
export __VK_LAYER_NV_optimus=NVIDIA_only
exec "$@"
```

如果一切配置正确，那么运行像`glxgears`这样的程序应该使用 集显，而运行`nvidia-offload glxgears`则应该只使用独显。

#### 同步模式(Sync mode)

> 注意：同步模式自NixOS 19.03和NVIDIA驱动程序版本390.67起可用，但与卸载模式和反向同步模式(reverse sync modes)均不兼容。同步模式还要求使用支持`services.xserver.displayManager.setupCommands`选项的桌面管理器，例如LightDM、GDM和SDDM。

在同步模式下，渲染完全交给独显工作，而集显仅显示从独显复制的渲染帧缓冲区。同步模式可提供更佳的性能并大幅减少画面撕裂，但代价是更高的功耗，因为独立显卡在不需要时不会像在卸载模式下那样进入休眠状态。同步模式还可以解决将显示器以合盖模式直接连接到显卡时出现的一些问题。

要开启同步模式，将`hardware.nvidia.prime.sync.enable`选项设置为`true`：

```nix configuration.nix
{
  hardware.nvidia.prime = {
    sync.enable = true;
    
    intelBusId = "PCI:0@0:2:0";
    nvidiaBusId = "PCI:1@0:0:0";
    # amdgpuBusId = "PCI:5@0:0:0"; # 如果你有 AMD 集显
  };
}
```

#### 反向同步模式(reverse sync modes)

> 注意：注意：反向同步模式自 NixOS 23.05 和 NVIDIA 驱动程序版本 460.39 起可用，但仍处于实验阶段，存在一些缺陷[^4]。实际效果可能因系统而异。反向同步模式与同步模式不兼容，要求使用支持`services.xserver.displayManager.setupCommands`选项的桌面管理器，例如LightDM、GDM和SDDM。

常规同步模式和反向同步模式的区别在于，独显配置为主要输出设备，允许向连接到它的外部显示器显示图像，而不是向集显（更常见）显示图像。

要开启反向同步模式，将`hardware.nvidia.prime.reverseSync.enable`选项设置为`true`：

```nix configuration.nix
{
  hardware.nvidia.prime = {
    reverseSync.enable = true;
    
    intelBusId = "PCI:0@0:2:0";
    nvidiaBusId = "PCI:1@0:0:0";
    # amdgpuBusId = "PCI:5@0:0:0"; # 如果你有 AMD 集显
  };
}
```

### Wayland

#### 要求

Wayland需要启用内核模式设置(kernel mode setting)：

```nix configuration.nix
{
  hardware.nvidia.modesetting.enable = true;
}
```

#### 支持的混成器

- GNOME（Wayland）
在最新的驱动程序上完全支持（建议使用 ≥ 535，强烈建议使用 ≥ 555）。

- KDE Plasma（Wayland）
自Plasma 6起，配合最新的英伟达驱动程序即可使用，但可能仍存在一些问题。

- Hyprland
通常可与最新的英伟达驱动程序配合使用，但官方并未保证完全支持。驱动程序或合成器更新后可能会出现回归问题。

#### PRIME 和 Wayland

- PRIME的**同步**和**反向同步**模式**仅适用于 X11**，在 Wayland 下无法工作。
- PRIME的**卸载功能**在Wayland下可以工作，但应用程序卸载的行为可能因合成器而异。

#### 显式同步(Explicit Sync, typo as "Explict Sync" in wiki[.]nixos[.]org)

驱动版本 555 及更高版本引入了显式同步支持，显著改善了 Wayland 下的帧速率，并减少了闪烁和卡顿现象。为了获得最佳的 Wayland 体验，强烈建议使用最新的 NVIDIA 驱动程序。

## 技巧与窍门

{{translateByMachine}}

### 查看nixos-hardware

[nixos-hardware](https://github.com/NixOS/nixos-hardware)项目旨在提供针对不同设备特定硬件问题的配置。也许已经有人为你的设备编写了硬件配置，这通常可以帮你处理好驱动问题。如果是这样，请按照上游文档启用所需的模块。

### 多启动配置

想象一下，你有一台笔记本电脑，大多数时候以合盖模式使用（接驳、连接外部显示器并接通电源），但有时也会在外出时使用。

在合盖模式下，使用 PRIME 同步可能会带来更好的性能、外部显示器支持等，但代价是可能会（但不总是）降低电池续航。然而，在外出使用笔记本电脑时，你可能更倾向于使用卸载模式。

NixOS 支持"特化(specialisations)"功能，允许你在重建系统时自动生成不同的启动配置文件。例如，我们可以默认启用 PRIME 同步，但也创建一个"on-the-go"特化，禁用 PRIME 同步并启用卸载模式：

```nix configuration.nix
{
  specialisation.on-the-go.configuration = {
    system.nixos.tags = [ "on-the-go" ];
    hardware.nvidia.prime = {
      offload = {
        enable = lib.mkForce true;
        enableOffloadCmd = lib.mkForce true;
      };
      sync.enable = lib.mkForce false;    
    };
  };
}
```

（你也可以在这里添加其他与 NVIDIA 完全无关的设置，比如电源配置方案等。）

重建并重启后，你会在启动菜单中每个 Generation 下看到一个"on-the-go"选项，允许你以该 Generation 的 on-the-go 特化模式启动。

另请参阅 [nixos-hardware](https://github.com/NixOS/nixos-hardware/blob/master/common/gpu/nvidia/prime.nix) 中类似思路的实现。

### 在非NixOS系统上使用GPU

如果你在非NixOS系统上使用Nix打包的软件，你需要一种变通方法来让一切正常运行。[nixGL](https://github.com/guibou/nixGL) 项目提供了在非NixOS系统上使用GL驱动的包装器。你需要在你的发行版上安装 GPU 驱动（用于内核模块）。安装了nixGL后，运行`nixGL foobar`来代替`foobar`。

注意，nixGL并非英伟达显卡专用，它应该适用于几乎任何GPU。

### CUDA与使用GPU进行计算

参见[CUDA](https://wiki.nixos.org/wiki/CUDA)维基页面。

### 多进程服务(MPS)

[NVIDIA多进程服务(MPS)](https://docs.nvidia.com/deploy/mps/index.html) 允许多个CUDA进程共享同一个GPU上下文。NixOS没有为MPS提供专用模块，因此需要自定义systemd服务：

```nix configuration.nix
{ config, pkgs, ... }:
{
  systemd.services.nvidia-mps = {
    description = "NVIDIA CUDA Multi-Process Service";
    after = [ "nvidia-persistenced.service" ];
    requires = [ "nvidia-persistenced.service" ];
    wantedBy = [ "multi-user.target" ];
    path = [ config.hardware.nvidia.package.bin ];
    serviceConfig = {
      Type = "forking";
      ExecStart = "${config.hardware.nvidia.package.bin}/bin/nvidia-cuda-mps-control -d";
      ExecStop = "${pkgs.writeShellScript "nvidia-mps-stop" ''
        echo quit | ${config.hardware.nvidia.package.bin}/bin/nvidia-cuda-mps-control
      ''}";
      Restart = "on-failure";
      RestartSec = 5;
    };
  };
}
```

> **警告**：`path`选项是必需的。MPS控制守护进程使用`execlp`来启动`nvidia-cuda-mps-server`，该程序必须位于服务的`PATH`中。如果没有它，守护进程看似正常启动，但会静默地无法启动服务器进程。CUDA客户端将收到 Error 805 (`cudaErrorMpsConnectionFailed`)。

要从[Docker](https://wiki.nixos.org/wiki/Docker)容器中使用MPS，必须挂载MPS管道目录并共享主机IPC命名空间：

```yaml
services:
  gpu-worker:
    ipc: host
    volumes:
      - /tmp/nvidia-mps:/tmp/nvidia-mps
    environment:
      CUDA_MPS_PIPE_DIRECTORY: /tmp/nvidia-mps
```

### 运行特定版本的英伟达驱动

要在NixOS中运行特定版本的英伟达驱动，你可以通过指定所需的版本及对应的SHA256哈希值来自定义配置。以下是使用英伟达驱动版本`555.58.02`的配置示例：

```nix configuration.nix
{ config, ... }:
{
  hardware.nvidia.package = config.boot.kernelPackages.nvidiaPackages.mkDriver {
    version = "555.58.02";
    sha256_64bit = "sha256-xctt4TPRlOJ6r5S54h5W6PT6/3Zy2R4ASNFPu8TSHKM=";
    sha256_aarch64 = "sha256-xctt4TPRlOJ6r5S54h5W6PT6/3Zy2R4ASNFPu8TSHKM=";
    openSha256 = "sha256-ZpuVZybW6CFN/gz9rx+UJvQ715FZnAOYfHn5jt5Z2C8=";
    settingsSha256 = "sha256-ZpuVZybW6CFN/gz9rx+UJvQ715FZnAOYfHn5jt5Z2C8=";
    persistencedSha256 = lib.fakeSha256;
  };
};
```

在此配置中：

- 将 `version` 替换为所需的驱动版本。
- 更新 SHA256 哈希值以匹配你想要使用的新版本。
- 更新配置后，运行 `sudo nixos-rebuild switch` 以应用更改并加载指定的驱动版本。

这样可以固定 NixOS 安装中使用的具体驱动版本。如果你正在运行最新的内核，可能需要这样做，因为打包的驱动可能无法正常构建[^5]。

## 疑难解答

### 启动进入文本模式

如果你遇到了启动进入文本模式的问题，可以尝试手动添加英伟达内核模块：

```nix
boot.initrd.kernelModules = [ "nvidia" ];
boot.extraModulePackages = [ config.boot.kernelPackages.nvidia_x11 ];
```

### 画面撕裂问题

首先，尝试切换到 PRIME 同步模式，如上所述。如果不起作用，尝试强制合成管道(composition pipeline)。

> 注意：强制全合成管道已被报告会降低某些OpenGL应用的性能，并可能在WebGL中引发问题。它还会显著增加驱动在负载后降频所需的时间。

```nix configuration.nix
hardware.nvidia.forceFullCompositionPipeline = true;
```

### Picom 闪烁问题

```conf ~/.config/picom/picom.conf
unredir-if-possible = false;
backend = "xrender"; # 如果 xrender 无效，尝试 "glx"
vsync = true;
```

### 挂起/恢复时的图形损坏和系统崩溃

`powerManagement.enable = true` 有时可以解决这个问题，但其本身不稳定，且已知会导致挂起问题。

`hardware.nvidia.powerManagement.enable = true` 有时也可以解决这个问题；其默认值为 `false`。

> 注意：当启用`hardware.nvidia.powerManagement.enable`选项时，驱动默认将视频内存保存到`/tmp`。如果`/tmp`由tmpfs（内存）支持，且GPU VRAM使用量超出可用空间，系统将无法恢复，你会看到黑屏。
>
> 要解决此问题，请使用内核参数将临时文件重定向到具有足够容量的存储位置（例如 `/var/tmp`）：
>
> ```nix configuration.nix
> boot.kernelParams = [ "nvidia.NVreg_TemporaryFilePath=/var/tmp" ];
> ```

如果你有现代英伟达显卡（图灵架构或更新），你可能还想了解 `hardware.nvidia.powerManagement.finegrained` 选项：[动态电源管理](https://download.nvidia.com/XFree86/Linux-x86_64/460.73.01/README/dynamicpowermanagement.html)

[一个潜在的修复方案](https://discourse.nixos.org/t/suspend-resume-cycling-on-system-resume/32322/12) 是及时中断 gnome-shell，使其在休眠时不再尝试访问图形硬件[^6]。其全部目的是在系统休眠前手动"暂停"GNOME Shell 进程，并在系统唤醒后"取消暂停"它。

---

如果你在从挂起唤醒后出现图形损坏，并且上述设置导致系统在唤醒后约 20-30 秒重新进入休眠状态，以下方法可能同时解决这两个问题：

```nix configuration.nix
{
  # https://discourse.nixos.org/t/black-screen-after-suspend-hibernate-with-nvidia/54341/6
  # https://discourse.nixos.org/t/suspend-problem/54033/28
  systemd = {
    # 不确定是否还需要此项。
    services.systemd-suspend.environment.SYSTEMD_SLEEP_FREEZE_USER_SESSIONS = "false";

    services."gnome-suspend" = {
      description = "suspend gnome shell"; # 暂停 gnome shell
      before = [
        "systemd-suspend.service"
        "systemd-hibernate.service"
        "nvidia-suspend.service"
        "nvidia-hibernate.service"
      ];
      wantedBy = [
        "systemd-suspend.service"
        "systemd-hibernate.service"
      ];
      serviceConfig = {
        Type = "oneshot";
        ExecStart = ''${pkgs.procps}/bin/pkill -f -STOP ${pkgs.gnome-shell}/bin/gnome-shell'';
      };
    };
    services."gnome-resume" = {
      description = "resume gnome shell"; # 恢复 gnome shell
      after = [
        "systemd-suspend.service"
        "systemd-hibernate.service"
        "nvidia-resume.service"
      ];
      wantedBy = [
        "systemd-suspend.service"
        "systemd-hibernate.service"
      ];
      serviceConfig = {
        Type = "oneshot";
        ExecStart = ''${pkgs.procps}/bin/pkill -f -CONT ${pkgs.gnome-shell}/bin/gnome-shell'';
      };
    };
  };

  # https://discourse.nixos.org/t/black-screen-after-suspend-hibernate-with-nvidia/54341/23
  hardware.nvidia.powerManagement.enable = true;
}
```

### 笔记本电脑上黑屏或"什么都不管用"

英特尔的内核模块`i915`或AMD的`amdgpu`可能会与英伟达驱动发生冲突。这可能导致切换到虚拟终端或退出X会话时出现黑屏。一种可能的解决方法是禁用集显，将模块加入黑名单，使用以下配置选项（另请参见[相关讨论](https://discourse.nixos.org/t/nvidia-gpu-and-i915-kernel-module/21307/3)）：

```nix
# 英特尔
boot.kernelParams = [ "module_blacklist=i915" ];
# AMD
boot.kernelParams = [ "module_blacklist=amdgpu" ];
```

### NVIDIA Docker容器

参见：[Docker#NVIDIA Docker容器](https://wiki.nixos.org/wiki/Docker#NVIDIA_Docker_Containers)

## 禁用

### 来自英伟达的内核模块 <a id="禁用-英伟达内核模块"></a>

通常情况下，可以通过从`services.xserver.videoDrivers`中移除`"nvidia"`来完全禁用 NVIDIA 的内核模块。如果此方法无效，您还可以手动将相应的内核模块列入黑名单：

```nix
{ 
  boot.blacklistedKernelModules = [
    "nvidia"
    "nvidiafb"
    "nvidia-drm"
    "nvidia-uvm"
    "nvidia-modeset"
  ];
}
```

### [Nouveau](https://zh.wikipedia.org/wiki/nouveau) <a id="禁用-nouveau"></a>

可以通过将`nouveau`内核模块加入黑名单来禁用Nouveau驱动：

> 注意：使用专有驱动程序时，默认情况下会执行此操作。

```nix
{
  boot.blacklistedKernelModules = [ "nouveau" ];
}
```

请注意，同时禁用英伟达内核模块和Nouveau会彻底禁用GPU。

[^1]: [NVIDIA Transitions Fully Towards Open-Source GPU Kernel Modules](https://developer.nvidia.com/blog/nvidia-transitions-fully-towards-open-source-gpu-kernel-modules/)

[^2]: [Nouveau Persevered In 2017 For Open-Source NVIDIA But 2018 Could Be Much Better 上的讨论](https://www.phoronix.com/forums/forum/linux-graphics-x-org-drivers/open-source-nvidia-linux-nouveau/998310-nouveau-persevered-in-2017-for-open-source-nvidia-but-2018-could-be-much-better#post998316)

[^3]: [Chapter 21. Configuring Power Management Support](https://download.nvidia.com/XFree86/Linux-x86_64/595.71.05/README/powermanagement.html)

[^4]: [The all new OutputSink feature aka reverse PRIME](https://forums.developer.nvidia.com/t/the-all-new-outputsink-feature-aka-reverse-prime/129828/67)

[^5]: [nixpkgs #429624#comment3189861599](https://github.com/NixOS/nixpkgs/issues/429624#issuecomment-3189861599)

[^6]: [Suspend/resume cycling on system resume](https://discourse.nixos.org/t/suspend-resume-cycling-on-system-resume/32322/12)
