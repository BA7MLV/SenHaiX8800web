# 8800web / 8800web

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Web Bluetooth](https://img.shields.io/badge/Web%20Bluetooth-supported-1E9C97?logo=bluetooth)](https://developer.chrome.com/docs/capabilities/web-apis/bluetooth)


基于浏览器的森海克斯 **SHX8800** 系列对讲机编程工具（及兼容机型）。通过 **Web Bluetooth** 无线连接，完成读频、编辑、写频——无需安装任何桌面软件。

A browser-based radio programming tool for the **SHX8800** series of walkie-talkies (and compatible models). Connect via **Web Bluetooth** to read, edit, and write radio configurations — no desktop software required.

---

## 功能特性 / Features

- **BLE 连接** — 使用 Web Bluetooth 无线连接对讲机（需 Chromium 内核浏览器）
- **读取对讲机** — 完整读取信道、VFO 设置、DTMF/MDC 联系人、功能设置、FM 预设及开机图片
- **信道编辑** — 电子表格风格编辑器，支持 512 个信道（8 区 × 64 个），可编辑频率/亚音/功率/带宽/扫描/PTT ID，支持复制/剪切/粘贴/复制/重排序
- **CSV 导入/导出** — 通过 CSV 文件批量管理信道
- **写频** — 将修改后的配置写回设备
- **备份与还原** — 以 JSON 格式保存/加载完整对讲机镜像
- **差异对比** — 写频前审查变更内容
- **开机图片** — 支持读取/写入 OLED 开机画面（128×128 RGB565），参考 senhaix-freq-writer-enhanced 实现，支持 8x00 流式协议与 Pro 0xA5 帧协议
- **多语言** — 英文与中文界面
- **信道分享** — 分享信道配置

---

- **BLE Connection** — Connect to your radio wirelessly using Web Bluetooth (Chromium-based browser required)
- **Read Radio** — Full read of channels, VFO settings, DTMF/MDC contacts, function settings, FM presets, and boot image
- **Channel Editing** — Spreadsheet-style editor with 512 channels (64 × 8 banks), frequency/tone/power/bandwidth/scan/PTT ID editing, copy/cut/paste/duplicate/reorder
- **CSV Import/Export** — Bulk channel management via CSV files
- **Program Radio** — Write modified configurations back to the device
- **Backup & Restore** — Save/load full radio images as JSON
- **Diff View** — Review changes before writing to the radio
- **Boot Image** — Read/write OLED boot screen images (128×128 RGB565), implemented following senhaix-freq-writer-enhanced, supporting both 8x00 streaming protocol and Pro 0xA5-frame protocol
- **i18n** — English and Chinese (中文) UI
- **Channel Sharing** — Share channel configurations

---

## 支持机型 / Supported Models

- SHX8800
- SHX8600
- SHX8800 Pro
- SHX8600 Pro
- GT12 / GT12 Pro

---

## 快速开始 / Getting Started

```bash
npm install
npm run dev
```

在 Chromium 内核浏览器（Chrome、Edge 等）中打开 [http://localhost:8800](http://localhost:8800)。Web Bluetooth 需要 HTTPS 或 localhost 环境。

Open [http://localhost:8800](http://localhost:8800) in a Chromium-based browser (Chrome, Edge, etc.). Web Bluetooth requires HTTPS or localhost.

### 命令 / Commands

| 命令 / Command | 说明 / Description |
|---|---|
| `npm run dev` | 启动开发服务器（端口 8800） / Start development server (port 8800) |
| `npm run build` | 生产构建到 `dist/` / Production build to `dist/` |
| `npm run preview` | 预览生产构建 / Preview production build |
| `npm test` | 运行测试（Node.js 内置测试运行器）/ Run tests (Node.js built-in test runner) |
| `npm run lint` | 使用 ESLint 检查代码 / Lint with ESLint |

---

## 技术栈 / Tech Stack

- **React 19** + **React Router 7**
- **Vite 8** — 构建工具 / Build tool
- **Tailwind CSS 4** — 样式 / Styling
- **Ant Design 5** *(部分使用，正迁移至自定义组件)* / *(partially used, migrating to custom primitives)*
- **lucide-react** — 图标 / Icons
- **i18next** — 国际化 / Internationalization
- **gbk.js** — 中文文本编码（GBK/GB2312）/ Chinese text encoding (GBK/GB2312)
- **Web Bluetooth API** — 对讲机连接 / Radio connectivity

---

## 架构 / Architecture

```
Web Bluetooth API       ← BLE transport (service 0xFFE0, characteristic 0xFFE1)
       ↓
WebBluetoothTransport   ← BLE 连接层 / BLE connectivity layer
       ↓
Shx8800Session          ← 会话协议（握手、块读写）/ Session protocol (handshake, block read/write)
       ↓
BootImageSession        ← 开机图片写频协议（8x00 + Pro）/ Boot image write protocol (8x00 + Pro)
       ↓
shx8800.js              ← 二进制协议编解码 / Binary protocol encoding/decoding
       ↓
bootImage.js            ← RGB565、CRC-16、图像转换 / RGB565, CRC-16, image conversion
       ↓
AppContext (React)      ← 全局状态（对讲机镜像、连接状态）/ Global state (radio image, connection status)
       ↓
Pages                   ← UI 视图（信道、设置、备份等）/ UI views (Channels, Settings, Backup, etc.)
```

---

## 开机图片写入 / Boot Image Writing

参考 [senhaix-freq-writer-enhanced](https://github.com/SydneyOwl/senhaix-freq-writer-enhanced) 项目实现，支持两种协议：

Implemented following the [senhaix-freq-writer-enhanced](https://github.com/SydneyOwl/senhaix-freq-writer-enhanced) project, supporting two protocols:

### 8x00 协议（8600/8800）

- 握手：`PROGROMSHXU` → 等待 0x06 ACK → 发送 `0x46` → 等待就绪响应
- 首包（68 字节）：头部 `[0x17, 0x09, 0x22, 0x30]`，图像数据 48 字节（偏移 16）
- 后续包（68 字节）：头部 `[0x49, 计数器高, 计数器低, 0x40]`，图像数据 64 字节（偏移 4）
- 每包发送后等待 0x06 ACK 确认

### 8x00 Protocol (8600/8800)

- Handshake: `PROGROMSHXU` → wait 0x06 ACK → send `0x46` → wait ready response
- First packet (68 bytes): header `[0x17, 0x09, 0x22, 0x30]`, 48 bytes image data (offset 16)
- Regular packets (68 bytes): header `[0x49, counterHi, counterLo, 0x40]`, 64 bytes image data (offset 4)
- Wait for 0x06 ACK after each packet

### Pro 协议（8600 Pro/8800 Pro）

- 握手：同上，发送 `0x44` 进入 Pro 模式
- 使用 `0xA5` 帧头 + CRC-16（CRC-CCITT 0x1021）打包
- 命令：握手(0x02) → 设置地址(0x03, Flash 0x10000) → 擦除(0x04) → 写入(0x57, 1024 字节块) → 结束(0x06)
- 每包带有 CRC-16 校验，确保数据完整性

### Pro Protocol (8600 Pro/8800 Pro)

- Handshake: same as above, send `0x44` to enter Pro mode
- Uses `0xA5` frame header + CRC-16 (CRC-CCITT 0x1021) framing
- Commands: Handshake(0x02) → Set Address(0x03, Flash 0x10000) → Erase(0x04) → Write(0x57, 1024-byte chunks) → Over(0x06)
- Each packet includes CRC-16 validation for data integrity

### 图像格式 / Image Format

- 分辨率 / Resolution：128 × 128 像素 / pixels
- 颜色格式 / Color format：RGB565（16 位，5R + 6G + 5B）/ RGB565 (16-bit, 5R + 6G + 5B)
- 数据大小 / Data size：32,768 字节 / bytes
- 支持拖拽上传 PNG/JPEG/GIF/WebP/BMP，自动缩放至 128×128

---

## 测试 / Testing

测试使用 Node.js 内置测试运行器，覆盖协议编解码、握手、开机图片探测、开机图片写入、信道编辑、备份往返及机型元数据。

Tests use Node.js built-in test runner, covering protocol encoding/decoding, handshake, boot image probing, boot image writing, channel editing, backup round-trip, and model metadata.

```bash
npm test
```

共 30 个测试用例 / 30 test cases total:

- `shx8800.js`：协议编解码、信道解析、备份导入导出
- `bootImage.js`：RGB565 编解码、CRC-16、Pro 数据包构建与解析
- `BootImageSession.js`：8x00 数据包构建、Pro 机型检测
- `BootImageProbeSession.js`：握手探测、响应解析

---

## 开发说明 / Development Notes

当前版本参考 K5Web 的后台结构，用纯 Web Bluetooth 打通 SHX8800 的连接、自动握手、读频、写频、备份恢复和信道编辑主流程。

This version follows the K5Web architecture, using pure Web Bluetooth to connect, auto-handshake, read, write, backup/restore, and edit channels for the SHX8800.

### 已知限制 / Known Limitations

- 当前仅支持 Web Bluetooth，不包含 USB/串口
- Pro 协议在 BLE 环境下跳过波特率切换步骤
- 开机图片写入功能需结合实际设备进行验证
- 建议先导出 JSON 备份，便于异常时恢复

---

- Currently only supports Web Bluetooth, does not include USB/serial
- Pro protocol skips baud rate switching on BLE
- Boot image writing needs real-device validation
- Export a JSON backup before modifying the device for easy recovery

---

## 许可证 / License

MIT License

---

## 致谢 / Acknowledgments

- [senhaix-freq-writer-enhanced](https://github.com/SydneyOwl/senhaix-freq-writer-enhanced) — 开机图片协议参考 / Boot image protocol reference
- [K5Web](https://github.com/) — 架构参考 / Architecture reference
- [Shx8800Session](https://github.com/) — 会话协议参考 / Session protocol reference
