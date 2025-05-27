import os
import logging
from PIL import Image, ImageOps, ExifTags
import subprocess
import platform
import hashlib
import io
import sys

from utils.exceptions import FolderNotFoundError, NoImagePairsFoundError, ImageProcessingError, ExternalToolError, \
    ImageSelectorError
from utils.config_loader import app_config

logger = logging.getLogger(__name__)

class FileManager:
    def __init__(self):
        self._thumbnail_bounding_box_size = (150, 150)
        logger.info("FileManager initialized.")
        self._cache_dir_name = app_config.get("CACHE_DIR_NAME") or "app_cache"
        self._thumbnail_width = app_config.get("THUMBNAIL_WIDTH") or 150
        self._photoshop_path = app_config.get("PHOTOSHOP_PATH")

        this_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.join(this_dir, '..', '..')
        self._cache_dir = os.path.join(project_root, self._cache_dir_name)

        self._ensure_cache_dir_exists()
        logger.info(f"缩略图缓存目录设置为: {self._cache_dir}")

    def _ensure_cache_dir_exists(self):
        logger.debug(f"检查缓存目录是否存在: {self._cache_dir}")
        if not os.path.exists(self._cache_dir):
            try:
                os.makedirs(self._cache_dir)
                logger.info(f"缓存目录创建成功: {self._cache_dir}")
            except OSError as e:
                logger.error(f"无法创建缓存目录 {self._cache_dir}: {e}", exc_info=True)
                pass

    def find_image_pairs(self, jpg_folder_path, raw_folder_path):
        logger.info(f"开始在文件夹中查找图片对: JPG='{jpg_folder_path}', RAW='{raw_folder_path}'")

        if not os.path.isdir(jpg_folder_path):
            logger.error(f"JPG 文件夹不存在或不是目录: {jpg_folder_path}")
            raise FolderNotFoundError(f"JPG 文件夹不存在或不是目录: {jpg_folder_path}")
        if not os.path.isdir(raw_folder_path):
            logger.error(f"RAW 文件夹不存在或不是目录: {raw_folder_path}")
            raise FolderNotFoundError(f"RAW 文件夹不存在或不是目录: {raw_folder_path}")

        jpg_extensions = ('.jpg', '.jpeg')
        raw_extensions = ('.cr2', '.nef', '.arw', '.dng', '.orf', '.rw2', '.3fr', '.ari', '.bmq', '.cap', '.cin', '.cxr', '.drf', '.dcs', '.dcr', '.dqf', '.efw', '.erf', '.fff', '.iiq', '.jpeg', '.j6f', '.kdc', '.mos', '.mrf', '.nrw', '.pef', '.pxn', '.qtk', '.raf', '.raw', '.rdc', '.sr2', '.srf', '.srw', '.x3f')

        jpg_files = {}
        logger.debug(f"扫描 JPG 文件夹: {jpg_folder_path}")
        try:
            for filename in os.listdir(jpg_folder_path):
                name, ext = os.path.splitext(filename)
                if ext.lower() in jpg_extensions:
                    jpg_files[name.lower()] = os.path.join(jpg_folder_path, filename)
        except OSError as e:
             logger.error(f"扫描 JPG 文件夹时发生错误: {jpg_folder_path}, 错误: {e}", exc_info=True)
             raise ImageSelectorError(f"无法读取 JPG 文件夹内容: {jpg_folder_path}") from e

        raw_files = {}
        logger.debug(f"扫描 RAW 文件夹: {raw_folder_path}")
        try:
            for filename in os.listdir(raw_folder_path):
                name, ext = os.path.splitext(filename)
                if ext.lower() in raw_extensions:
                    raw_files[name.lower()] = os.path.join(raw_folder_path, filename)
        except OSError as e:
             logger.error(f"扫描 RAW 文件夹时发生错误: {raw_folder_path}, 错误: {e}", exc_info=True)
             raise ImageSelectorError(f"无法读取 RAW 文件夹内容: {raw_folder_path}") from e

        image_pairs = []
        common_bases_lower = set(jpg_files.keys()).intersection(set(raw_files.keys()))

        logger.debug(f"找到的共有图片基名（忽略大小写）数量: {len(common_bases_lower)}")

        sorted_common_bases_lower = sorted(list(common_bases_lower))

        for base_name_lower in sorted_common_bases_lower:
           jpg_path = jpg_files.get(base_name_lower)
           raw_path = raw_files.get(base_name_lower)

           if jpg_path and raw_path:
                original_base_name_jpg = os.path.splitext(os.path.basename(jpg_path))[0]
                image_pairs.append({
                   "base_name": original_base_name_jpg,
                   "jpg_path": jpg_path,
                   "raw_path": raw_path,
               })
           else:
                logger.warning(f"找到匹配的低层级基名 '{base_name_lower}' 但无法在字典中找到原始文件路径。逻辑错误或异常文件。跳过。")

        if not image_pairs:
            logger.warning(f"在文件夹 '{jpg_folder_path}' 和 '{raw_folder_path}' 中没有找到匹配的图片对。")
            raise NoImagePairsFoundError("在指定的文件夹中没有找到匹配的图片对。")

        logger.info(f"图片对查找完成，找到 {len(image_pairs)} 对。")
        return image_pairs

    def _get_cache_path(self, original_file_path, suffix="thumb"):
        try:
            abs_file_path = os.path.abspath(original_file_path)
            mtime = os.path.getmtime(abs_file_path)
            unique_string = f"{abs_file_path}-{mtime}-{self._thumbnail_width}-{suffix}"
            cache_hash = hashlib.sha256(unique_string.encode('utf-8')).hexdigest()

            original_name = os.path.basename(original_file_path)
            base, _ = os.path.splitext(original_name)

            cache_filename = f"{cache_hash}_{base}_{suffix}.jpeg"

            cache_file_path = os.path.join(self._cache_dir, cache_filename)

            return cache_file_path
        except Exception as e:
             logger.error(f"生成缓存路径时发生错误 for '{original_file_path}': {e}", exc_info=True)
             raise ImageSelectorError(f"无法生成缓存文件路径: {os.path.basename(original_file_path)}") from e

    def get_thumbnail(self, file_path):
        logger.info(f"尝试获取缩略图 for: {os.path.basename(file_path)}")

        if not os.path.exists(file_path):
             logger.error(f"尝试获取缩略图时文件未找到: {file_path}")
             raise FileNotFoundError(f"图片文件未找到: {os.path.basename(file_path)}")

        cache_path = self._get_cache_path(file_path, suffix="thumb")

        if os.path.exists(cache_path):
            try:
                original_mtime = os.path.getmtime(file_path)
                cache_mtime = os.path.getmtime(cache_path)
                cache_size = os.path.getsize(cache_path)

                if cache_mtime >= original_mtime and cache_size > 0:
                    logger.debug(f"缩略图缓存命中且未过期: {os.path.basename(file_path)}")
                    with open(cache_path, 'rb') as f:
                        img_bytes = io.BytesIO(f.read())
                    img_bytes.seek(0)
                    return img_bytes
                else:
                    logger.debug(f"缩略图缓存过期或无效，将重新生成: {os.path.basename(file_path)}")
            except Exception as e:
                 logger.warning(f"读取或检查缩略图缓存时发生错误 ({cache_path}): {e}. 将重新生成。", exc_info=True)

        logger.debug(f"生成缩略图: {os.path.basename(file_path)}")
        img = None
        try:
            try:
                with Image.open(file_path) as original_img_handle:
                    img = ImageOps.exif_transpose(original_img_handle)

                if img is None:
                    logger.error(f"使用 with Image.open 打开图片后 img 对象为 None: {file_path}")
                    print(f"--- Image.open returned None after with block: {file_path} ---", file=sys.stderr,
                          flush=True)
                    return None

            except RecursionError as re:
                print(f"--- Thumbnail generator RecursionError (suppressed): {file_path} ---", file=sys.stderr,
                      flush=True)
                try:
                    logger.error(f"生成缩略图时捕获到 RecursionError: {file_path}")
                except Exception:
                    pass
                return None

            except FileNotFoundError:
                logger.error(f"生成缩略图文件未找到: {file_path}")
                print(f"--- Thumbnail FileNotFoundError: {file_path} ---", file=sys.stderr, flush=True)
                return None

            except Exception as e:
                logger.error(f"打开或转置图片 '{file_path}' 时发生错误: {e}")
                print(f"--- Error opening/transposing thumbnail {file_path}: {e} ---", file=sys.stderr, flush=True)
                return None

            img_width, img_height = img.size
            if img_width <= 0 or img_height <= 0:
                logger.warning(f"图片尺寸无效 ({img_width}x{img_height})，无法生成缩略图: {file_path}")
                print(f"--- Thumbnail invalid size {file_path}: {img_width}x{img_height} ---", file=sys.stderr,
                      flush=True)
                return None

            box_width, box_height = self._thumbnail_bounding_box_size
            scale = min(box_width / img_width, box_height / img_height)
            new_width = int(img_width * scale)
            new_height = int(img_height * scale)
            new_width = max(1, new_width)
            new_height = max(1, new_height)

            resized_img = None
            try:
                resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            except Exception as e:
                logger.error(f"缩放图片 '{file_path}' 时发生错误: {e}")
                print(f"--- Error resizing thumbnail {file_path}: {e} ---", file=sys.stderr, flush=True)
                return None

            if resized_img is None:
                logger.error(f"缩放图片后 resized_img 对象为 None: {file_path}")
                print(f"--- Resized image is None: {file_path} ---", file=sys.stderr, flush=True)
                return None

            padding_color = (249, 249, 249, 0)
            padded_img = Image.new("RGBA", self._thumbnail_bounding_box_size, padding_color)

            paste_x = (box_width - new_width) // 2
            paste_y = (box_height - new_height) // 2

            try:
                padded_img.paste(resized_img, (paste_x, paste_y))

            except Exception as e:
                logger.error(f"粘贴缩放后的图片到填充背景时发生错误: {file_path}, {e}")
                print(f"--- Error pasting thumbnail {file_path}: {e} ---", file=sys.stderr, flush=True)
                return None

            img_thumb = padded_img

            if cache_path:
                try:
                    img_thumb.save(cache_path, "PNG")
                except Exception as e:
                    logger.error(f"保存缩略图到缓存失败: {cache_path}: {e}")
                    print(f"--- Error saving thumbnail cache {cache_path}: {e} ---", file=sys.stderr, flush=True)

            logger.debug(f"生成带填充的缩略图成功: {file_path}")
            return img_thumb

        except Exception as e:
            logger.error(f"生成缩略图: '{file_path}' 时发生未预料错误 (处理阶段): {e}")
            print(f"--- Unexpected Error during thumbnail processing {file_path}: {e} ---", file=sys.stderr,
                  flush=True)
            return None

    def get_image_metadata(self, file_path):
        logger.info(f"尝试获取图片元数据 for: {os.path.basename(file_path)}")
        metadata = {
            "date_taken": None,
            "camera_make": None,
            "camera_model": None,
            "lens_model": None
        }
        try:
            with Image.open(file_path) as img:
                exif_data = img._getexif()
                if exif_data:
                    exif = {
                        ExifTags.TAGS[k]: v
                        for k, v in exif_data.items()
                        if k in ExifTags.TAGS
                    }

                    # 拍摄日期
                    if 'DateTimeOriginal' in exif:
                        metadata['date_taken'] = exif['DateTimeOriginal']
                    elif 'DateTimeDigitized' in exif:
                        metadata['date_taken'] = exif['DateTimeDigitized']
                    elif 'DateTime' in exif:
                        metadata['date_taken'] = exif['DateTime']

                    # 相机制造商和型号
                    if 'Make' in exif:
                        metadata['camera_make'] = exif['Make']
                    if 'Model' in exif:
                        metadata['camera_model'] = exif['Model']

                    # 镜头型号 (通常在 Exif IFD 或 MakerNote 中，这里只尝试常见的标签)
                    if 'LensModel' in exif:
                        metadata['lens_model'] = exif['LensModel']
                    elif 'Lens' in exif: # Some cameras might use 'Lens'
                        metadata['lens_model'] = exif['Lens']

        except Exception as e:
            logger.warning(f"无法从文件 '{file_path}' 读取 EXIF 数据: {e}", exc_info=True)
            # 如果无法读取，则返回 None 或默认值
            return {
                "date_taken": None,
                "camera_make": None,
                "camera_model": None,
                "lens_model": None
            }
        return metadata

    def get_preview_image(self, file_path):
        logger.info(f"尝试获取预览图片 for: {os.path.basename(file_path)}")

        if not os.path.exists(file_path):
             logger.error(f"尝试获取预览图片时文件未找到: {file_path}")
             raise FileNotFoundError(f"图片文件未找到: {os.path.basename(file_path)}")

        try:
            img = Image.open(file_path)
            logger.debug(f"Pillow 成功打开图片: {os.path.basename(file_path)}, 模式: {img.mode}, 尺寸: {img.size}")

            img = ImageOps.exif_transpose(img)
            logger.debug("应用 EXIF 转置。")

            if img.mode in ('RGBA', 'P'):
                 logger.debug("Converting image mode to RGB for preview.")
                 img = img.convert('RGB')
            elif img.mode != 'RGB':
                 logger.debug(f"Converting image mode {img.mode} to RGB for preview.")
                 img = img.convert('RGB')

            byte_io = io.BytesIO()
            img.save(byte_io, format='JPEG', optimize=True, quality=80)
            byte_io.seek(0)
            logger.debug(f"预览图片生成并返回成功: {os.path.basename(file_path)}, BytesIO size: {byte_io.getbuffer().nbytes} bytes")

            return byte_io

        except (FileNotFoundError, Image.UnidentifiedImageError) as e:
             logger.error(f"预览图片处理失败（文件不存在或不支持/损坏的格式）: {file_path}, 错误: {e}", exc_info=True)
             raise ImageProcessingError(f"无法处理预览图片文件或文件损坏: {os.path.basename(file_path)}") from e
        except Exception as e:
             logger.error(f"生成预览图片时发生意外错误: {file_path}, 错误: {e}", exc_info=True)
             raise ImageProcessingError(f"生成预览图片失败: {os.path.basename(file_path)}") from e

    def open_file_with_default_app(self, file_path):
        logger.info(f"尝试使用系统默认程序打开文件: {file_path}")

        if not os.path.exists(file_path):
             logger.error(f"尝试打开文件时文件未找到: {file_path}")
             raise FileNotFoundError(f"文件未找到，无法打开: {os.path.basename(file_path)}")

        try:
            raw_extensions = ('.cr2', '.nef', '.arw', '.dng', '.orf', '.rw2', '.3fr', '.ari', '.bmq', '.cap', '.cin', '.cxr', '.drf', '.dcs', '.dcr', '.dqf', '.efw', '.erf', '.fff', '.iiq', '.jpeg', '.j6f', '.kdc', '.mos', '.mrf', '.nrw', '.pef', '.pxn', '.qtk', '.raf', '.raw', '.rdc', '.sr2', '.srf', '.srw', '.x3f')
            _, file_extension = os.path.splitext(file_path)

            if file_extension.lower() in raw_extensions and self._photoshop_path and os.path.exists(self._photoshop_path):
                logger.info(f"文件 '{os.path.basename(file_path)}' 匹配 RAW 格式，尝试使用配置的 Photoshop 打开: {self._photoshop_path}")
                try:
                    subprocess.Popen([self._photoshop_path, file_path], shell=False)
                    logger.info("Photoshop 打开命令执行成功。")
                    return True
                except FileNotFoundError:
                     logger.error(f"尝试执行 Photoshop 但文件未找到: {self._photoshop_path}", exc_info=True)
                     raise ExternalToolError(f"配置的 Photoshop 可执行文件未找到: {self._photoshop_path}") from None
                except OSError as e:
                     logger.error(f"执行 Photoshop 命令时发生 OS 错误: {e}", exc_info=True)
                     raise ExternalToolError(f"执行 Photoshop 命令时发生错误: {e}") from e
                except Exception as e:
                     logger.error(f"执行 Photoshop 命令时发生意外错误: {e}", exc_info=True)
                     raise ImageSelectorError(f"执行 Photoshop 命令时发生意外错误: {e}") from e

            else:
                logger.debug(f"尝试使用系统默认程序打开文件: {file_path}")
                try:
                    if platform.system() == "Windows":
                        os.startfile(file_path)
                        logger.debug("Windows 系统下使用 os.startfile 打开文件。")

                    elif platform.system() == "Darwin":
                        subprocess.run(["open", file_path], check=True, capture_output=True)
                        logger.debug("macOS 系统下使用 'open' 命令打开文件。")

                    else:
                        subprocess.run(["xdg-open", file_path], check=True, capture_output=True)
                        logger.debug("Posix 系统下使用 'xdg-open' 命令打开文件。")

                    logger.info("系统默认打开命令执行成功。")
                    return True

                except FileNotFoundError:
                     logger.error(f"无法找到系统默认打开命令或程序路径异常 for: {file_path}", exc_info=True)
                     raise ExternalToolError(f"无法找到系统程序打开文件: {os.path.basename(file_path)}. 请确保文件类型有默认关联程序。") from None
                except subprocess.CalledProcessError as e:
                     logger.error(f"系统默认打开命令执行失败，返回码 {e.returncode} for: {file_path}. Stdout: {e.stdout.decode()}, Stderr: {e.stderr.decode()}", exc_info=True)
                     raise ExternalToolError(f"系统默认打开命令执行失败: {os.path.basename(file_path)}") from e
                except Exception as e:
                    logger.error(f"尝试使用系统默认程序打开文件时发生意外错误: {file_path}, 错误: {e}", exc_info=True)
                    raise ImageSelectorError(f"无法打开文件: {os.path.basename(file_path)}") from e

        except Exception as e:
             logger.error(f"打开文件时的顶层处理错误: {file_path}, 错误: {e}", exc_info=True)
             raise ImageSelectorError(f"处理打开文件请求时发生错误: {e}") from e

file_manager = FileManager()
