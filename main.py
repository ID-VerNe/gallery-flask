import logging
import os

from interface.api import app
from utils.config_loader import app_config

logger = logging.getLogger(__name__)

def run_app():
    try:
        host = app_config.get("FLASK_RUN_HOST")
        port = app_config.get("FLASK_RUN_PORT")
        debug = os.getenv("FLASK_DEBUG", "False").lower() in ('true', '1', 't')

        if not isinstance(host, str):
             logger.warning(f"从配置获取的 FLASK_RUN_HOST 类型无效: {type(host)}, 使用默认字符串。")
             host = "127.0.0.1"
        if not isinstance(port, int):
            try:
                port = int(port)
                logger.warning(f"从配置获取的 FLASK_RUN_PORT 类型非整数，但成功转换为: {port}。")
            except (ValueError, TypeError):
                logger.warning(f"从配置获取的 FLASK_RUN_PORT 类型无效: {type(port)}, 使用默认整数 5000。")
                port = 5000

        logger.info(f"Starting Flask application at http://{host}:{port}")
        logger.info(f"Debug mode is {debug}")

        app.run(host=host, port=port, debug=debug)

        logger.info("Flask application finished.")

    except Exception as e:
        logger.critical(f"运行 Flask 应用时发生致命错误: {e}", exc_info=True)

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(levelname)s] [%(name)s.%(funcName)s] - %(message)s')
    logger.info("Application main entry point started.")

    try:
        config_test = app_config.get("FLASK_RUN_PORT")
        logger.info(f"Configuration (e.g., FLASK_RUN_PORT={config_test}) loaded successfully.")
    except Exception as e:
        logger.critical(f"应用程序启动前加载配置失败: {e}", exc_info=True)
        import sys
        sys.exit(1)

    run_app()

