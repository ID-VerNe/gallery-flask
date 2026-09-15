# 快速选图工具重构方案：Tauri 2.0 + React 19 + Rust 极速桌面架构

> **文档状态**：已对齐并通过评审 (Approved)  
> **版本**：v1.0.0  
> **更新时间**：2026-09-16  

---

## 1. 项目背景与重构目标

### 1.1 现状与痛点分析
当前项目基于 Python Flask + Tkinter 构建本地 Web 选图工具，随着单次拍摄照片数量增加（通常 2,000 ~ 10,000 张 RAW+JPG 对），暴露出三大核心瓶颈：
1. **后端并发阻塞**：Flask 单进程同步模型，高频请求缩略图和预览时存在排队阻塞；
2. **图像计算压力**：Pillow 在 Python 层解算大图与下采样受限于 CPU 性能与 GIL，无法榨干多核与 SIMD 指令集；
3. **前端 DOM 崩溃**：原生 JS 遍历将数千张缩略图全部渲染到 DOM 中，缺少虚拟滚动机制，导致浏览器内存暴涨与滚动卡顿；
4. **系统交互脆弱**：原生文件夹对话框依赖独立的 Tkinter Python 子进程，在 Windows 平台下容易丢失焦点或被拦截。

### 1.2 重构核心目标
- **极致性能**：利用 Rust 原生多线程、SIMD 加速缩放与内嵌缩略图提取，万张照片秒级索引与加载；
- **原生单 exe 交付**：采用 **Tauri 2.0** 架构，彻底摆脱 Python 虚拟环境与 Tkinter 外部子进程，绿色单二进制分发；
- **专业级选片工作流**：引入 1-5 星级打分、Pick/Reject 快速标记、双图并排对比 (Split View)、批量挑选导出与 Adobe Lightroom/Photoshop 标准 XMP 双向无缝互通；
- **丝滑交互体验**：前端采用 React 19 + `@tanstack/react-virtual` 虚拟网格，保持 DOM 节点数恒定，滚动帧率稳定在 60fps。

---

## 2. 外部开源借鉴与融合 (Glue-Engineer 成果)

通过 `glue-engineer` 专有工具链对行业开源选片与图像桌面端深度分析（`.glue/deep/`），我们融合了以下 3 个高价值开源项目的精髓：

| 来源项目 | 技术栈 | 借鉴的核心工程设计 |
| :--- | :--- | :--- |
| **[AGPEIM/lenslink](https://github.com/AGPEIM/lenslink)** | Tauri v2 + React + Rust | 1. `PhotoGroupInfo` 优雅结构：单次遍历按 stem（主文件名）聚合并自动区分 `COMPLETE` / `JPG_ONLY` / `RAW_ONLY` 状态。<br>2. Tauri v2 `protocol-asset` 协议：前端通过原生安全协议直接渲染本地大图，零内存拷贝与零 IPC 序列化。<br>3. `trash` crate：将淘汰标记的照片安全投递至系统回收站，防止误删。 |
| **[ChrisChen667788/pixcull](https://github.com/ChrisChen667788/pixcull)** | Python Local-First | 1. 行业标准 Adobe XMP 侧边栏结构规范（固定 UUID: `W5M0MpCehiHzreSzNTczkc9d`）。<br>2. 规范的 `<xmp:Rating>0..5</xmp:Rating>` 与 `<xmp:Label>` 色彩标签映射。<br>3. 单手键盘选片操作流（1-5 打分、P 键保留、X 键淘汰、空格/方向键快速切片）。 |
| **[glebis/cull](https://github.com/glebis/cull)** | Tauri v2 + Rust + Svelte | 1. 内嵌 `rusqlite` SQLite 本地存储：高速索引已扫描图片元数据与浏览断点，二次打开瞬间还原。<br>2. Release 编译配置：在 `Cargo.toml` 开启 `strip = true`, `lto = true`, `codegen-units = 1`，将桌面 exe 体积控制在极小范围。 |

---

## 3. 系统全景架构设计

### 3.1 总体架构图

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Webview 前端 (React 19)                       │
│  ┌───────────────────────┐  ┌───────────────────┐  ┌────────────────┐  │
│  │ @tanstack/react-virt │  │ 单图 / 双图对比视口 │  │ 快捷键与打分面板│  │
│  │ 万级虚拟缩略图网格    │  │ GPU 缩放平移 (60fps)│  │ 1-5星, P/X 标记│  │
│  └───────────┬───────────┘  └─────────┬─────────┘  └────────┬───────┘  │
│              │                        │                     │          │
│              │ asset:// 本地直通      │ Tauri IPC Commands  │          │
└──────────────┼────────────────────────┼─────────────────────┼──────────┘
               │                        │                     │
┌──────────────┼────────────────────────┼─────────────────────┼──────────┐
│              ▼                        ▼                     ▼          │
│                              Tauri 2.0 Core                            │
│  ┌───────────────────────┐  ┌───────────────────┐  ┌────────────────┐  │
│  │ 混合缩略图引擎        │  │ 原生目录扫描器    │  │ XMP 双向同步   │  │
│  │ • EXIF/RAW 内嵌 Preview│  │ • Stem 大小写配对 │  │ • Adobe 规范   │  │
│  │ • fast_image_resize   │  │ • XMP/ACR 状态检测│  │ • xmp:Rating   │  │
│  │ • Rayon 多线程并发池 │  │ • 多维度智能排序  │  │ • xmp:Label    │  │
│  └───────────────────────┘  └───────────────────┘  └────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────┐  ┌────────────────┐  │
│  │ 本地 SQLite 缓存 (db) │  │ 外部工具唤起      │  │ 安全回收站     │  │
│  │ • 会话断点还原        │  │ • Photoshop       │  │ • trash crate  │  │
│  │ • 毫秒级星级/标记过滤 │  │ • 系统默认看图器  │  │ • 物理隔离防误删│  │
│  └───────────────────────┘  └───────────────────┘  └────────────────┘  │
│                                                                        │
│                          Rust 后端 (src-tauri)                         │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Rust 后端模块划分 (`src-tauri/src/`)

1. **`models.rs`**：
   - `PhotoFileInfo`: `{ name, extension, path, size, mtime }`
   - `PhotoGroupInfo`: `{ id, base_name, jpg: Option<PhotoFileInfo>, raw: Option<PhotoFileInfo>, status, rating, flag, exif, has_xmp }`
   - `ExifData`: `{ camera_model, lens_model, shutter_speed, aperture, iso, focal_length, date_time }`
   - `AppSettings`: `{ default_jpg_folder, default_raw_folder, photoshop_path, thumbnail_size, sort_order }`
2. **`scanner.rs`**：
   - 快速单次读取文件目录；
   - 提取文件 stem 进行大小写不敏感聚合匹配；
   - 检查同目录下是否存在 `.xmp`、`.acr` 文件；
   - 支持按拍摄日期时间（EXIF）、修改时间和文件名正反序排序。
3. **`thumbnail.rs`**（混合缩略图管线）：
   - **第一优先级**：使用 `kamadak-exif` 或 `rawler` 直接读取文件内嵌的 JPEG Thumbnail / Preview（仅需读取头部几 KB 至几百 KB，耗时 < 5ms）；
   - **第二优先级**：缺失内嵌缩略图时，调用 `image` 解码 + **`fast_image_resize` (SIMD)** 执行高性能下采样；
   - **磁盘持久化缓存**：基于 `Path + Mtime + Size` 生成 SHA256 存入 `app_cache/`，支持秒级二次命中。
4. **`xmp.rs`**：
   - 生成/解析符合 Adobe 标准的 `.xmp` 侧边栏文件；
   - 同步读写 `<xmp:Rating>` (0..5) 与 `<xmp:Label>`；
   - 保证与 Adobe Lightroom Classic、Photoshop ACR、Capture One 完全兼容。
5. **`db.rs`**：
   - 使用内嵌 `rusqlite`，单文件轻量数据库保存相册扫描缓存、用户会话、上次浏览位置。
6. **`commands.rs`**：
   - `scan_folders(jpg_path, raw_path, sort_order)`
   - `get_thumbnail(file_path)`
   - `update_rating_flag(group_id, rating, flag, write_xmp)`
   - `open_in_photoshop(file_path)` / `open_in_default_app(file_path)`
   - `batch_export_selected(target_dir, include_raw, include_jpg, rename_pattern)`
   - `trash_rejected_photos(group_ids)`

### 3.3 前端组件设计 (`src/`)

1. **`ThumbnailGrid.tsx`**：
   - 采用 `@tanstack/react-virtual` 搭建虚拟网格，仅渲染可视区域照片；
   - 卡片上直观显示：星级徽章 (★1-5)、Pick/Reject 标识、RAW 标志、XMP 编辑小圆点。
2. **`PreviewViewport.tsx`**：
   - 单图大图检视视口；
   - CSS Transform / Canvas 实现硬件加速缩放（10% ~ 800%）和平滑平移，支持双击自适应/100% 切换；
   - 顶部悬浮 EXIF 详细信息胶囊（快门、光圈、ISO、焦距、相机型号、镜头）。
3. **`SplitCompareViewport.tsx`**（**深度增强功能**）：
   - 双图并排对比模式（候选图 A vs 候选图 B）；
   - 支持**联动同步缩放与平移**（选焦点清晰度、眼神微表情对比的神器）。
4. **`TopBar.tsx` / `BottomBar.tsx`**：
   - 顶部：原生文件夹选取按钮、过滤选择器（全部 / 仅已选 / ★3星以上等）、视图模式切换（单图 / 双图对比 / 纯网格）；
   - 底部：进度指示（第 X / Y 张）、打分按键指示、一键打开 RAW / Photoshop、一键导出选中。
5. **`useKeyboardShortcuts.ts`**：
   - `1` ~ `5`：设置 1-5 星级打分；
   - `0` / `U`：清除打分/标记；
   - `P`：标记保留 (Pick)；
   - `X`：标记淘汰 (Reject)；
   - `Left` / `Right` 或 `A` / `D`：上一张 / 下一张；
   - `O`：用外部程序（Photoshop/默认软件）打开当前照片；
   - `C`：切换至双图对比视图。

---

## 4. 实施阶段与步骤规划

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 1    │     │   Phase 2    │     │   Phase 3    │     │   Phase 4    │
│ 现有代码归档 │ ──> │ 脚手架搭建   │ ──> │ Rust 后端核心│ ──> │ 前端 UI 核心 │
│ legacy_flask │     │ Tauri + pnpm │     │ 扫描/缩略图  │     │ 虚拟网格/视口│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
┌──────────────┐     ┌──────────────┐     ┌────────────────────────────┘
│   Phase 6    │     │   Phase 5    │     │
│ 验证构建打包 │ <── │ 专业工作流   │ <───┘
│ 单 exe 交付  │     │ XMP/对比/导出│
└──────────────┘     └──────────────┘
```

### Phase 1: 现有代码归档隔离
- 创建 `legacy_flask/` 目录；
- 将现有的 `main.py`, `start_app.cmd`, `看图.cmd`, `interface/`, `application/`, `domain/`, `utils/`, `scripts/` 安全移入 `legacy_flask/`；
- 保留 `history.json` 作为迁移初始化参考。

### Phase 2: Tauri 2.0 与前端脚手架初始化
- 严格按照规范使用 **pnpm** 安装依赖：
  - `react@19`, `react-dom@19`, `@types/react`, `@types/react-dom`
  - `@tauri-apps/api@^2`, `@tauri-apps/plugin-dialog@^2`, `@tauri-apps/plugin-fs@^2`, `@tauri-apps/plugin-opener@^2`
  - `@tanstack/react-virtual`, `lucide-react`, `tailwindcss@^4`, `clsx`, `tailwind-merge`
- 配置 `src-tauri/Cargo.toml`：
  - `tauri` (features: `["protocol-asset"]`)
  - `image`, `fast_image_resize`, `kamadak-exif`, `rawler`, `rusqlite`, `trash`, `rayon`, `serde`
  - 生产编译配置 (`strip = true`, `lto = true`)。

### Phase 3: Rust 后端核心实现
- 实现 `scanner.rs`：单次读取、忽略大小写 stem 自动配对；
- 实现 `thumbnail.rs`：极速内嵌提取 + `fast_image_resize` SIMD 下采样与磁盘哈希缓存；
- 实现 `xmp.rs`：生成符合 Adobe 规范的 `.xmp` 侧边栏包体；
- 实现 `db.rs`：SQLite 本地轻量存储断点会话；
- 暴露核心 Tauri commands 并完成单元测试。

### Phase 4: 前端核心 UI 与交互开发
- 实现 `ThumbnailGrid.tsx`：`@tanstack/react-virtual` 虚拟网格及状态微标；
- 实现 `PreviewViewport.tsx`：大图 GPU 变换缩放平移、自适应居中；
- 实现 `useKeyboardShortcuts.ts`：全套专业选片快捷键系统。

### Phase 5: 专业工作流与增强功能
- 实现双图并排对比模式 `SplitCompareViewport.tsx`（支持双视口联动平移缩放）；
- 接入 XMP 实时双向同步（打分变更自动写回同名 `.xmp`）；
- 实现批量挑选导出模态框 `BatchExportModal.tsx`（一键复制挑选文件对至指定目录）；
- 实现 Photoshop / 系统默认程序一键唤起与路径自定义设置。

### Phase 6: 全链路联调、测试与打包交付
- 功能验收：原生文件选择、千张大图配对、虚拟网格无卡顿滚动、XMP 在 Lightroom 中验证；
- 运行 `pnpm tauri build` 构建生成 Windows 平台免安装便携版 exe 与安装包。

---

## 5. 验收标准与测试计划

1. **并发与性能指标**：
   - 1,000 张 RAW+JPG 目录索引配对时间 ≤ 1 秒；
   - 缩略图生成与加载无白屏，滚轮极速滑动帧率稳定 60fps；
   - 软件运行时内存占用控制在 150MB ~ 250MB 之间。
2. **功能准确性指标**：
   - 各种大小写扩展名（`DSC001.JPG` + `dsc001.arw`）100% 精确配对；
   - 软件内打 5 星、打 Red 标后，Lightroom Classic 打开对应目录，原片直接显示 5 星与红标；
   - 外部调用 Photoshop 能秒级唤起并正确定位当前 RAW 文件；
   - 淘汰标记执行后，源文件安全进入 Windows 回收站，支持撤回。
