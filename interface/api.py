import platform
import subprocess
import sys

from flask import Flask, request, jsonify, send_file, render_template, Response
from application.image_selector_app import app_state
from utils.config_loader import app_config
from domain.file_manager import file_manager
from utils.exceptions import (
    FolderNotFoundError, NoImagePairsFoundError, ImageProcessingError,
    InvalidIndexError, ImageSelectorError, ExternalToolError, ConfigError
)

import logging
import os
import json

debug_mode = os.getenv("FLASK_DEBUG", "False").lower() in ('true', '1', 't')
log_level = logging.DEBUG if debug_mode else logging.INFO

logging.basicConfig(level=log_level, format='[%(asctime)s] [%(levelname)s] [%(name)s.%(funcName)s] - %(message)s')
logger = logging.getLogger(__name__)

template_dir = os.path.join(os.path.dirname(__file__), 'templates')
static_dir = os.path.join(os.path.dirname(__file__), 'static')

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

# History file path (放在项目根目录)
HISTORY_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'history.json')

def _load_history():
    """Loads history data from the JSON file."""
    print(f"--- Attempting to load history from: {HISTORY_FILE_PATH} ---", file=sys.stderr, flush=True) # Use print for visibility
    if not os.path.exists(HISTORY_FILE_PATH):
        print(f"--- History file not found at: {HISTORY_FILE_PATH} ---", file=sys.stderr, flush=True) # Use print for visibility
        return {}
    try:
        with open(HISTORY_FILE_PATH, 'r', encoding='utf-8') as f:
            history_data = json.load(f)
            print(f"--- Successfully loaded history from: {HISTORY_FILE_PATH} ---", file=sys.stderr, flush=True) # Use print for visibility
            return history_data
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"加载历史记录文件失败: {HISTORY_FILE_PATH}, 错误: {e}", exc_info=True)
        print(f"--- Failed to load history from {HISTORY_FILE_PATH}: {e} ---", file=sys.stderr, flush=True) # Use print for visibility
        return {}

def _save_history(history_data):
    """Saves history data to the JSON file."""
    print(f"--- Attempting to save history to: {HISTORY_FILE_PATH} ---", file=sys.stderr, flush=True) # Use print for visibility
    try:
        with open(HISTORY_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(history_data, f, indent=4, ensure_ascii=False)
        print(f"--- Successfully saved history to: {HISTORY_FILE_PATH} ---", file=sys.stderr, flush=True) # Use print for visibility
    except IOError as e:
        logger.error(f"保存历史记录文件失败: {HISTORY_FILE_PATH}, 错误: {e}", exc_info=True)
        print(f"--- Failed to save history to {HISTORY_FILE_PATH}: {e} ---", file=sys.stderr, flush=True) # Use print for visibility

@app.route('/')
def index():
    logger.info("Serving index.html...")
    default_jpg_folder = app_config.get('DEFAULT_JPG_FOLDER', '')
    default_raw_folder = app_config.get('DEFAULT_RAW_FOLDER', '')
    return render_template('index.html', default_jpg_folder=default_jpg_folder, default_raw_folder=default_raw_folder)


@app.route('/api/select_folder', methods=['GET'])
def select_folder():
    logger.info("接收到 /api/select_folder 请求。")
    dialog_type = request.args.get('type', 'jpg').lower()
    if dialog_type not in ['jpg', 'raw']:
        logger.warning(f"接收到无效的对话框类型请求: {dialog_type}")
        return jsonify({"success": False,
                        "message": f"无效的对话框类型: {dialog_type}. 必须是 'jpg' 或 'raw'."}), 400

    this_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(this_dir, os.pardir, os.pardir).replace('interface\..\..','')
    dialog_script_path = os.path.join(project_root, 'scripts', 'folder_selector_dialog.py')

    if not os.path.exists(dialog_script_path):
        logger.critical(f"Tkinter 对话框脚本未找到: {dialog_script_path}")
        return jsonify({"success": False, "message": "后端错误：文件夹选择器脚本丢失。"}), 500

    initial_dir = None
    current_status = app_state.get_current_status()
    if dialog_type == 'jpg':
        initial_dir = current_status.get('jpg_folder') or app_config.get('DEFAULT_JPG_FOLDER')
    elif dialog_type == 'raw':
        initial_dir = current_status.get('raw_folder') or app_config.get('DEFAULT_RAW_FOLDER')

    command = [sys.executable, dialog_script_path]
    if initial_dir:
        command.append(initial_dir)

    logger.debug(f"启动 Tkinter 对话框子进程命令: {command}")
    timeout_seconds = 60

    try:
        process_result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=timeout_seconds,
            creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0
        )

        if process_result.stderr:
            logger.warning(f"Tkinter 对话框子进程 STDERR 输出:\n{process_result.stderr.strip()}")

        if process_result.returncode != 0:
            logger.error(f"Tkinter 对话框子进程以非零状态码 {process_result.returncode} 退出。")
            return jsonify(
                {"success": False, "message": "文件夹选择器遇到内部错误，无法完成操作。"}), 500

        selected_path = process_result.stdout.strip()

        if selected_path:
            logger.info(f"成功从 Tkinter 子进程获取路径 ({dialog_type}): {selected_path}")

            current_jpg_default = current_status.get('jpg_folder') or app_config.get('DEFAULT_JPG_FOLDER')
            current_raw_default = current_status.get('raw_folder') or app_config.get('DEFAULT_RAW_FOLDER')

            try:
                if dialog_type == 'jpg':
                    app_config.save_paths(selected_path, current_raw_default)
                elif dialog_type == 'raw':
                    app_config.save_paths(current_jpg_default, selected_path)
                logger.info(f"成功保存选择的 {dialog_type} 文件夹路径到 .env。")
                return jsonify({"success": True, "path": selected_path}), 200
            except ConfigError as e:
                logger.error(f"保存选中的文件夹路径到 .env 时发生错误: {e}", exc_info=True)
                return jsonify(
                    {"success": False, "message": f"文件夹选择成功，但保存到配置失败: {e}", "path": selected_path}), 500

        else:
            logger.info(f"Tkinter 文件夹选择对话框 ({dialog_type}) 被取消或未返回路径。")
            return jsonify({"success": False,
                            "message": "文件夹选择已取消或未选择路径。"}), 200

    except subprocess.TimeoutExpired:
        logger.error(f"等待 Tkinter 对话框子进程超时 ({timeout_seconds}秒)。")
        return jsonify({"success": False,
                        "message": f"文件夹选择超时 ({timeout_seconds}秒)。请重试或手动输入路径。"}), 500
    except FileNotFoundError:
        logger.critical(f"无法找到 Python 可执行文件 ({sys.executable}) 或脚本 ({dialog_script_path}) 启动子进程。",
                        exc_info=True)
        return jsonify({"success": False, "message": "后端错误：无法启动文件夹选择器。"}), 500
    except Exception as e:
        logger.error(f"处理文件夹选择子进程结果时发生意外错误 ({dialog_type}): {e}", exc_info=True)
        return jsonify({"success": False, "message": f"处理选择时发生意外错误: {e}"}), 500

@app.route('/api/load_folders', methods=['POST'])
def load_folders():
    logger.info("接收到 /api/load_folders 请求。")
    try:
        data = request.get_json()
        if not data:
             logger.warning("/api/load_folders 请求体为空或不是有效的 JSON。")
             return jsonify({"success": False, "message": "请求需要有效的 JSON 主体。"}), 400

        jpg_folder = data.get('jpg_folder')
        raw_folder = data.get('raw_folder')

        logger.debug(f"接收到的加载请求参数: JPG='{jpg_folder}', RAW='{raw_folder}'")

        # load_folders 现在接受可选的 initial_index 和 sort_order
        initial_index = data.get('initial_index')
        sort_order = data.get('sort_order') # 接收前端传递的排序方式

        load_result = app_state.load_folders(jpg_folder, raw_folder, initial_index=initial_index, sort_order=sort_order)
        is_viewer_mode = not bool(raw_folder) # 如果 raw_folder 为空，则为看图模式
        load_result['is_viewer_mode'] = is_viewer_mode

        logger.info("/api/load_folders 处理成功。")
        return jsonify(load_result), 200

    except (FolderNotFoundError, NoImagePairsFoundError) as e:
         logger.warning(f"/api/load_folders 处理失败（文件夹/对未找到）: {e}")
         return jsonify({"success": False, "message": str(e)}), 404
    except (ImageSelectorError, ConfigError, ExternalToolError) as e:
         logger.error(f"/api/load_folders 处理失败: {e}", exc_info=True)
         return jsonify({"success": False, "message": f"加载图片时发生错误: {e}"}), 500
    except Exception as e:
         logger.error(f"/api/load_folders 发生未捕获的意外错误: {e}", exc_info=True)
         return jsonify({"success": False, "message": "加载图片时发生未知的服务器内部错误。"}), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    try:
        status = app_state.get_current_status()
        return jsonify(status), 200
    except Exception as e:
         logger.error(f"/api/status 发生未捕获的意外错误: {e}", exc_info=True)
         return jsonify({"success": False, "message": "获取应用状态时发生未知错误。"}), 500

@app.route('/api/load_history', methods=['GET'])
def load_history():
    logger.info("接收到 /api/load_history 请求。")
    jpg_folder = request.args.get('jpg_folder')

    if not jpg_folder:
        logger.warning("/api/load_history 请求缺少 jpg_folder 参数。")
        return jsonify({"success": False, "message": "缺少 jpg_folder 参数。"}), 400

    history_data = _load_history()
    folder_history = history_data.get(jpg_folder)

    if folder_history:
        logger.info(f"找到文件夹 '{jpg_folder}' 的历史记录。")
        return jsonify({"success": True, "history": folder_history}), 200
    else:
        logger.info(f"未找到文件夹 '{jpg_folder}' 的历史记录。")
        return jsonify({"success": False, "message": "未找到历史记录。"}), 404

@app.route('/api/save_history', methods=['POST'])
def save_history():
    logger.info("接收到 /api/save_history 请求。")
    try:
        data = request.get_json()
        if not data:
            logger.warning("/api/save_history 请求体为空或不是有效的 JSON。")
            return jsonify({"success": False, "message": "请求需要有效的 JSON 主体。"}), 400

        jpg_folder = data.get('jpg_folder')
        current_index = data.get('current_index')
        sort_order = data.get('sort_order')

        if not jpg_folder or current_index is None or sort_order is None:
            logger.warning("/api/save_history 请求缺少必要参数。")
            return jsonify({"success": False, "message": "缺少 jpg_folder, current_index 或 sort_order 参数。"}), 400

        history_data = _load_history()
        history_data[jpg_folder] = {
            "last_index": current_index,
            "sort_order": sort_order
        }
        _save_history(history_data)

        logger.info(f"成功保存文件夹 '{jpg_folder}' 的历史记录。")
        return jsonify({"success": True, "message": "历史记录已保存。"}), 200

    except Exception as e:
        logger.error(f"/api/save_history 发生未捕获的意外错误: {e}", exc_info=True)
        return jsonify({"success": False, "message": "保存历史记录时发生未知错误。"}), 500

@app.route('/api/select_image/<int:index>', methods=['POST'])
def select_image(index):
    logger.info(f"接收到 /api/select_image/{index} 请求。")
    try:
        updated_status = app_state.select_image(index)
        logger.info(f"/api/select_image/{index} 处理成功。")
        return jsonify(updated_status), 200

    except InvalidIndexError as e:
         logger.warning(f"/api/select_image/{index} 处理失败: {e}")
         return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        logger.error(f"/api/select_image/{index} 发生未捕获的意外错误: {e}", exc_info=True)
        return jsonify({"success": False, "message": "选择图片时发生未知的服务器内部错误。"}), 500

@app.route('/api/next_image', methods=['POST'])
def next_image():
    logger.info("接收到 /api/next_image 请求。")
    try:
        updated_status = app_state.next_image()
        logger.info("/api/next_image 处理成功。")
        return jsonify(updated_status), 200
    except InvalidIndexError as e:
         logger.warning(f"/api/next_image 处理失败: {e}")
         return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        logger.error(f"/api/next_image 发生未捕获的意外错误: {e}", exc_info=True)
        return jsonify({"success": False, "message": "切换到下一张图片时发生未知的服务器内部错误。"}), 500

@app.route('/api/previous_image', methods=['POST'])
def previous_image():
    logger.info("接收到 /api/previous_image 请求。")
    try:
        updated_status = app_state.prev_image()
        logger.info("/api/previous_image 处理成功。")
        return jsonify(updated_status), 200
    except InvalidIndexError as e:
         logger.warning(f"/api/previous_image 处理失败: {e}")
         return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        logger.error(f"/api/previous_image 发生未捕获的意外错误: {e}", exc_info=True)
        return jsonify({"success": False, "message": "切换到上一张图片时发生未知的服务器内部错误。"}), 500

@app.route('/api/image/thumbnail/<int:index>', methods=['GET'])
def get_thumbnail(index):
    try:
        jpg_path = app_state.get_image_file_path(index, 'jpg')

        img_byte_stream = file_manager.get_thumbnail(jpg_path)

        return send_file(
            img_byte_stream,
            mimetype='image/jpeg',
            as_attachment=False
        ), 200

    except InvalidIndexError as e:
         logger.warning(f"/api/image/thumbnail/{index} 处理失败: {e}")
         return jsonify({"success": False, "message": str(e)}), 400
    except FileNotFoundError as e:
         logger.warning(f"/api/image/thumbnail/{index} 处理失败，文件未找到: {e}")
         return jsonify({"success": False, "message": f"图片文件未找到 (索引 {index})."}), 404
    except ImageProcessingError as e:
         logger.error(f"/api/image/thumbnail/{index} 处理失败: {e}", exc_info=True)
         return jsonify({"success": False, "message": f"处理缩略图失败: {e}"}), 500
    except Exception as e:
        logger.error(f"/api/image/thumbnail/{index} 发生未捕获的意外错误: {e}", exc_info=True)
        return jsonify({"success": False, "message": "获取缩略图时发生未知的服务器内部错误。"}), 500

@app.route('/api/open_raw', methods=['POST'])
def open_raw_file():
    logger.info("接收到 /api/open_raw 请求。")
    try:
         app_state.open_current_raw()
         logger.info("/api/open_raw 处理成功。打开 RAW 指令已发送。")
         return jsonify({"success": True, "message": "尝试使用外部程序打开 RAW 文件..."}), 200

    except InvalidIndexError as e:
         logger.warning(f"/api/open_raw 处理失败: {e}")
         return jsonify({"success": False, "message": str(e)}), 400
    except (FileNotFoundError, ExternalToolError) as e:
         logger.error(f"/api/open_raw 处理失败: {e}", exc_info=True)
         return jsonify({"success": False, "message": f"无法打开 RAW 文件: {e}"}), 500
    except ImageSelectorError as e:
         logger.error(f"/api/open_raw 处理失败: {e}", exc_info=True)
         return jsonify({"success": False, "message": f"处理打开 RAW 文件请求时发生错误: {e}"}), 500
    except Exception as e:
         logger.error(f"/api/open_raw 发生未捕获的意外错误: {e}", exc_info=True)
         return jsonify({"success": False, "message": "打开 RAW 文件时发生未知的服务器内部错误。"}), 500

@app.route('/api/update_paths', methods=['POST'])
def update_paths():
     logger.info("接收到 /api/update_paths 请求。")
     try:
         data = request.get_json()
         if not data:
             logger.warning("/api/update_paths 请求体为空或不是有效的 JSON。")
             return jsonify({"success": False, "message": "请求需要有效的 JSON 主体。"}), 400

         jpg_folder = data.get('jpg_folder')
         raw_folder = data.get('raw_folder')

         logger.debug(f"接收到的更新路径参数: JPG='{jpg_folder}', RAW='{raw_folder}'")

         if not (isinstance(jpg_folder, (str, type(None))) and isinstance(raw_folder, (str, type(None)))):
             logger.warning("更新路径请求参数类型无效。")
             return jsonify({"success": False, "message": "无效的路径参数类型。"}), 400

         app_config.save_paths(jpg_folder, raw_folder)

         logger.info("/api/update_paths 处理成功。默认路径已更新到 .env 文件。")
         return jsonify({"success": True, "message": "默认文件夹路径已更新。"}), 200

     except ConfigError as e:
          logger.error(f"/api/update_paths 处理失败: {e}", exc_info=True)
          return jsonify({"success": False, "message": f"保存默认路径失败: {e}"}), 500
     except Exception as e:
         logger.error(f"/api/update_paths 发生未捕获的意外错误: {e}", exc_info=True)
         return jsonify({"success": False, "message": "更新默认路径时发生未知的服务器内部错误。"}), 500

@app.route('/api/image/preview/<int:index>', methods=['GET'])
def get_preview_image(index):
    logger.info(f"接收到 /api/image/preview/{index} 请求。")

    try:
        jpg_path = app_state.get_image_file_path(index, 'jpg')

        if not jpg_path:
            logger.warning(f"/api/image/preview/{index} 处理失败: 索引 {index} 对应的 JPG 路径不可用。")
            return jsonify({"success": False, "message": f"索引 {index} 对应的图片文件路径不可用。"}), 404

        img_byte_stream = file_manager.get_preview_image(jpg_path)

        logger.info(f"/api/image/preview/{index} 处理成功。返回图片流。")
        return send_file(
            img_byte_stream,
            mimetype='image/jpeg',
            as_attachment=False
        ), 200

    except InvalidIndexError as e:
         logger.warning(f"/api/image/preview/{index} 处理失败: {e}")
         return jsonify({"success": False, "message": str(e)}), 400
    except FileNotFoundError as e:
         logger.warning(f"/api/image/preview/{index} 处理失败，文件未找到: {e}")
         return jsonify({"success": False, "message": f"索引 {index} 对应的图片文件未找到。"}), 404
    except ImageProcessingError as e:
         logger.error(f"/api/image/preview/{index} 处理失败: {e}", exc_info=True)
         return jsonify({"success": False, "message": f"处理索引 {index} 的预览图片失败: {e}"}), 500
    except Exception as e:
        logger.error(f"/api/image/preview/{index} 发生未捕获的意外错误: {e}", exc_info=True)
        return jsonify({"success": False, "message": "获取预览图片时发生未知的服务器内部错误。"}), 500
