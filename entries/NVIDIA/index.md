本页尝试涵盖在NixOS上使用英伟达显卡相关的内容。

## 启用

### 来自英伟达的内核模块

比起其他选择，来自英伟达的内核模块提供更好的性能，但是它让系统变得不自由，因为提供了专有的用户空间库，使其能与内核模块互动。若你想要完全自由且开源的系统，应当使用Nouveau代替。

要启用他们，添加`"nvidia"`到由`services.xserver.videoDrivers`选项(option)的启用显示驱动列表。

> 注意：自驱动版本 560 开始，你也将要通过选项`hardware.nvidia.open`的布尔值来决定选择开源模块(`true`)还是专有模块(`false`)。
>
> 尽管开源内核模块只支持图灵(Turing)架构以及更新的 GPU（GeForce RTX 20 与 GeForce GTX 16 开始），但开源的比专有的内核模块更受青睐，且计划逐步代替专有的内核模块[<sup>1</sup>](#ref1)。
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

Nouveau 是英伟达显卡的免费开源驱动程序，提供所有英伟达显卡的图形加速功能。一般不推荐使用它，因为与 英伟达的官方内核模块相比，其性能明显较差，且对许多英伟达显卡不支持 reclocking（动态调整时钟频率）[<sup>2</sup>](#ref2)。尽管如此，对于希望使用完全免费开源操作系统的人来说，Nouveau 仍然是可行的选择，因为它不包含任何专有组件，这一点与 NVIDIA 的内核模块和用户空间库不同。

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

令英伟达驱动支持睡眠（挂起至内存）和休眠（挂起至磁盘）的电源管理操作，如x86_64平台上的ACPI S3和S4。[<sup>3</sup>](#ref3)

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

> 注意：注意：反向同步模式自 NixOS 23.05 和 NVIDIA 驱动程序版本 460.39 起可用，但仍处于实验阶段，存在一些缺陷[<sup>4</sup>](#ref4)。实际效果可能因系统而异。反向同步模式与同步模式不兼容，要求使用支持`services.xserver.displayManager.setupCommands`选项的桌面管理器，例如LightDM、GDM和SDDM。

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

> 进行中，也在等待你的贡献

## 疑难解答

> 进行中，也在等待你的贡献

## 禁用

### 来自英伟达的内核模块

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

### [Nouveau](https://zh.wikipedia.org/wiki/nouveau)

可以通过将`nouveau`内核模块加入黑名单来禁用Nouveau驱动：

> 注意：使用专有驱动程序时，默认情况下会执行此操作。

```nix
{
  boot.blacklistedKernelModules = [ "nouveau" ];
}
```

请注意，同时禁用英伟达内核模块和Nouveau会彻底禁用GPU。

## 脚注

<a id="ref1"></a> [1] [NVIDIA Transitions Fully Towards Open-Source GPU Kernel Modules](https://developer.nvidia.com/blog/nvidia-transitions-fully-towards-open-source-gpu-kernel-modules/)

<a id="ref2"></a> [2] [Nouveau Persevered In 2017 For Open-Source NVIDIA But 2018 Could Be Much Better 上的讨论](https://www.phoronix.com/forums/forum/linux-graphics-x-org-drivers/open-source-nvidia-linux-nouveau/998310-nouveau-persevered-in-2017-for-open-source-nvidia-but-2018-could-be-much-better#post998316)

<a id="ref2"></a> [3] [Chapter 21. Configuring Power Management Support](https://download.nvidia.com/XFree86/Linux-x86_64/595.71.05/README/powermanagement.html)

<a id="ref4"></a> [4] [The all new OutputSink feature aka reverse PRIME](https://forums.developer.nvidia.com/t/the-all-new-outputsink-feature-aka-reverse-prime/129828/67)
