# singbox-configs

个人 sing-box 配置模板仓库。

## 分支

- `windows`：Windows reF1nd 内核配置。
- `linux`：ImmortalWrt / Linux reF1nd 内核配置。
- `sub-store`：官方 sing-box 内核可用的 Sub-Store 动态模板和脚本。

## 特性

- Windows 和 ImmortalWrt / Linux 版本使用 reF1nd 内核扩展能力。
- Sub-Store 版本面向官方 sing-box 内核，动态写入订阅节点到 `outbounds`。
- 保留 TUN、FakeIP、Tailscale、MagicDNS、广告过滤、国内 QUIC 回落等基础能力。
- Windows / SFW 支持 IDM 下载分流和常用网络工具直连绕过。
- SFW / SFI 支持 IEPL / IPLC 入口中转与 Landing 出口的 Detour 链路重组。
- SFI 保持适合 iOS Network Extension 的精简策略。
