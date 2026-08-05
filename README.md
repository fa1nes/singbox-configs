# singbox-configs

个人 sing-box 配置模板集合，按平台拆分到不同分支维护。

## 分支

| 分支 | 适用场景 | 说明 |
| --- | --- | --- |
| [windows](../../tree/windows) | Windows 桌面端 | reF1nd 内核模板，使用官方内核不支持的 `providers` 字段。 |
| [linux](../../tree/linux) | Linux / OpenWrt / ImmortalWrt | reF1nd 网关模板，使用 `auto_redirect`、Tailscale 和双 API 面板。 |
| [sub-store](../../tree/sub-store) | iOS / Windows 官方内核 | 通过 Sub-Store 动态注入订阅节点，不依赖 `providers`。 |

## 内核版本

模板使用了 sing-box 1.14 的多标签远程规则集、Tailscale `preferred_by`、MagicDNS 和新版 TUN 默认 DNS 劫持：

- 官方内核：最低建议 `1.14.0-alpha.47`，推荐使用当前 `1.14.0-alpha.48` 或更高版本。
- reF1nd 内核：最低建议 `1.14.0-alpha.46-reF1nd.1`，推荐跟随最新 `reF1nd-testing-next`。
- 旧版内核无法解析数组形式的 `route.rule_set[].tag`，不要直接加载这些模板。

## 规则集约定

- 远程规则集统一放在 `route.rules` 后方集中定义。
- 规则集 CDN 统一使用 `https://cdn.jsdelivr.net/gh`。
- 自维护规则统一使用 `https://cdn.jsdelivr.net/gh/fa1nes/sing-box-rules@main/srs/`。
- 多标签规则集使用 `{tag}` 占位符，减少重复配置。
- 同一来源内的规则集标签按长度由短到长排列，Telegram DC 规则保持连续。
- 模板中的订阅地址、Tailscale 密钥、主机名和 API 密钥均使用占位符。

## 选择建议

- Windows 使用 reF1nd：选择 `windows` 分支。
- OpenWrt / ImmortalWrt：选择 `linux` 分支。
- Windows 使用官方内核：使用 `sub-store` 分支的 SFW 模板与脚本。
- iOS：使用 `sub-store` 分支的 SFI 模板与脚本。

## reF1nd 内核特性参考

- 机场订阅支持：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/provider/>
- 在策略组中使用订阅：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/outbound/selector/>
- DNS 并发：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/dns/server/group/>
- Snell 出站：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/outbound/snell/>
- 负载均衡策略组：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/outbound/loadbalance/>
- Fallback 策略组：<https://github.com/reF1nd/sing-box/tree/reF1nd-testing-next#urltest-fallback-支持>
- Inbound TLS：<https://github.com/reF1nd/sing-box/tree/reF1nd-testing-next#inbound-tls>
- 在线文档：<https://sing-boxr.dustinwin.cc.cd/zh/configuration/>

以下统一延迟选项由 reF1nd 支持，但模板默认没有启用，可按需添加：

```json
{
  "experimental": {
    "urltest_unified_delay": true
  }
}
```
