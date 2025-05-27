# --- ADD: Configuration loading logic ---
import os
import sys

from dotenv import load_dotenv, set_key
import logging
from utils.exceptions import ConfigError # Import custom exception

# --- LOGGING SETUP ---
# Get logger for this module. Basic config is done in api.py or main.py.
logger = logging.getLogger(__name__)

app_dir = os.path.dirname(sys.executable)
# env_path = os.path.join(app_dir, '.env')

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')

class Config:
    """
    Loads and provides access to application configuration from environment variables (including .env).
    Handles saving specific configuration values back to the .env file.
     Assumes .env file is located in ./config relative to the directory containing main.py or the bundle root.
    """
    def __init__(self):
        # Determine the path to the .env file relative to the main script's assumed location
        # If main.py is at project_root, then .env is at project_root/config/.env
        # A more robust path might be based on the executable location after bundling
        # For development, assuming project_root where main.py is executed is fine.
        # We need the path relative to *this* file to locate main.py's directory.
        # Get the directory containing THIS file (config_loader.py)
        # this_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up one level (to utils) and then one more (to project_root)
        # project_root = os.path.join(this_dir, '..', '..')


        # print(f"项目根目录: {project_root}")
        # env_path = os.path.join(project_root, 'config', '.env')

        logger.info(f"尝试从 {env_path} 加载配置...")
        print(f"尝试从 {env_path} 加载配置...")

        if not os.path.exists(env_path):
            logger.warning(f".env 配置文件不存在: {env_path}. 将只使用环境变量或默认值。")
            # Create an empty .env file perhaps? Or let save_paths create it.
            # Let's let save_paths create it if it doesn't exist.
        else:
             # load_dotenv() looks for .env in the current directory and its parents by default,
             # but explicitly providing the path is safer especially after bundling.
             load_dotenv(dotenv_path=env_path)
             logger.info(".env 配置加载完成。")

        # Load configuration values, providing default fallback
        # Use type casting where necessary
        try:
            self._config = {
                # Strip whitespace from paths just in case
                "DEFAULT_JPG_FOLDER": os.getenv("DEFAULT_JPG_FOLDER", "").strip(),
                "DEFAULT_RAW_FOLDER": os.getenv("DEFAULT_RAW_FOLDER", "").strip(),
                "CACHE_DIR_NAME": os.getenv("CACHE_DIR_NAME", "app_cache").strip(),
                "THUMBNAIL_WIDTH": int(os.getenv("THUMBNAIL_WIDTH", "150").strip()), # Convert to int
                "PHOTOSHOP_PATH": os.getenv("PHOTOSHOP_PATH", "C:\Program Files\Adobe\Adobe Photoshop 2025\Photoshop.exe").strip(),
                "FLASK_RUN_HOST": os.getenv("FLASK_RUN_HOST", "127.0.0.1").strip(),
                "FLASK_RUN_PORT": int(os.getenv("FLASK_RUN_PORT", "5000").strip()), # Convert to int

                # Add other configs as needed
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
        """Retrieves a configuration value by key."""
        # logger.debug(f"尝试获取配置键: {key}") # Too verbose for debug
        value = self._config.get(key, default)
        if value is None and default is None:
             logger.warning(f"配置键 '{key}' 未找到且未提供默认值，返回 None。")
        # else:
        #     logger.debug(f"获取配置键 '{key}' 的值为: {value}") # Too verbose
        return value

    def get_all(self):
        """Returns a copy of all loaded configuration."""
        return self._config.copy()

    def save_paths(self, jpg_folder, raw_folder):
         """
         Saves the default folder paths back to the .env file.
         Uses python-dotenv's set_key for safe update or addition.
         """
         logger.info(f"尝试保存新的默认文件夹路径到 .env 文件: JPG='{jpg_folder or 'None'}', RAW='{raw_folder or 'None'}'")
         try:
             # Update internal state first
             self._config["DEFAULT_JPG_FOLDER"] = jpg_folder if jpg_folder is not None else "" # Ensure it's a string
             self._config["DEFAULT_RAW_FOLDER"] = raw_folder if raw_folder is not None else "" # Ensure it's a string

             # Determine the path to the .env file (same logic as __init__)
             # this_dir = os.path.dirname(os.path.abspath(__file__))
             # project_root = os.path.join(this_dir, '..', '..')
             # env_path = os.path.join(project_root, 'config', '.env')

             # Ensure the config directory exists
             config_dir = os.path.dirname(env_path)
             if not os.path.exists(config_dir):
                 os.makedirs(config_dir)
                 logger.info(f"创建配置目录: {config_dir}")

             # Use set_key to update or add keys in the .env file
             set_key(env_path, "DEFAULT_JPG_FOLDER", self._config["DEFAULT_JPG_FOLDER"])
             set_key(env_path, "DEFAULT_RAW_FOLDER", self._config["DEFAULT_RAW_FOLDER"])

             logger.info("成功保存默认文件夹路径到 .env 文件。")
             return True
         except Exception as e:
             logger.error(f"保存默认文件夹路径到 .env 文件时发生错误: {e}", exc_info=True)
             # Raise a custom exception
             raise ConfigError(f"无法保存配置到 .env 文件: {e}") from e

# Create a single instance to be imported and used across the application
# This instance is created when the module is first imported
try:
    app_config = Config()
except ConfigError:
    # If configuration loading fails at startup, the application cannot proceed.
    # We re-raise the exception. main.py or the entry point should handle this fatal error.
    raise
# --- END ADD ---