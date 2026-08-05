# Windows

Windows sing-box 配置模板，配置文件为 `demo.json`。

## 内核要求

此模板面向 **reF1nd 内核**，使用了官方内核不支持的 `providers` 字段。

- 最低建议：`1.14.0-alpha.46-reF1nd.1`。
- 推荐：最新 `reF1nd-testing-next`。
- 模板中的多标签规则集无法被旧版 `alpha.43-reF1nd` 解析。

使用官方 sing-box 内核时，请改用 [sub-store](../../tree/sub-store) 分支中的 `sfw-template.json` 和 `sfw-substore.js`。

## 网络与 TUN

- `mixed-in` 监听 `127.0.0.1:7890`。
- TUN 开启 `auto_route` 和 `strict_route`，并保留 `dns_mode: "hijack"`。
- `tun.platform.http_proxy` 指向本地 `127.0.0.1:7890`，供支持该平台接口的 Windows 图形客户端设置系统代理。
- TUN 使用 `udp_timeout: "60s"`；最新内核默认已经采用 endpoint-independent UDP 映射和过滤，无需重复添加旧字段。
- `tun-in` 排在 `mixed-in` 前方仅用于统一排版；两个入站独立监听，顺序不会改变流量接管关系。
- `strict_route` 可降低 Windows 多宿主 DNS 泄漏，但可能影响 VirtualBox 等特殊虚拟网络软件。
- 如果其他代理程序已经占用 7890，需要先关闭冲突程序或自行修改 `mixed-in` 与 HTTP 代理端口。

## 私有网络与 Tailscale

- 不再写死 `192.168.1.0/24` 家庭网段，本地 LAN、回环及其他私有地址统一由 `ip_is_private` 处理。
- Tailscale 对端及已接受子网路由由 `preferred_by: "ts-ep"` 优先匹配；其余私有地址依次尝试 `bridge-out` 和 `DIRECT`。
- `bridge-out` 需要管理员权限；TUN 的 L3 流量优先走 bridge，`mixed-in` 等 L4 流量使用后续的私有地址 `DIRECT` 兜底。
- `ip_is_private` 已覆盖回环、RFC1918、链路本地、组播和未指定地址，因此不再单独保留 `127.0.0.0/8` / `::1` 规则。
- Tailscale endpoint 使用 `detour: "DIRECT"`，状态目录为 `ts-state`。
- `dns-ts` 接入 MagicDNS，并开启 `accept_search_domain`，支持 `immortalwrt` 等单标签主机名。

## 进程分流

Windows 的 `process_name` 按可执行文件完整文件名精确匹配：

- IDM：`IDMan.exe`、`IEMonitor.exe` → `DOWNLOAD`。
- 网络工具：`ntrace.exe`、`iperf3.exe`、`tcping.exe`、`mtr.exe` → `bypass` / `DIRECT`。
- `DOWNLOAD` 包含全部订阅节点和 `DIRECT`，可在面板中手动选择下载线路。
- 每个可切换策略组仍单独保留 `interrupt_exist_connections: true`；该字段属于策略组配置，无法设置为顶层全局选项。

## DNS 与路由

- 国内 DNS 使用 `223.5.5.5` AliDNS DoH，并显式指定 `detour: "DIRECT"`；代理 DNS 使用 Cloudflare DoH。
- FakeIP 启用 IPv4/IPv6 地址池、反向映射和持久化缓存。
- `cache.db` 保存 FakeIP 与 DNS 缓存。
- 广告采用双层处理：DNS 直接返回 `0.0.0.0` / `::`，使连接快速失败，避免路由层静默 drop 带来的长时间超时；路由层 `reject` / `drop` 继续作为缓存、硬编码地址和漏网连接的兜底。
- TUN 使用默认 DNS 劫持，代理入站仍由 `protocol: "dns"` 的 `hijack-dns` 规则处理。
- FakeIP 网段不再显式指定到 `PROXY`，普通连接由 `route.final: "PROXY"` 处理。
- ICMP 保持 `bypass` / `DIRECT`，不再额外添加官方内核兼容性不一致的显式 `resolve` 动作。
- 继续阻止已知 DoH、HTTPDNS、污染 IP、广告和 BitTorrent 流量。
- 国内域名及解析出的国内 IP 的 UDP 443 均会被拒绝，使 QUIC 回落 TCP。
- 远程规则集集中放在 `route.rules` 后方；各来源内部按标签长度由短到长排列，Telegram DC 规则保持连续。

## 使用前填写

- `providers[0].url`：Sub-Store 或订阅下载地址。
- Tailscale `auth_key` 与 `hostname`。
- 其他按个人环境调整的 LAN 网段和端口。

## reF1nd 文档

- Provider：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/provider/>
- Selector：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/outbound/selector/>
- 在线文档：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/>
- 更新频道：<https://t.me/sing_box_reF1nd>
