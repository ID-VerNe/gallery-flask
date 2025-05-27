import logging
import os

from domain.file_manager import file_manager
from utils.config_loader import app_config
from utils.exceptions import FolderNotFoundError, NoImagePairsFoundError, InvalidIndexError, ImageSelectorError, \
    ExternalToolError

logger = logging.getLogger(__name__)

class ImageSelectorApp:
    def __init__(self):
        logger.info("ImageSelectorApp initialized.")
        self._image_pairs = []
        self._current_index = -1
        self._jpg_folder = ""
        self._raw_folder = ""
        self._is_loaded = False

    def load_folders(self, jpg_folder_path, raw_folder_path):
        logger.info(f"应用层尝试加载文件夹: JPG='{jpg_folder_path}', RAW='{raw_folder_path}'")

        if not jpg_folder_path or not raw_folder_path:
             logger.warning("尝试加载文件夹，但其中一个或两个路径为空。")
             raise FolderNotFoundError("JPG 和 RAW 文件夹路径不能为空。")

        try:
            found_pairs = file_manager.find_image_pairs(jpg_folder_path, raw_folder_path)

            self._image_pairs = found_pairs
            self._current_index = 0 if self._image_pairs else -1
            self._jpg_folder = jpg_folder_path
            self._raw_folder = raw_folder_path
            self._is_loaded = len(self._image_pairs) > 0

            logger.info(f"应用层加载文件夹成功，找到 {len(self._image_pairs)} 对图片。当前索引设置为 {self._current_index}。")

            frontend_pairs_info = []
            for i, pair in enumerate(self._image_pairs):
                 frontend_pairs_info.append({
                    "base_name": pair['base_name'],
                    "index": i,
                 })

            status = self.get_current_status()
            status["image_pairs_info"] = frontend_pairs_info

            return status

        except (FolderNotFoundError, NoImagePairsFoundError) as e:
             logger.warning(f"应用层加载文件夹失败（文件/对未找到）：{e}")
             self._image_pairs = []
             self._current_index = -1
             self._is_loaded = False
             raise e
        except ImageSelectorError as e:
             logger.error(f"应用层加载文件夹时发生领域层错误: {e}", exc_info=True)
             self._image_pairs = []
             self._current_index = -1
             self._is_loaded = False
             raise e
        except Exception as e:
            logger.error(f"应用层加载文件夹时发生未定义错误: {e}", exc_info=True)
            self._image_pairs = []
            self._current_index = -1
            self._is_loaded = False
            raise ImageSelectorError(f"加载图片时发生意外错误: {e}") from e

    def get_current_status(self):
        current_pair = None
        jpg_name = None
        raw_name = None

        if 0 <= self._current_index < len(self._image_pairs):
             current_pair = self._image_pairs[self._current_index]
             jpg_name = os.path.basename(current_pair.get('jpg_path')) if current_pair.get('jpg_path') else None
             raw_name = os.path.basename(current_pair.get('raw_path')) if current_pair.get('raw_path') else None

        status = {
            "success": True,
            "current_index": self._current_index,
            "total_images": len(self._image_pairs),
            "jpg_file_name": jpg_name,
            "raw_file_name": raw_name,
            "jpg_folder": self._jpg_folder,
            "raw_folder": self._raw_folder,
            "is_loaded": self._is_loaded,
        }
        return status

    def select_image(self, index):
        logger.info(f"应用层尝试选择图片对索引: {index}. 当前总数: {len(self._image_pairs)}")

        if not (0 <= index < len(self._image_pairs)):
            logger.warning(f"尝试选择无效索引: {index}. 当前总数: {len(self._image_pairs)}")
            if not self._image_pairs:
                 raise InvalidIndexError("当前没有加载任何图片对，无法选择索引。")
            else:
                raise InvalidIndexError(f"无效的图片索引: {index}. 有效范围是 0 到 {len(self._image_pairs) - 1}。")

        self._current_index = index
        logger.info(f"应用层图片对索引成功切换为: {self._current_index}")

        return self.get_current_status()

    def next_image(self):
        logger.info(f"应用层前往下一张图片。当前索引: {self._current_index}, 总数: {len(self._image_pairs)}")

        if not self._image_pairs:
             logger.warning("应用层尝试前往下一张图片，但没有加载任何图片。")
             raise InvalidIndexError("当前没有加载任何图片对，无法前往下一张。")

        if 0 <= self._current_index < len(self._image_pairs) - 1:
            self._current_index += 1
            logger.info(f"应用层下一张图片索引为: {self._current_index}")
        else:
            logger.warning("应用层已在最后一张图片，无法前往下一张。索引保持不变。")

        return self.get_current_status()

    def prev_image(self):
        logger.info(f"应用层返回上一张图片。当前索引: {self._current_index}, 总数: {len(self._image_pairs)}")

        if not self._image_pairs:
            logger.warning("应用层尝试返回上一张图片，但没有加载任何图片。")
            raise InvalidIndexError("当前没有加载任何图片对，无法返回上一张。")

        if self._current_index > 0:
            self._current_index -= 1
            logger.info(f"应用层上一张图片索引为: {self._current_index}")
        else:
            logger.warning("应用层已在第一张图片，无法返回上一张。索引保持不变。")

        return self.get_current_status()

    def get_image_file_path(self, index, file_type='jpg'):
        if not (0 <= index < len(self._image_pairs)):
            logger.warning(f"尝试获取文件路径时索引无效: {index}. 总数: {len(self._image_pairs)}")
            raise InvalidIndexError(f"无效的图片索引: {index}")

        if file_type not in ['jpg', 'raw']:
             logger.error(f"应用层获取文件路径时文件类型无效: {file_type}")
             raise ImageSelectorError(f"无效的文件类型请求: {file_type}")

        pair = self._image_pairs[index]
        key = f"{file_type}_path"

        file_path = pair.get(key)

        if not file_path:
             logger.error(f"应用层获取文件路径时，索引 {index} 的图片对缺少文件类型 '{file_type}' 的路径信息。")
             raise ImageSelectorError(f"图片对数据不完整，缺少文件类型 '{file_type}' 的路径。")

        return file_path

    def get_current_jpg_path(self):
         if self._current_index != -1 and 0 <= self._current_index < len(self._image_pairs):
              try:
                  return self.get_image_file_path(self._current_index, 'jpg')
              except ImageSelectorError as e:
                  logger.error(f"获取当前 JPG 路径失败: {e}", exc_info=True)
                  return None
         logger.debug("应用层尝试获取当前 JPG 路径但未选中任何图片或图片列表为空。")
         return None

    def get_current_raw_path(self):
        if self._current_index != -1 and 0 <= self._current_index < len(self._image_pairs):
             try:
                return self.get_image_file_path(self._current_index, 'raw')
             except ImageSelectorError as e:
                  logger.error(f"获取当前 RAW 路径失败: {e}", exc_info=True)
                  return None
        logger.debug("应用层尝试获取当前 RAW 路径但未选中任何图片或图片列表为空。")
        return None

    def open_current_raw(self):
        logger.info("应用层请求打开当前 RAW 文件。")
        raw_path = self.get_current_raw_path()

        if raw_path:
             try:
                success = file_manager.open_file_with_default_app(raw_path)
                logger.info("应用层成功调用 FileManager 打开 RAW 路径。")
                return success
             except (FileNotFoundError, ExternalToolError, ImageSelectorError) as e:
                  logger.error(f"应用层调用 FileManager 打开 RAW 路径时失败: {e}", exc_info=True)
                  raise e
             except Exception as e:
                 logger.error(f"应用层调用 FileManager 打开 RAW 路径时发生意外错误: {e}", exc_info=True)
                 raise ImageSelectorError(f"无法打开 RAW 文件: {e}") from e
        else:
            logger.warning("应用层尝试打开 RAW 文件但未选中任何图片或对应的 RAW 路径不可用。")
            raise InvalidIndexError("请选择一张图片对后再尝试打开 RAW 文件。")

app_state = ImageSelectorApp()
