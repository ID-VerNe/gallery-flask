[English Version](README.md)

# 快速选图工具

一个基于 Python Flask 构建的本地网络应用程序，用于快速浏览和选择本地文件夹中匹配的 JPG/JPEG 和 RAW 图像对。旨在帮助摄影师和图像处理专业人员高效地审阅大量照片会话。

## 功能

*   **原生文件夹选择：** 使用系统原生对话框选择 JPG 和 RAW 源文件夹。
*   **图像对匹配：** 根据文件名基础（不区分大小写）自动查找匹配的 JPG/JPEG 和 RAW 文件。
*   **缩略图视图：** 显示所有已识别图像对的交互式缩略图，以便快速浏览。
*   **大图预览：** 显示所选 JPG 图像的大图预览。
*   **交互式预览：** 使用鼠标滚轮和点击拖动来缩放和平移预览图像。
*   **RAW 文件访问：** 通过系统命令，使用配置的外部应用程序（如 Photoshop）快速打开当前选择的对应 RAW 文件。
*   **导航：** 使用专用按钮或键盘快捷键（左/右箭头）在图像对之间导航。
*   **默认路径：** 将选定的文件夹路径保存到配置文件（.env），以便后续运行快速加载。
*   **缓存：** 本地生成并缓存缩略图，以便在初次扫描后更快地加载。

## 技术栈

*   **后端：** Python 3, Flask, Pillow, python-dotenv, subprocess, os, sys, platform, hashlib, io, Tkinter (用于独立进程中的对话框)。
*   **前端：** HTML, CSS, JavaScript (ES 模块), Fetch API。

## 入门

### 先决条件

*   Python 3.6+
*   `pip` (Python 包安装程序)

### 安装

1.  克隆仓库：
    ```bash
    git clone https://github.com/ID-VerNe/gallery-flask.git 
    cd gallery-flask
    ```
2.  创建 Python 虚拟环境（推荐）：
    ```bash
    python -m venv .venv
    ```
3.  激活虚拟环境：
    *   在 Windows 上：
        ```bash
        .venv\Scripts\activate
        ```
    *   在 macOS / Linux 上：
        ```bash
        source .venv/bin/activate
        ```
4.  安装所需的 Python 包：
    ```bash
    pip install -r requirements.txt
    ```
5.  创建配置文件：
    复制 `.env` 文件模板（如果有）或手动在项目根目录 (`<project_directory>/config/`) 中创建 `config/.env` 文件。
    有关 `.env` 内容的详细信息，请参阅[配置](#配置)部分。

## 配置

应用程序使用位于项目根目录 `config/` 目录中的 `.env` 文件进行配置。

创建或编辑 `config/.env`，包含以下键：

```dotenv
# 默认文件夹路径 - 如果设置，应用程序将加载这些路径
DEFAULT_JPG_FOLDER=
DEFAULT_RAW_FOLDER=

# 缓存目录名称（相对于应用程序的可执行文件/主脚本目录）
CACHE_DIR_NAME=app_cache

# 缩略图宽度（像素）。高度自动计算。
THUMBNAIL_WIDTH=150

# Photoshop 可执行文件路径（可选）。
# 如果设置且存在，用于打开支持扩展名的 RAW 文件。
# 示例 Windows: C:\Program Files\Adobe\Adobe Photoshop CC 2023\Photoshop.exe
# 示例 macOS: /Applications/Adobe Photoshop CC 2023/Adobe Photoshop CC 2023.app/Contents/MacOS/Adobe Photoshop
PHOTOSHOP_PATH=

# Flask 应用程序主机和端口
FLASK_RUN_HOST=127.0.0.1
FLASK_RUN_PORT=5000
```
请记住填写 `DEFAULT_JPG_FOLDER`、`DEFAULT_RAW_FOLDER` 或 `PHOTOSHOP_PATH`，如果您想使用默认设置或特定的 RAW 编辑器。应用程序会将成功加载的路径保存回此文件。

## 如何运行

1.  确保您位于项目根目录 (`gallery-flask`)。
2.  激活虚拟环境（如果您使用了虚拟环境）：
    *   在 Windows 上：`.venv\Scripts\activate`
    *   在 macOS / Linux 上：`source .venv/bin/activate`
3.  运行主 Python 脚本：
    ```bash
    python main.py
    ```
    Flask 开发服务器将启动。您将在终端中看到日志输出。
4.  打开您的网络浏览器并导航到日志中显示的地址（通常是 `http://127.0.0.1:5000/`）。

或者，在 Windows 上，您可以使用提供的 `start_app.cmd` 脚本，它会激活虚拟环境并运行应用程序，如果发生错误则保持窗口打开。

## 使用方法

1.  在浏览器界面中，输入 JPG 和 RAW 文件夹的完整路径，或点击“浏览...”按钮使用原生文件夹选择对话框。
2.  点击“加载图片对”按钮。应用程序将扫描文件夹并在右侧窗格中以缩略图形式列出匹配的图像对。
3.  点击缩略图选择图像对。大图预览将显示 JPG 图像，底部的信息标签将更新。
4.  使用“上一张”和“下一张”按钮或左/右箭头键在选定图像之间导航。
5.  使用鼠标滚轮放大/缩小预览图像。放大时点击并拖动（平移）图像。
6.  点击“打开 RAW”按钮或按“O”键，使用系统默认应用程序或配置的 Photoshop 路径打开当前选择对应的 RAW 文件。

## 文件结构

```
project_root/
├── interface/           # Flask API 路由和前端文件 (HTML, CSS, JS)
│   ├── api.py           # Flask 路由，与下层集成，Tkinter 的子进程
│   ├── static/          # 静态前端资源 (CSS, JS, 图片)
│   │   ├── css/
│   │   ├── js/          # 模块化 JavaScript 文件
│   │   └── assets/
│   └── templates/       # HTML 模板
│       └── index.html   # 主 UI HTML
├── application/         # 应用程序层 - 管理应用程序状态和协调任务
│   └── image_selector_app.py
├── domain/              # 领域/基础设施层 - 处理文件系统、图像处理、外部调用
│   └── file_manager.py
├── utils/              # 工具层 - 通用辅助函数 (配置加载、异常)
│   ├── config_loader.py
│   └── exceptions.py
├── scripts/            # 辅助脚本，不属于主应用程序 (例如，Tkinter 对话框子进程)
│   └── folder_selector_dialog.py
├── config/             # 配置文件
│   └── .env             # 环境变量和设置
├── main.py             # 应用程序入口点
├── requirements.txt    # Python 依赖
├── start_app.cmd       # Windows 启动脚本
└── README.md           # 此文件
```

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

## 贡献

欢迎贡献！如果您发现错误或想到新功能，请随时提出问题或提交拉取请求。
