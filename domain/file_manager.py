# --- ADD: File Manager Implementation ---
import os
import logging
from PIL import Image, ImageOps # Used for image processing
import subprocess # Used for opening files with external applications
import platform # Used for detecting the operating system
import hashlib # Used for generating cache file names
import io # Used for working with image data in memory
import sys # Used for checking Python executable path for cache dir calculation

# Import custom exceptions and configuration
from utils.exceptions import FolderNotFoundError, NoImagePairsFoundError, ImageProcessingError, ExternalToolError, \
    ImageSelectorError
from utils.config_loader import app_config

# --- LOGGING SETUP ---
# Get logger for this module
logger = logging.getLogger(__name__)

class FileManager:
    """
    Handles all local file system and image processing operations.
    Interacts with Pillow, subprocess, os module.
    """
    def __init__(self):
        self._thumbnail_bounding_box_size = (150, 150)
        logger.info("FileManager initialized.")
        # Access config values
        self._cache_dir_name = app_config.get("CACHE_DIR_NAME") or "app_cache" # Fallback in case config fails
        self._thumbnail_width = app_config.get("THUMBNAIL_WIDTH") or 150
        self._photoshop_path = app_config.get("PHOTOSHOP_PATH")

        # Define cache path. A robust way is relative to the executable location.
        # In development, this is main.py's directory.
        # In PyInstaller onefile bundle, this is the temp extract directory.
        # In PyInstaller onedir bundle, this is the directory containing the executable.
        # A common approach is relative to sys.executable or sys.argv[0]'s directory.
        # Let's use the directory of main.py (assuming main.py is the entry) relative to config.
        # config is project_root/config. cache should be project_root/app_cache.
        # From domain/file_manager.py: '../..', then self._cache_dir_name
        this_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.join(this_dir, '..', '..')
        self._cache_dir = os.path.join(project_root, self._cache_dir_name)

        self._ensure_cache_dir_exists()
        logger.info(f"缩略图缓存目录设置为: {self._cache_dir}")

    def _ensure_cache_dir_exists(self):
        """Ensures the thumbnail cache directory exists."""
        logger.debug(f"检查缓存目录是否存在: {self._cache_dir}")
        if not os.path.exists(self._cache_dir):
            try:
                os.makedirs(self._cache_dir)
                logger.info(f"缓存目录创建成功: {self._cache_dir}")
            except OSError as e:
                logger.error(f"无法创建缓存目录 {self._cache_dir}: {e}", exc_info=True)
                # It might be acceptable to continue without cache, log a warning.
                # If cache is critical, re-raise as ConfigError or ImageSelectorError.
                # For now, just log and continue.
                pass

    def find_image_pairs(self, jpg_folder_path, raw_folder_path):
        """
        Scans folders and finds matching JPG/JPEG and RAW file pairs based on base name.
        Matches are case-insensitive on the base name part.

        Args:
            jpg_folder_path: Path to the folder containing JPG/JPEG files.
            raw_folder_path: Path to the folder containing RAW files.

        Returns:
            A list of dictionaries, where each dictionary represents a pair
            and contains 'base_name', 'jpg_path', 'raw_path'.
             The list is sorted by base_name.

        Raises:
            FolderNotFoundError: If either folder does not exist or is not a directory.
            NoImagePairsFoundError: If no matching pairs are found.
        """
        logger.info(f"开始在文件夹中查找图片对: JPG='{jpg_folder_path}', RAW='{raw_folder_path}'")

        # --- Input validation ---
        if not os.path.isdir(jpg_folder_path):
            logger.error(f"JPG 文件夹不存在或不是目录: {jpg_folder_path}")
            raise FolderNotFoundError(f"JPG 文件夹不存在或不是目录: {jpg_folder_path}")
        if not os.path.isdir(raw_folder_path):
            logger.error(f"RAW 文件夹不存在或不是目录: {raw_folder_path}")
            raise FolderNotFoundError(f"RAW 文件夹不存在或不是目录: {raw_folder_path}")

        # --- Define supported extensions (case-insensitive check) ---
        jpg_extensions = ('.jpg', '.jpeg')
        # Add common RAW extensions based on expected camera types
        raw_extensions = ('.cr2', '.nef', '.arw', '.dng', '.orf', '.rw2', '.3fr', '.ari', '.bmq', '.cap', '.cin', '.cxr', '.drf', '.dcs', '.dcr', '.dqf', '.efw', '.erf', '.fff', '.iiq', '.jpeg', '.j6f', '.kdc', '.mos', '.mrf', '.nrw', '.pef', '.pxn', '.qtk', '.raf', '.raw', '.rdc', '.sr2', '.srf', '.srw', '.x3f') # Extended list

        # --- Scan folders and build maps (lowercase base name -> full path) ---
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

        # --- Find matching base names and create image pairs list ---
        image_pairs = []
        # Find common base names (case-insensitive match on name part)
        common_bases_lower = set(jpg_files.keys()).intersection(set(raw_files.keys()))

        logger.debug(f"找到的共有图片基名（忽略大小写）数量: {len(common_bases_lower)}")

        # Sort the lowercased base names for consistent order
        sorted_common_bases_lower = sorted(list(common_bases_lower))

        # Build pair list using original file paths
        for base_name_lower in sorted_common_bases_lower:
           jpg_path = jpg_files.get(base_name_lower) # Already have paths from scanning
           raw_path = raw_files.get(base_name_lower) # Already have paths from scanning

           if jpg_path and raw_path:
                # Use the original filename for base_name entry for potentially better readability
                original_base_name_jpg = os.path.splitext(os.path.basename(jpg_path))[0]
                image_pairs.append({
                   "base_name": original_base_name_jpg, # Use original base name from JPG
                   "jpg_path": jpg_path,
                   "raw_path": raw_path,
               })
           else:
                # This case should ideally not happen if common_bases_lower intersection is correct
                logger.warning(f"找到匹配的低层级基名 '{base_name_lower}' 但无法在字典中找到原始文件路径。逻辑错误或异常文件。跳过。")

        if not image_pairs:
            logger.warning(f"在文件夹 '{jpg_folder_path}' 和 '{raw_folder_path}' 中没有找到匹配的图片对。")
            raise NoImagePairsFoundError("在指定的文件夹中没有找到匹配的图片对。")

        logger.info(f"图片对查找完成，找到 {len(image_pairs)} 对。")
        return image_pairs

    def _get_cache_path(self, original_file_path, suffix="thumb"):
        """
        Generates a unique cache file path for a given original file path and suffix.
        Uses a hash of the absolute file path and modification time to handle updates.
        Includes thumbnail width in the hash for cache busting if size changes.
        """
        try:
            # Use absolute path to avoid issues with relative paths and CWD changes
            abs_file_path = os.path.abspath(original_file_path)
            # Include modification time to regenerate cache if the original file changes
            mtime = os.path.getmtime(abs_file_path)
            # Include thumbnail width in the hash to regenerate if the desired size changes
            unique_string = f"{abs_file_path}-{mtime}-{self._thumbnail_width}-{suffix}"
            # Use SHA256 hash for robustness
            cache_hash = hashlib.sha256(unique_string.encode('utf-8')).hexdigest()

            # Use the original file's base name and extension, replace extension with .jpeg or .png
            original_name = os.path.basename(original_file_path)
            base, _ = os.path.splitext(original_name)

            # Construct the cache filename: hash_basename_suffix.jpeg/png
            cache_filename = f"{cache_hash}_{base}_{suffix}.jpeg" # Assume saving as JPEG

            cache_file_path = os.path.join(self._cache_dir, cache_filename)

            # logger.debug(f"为文件 '{original_name}' 生成缓存路径: {cache_file_path}") # Can be too verbose
            return cache_file_path
        except Exception as e:
             logger.error(f"生成缓存路径时发生错误 for '{original_file_path}': {e}", exc_info=True)
             # It's safer to raise an error if cache path generation fails
             raise ImageSelectorError(f"无法生成缓存文件路径: {os.path.basename(original_file_path)}") from e

    def get_thumbnail(self, file_path):
        """
        Gets the thumbnail image data (BytesIO) for a given file path.
        Uses a cache. Generates if not cached. Thumbnails are typically from JPGs.

        Args:
            file_path: The full path to the image file (usually JPG).

        Returns:
            BytesIO containing the thumbnail image data (JPEG format).

        Raises:
            ImageProcessingError: If image processing fails or file not found.
        """
        logger.info(f"尝试获取缩略图 for: {os.path.basename(file_path)}")

        if not os.path.exists(file_path):
             logger.error(f"尝试获取缩略图时文件未找到: {file_path}")
             raise FileNotFoundError(f"图片文件未找到: {os.path.basename(file_path)}") # Use standard FileNotFoundError

        # Get potential cache file path
        cache_path = self._get_cache_path(file_path, suffix="thumb")

        # --- Check Cache ---
        if os.path.exists(cache_path):
            try:
                # Check if original file is newer than cache file (or if cache is corrupt/zero size)
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
                    # Cache is old or invalid, fall through to regeneration
            except Exception as e:
                 logger.warning(f"读取或检查缩略图缓存时发生错误 ({cache_path}): {e}. 将重新生成。", exc_info=True)
                 # Error reading cache, fall through to regeneration

        # --- Generate Thumbnail ---
        logger.debug(f"生成缩略图: {os.path.basename(file_path)}")
        img = None
        try:
            # --- CRITICAL FIX AREA FOR EXCEPTIONS DURING OPEN/TRANSPOSE ---
            try:
                # Attempt to open the image file
                with Image.open(file_path) as original_img_handle:
                    # Apply EXIF orientation transpose
                    img = ImageOps.exif_transpose(original_img_handle)

                # --- Check if img object is valid after with block, even without exception ---
                if img is None:
                    logger.error(f"使用 with Image.open 打开图片后 img 对象为 None: {file_path}")  # No exc_info
                    print(f"--- Image.open returned None after with block: {file_path} ---", file=sys.stderr,
                          flush=True)
                    return None

            # Catch RecursionError specifically and handle minimally
            except RecursionError as re:
                print(f"--- Thumbnail generator RecursionError (suppressed): {file_path} ---", file=sys.stderr,
                      flush=True)
                # Only log a minimalistic message, avoid accessing 're' details if logging is problematic
                try:
                    logger.error(f"生成缩略图时捕获到 RecursionError: {file_path}")  # No exc_info
                except Exception:
                    pass
                return None  # Return None to indicate failure

            # Catch other Exceptions during the opening/transpose phase
            except FileNotFoundError:
                logger.error(f"生成缩略图文件未找到: {file_path}")  # No exc_info needed
                print(f"--- Thumbnail FileNotFoundError: {file_path} ---", file=sys.stderr, flush=True)
                return None

            except Exception as e:
                logger.error(f"打开或转置图片 '{file_path}' 时发生错误: {e}")  # No exc_info needed
                print(f"--- Error opening/transposing thumbnail {file_path}: {e} ---", file=sys.stderr, flush=True)
                return None

            # --- Continue processing if image was opened successfully (img is not None) ---
            img_width, img_height = img.size
            if img_width <= 0 or img_height <= 0:
                logger.warning(f"图片尺寸无效 ({img_width}x{img_height})，无法生成缩略图: {file_path}")  # No exc_info
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
                logger.error(f"缩放图片 '{file_path}' 时发生错误: {e}")  # No exc_info
                print(f"--- Error resizing thumbnail {file_path}: {e} ---", file=sys.stderr, flush=True)
                return None

            # --- Check if resized_img is valid ---
            if resized_img is None:
                logger.error(f"缩放图片后 resized_img 对象为 None: {file_path}")  # No exc_info
                print(f"--- Resized image is None: {file_path} ---", file=sys.stderr, flush=True)
                return None

            # Create padded image and paste
            padding_color = (249, 249, 249, 0)  # Light grey background
            padded_img = Image.new("RGBA", self._thumbnail_bounding_box_size, padding_color)

            paste_x = (box_width - new_width) // 2
            paste_y = (box_height - new_height) // 2

            try:
                # Paste the resized thumbnail onto the padded image.
                # Using paste without mask is generally safe for different modes if padded_img is RGBA
                # If resized_img has alpha you want preserved, use mask=resized_img
                # Let's assume simple paste is sufficient for padding.
                padded_img.paste(resized_img, (paste_x, paste_y))

            except Exception as e:
                logger.error(f"粘贴缩放后的图片到填充背景时发生错误: {file_path}, {e}")  # No exc_info
                print(f"--- Error pasting thumbnail {file_path}: {e} ---", file=sys.stderr, flush=True)
                return None

            img_thumb = padded_img  # This is the final RGBA image

            # Save to cache
            if cache_path:
                try:
                    # Save as PNG which supports alpha (from padding)
                    img_thumb.save(cache_path, "PNG")
                    # logger.debug(f"新生成带填充的缩略图并保存到缓存: {cache_path}")
                except Exception as e:
                    logger.error(f"保存缩略图到缓存失败: {cache_path}: {e}")  # No exc_info
                    print(f"--- Error saving thumbnail cache {cache_path}: {e} ---", file=sys.stderr, flush=True)

            logger.debug(f"生成带填充的缩略图成功: {file_path}")
            return img_thumb  # Return the RGBA image

        # This outer catch block catches errors in processing steps *after* opening/transposing
        # It should not catch the specific RecursionError from Image.open if handled inside
        except Exception as e:
            logger.error(f"生成缩略图: '{file_path}' 时发生未预料错误 (处理阶段): {e}")  # No exc_info
            print(f"--- Unexpected Error during thumbnail processing {file_path}: {e} ---", file=sys.stderr,
                  flush=True)
            return None

    def get_preview_image(self, file_path):
        """
        Gets the main preview image data (BytesIO) for a given file path.
        Usually taken from the JPG. Applies EXIF rotation. Does NOT cache previews.

        Args:
            file_path: The full path to the image file (usually JPG).

        Returns:
            BytesIO containing the preview image data (JPEG format).

        Raises:
            ImageProcessingError: If image processing fails or file not found.
        """
        logger.info(f"尝试获取预览图片 for: {os.path.basename(file_path)}") # Log before checks

        if not os.path.exists(file_path):
             logger.error(f"尝试获取预览图片时文件未找到: {file_path}") # Log specific error before raising
             raise FileNotFoundError(f"图片文件未找到: {os.path.basename(file_path)}") # Use standard FileNotFoundError

        try:
            # Open image using Pillow
            img = Image.open(file_path)
            logger.debug(f"Pillow 成功打开图片: {os.path.basename(file_path)}, 模式: {img.mode}, 尺寸: {img.size}")

            # Apply EXIF orientation if present
            img = ImageOps.exif_transpose(img)
            logger.debug("应用 EXIF 转置。")

            # Convert to RGB if not already. Previews are usually displayed in main browser area, JPEG is common.
            # RGBA might be useful if we had transparency needs, but for photos RGB is standard.
            if img.mode in ('RGBA', 'P'):
                 logger.debug("Converting image mode to RGB for preview.")
                 img = img.convert('RGB')
            elif img.mode != 'RGB':
                 # Convert other modes like L (grayscale) to RGB
                 logger.debug(f"Converting image mode {img.mode} to RGB for preview.")
                 img = img.convert('RGB')

            # Save to BytesIO (in-memory binary stream) as JPEG
            byte_io = io.BytesIO()
            # Quality can be adjusted, higher quality means larger file
            img.save(byte_io, format='JPEG', optimize=True, quality=80) # Slightly higher quality for preview
            byte_io.seek(0) # Rewind to the beginning of the stream
            logger.debug(f"预览图片生成并返回成功: {os.path.basename(file_path)}, BytesIO size: {byte_io.getbuffer().nbytes} bytes")

            return byte_io

        except (FileNotFoundError, Image.UnidentifiedImageError) as e:
             logger.error(f"预览图片处理失败（文件不存在或不支持/损坏的格式）: {file_path}, 错误: {e}", exc_info=True)
             raise ImageProcessingError(f"无法处理预览图片文件或文件损坏: {os.path.basename(file_path)}") from e
        except Exception as e:
             # Catch any other exceptions during processing
             logger.error(f"生成预览图片时发生意外错误: {file_path}, 错误: {e}", exc_info=True)
             raise ImageProcessingError(f"生成预览图片失败: {os.path.basename(file_path)}") from e

    def open_file_with_default_app(self, file_path):
        """
        Opens the given file with the system's default application or configured one (for RAW).

        Args:
            file_path: The full path to the file to open.

        Returns:
            True if the command was successfully issued/os.startfile called.

        Raises:
            FileNotFoundError: If the file_path does not exist.
            ExternalToolError: If the external program cannot be found or executed.
            ImageSelectorError: For other unexpected errors.
        """
        logger.info(f"尝试使用系统默认程序打开文件: {file_path}")

        if not os.path.exists(file_path):
             logger.error(f"尝试打开文件时文件未找到: {file_path}")
             raise FileNotFoundError(f"文件未找到，无法打开: {os.path.basename(file_path)}")

        try:
            # Define common RAW extensions again for this specific check
            raw_extensions = ('.cr2', '.nef', '.arw', '.dng', '.orf', '.rw2', '.3fr', '.ari', '.bmq', '.cap', '.cin', '.cxr', '.drf', '.dcs', '.dcr', '.dqf', '.efw', '.erf', '.fff', '.iiq', '.jpeg', '.j6f', '.kdc', '.mos', '.mrf', '.nrw', '.pef', '.pxn', '.qtk', '.raf', '.raw', '.rdc', '.sr2', '.srf', '.srw', '.x3f')
            _, file_extension = os.path.splitext(file_path)

            # --- Use configured Photoshop path for RAWs if provided and exists ---
            if file_extension.lower() in raw_extensions and self._photoshop_path and os.path.exists(self._photoshop_path):
                logger.info(f"文件 '{os.path.basename(file_path)}' 匹配 RAW 格式，尝试使用配置的 Photoshop 打开: {self._photoshop_path}")
                try:
                    # Use subprocess.Popen for non-blocking start
                    subprocess.Popen([self._photoshop_path, file_path], shell=False)
                    logger.info("Photoshop 打开命令执行成功。")
                    return True
                except FileNotFoundError:
                     # This specific FileNotFoundError means the PHOTOSHOP_PATH executable wasn't found
                     logger.error(f"尝试执行 Photoshop 但文件未找到: {self._photoshop_path}", exc_info=True)
                     # Fallback to system default if Photoshop not found? Or explicitly fail?
                     # Let's explicitly fail as user configured Photoshop.
                     raise ExternalToolError(f"配置的 Photoshop 可执行文件未找到: {self._photoshop_path}") from None
                except OSError as e:
                     # Other OS errors during subprocess execution
                     logger.error(f"执行 Photoshop 命令时发生 OS 错误: {e}", exc_info=True)
                     raise ExternalToolError(f"执行 Photoshop 命令时发生错误: {e}") from e
                except Exception as e:
                     # Catch any other unexpected errors during Popen
                     logger.error(f"执行 Photoshop 命令时发生意外错误: {e}", exc_info=True)
                     raise ImageSelectorError(f"执行 Photoshop 命令时发生意外错误: {e}") from e

            # --- Use system default application ---
            else:
                logger.debug(f"尝试使用系统默认程序打开文件: {file_path}")
                try:
                    if platform.system() == "Windows":
                        # os.startfile is the standard way on Windows to open with default app
                        os.startfile(file_path)
                        logger.debug("Windows 系统下使用 os.startfile 打开文件。")
                        # Note: os.startfile is usually asynchronous but might block briefly in some contexts.
                        # Alternative using subprocess (more control, potentially complex):
                        # subprocess.Popen(['start', '', file_path.replace('/', '\\')], shell=True) # Requires shell=True, path format adjusted

                    elif platform.system() == "Darwin": # macOS
                        # 'open' command is the standard way on macOS
                        subprocess.run(["open", file_path], check=True, capture_output=True)
                        # check=True will raise CalledProcessError if command fails (e.g., no associated app)
                        logger.debug("macOS 系统下使用 'open' 命令打开文件。")

                    else: # Linux and other Posix systems (e.g., using xdg-open)
                        # xdg-open is the standard utility on many Linux desktops
                        subprocess.run(["xdg-open", file_path], check=True, capture_output=True)
                        logger.debug("Posix 系统下使用 'xdg-open' 命令打开文件。")

                    logger.info("系统默认打开命令执行成功。")
                    return True

                except FileNotFoundError:
                     # This FileNotFoundError means the command ('open', 'xdg-open', or 'start' if used with shell=True) wasn't found
                     logger.error(f"无法找到系统默认打开命令或程序路径异常 for: {file_path}", exc_info=True)
                     raise ExternalToolError(f"无法找到系统程序打开文件: {os.path.basename(file_path)}. 请确保文件类型有默认关联程序。") from None
                except subprocess.CalledProcessError as e:
                     # Command executed but returned a non-zero exit code
                     logger.error(f"系统默认打开命令执行失败，返回码 {e.returncode} for: {file_path}. Stdout: {e.stdout.decode()}, Stderr: {e.stderr.decode()}", exc_info=True)
                     raise ExternalToolError(f"系统默认打开命令执行失败: {os.path.basename(file_path)}") from e
                except Exception as e:
                    # Catch any other unexpected exceptions
                    logger.error(f"尝试使用系统默认程序打开文件时发生意外错误: {file_path}, 错误: {e}", exc_info=True)
                    raise ImageSelectorError(f"无法打开文件: {os.path.basename(file_path)}") from e

        except Exception as e:
             # Catch any exceptions from the outer logic (like initial checks)
             logger.error(f"打开文件时的顶层处理错误: {file_path}, 错误: {e}", exc_info=True)
             raise ImageSelectorError(f"处理打开文件请求时发生错误: {e}") from e

    # TODO: Potential methods for clearing cache or managing cache size
    # def clear_cache(self): ...

# Create a single instance to be imported and used by the application layer
# This instance is created when the module is first imported
file_manager = FileManager()
# --- END ADD ---