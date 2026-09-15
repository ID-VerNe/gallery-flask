[English Version](README.md)

# 快速选图工具 (Gallery Culling) — Tauri 2.0 原生极速版

一个基于 **Tauri 2.0 + Rust + React 19 + TypeScript** 构建的高性能专业选片桌面应用。专为摄影师和图像处理专业人员打造，可秒级加载数千至上万张照片，极速配对浏览 JPG 与相机 RAW 图像，支持 1-5 星级打分、Pick/Reject 标记、双图并排联动对比与 Adobe Lightroom / Photoshop XMP 侧边栏双向无缝互通。

---

## 核心特性

*   **极致性能架构：** 采用 Tauri 2.0 原生架构，摆脱 Python 运行环境依赖与 Tkinter 外部对话框子进程，极小内存占用与秒开速度。
*   **万级虚拟滚动：** 前端依托 `@tanstack/react-virtual` 虚拟网格，无论 1,000 还是 10,000 张照片，DOM 节点恒定，60fps 丝滑流畅。
*   **混合极速缩略图引擎：** Rust 原生线程池优先提取 EXIF / RAW 内嵌预览图（数毫秒级），缺失时自动通过 `fast_image_resize` (SIMD 指令集加速) 进行下采样并持久化磁盘缓存。
*   **RAW 与 JPG 智能配对：** 忽略大小写自动将同名 JPG/PNG 与各种相机 RAW（Sony ARW、Canon CR2/CR3、Nikon NEF、DNG 等）配对关联。
*   **双图并排联动对比 (Split View)：** 创新支持双图同屏对比模式，支持**双视口联动同步平移与缩放**，选对焦清晰度与面部表情的神器。
*   **Lightroom / Capture One XMP 双向互通：** 软件内 1-5 星级打分与 Pick/Reject 标记，自动无损同步写入/读取标准 `.xmp` 侧边栏文件，修图软件打开直接生效。
*   **单手键盘极速选片：**
    *   `1` ~ `5`：设置 1-5 星级
    *   `0` / `U`：清除评级与标记
    *   `P`：标记保留 (Pick，绿标)
    *   `X`：标记淘汰 (Reject，红标)
    *   `A` / `D` 或 `←` / `→`：上一张 / 下一张
    *   `O`：使用 Photoshop 或系统默认程序打开当前 RAW 原片
    *   `C`：切换双图对比视图
    *   `G`：切换纯缩略图网格视图
*   **批量挑选导出：** 一键将保留 (Pick) 或指定星级以上的 RAW 原片、JPG 预览及 XMP 侧边栏文件快速复制到目标目录。
*   **本地会话记忆：** 内嵌 SQLite 自动记忆上一次打开的目录与选片浏览断点，下次打开秒级还原。

---

## 架构技术栈

*   **桌面框架：** Tauri 2.0 (`tauri`, `protocol-asset`)
*   **后端语言：** Rust (`image`, `fast_image_resize`, `kamadak-exif`, `rusqlite`, `trash`, `rayon`, `tokio`)
*   **前端框架：** React 19, TypeScript, Vite 6, Tailwind CSS
*   **包管理器：** `pnpm`
*   **旧版归档：** 原 Python Flask 实现完整归档在 `legacy_flask/` 目录下。

---

## 开发与运行

### 先决条件
*   **Node.js** >= 18 (推荐 v20+)
*   **pnpm** >= 9 (推荐 v10+)
*   **Rust** >= 1.77 (`rustc` 与 `cargo`)

### 快速启动

1.  克隆仓库：
    ```bash
    git clone https://github.com/ID-VerNe/gallery-flask.git
    cd gallery-flask
    ```
2.  安装前端依赖：
    ```bash
    pnpm install
    ```
3.  启动开发环境：
    ```bash
    pnpm tauri dev
    ```
    或在 Windows 上双击运行 `start_app.cmd`。

### 编译打包单可执行文件 (Release Build)
```bash
pnpm tauri build
```
编译生成的便携版 `.exe` 与安装程序将输出在 `src-tauri/target/release/`。

---

## 许可证
本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。
