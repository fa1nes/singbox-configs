# sub-store

<<<<<<< HEAD
Sub-Store 动态生成 sing-box 配置模板。

## 目录说明

- `template/`：存放远程模板文件。
- `js/`：存放 Sub-Store 脚本操作文件。

## 文件说明

- `template/sfi-template.json`：sing-box for iOS 模板。
- `js/sfi-substore.js`：配套 iOS 模板的 Sub-Store 脚本操作。
- `template/sfw-template.json`：sing-box for Windows 模板，保留 Windows 原配置结构，但移除官方内核不支持的 `providers` 动态订阅字段。
- `js/sfw-substore.js`：配套 Windows 模板的 Sub-Store 脚本操作，用订阅节点动态填入 `PROXY`、`GLOBAL`、`HK`、`TW`、`SG`、`US`、`JP`、`EMBY`、`SPEEDTEST` 等分组。

## Windows 用法

远程文件填写：

```text
https://raw.githubusercontent.com/fa1nes/singbox-configs/sub-store/template/sfw-template.json#noCache
```

脚本操作填写，链接已默认追加关闭缓存参数：

```text
https://raw.githubusercontent.com/fa1nes/singbox-configs/sub-store/js/sfw-substore.js#type=0&name=你的订阅名称#noCache
```

如果使用组合订阅：

```text
https://raw.githubusercontent.com/fa1nes/singbox-configs/sub-store/js/sfw-substore.js#type=1&name=你的组合订阅名称#noCache
```

## iOS 用法

远程文件填写：

```text
https://raw.githubusercontent.com/fa1nes/singbox-configs/sub-store/template/sfi-template.json#noCache
```

脚本操作填写，链接已默认追加关闭缓存参数：

```text
https://raw.githubusercontent.com/fa1nes/singbox-configs/sub-store/js/sfi-substore.js#type=0&name=你的订阅名称#noCache
```

如果使用组合订阅：

```text
https://raw.githubusercontent.com/fa1nes/singbox-configs/sub-store/js/sfi-substore.js#type=1&name=你的组合订阅名称#noCache
```

## 参数说明

- `type=0` 表示单条订阅。
- `type=1` 表示组合订阅。
- `name` 是 Sub-Store 中订阅或组合订阅的名称，不是显示名称。
- `#noCache` 表示关闭 Sub-Store 拉取远程文件/脚本时的缓存，模板链接和脚本链接都已默认携带。
- 生成后的 Windows 配置不依赖 sing-box `providers` 字段，可用于官方 sing-box 内核。
=======
个人 sing-box 配置模板集合，按使用场景拆分到不同分支维护。

## 分支说明

- [`windows`](../../tree/windows)：Windows 客户端模板，配置文件为 `demo.json`。
- [`linux`](../../tree/linux)：Linux / OpenWrt / ImmortalWrt 设备模板，配置文件为 `demo.json`。
- [`sub-store`](../../tree/sub-store)：Sub-Store 动态生成模板，保留原有文件结构，不随平台模板重命名。

## 使用方式

1. 进入对应分支下载 `demo.json`。
2. 按需替换订阅链接、Tailscale 授权密钥、主机名、SOCKS 用户名/密码等占位符。
3. 根据自己的网络环境调整入站、路由、规则集与代理分组。
4. 使用 sing-box 检查配置后再部署。

## 约定

- 平台模板统一使用 `demo.json` 作为示例配置文件名。
- 缓存文件统一使用 `cache.db`。
- Tailscale 状态目录统一使用 `ts-state`。
- 仓库中的敏感信息均以占位符形式保留，使用前请自行填写。
>>>>>>> 733c555 (update readme)
