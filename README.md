# Linux / OpenWrt / ImmortalWrt

Linux 网关与 OpenWrt / ImmortalWrt 透明代理模板，配置文件为 `demo.json`。

## 内核要求

模板使用 reF1nd 的 `providers` 扩展以及 sing-box 1.14 的多标签规则集、Tailscale、API 服务和 TUN DNS 模式。

- 最低建议：`1.14.0-alpha.46-reF1nd.1`。
- 推荐：最新 `reF1nd-testing-next`。
- 旧版 `alpha.43-reF1nd` 无法解析数组形式的 `route.rule_set[].tag`。

## TUN 与透明代理

- TUN 开启 `auto_route`、`auto_redirect` 和 `strict_route`，并保留 `dns_mode: "hijack"`。
- `auto_redirect` 使用 nftables，并可自动接入 OpenWrt fw4。
- 仅接管 `br-lan`，接口名称不同的设备需要自行修改 `include_interface`。
- TUN 使用 `udp_timeout: "60s"`；最新内核默认已经使用 endpoint-independent UDP NAT，无需旧的 `endpoint_independent_nat` 字段。
- Linux 本机地址的 DNS 无法完全依赖 TUN DNAT，因此保留了回环地址 53 端口的显式 `hijack-dns` 规则。

## 私有网络

- TUN 等 L3 流量优先由 `bridge-out` 直接转发私有地址。
- `socks-lan` 等 L4 流量由 bridge 后方的 `ip_is_private -> DIRECT` 规则兜底，避免私有地址落入代理。
- `ip_is_private` 已覆盖回环、RFC1918、链路本地、组播和未指定地址，因此删除单独的回环 DIRECT 规则，并将通用私有地址规则放到 IPv6 防护之前。
- 不再写死 `192.168.1.0/24` 家庭网段；Tailscale 优先匹配后，其余私有地址统一交给 bridge / DIRECT。
- 网络诊断工具和 ICMP 使用内核级 `bypass` / `DIRECT`；ImmortalWrt 使用的 reF1nd 内核负责自动处理 FakeIP 解析，不再单独写 `resolve` 规则。
- 每个可切换策略组仍单独保留 `interrupt_exist_connections: true`，该字段没有顶层全局写法。

网络工具进程：

```text
nexttrace
ntrace
iperf3
tcping
mtr
mtr-packet
```

## Tailscale

- Tailscale endpoint 使用 `detour: "DIRECT"` 和 `ts-state` 状态目录。
- `dns-ts` 接入 MagicDNS，并开启 `accept_search_domain` 支持单标签主机名。
- `preferred_by: "ts-ep"` 自动匹配 MagicDNS、Tailscale 对端及已接受路由。
- 模板默认广播 `192.168.1.0/24`，并声明为出口节点；不需要时应删除 `advertise_routes` 或 `advertise_exit_node`。

## LAN SOCKS 与控制面板

- SOCKS5：`0.0.0.0:7891`，必须替换模板用户名和密码；如不使用可删除该入站。
- sing-box 官方 API：`0.0.0.0:9090`，提供官方 Dashboard。
- Clash API：`0.0.0.0:9091`，提供 Zashboard。
- 两个 API 都监听 LAN，必须替换示例密钥，并通过防火墙限制可信网段访问。

## DNS、缓存与规则

- 国内 DNS 使用 `223.5.5.5` AliDNS DoH，并显式指定 `detour: "DIRECT"`；代理 DNS 使用 Cloudflare DoH。
- FakeIP 启用 IPv4/IPv6 地址池和反向映射。
- `cache.db` 持久化 FakeIP 与 DNS 缓存。
- 广告采用双层处理：DNS 返回 `0.0.0.0` / `::` 让客户端快速失败，路由层 `reject` / `drop` 继续处理缓存、硬编码地址和漏网连接。
- 保留 TUN 默认 DNS 劫持、回环 DNS 劫持和 `protocol: "dns"` 处理。
- FakeIP 网段不再显式指定到 `PROXY`，普通连接由 `route.final: "PROXY"` 处理。
- 继续阻止已知 DoH、HTTPDNS 和污染 IP。
- 远程规则集集中放在 `route.rules` 后方，统一通过 jsDelivr 下载；各来源内部按标签长度排序，Telegram DC 规则保持连续。
- Provider 通过独立的 `sub-download` HTTP 客户端直连更新，规则集和面板资源通过 `rule-download` 获取。

## 使用前填写

- Provider 订阅地址。
- Tailscale 密钥、主机名与实际广播网段。
- SOCKS 用户名、密码。
- 9090/9091 API 密钥。
- `br-lan`、LAN 网段及持久化目录等设备相关值。

## reF1nd 文档

- Provider：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/provider/>
- Selector：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/outbound/selector/>
- 在线文档：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/>
- 更新频道：<https://t.me/sing_box_reF1nd>
