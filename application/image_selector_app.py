# --- ADD: Application Logic Implementation ---
import logging
import os

# Import dependencies from lower layers
from domain.file_manager import file_manager # Depend on the domain layer instance (singleton)
from utils.config_loader import app_config # Depend on config loader instance (singleton)
from utils.exceptions import FolderNotFoundError, NoImagePairsFoundError, InvalidIndexError, ImageSelectorError, \
    ExternalToolError  # Import relevant exceptions

# --- LOGGING SETUP ---
# Get logger for this module
logger = logging.getLogger(__name__)

class ImageSelectorApp:
    """
    Manages the application state and coordinates between API and Domain layers.
    Holds the list of image pairs and the currently selected index.
    """
    def __init__(self):
        logger.info("ImageSelectorApp initialized.")
        # Internal state variables
        self._image_pairs = [] # List of dicts from FileManager: [{"base_name": ..., "jpg_path": ..., "raw_path": ...}, ...]
        self._current_index = -1 # -1 indicates no image is selected
        self._jpg_folder = "" # Path of the currently loaded JPG folder
        self._raw_folder = "" # Path of the currently loaded RAW folder
        self._is_loaded = False # Flag indicating if folders have been successfully loaded

    def load_folders(self, jpg_folder_path, raw_folder_path):
        """
        Scans the specified folders for image pairs, updates internal state,
        and returns initial status and image pair info for frontend.

        Args:
            jpg_folder_path: Path to JPG folder.
            raw_folder_path: Path to RAW folder.

        Returns:
            A dictionary containing initial status and image pair info for frontend.

        Raises:
            FolderNotFoundError: If folders are invalid or not found by file_manager.
            NoImagePairsFoundError: If no pairs are found by file_manager.
            ImageSelectorError: For unexpected errors during the process.
        """
        logger.info(f"应用层尝试加载文件夹: JPG='{jpg_folder_path}', RAW='{raw_folder_path}'")

        # --- Input validation (basic) ---
        if not jpg_folder_path or not raw_folder_path:
             logger.warning("尝试加载文件夹，但其中一个或两个路径为空。")
             raise FolderNotFoundError("JPG 和 RAW 文件夹路径不能为空。")

        # --- Use FileManager to find image pairs ---
        try:
            # file_manager handles validation on existence and type
            found_pairs = file_manager.find_image_pairs(jpg_folder_path, raw_folder_path)

            self._image_pairs = found_pairs
            self._current_index = 0 if self._image_pairs else -1 # Select first image if pairs found
            self._jpg_folder = jpg_folder_path
            self._raw_folder = raw_folder_path
            self._is_loaded = len(self._image_pairs) > 0

            logger.info(f"应用层加载文件夹成功，找到 {len(self._image_pairs)} 对图片。当前索引设置为 {self._current_index}。")

            # Prepare minimal data for the frontend's thumbnail list
            # Frontend only needs base_name and index to request thumbnails/previews
            frontend_pairs_info = []
            for i, pair in enumerate(self._image_pairs):
                 frontend_pairs_info.append({
                    "base_name": pair['base_name'],
                    "index": i,
                    # Add other lightweight info if needed, but avoid passing file paths back
                 })

            # Return the initial status and the list of pairs info
            status = self.get_current_status()
            status["image_pairs_info"] = frontend_pairs_info # Add the list of pairs info

            return status

        except (FolderNotFoundError, NoImagePairsFoundError) as e:
             # These are expected business logic errors from the domain layer
             logger.warning(f"应用层加载文件夹失败（文件/对未找到）：{e}")
             self._image_pairs = [] # Clear state on failure
             self._current_index = -1
             self._is_loaded = False
             # Re-raise the specific exceptions for the API layer to handle
             raise e
        except ImageSelectorError as e:
             # Catch other custom errors from FileManager (e.g., reading directory failed)
             logger.error(f"应用层加载文件夹时发生领域层错误: {e}", exc_info=True)
             self._image_pairs = []
             self._current_index = -1
             self._is_loaded = False
             raise e # Re-raise
        except Exception as e:
            # Catch any other unexpected errors
            logger.error(f"应用层加载文件夹时发生未定义错误: {e}", exc_info=True)
            self._image_pairs = []
            self._current_index = -1
            self._is_loaded = False
            # Wrap in a generic app-level error
            raise ImageSelectorError(f"加载图片时发生意外错误: {e}") from e

    def get_current_status(self):
        """
        Returns the current application status.

        Returns:
            A dictionary containing status information:
            - success: always True if this function succeeds
            - current_index: currently selected index (-1 if none)
            - total_images: total number of image pairs loaded
            - jpg_file_name: base name of the current JPG file (or None)
            - raw_file_name: base name of the current RAW file (or None)
            - jpg_folder: path of the loaded JPG folder
            - raw_folder: path of the loaded RAW folder
            - is_loaded: boolean indicating if folders were loaded successfully
        """
        # logger.debug(f"应用层获取当前状态。索引: {self._current_index}, 总数: {len(self._image_pairs)}") # Too verbose

        current_pair = None
        jpg_name = None
        raw_name = None

        if 0 <= self._current_index < len(self._image_pairs):
             current_pair = self._image_pairs[self._current_index]
             jpg_name = os.path.basename(current_pair.get('jpg_path')) if current_pair.get('jpg_path') else None
             raw_name = os.path.basename(current_pair.get('raw_path')) if current_pair.get('raw_path') else None

        status = {
            "success": True, # Indicate the status retrieval was successful
            "current_index": self._current_index,
            "total_images": len(self._image_pairs),
            "jpg_file_name": jpg_name,
            "raw_file_name": raw_name,
            "jpg_folder": self._jpg_folder,
            "raw_folder": self._raw_folder,
            "is_loaded": self._is_loaded,
        }
        # logger.debug(f"当前状态: {status}") # Too verbose
        return status

    def select_image(self, index):
        """
        Sets the current selected image index and returns the updated status.

        Args:
            index: The zero-based index of the image pair to select.

        Returns:
             The updated status dictionary.

        Raises:
            InvalidIndexError: If the index is out of bounds for the current image pairs list.
        """
        logger.info(f"应用层尝试选择图片对索引: {index}. 当前总数: {len(self._image_pairs)}")

        if not (0 <= index < len(self._image_pairs)):
            logger.warning(f"尝试选择无效索引: {index}. 当前总数: {len(self._image_pairs)}")
            # Check if any images are loaded at all
            if not self._image_pairs:
                 raise InvalidIndexError("当前没有加载任何图片对，无法选择索引。")
            else:
                raise InvalidIndexError(f"无效的图片索引: {index}. 有效范围是 0 到 {len(self._image_pairs) - 1}。")

        # Update state
        self._current_index = index
        logger.info(f"应用层图片对索引成功切换为: {self._current_index}")

        # Return updated status
        return self.get_current_status()

    def next_image(self):
        """
        Selects the next image in the list and returns the updated status.

        Returns:
             The updated status dictionary. If already at the last image, status reflects that.

        Raises:
            InvalidIndexError: If no images are loaded.
        """
        logger.info(f"应用层前往下一张图片。当前索引: {self._current_index}, 总数: {len(self._image_pairs)}")

        if not self._image_pairs:
             logger.warning("应用层尝试前往下一张图片，但没有加载任何图片。")
             raise InvalidIndexError("当前没有加载任何图片对，无法前往下一张。")

        if 0 <= self._current_index < len(self._image_pairs) - 1:
            # Increment if not already at the last index
            self._current_index += 1
            logger.info(f"应用层下一张图片索引为: {self._current_index}")
        else:
            # Already at the last image
            logger.warning("应用层已在最后一张图片，无法前往下一张。索引保持不变。")

        # Return updated status regardless of whether index changed
        return self.get_current_status()

    def prev_image(self):
        """
        Selects the previous image in the list and returns the updated status.

        Returns:
             The updated status dictionary. If already at the first image, status reflects that.

        Raises:
            InvalidIndexError: If no images are loaded.
        """
        logger.info(f"应用层返回上一张图片。当前索引: {self._current_index}, 总数: {len(self._image_pairs)}")

        if not self._image_pairs:
            logger.warning("应用层尝试返回上一张图片，但没有加载任何图片。")
            raise InvalidIndexError("当前没有加载任何图片对，无法返回上一张。")

        if self._current_index > 0:
            # Decrement if not already at the first index (index 0)
            self._current_index -= 1
            logger.info(f"应用层上一张图片索引为: {self._current_index}")
        else:
            # Already at the first image
            logger.warning("应用层已在第一张图片，无法返回上一张。索引保持不变。")

        # Return updated status regardless of whether index changed
        return self.get_current_status()

    def get_image_file_path(self, index, file_type='jpg'):
        """
        Gets the full file path for a specific image type ('jpg' or 'raw') and index.

        Args:
            index: The index of the image pair.
            file_type: 'jpg' or 'raw'.

        Returns:
            The full file path string.

        Raises:
            InvalidIndexError: If the index is out of bounds.
            ImageSelectorError: If file_type is invalid or path is missing in pair data.
        """
        # logger.debug(f"应用层获取文件路径，索引: {index}, 类型: {file_type}") # Too verbose

        if not (0 <= index < len(self._image_pairs)):
            logger.warning(f"尝试获取文件路径时索引无效: {index}. 总数: {len(self._image_pairs)}")
            raise InvalidIndexError(f"无效的图片索引: {index}")

        if file_type not in ['jpg', 'raw']:
             logger.error(f"应用层获取文件路径时文件类型无效: {file_type}")
             raise ImageSelectorError(f"无效的文件类型请求: {file_type}")

        pair = self._image_pairs[index]
        key = f"{file_type}_path"

        file_path = pair.get(key) # Use .get for safety

        if not file_path:
             logger.error(f"应用层获取文件路径时，索引 {index} 的图片对缺少文件类型 '{file_type}' 的路径信息。")
             # This indicates an issue when image_pairs was created
             raise ImageSelectorError(f"图片对数据不完整，缺少文件类型 '{file_type}' 的路径。")

        # logger.debug(f"应用层获取到文件路径: {file_path} for index {index} type {file_type}") # Too verbose
        return file_path

    def get_current_jpg_path(self):
         """Gets the JPG path for the currently selected image, returns None if no image is selected."""
         # logger.debug("应用层获取当前 JPG 路径。") # Too verbose
         if self._current_index != -1 and 0 <= self._current_index < len(self._image_pairs):
              try:
                  return self.get_image_file_path(self._current_index, 'jpg')
              except ImageSelectorError as e:
                  logger.error(f"获取当前 JPG 路径失败: {e}", exc_info=True)
                  return None # Return None if path is missing/invalid for current index
         logger.debug("应用层尝试获取当前 JPG 路径但未选中任何图片或图片列表为空。")
         return None

    def get_current_raw_path(self):
        """Gets the RAW path for the currently selected image, returns None if no image is selected."""
        # logger.debug("应用层获取当前 RAW 路径。") # Too verbose
        if self._current_index != -1 and 0 <= self._current_index < len(self._image_pairs):
             try:
                return self.get_image_file_path(self._current_index, 'raw')
             except ImageSelectorError as e:
                  logger.error(f"获取当前 RAW 路径失败: {e}", exc_info=True)
                  return None # Return None if path is missing/invalid for current index
        logger.debug("应用层尝试获取当前 RAW 路径但未选中任何图片或图片列表为空。")
        return None

    def open_current_raw(self):
        """
        Triggers the FileManager to open the currently selected RAW file.

        Returns:
            Return value from file_manager.open_file_with_default_app

        Raises:
            InvalidIndexError: If no image is selected.
            ExternalToolError: If the external program fails (propagated from FileManager).
            ImageSelectorError: For other errors (propagated or wrapped).
        """
        logger.info("应用层请求打开当前 RAW 文件。")
        raw_path = self.get_current_raw_path()

        if raw_path:
             try:
                # Delegate the task to the FileManager
                success = file_manager.open_file_with_default_app(raw_path)
                logger.info("应用层成功调用 FileManager 打开 RAW 路径。")
                return success
             except (FileNotFoundError, ExternalToolError, ImageSelectorError) as e:
                  # Catch specific expected errors or wrapped errors from FileManager
                  logger.error(f"应用层调用 FileManager 打开 RAW 路径时失败: {e}", exc_info=True)
                  raise e # Re-raise the specific error
             except Exception as e:
                 # Catch any other unexpected errors during the call
                 logger.error(f"应用层调用 FileManager 打开 RAW 路径时发生意外错误: {e}", exc_info=True)
                 # Wrap in a generic app-level error if not already a custom one
                 raise ImageSelectorError(f"无法打开 RAW 文件: {e}") from e
        else:
            logger.warning("应用层尝试打开 RAW 文件但未选中任何图片或对应的 RAW 路径不可用。")
            # Raise an error if no image is selected or path isn't found
            raise InvalidIndexError("请选择一张图片对后再尝试打开 RAW 文件。")

# Create a single instance of the application state manager
# This instance holds the state for the entire application lifecycle
app_state = ImageSelectorApp()
# --- END ADD ---