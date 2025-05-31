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
        self._sort_order = "time_filename" # Default sort order

    def load_folders(self, jpg_folder_path, raw_folder_path, initial_index=None, sort_order=None):
        logger.info(f"应用层尝试加载文件夹: JPG='{jpg_folder_path}', RAW='{raw_folder_path}', Initial Index={initial_index}, Sort Order={sort_order}")

        if not jpg_folder_path:
             logger.warning("尝试加载文件夹，但 JPG 路径为空。")
             raise FolderNotFoundError("JPG 文件夹路径不能为空。")

        try:
            # file_manager.find_image_pairs 已经在 domain 层实现了按时间+文件名排序
            # 如果未来需要其他排序方式，可以在这里根据 sort_order 参数调用不同的排序逻辑
            found_pairs = file_manager.find_image_pairs(jpg_folder_path, raw_folder_path)

            self._image_pairs = found_pairs

            # Set sort order
            self._sort_order = sort_order if sort_order is not None else "time_filename" # Use provided sort_order or default

            # Set initial index
            if initial_index is not None and 0 <= initial_index < len(self._image_pairs):
                self._current_index = initial_index
                logger.info(f"应用层根据历史记录设置初始索引为: {self._current_index}")
            else:
                self._current_index = 0 if self._image_pairs else -1
                if initial_index is not None: # Log if initial_index was provided but invalid
                     logger.warning(f"提供的初始索引 {initial_index} 无效，设置为默认索引 {self._current_index}。")
                else:
                     logger.info(f"未提供初始索引，设置为默认索引 {self._current_index}。")


            # 仅在加载时获取当前选中图片的元数据
            if self._image_pairs and self._current_index != -1:
                current_image_path = self._image_pairs[self._current_index]['jpg_path']
                metadata = file_manager.get_image_metadata(current_image_path)
                self._image_pairs[self._current_index]['metadata'] = metadata
                logger.debug(f"加载时获取了索引 {self._current_index} 的图片元数据。")
            elif self._image_pairs: # If there are images but index is -1 (shouldn't happen with current logic but for safety)
                 # Ensure metadata is initialized for all pairs if no initial index is set
                 for pair in self._image_pairs:
                      pair['metadata'] = {}
            else:
                # 如果没有图片，确保元数据为空
                pass # No images, no metadata to initialize

            self._jpg_folder = jpg_folder_path
            self._raw_folder = raw_folder_path
            self._is_loaded = len(self._image_pairs) > 0
            self._is_viewer_mode = not bool(raw_folder_path) # 根据 raw_folder_path 是否为空设置看图模式

            logger.info(f"应用层加载文件夹成功，找到 {len(self._image_pairs)} 对图片。当前索引设置为 {self._current_index}。看图模式: {self._is_viewer_mode}。排序方式: {self._sort_order}")

            frontend_pairs_info = []
            for i, pair in enumerate(self._image_pairs):
                 frontend_pairs_info.append({
                    "base_name": pair['base_name'],
                    "index": i,
                 })

            status = self.get_current_status()
            status["image_pairs_info"] = frontend_pairs_info
            status["is_viewer_mode"] = self._is_viewer_mode # 将看图模式状态添加到返回状态中
            status["sort_order"] = self._sort_order # 添加排序方式到返回状态中

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
        metadata = {} # 为 metadata 设置默认值

        if 0 <= self._current_index < len(self._image_pairs):
             current_pair = self._image_pairs[self._current_index]
             jpg_name = os.path.basename(current_pair.get('jpg_path')) if current_pair.get('jpg_path') else None
             raw_name = os.path.basename(current_pair.get('raw_path')) if current_pair.get('raw_path') else None
             metadata = current_pair.get('metadata', {}) # 获取元数据

        status = {
            "success": True,
            "current_index": self._current_index,
            "total_images": len(self._image_pairs),
            "jpg_file_name": jpg_name,
            "raw_file_name": raw_name,
            "jpg_folder": self._jpg_folder,
            "raw_folder": self._raw_folder,
            "is_loaded": self._is_loaded,
            "current_image_metadata": metadata, # 添加元数据到状态中
            "is_viewer_mode": self._is_viewer_mode if hasattr(self, '_is_viewer_mode') else False, # 添加看图模式状态
            "sort_order": self._sort_order if hasattr(self, '_sort_order') else "time_filename" # 添加排序方式到状态中
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

        # 获取当前选中图片的元数据（如果尚未加载）
        current_pair = self._image_pairs[self._current_index]
        if 'metadata' not in current_pair or not current_pair['metadata']:
            metadata = file_manager.get_image_metadata(current_pair['jpg_path'])
            current_pair['metadata'] = metadata
            logger.debug(f"按需加载了索引 {self._current_index} 的图片元数据。")

        return self.get_current_status()

    def next_image(self):
        logger.info(f"应用层前往下一张图片。当前索引: {self._current_index}, 总数: {len(self._image_pairs)}")

        if not self._image_pairs:
             logger.warning("应用层尝试前往下一张图片，但没有加载任何图片。")
             raise InvalidIndexError("当前没有加载任何图片对，无法前往下一张。")

        if 0 <= self._current_index < len(self._image_pairs) - 1:
            self._current_index += 1
            logger.info(f"应用层下一张图片索引为: {self._current_index}")
            # 获取当前选中图片的元数据（如果尚未加载）
            current_pair = self._image_pairs[self._current_index]
            if 'metadata' not in current_pair or not current_pair['metadata']:
                metadata = file_manager.get_image_metadata(current_pair['jpg_path'])
                current_pair['metadata'] = metadata
                logger.debug(f"按需加载了索引 {self._current_index} 的图片元数据。")
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
            # 获取当前选中图片的元数据（如果尚未加载）
            current_pair = self._image_pairs[self._current_index]
            if 'metadata' not in current_pair or not current_pair['metadata']:
                metadata = file_manager.get_image_metadata(current_pair['jpg_path'])
                current_pair['metadata'] = metadata
                logger.debug(f"按需加载了索引 {self._current_index} 的图片元数据。")
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
