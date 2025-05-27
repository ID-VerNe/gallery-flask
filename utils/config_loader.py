import os
import sys

from dotenv import load_dotenv, set_key
import logging
from utils.exceptions import ConfigError

logger = logging.getLogger(__name__)

app_dir = os.path.dirname(sys.executable)

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')

class Config:
    def __init__(self):
        logger.info(f"尝试从 {env_path} 加载配置...")
        print(f"尝试从 {env_path} 加载配置...")

        if not os.path.exists(env_path):
            logger.warning(f".env 配置文件不存在: {env_path}. 将只使用环境变量或默认值。")
        else:
             load_dotenv(dotenv_path=env_path)
             logger.info(".env 配置加载完成。")

        try:
            self._config = {
                "DEFAULT_JPG_FOLDER": os.getenv("DEFAULT_JPG_FOLDER", "").strip(),
                "DEFAULT_RAW_FOLDER": os.getenv("DEFAULT_RAW_FOLDER", "").strip(),
                "CACHE_DIR_NAME": os.getenv("CACHE_DIR_NAME", "app_cache").strip(),
                "THUMBNAIL_WIDTH": int(os.getenv("THUMBNAIL_WIDTH", "150").strip()),
                "PHOTOSHOP_PATH": os.getenv("PHOTOSHOP_PATH", "C:\Program Files\Adobe\Adobe Photoshop 2025\Photoshop.exe").strip(),
                "FLASK_RUN_HOST": os.getenv("FLASK_RUN_HOST", "127.0.0.1").strip(),
                "FLASK_RUN_PORT": int(os.getenv("FLASK_RUN_PORT", "5000").strip()),
            }
            print(f"加载并解析的配置信息: {self._config}")
            logger.debug(f"加载并解析的配置信息: {self._config['CACHE_DIR_NAME']}")
        except ValueError as e:
             logger.critical(f"配置解析错误，无法将环境变量转换为指定类型: {e}", exc_info=True)
             raise ConfigError(f"配置文件格式或值错误: {e}") from e
        except Exception as e:
             logger.critical(f"配置加载时发生意外错误: {e}", exc_info=True)
             raise ConfigError(f"加载配置失败: {e}") from e

    def get(self, key, default=None):
        value = self._config.get(key, default)
        if value is None and default is None:
             logger.warning(f"配置键 '{key}' 未找到且未提供默认值，返回 None。")
        return value

    def get_all(self):
        return self._config.copy()

    def save_paths(self, jpg_folder, raw_folder):
         logger.info(f"尝试保存新的默认文件夹路径到 .env 文件: JPG='{jpg_folder or 'None'}', RAW='{raw_folder or 'None'}'")
         try:
             self._config["DEFAULT_JPG_FOLDER"] = jpg_folder if jpg_folder is not None else ""
             self._config["DEFAULT_RAW_FOLDER"] = raw_folder if raw_folder is not None else ""

             config_dir = os.path.dirname(env_path)
             if not os.path.exists(config_dir):
                 os.makedirs(config_dir)
                 logger.info(f"创建配置目录: {config_dir}")

             set_key(env_path, "DEFAULT_JPG_FOLDER", self._config["DEFAULT_JPG_FOLDER"])
             set_key(env_path, "DEFAULT_RAW_FOLDER", self._config["DEFAULT_RAW_FOLDER"])

             logger.info("成功保存默认文件夹路径到 .env 文件。")
             return True
         except Exception as e:
             logger.error(f"保存默认文件夹路径到 .env 文件时发生错误: {e}", exc_info=True)
             raise ConfigError(f"无法保存配置到 .env 文件: {e}") from e

try:
    app_config = Config()
except ConfigError:
    raise
