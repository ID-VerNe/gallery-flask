
# Quick Image Selector Tool (快速选图工具)

A local web-based application built with Python Flask for quickly browsing and selecting matching JPG/JPEG and RAW image pairs from local folders. Designed to help photographers and image processing professionals efficiently review large photo sessions.

## Features

*   **Native Folder Selection:** Use system native dialogs to select JPG and RAW source folders.
*   **Image Pair Matching:** Automatically finds matching JPG/JPEG and RAW files based on file name base (case-insensitive).
*   **Thumbnail View:** Displays interactive thumbnails of all identified image pairs for quick browsing.
*   **Large Preview:** Shows a large preview of the selected JPG image.
*   **Interactive Preview:** Zoom and pan the preview image using mouse wheel and click-drag.
*   **RAW File Access:** Quickly open the corresponding RAW file of the current selection using a configured external application (like Photoshop) via system commands.
*   **Navigation:** Navigate through image pairs using dedicated buttons or keyboard shortcuts (Left/Right arrows).
*   **Default Paths:** Saves selected folder paths to a configuration file (.env) for quick loading on subsequent runs.
*   **Caching:** Generates and caches thumbnails locally for faster loading after the initial scan.

## Technology Stack

*   **Backend:** Python 3, Flask, Pillow, python-dotenv, subprocess, os, sys, platform, hashlib, io, Tkinter (for dialogs in separate process).
*   **Frontend:** HTML, CSS, JavaScript (ES Modules), Fetch API.

## Getting Started

### Prerequisites

*   Python 3.6+
*   `pip` (Python package installer)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/ID-VerNe/gallery-flask.git 
    cd gallery-flask
    ```
2.  Create a Python virtual environment (recommended):
    ```bash
    python -m venv .venv
    ```
3.  Activate the virtual environment:
    *   On Windows:
        ```bash
        .venv\Scripts\activate
        ```
    *   On macOS / Linux:
        ```bash
        source .venv/bin/activate
        ```
4.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```
5.  Create the configuration file:
    Copy the `.env` file template (if you have one) or manually create a `config/.env` file in the project root directory (`<project_directory>/config/`).
    See the [Configuration](#configuration) section for details on `.env` content.

## Configuration

The application uses a `.env` file located in the `config/` directory at the project root for configuration.

Create or edit `config/.env` with the following keys:

```dotenv
# Default folder paths - Application will load these if set
DEFAULT_JPG_FOLDER=
DEFAULT_RAW_FOLDER=

# Cache directory name (relative to the application's executable/main script directory)
CACHE_DIR_NAME=app_cache

# Thumbnail size (width in pixels). Height is auto-calculated.
THUMBNAIL_WIDTH=150

# Path to Photoshop executable (optional).
# If set and exists, used for opening RAW files matching supported extensions.
# Example Windows: C:\Program Files\Adobe\Adobe Photoshop CC 2023\Photoshop.exe
# Example macOS: /Applications/Adobe Photoshop CC 2023/Adobe Photoshop CC 2023.app/Contents/MacOS/Adobe Photoshop
PHOTOSHOP_PATH=

# Flask application host and port
FLASK_RUN_HOST=127.0.0.1
FLASK_RUN_PORT=5000

# Set to True or 1 for Flask debug mode أثناء development
# FLASK_DEBUG=False
```
Remember to fill in `DEFAULT_JPG_FOLDER`, `DEFAULT_RAW_FOLDER`, or `PHOTOSHOP_PATH` if you want to use default settings or specific RAW editors. The application will save successfully loaded paths back to this file.

## How to Run

1.  Ensure you are in the project root directory (`<project_directory>`).
2.  Activate the virtual environment (if you used one):
    *   On Windows: `.venv\Scripts\activate`
    *   On macOS / Linux: `source .venv/bin/activate`
3.  Run the main Python script:
    ```bash
    python main.py
    ```
    The Flask development server will start. You will see log output in your terminal.
4.  Open your web browser and navigate to the address shown in the logs (usually `http://127.0.0.1:5000/`).

Alternatively, on Windows, you can use the provided `start_app.cmd` script which activates the virtual environment and runs the application, then keeps the window open if an error occurred.

## Usage

1.  In the browser interface, either type the full paths to your JPG and RAW folders or click the "浏览..." (Browse...) buttons to use the native folder selection dialog.
2.  Click the "加载图片对" (Load Image Pairs) button. The application will scan the folders and list matching pairs as thumbnails in the right-hand pane.
3.  Click on a thumbnail to select the image pair. The large preview will show the JPG image, and the info label at the bottom will update.
4.  Use "上一张" (Previous) and "下一张" (Next) buttons or the Left/Right arrow keys to navigate between selected images.
5.  Use the mouse wheel to zoom in/out on the preview image. Click and drag (pan) the image when zoomed in.
6.  Click "打开 RAW" (Open RAW) button or press the 'O' key to open the RAW file corresponding to the current selection using your system's default application or the configured Photoshop path.

## File Structure

```
project_root/
├── interface/           # Flask API routing and frontend files (HTML, CSS, JS)
│   ├── api.py           # Flask Routes, integrates with lower layers, subprocess for Tkinter
│   ├── static/          # Static frontend assets (CSS, JS, images)
│   │   ├── css/
│   │   ├── js/          # Modular JavaScript files
│   │   └── assets/
│   └── templates/       # HTML templates
│       └── index.html   # Main UI HTML
├── application/         # Application Layer - Manages app state and coordinates tasks
│   └── image_selector_app.py
├── domain/              # Domain/Infrastructure Layer - Handles file system, image processing, external calls
│   └── file_manager.py
├── utils/              # Utility Layer - Generic helpers (config loading, exceptions)
│   ├── config_loader.py
│   └── exceptions.py
├── scripts/            # Helper scripts not part of main app (e.g., Tkinter dialog subprocess)
│   └── folder_selector_dialog.py
├── config/             # Configuration files
│   └── .env             # Environment variables and settings
├── main.py             # Application entry point
├── requirements.txt    # Python dependencies
├── start_app.cmd       # Windows launcher script
└── README.md           # This file
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Contributing

Contributions are welcome! If you find a bug or think of a feature, please feel free to open an issue or submit a pull request.

