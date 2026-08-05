# sub-store

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
