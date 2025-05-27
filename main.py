# --- ADD: Main entry point to run the Flask app ---
import logging
import os # Needed to check FLASK_DEBUG env var

# Import the Flask app instance from the interface layer
# Importing app_config here too ensures it's loaded early when this script runs
from interface.api import app # Assuming app instance is named 'app' in api.py
from utils.config_loader import app_config # Import to trigger config loading at startup if not already loaded

# --- LOGGING SETUP ---
# Basic logging configuration can also be done here if needed before Flask's logger is fully set up in api.py,
# but api.py's basicConfig should cover everything once imported.
# This logger is for the main script itself.
logger = logging.getLogger(__name__)

def run_app():
    """Runs the Flask application."""
    try:
        # Get host and port from the configuration
        host = app_config.get("FLASK_RUN_HOST")
        port = app_config.get("FLASK_RUN_PORT")
        # Determine debug mode using environment variable FLASK_DEBUG (standard Flask way)
        debug = os.getenv("FLASK_DEBUG", "False").lower() in ('true', '1', 't')

        # Ensure host and port are valid types (Config loader already converts, but defensive check)
        if not isinstance(host, str):
             logger.warning(f"从配置获取的 FLASK_RUN_HOST 类型无效: {type(host)}, 使用默认字符串。")
             host = "127.0.0.1"
        if not isinstance(port, int):
             # Try to convert if it's a string, otherwise fallback
            try:
                port = int(port)
                logger.warning(f"从配置获取的 FLASK_RUN_PORT 类型非整数，但成功转换为: {port}。")
            except (ValueError, TypeError):
                logger.warning(f"从配置获取的 FLASK_RUN_PORT 类型无效: {type(port)}, 使用默认整数 5000。")
                port = 5000

        logger.info(f"Starting Flask application at http://{host}:{port}")
        logger.info(f"Debug mode is {debug}")

        # Run the Flask development server
        # In a production scenario, you'd use a production-ready WSGI server like Gunicorn or uWSGI
        # For a local tool, Flask's built-in server is sufficient.
        app.run(host=host, port=port, debug=debug)

        logger.info("Flask application finished.")

    except Exception as e:
        # Catch any exceptions that prevent the app from starting or crash it unexpectedly
        logger.critical(f"运行 Flask 应用时发生致命错误: {e}", exc_info=True)
        # sys.exit(1) # Exit with a non-zero status code to indicate failure

if __name__ == '__main__':
    # This block executes when the script is run directly

    # Ensure logging is configured early, before other imports potentially log
    # A basic config here ensures messages from main.py and early imports are seen
    # The config in interface.api also sets up logging
    logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(levelname)s] [%(name)s.%(funcName)s] - %(message)s')
    logger.info("Application main entry point started.")

    # app_config instance is created upon import of utils.config_loader,
    # which loads the .env file automatically. If Config initialization raised an error,
    # the import might fail or the error will be propagated here.
    try:
        # Check if app_config was loaded successfully (e.g., by accessing a value)
        # This isn't strictly necessary as import errors would handle it, but clarifies dependencies.
        config_test = app_config.get("FLASK_RUN_PORT")
        logger.info(f"Configuration (e.g., FLASK_RUN_PORT={config_test}) loaded successfully.")
    except Exception as e:
        logger.critical(f"应用程序启动前加载配置失败: {e}", exc_info=True)
        # Exit if initial config loading failed
        import sys
        sys.exit(1)

    # Run the Flask application
    run_app()

    logger.info("Application main entry point finished.")

# --- END ADD ---