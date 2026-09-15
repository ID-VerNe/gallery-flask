use std::fs::{self, File};
use std::io::BufReader;
use std::path::{Path, PathBuf};
use sha2::{Digest, Sha256};
use image::{DynamicImage, GenericImageView, ImageFormat, RgbImage};
use fast_image_resize::images::Image as FirImage;
use fast_image_resize::{PixelType, Resizer};

/// Ensure thumbnail cache directory exists
pub fn get_cache_dir() -> PathBuf {
    // Priority: ./app_cache or AppData/Local/GalleryCulling/cache
    let project_cache = PathBuf::from("app_cache");
    if let Err(e) = fs::create_dir_all(&project_cache) {
        eprintln!("Failed to create local app_cache: {}, falling back to temp_dir", e);
        let fallback = std::env::temp_dir().join("gallery_culling_cache");
        let _ = fs::create_dir_all(&fallback);
        fallback
    } else {
        project_cache
    }
}

/// Generate unique cache file path based on image metadata
pub fn get_cache_path(file_path: &Path, width: u32) -> PathBuf {
    let abs_path = fs::canonicalize(file_path).unwrap_or_else(|_| file_path.to_path_buf());
    let mtime = fs::metadata(file_path)
        .and_then(|m| m.modified())
        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
        .unwrap_or(0);

    let key = format!("{}-{}-{}-thumb-v1", abs_path.to_string_lossy(), mtime, width);
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    let hash = format!("{:x}", hasher.finalize());

    let stem = file_path.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
    let filename = format!("{}_{}_{}.jpg", &hash[..16], stem, width);
    get_cache_dir().join(filename)
}

/// Try to extract embedded thumbnail from EXIF
pub fn try_extract_exif_thumbnail(file_path: &Path) -> Option<Vec<u8>> {
    let file = File::open(file_path).ok()?;
    let mut buf_reader = BufReader::new(file);
    let exifreader = exif::Reader::new();
    let exif = exifreader.read_from_container(&mut buf_reader).ok()?;

    // Some cameras store JPEG thumbnail in IFD1
    if let Some(offset_field) = exif.get_field(exif::Tag::JPEGInterchangeFormat, exif::In::THUMBNAIL) {
        if let Some(length_field) = exif.get_field(exif::Tag::JPEGInterchangeFormatLength, exif::In::THUMBNAIL) {
            if let (Some(offset), Some(length)) = (offset_field.value.get_uint(0), length_field.value.get_uint(0)) {
                use std::io::{Read, Seek, SeekFrom};
                let mut file = File::open(file_path).ok()?;
                file.seek(SeekFrom::Start(offset as u64)).ok()?;
                let mut thumb_buf = vec![0u8; length as usize];
                if file.read_exact(&mut thumb_buf).is_ok() {
                    return Some(thumb_buf);
                }
            }
        }
    }
    None
}

/// Fast downsample using fast_image_resize SIMD
pub fn resize_simd(img: &DynamicImage, target_width: u32) -> Result<RgbImage, String> {
    let (src_w, src_h) = img.dimensions();
    if src_w == 0 || src_h == 0 {
        return Err("Invalid image dimensions".to_string());
    }

    let scale = target_width as f64 / src_w as f64;
    let target_height = ((src_h as f64 * scale).round() as u32).max(1);

    let rgb = img.to_rgb8();
    let src_bytes = rgb.into_raw();

    let src_image = FirImage::from_vec_u8(src_w, src_h, src_bytes, PixelType::U8x3)
        .map_err(|e| format!("Fir source image error: {:?}", e))?;

    let mut dst_image = FirImage::new(target_width, target_height, PixelType::U8x3);

    let mut resizer = Resizer::new();
    resizer.resize(&src_image, &mut dst_image, None)
        .map_err(|e| format!("Resize error: {:?}", e))?;

    let dst_bytes = dst_image.into_vec();
    RgbImage::from_raw(target_width, target_height, dst_bytes)
        .ok_or_else(|| "Failed to construct RgbImage from resized bytes".to_string())
}

/// Generate or retrieve thumbnail path
pub fn get_or_create_thumbnail(file_path: &Path, target_width: u32) -> Result<String, String> {
    if !file_path.exists() {
        return Err(format!("文件不存在: {}", file_path.display()));
    }

    let cache_path = get_cache_path(file_path, target_width);

    // Cache hit check
    if cache_path.exists() {
        if let (Ok(orig_meta), Ok(cache_meta)) = (fs::metadata(file_path), fs::metadata(&cache_path)) {
            if let (Ok(orig_time), Ok(cache_time)) = (orig_meta.modified(), cache_meta.modified()) {
                if cache_time >= orig_time && cache_meta.len() > 0 {
                    return Ok(cache_path.to_string_lossy().to_string());
                }
            }
        }
    }

    // Try fast embedded thumbnail first
    if let Some(thumb_bytes) = try_extract_exif_thumbnail(file_path) {
        if let Ok(thumb_img) = image::load_from_memory(&thumb_bytes) {
            let resized = resize_simd(&thumb_img, target_width)?;
            resized.save_with_format(&cache_path, ImageFormat::Jpeg)
                .map_err(|e| format!("保存缩略图缓存失败: {}", e))?;
            return Ok(cache_path.to_string_lossy().to_string());
        }
    }

    // Full image fallback with SIMD resize
    let img = image::open(file_path)
        .map_err(|e| format!("无法打开图片进行缩放 ({}): {}", file_path.display(), e))?;

    let resized = resize_simd(&img, target_width)?;
    resized.save_with_format(&cache_path, ImageFormat::Jpeg)
        .map_err(|e| format!("保存缩略图缓存失败: {}", e))?;

    Ok(cache_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{DynamicImage, RgbImage};

    #[test]
    fn test_resize_simd() {
        let raw_img = RgbImage::new(400, 300);
        let dyn_img = DynamicImage::ImageRgb8(raw_img);
        let resized = resize_simd(&dyn_img, 100).expect("SIMD resize should succeed");
        assert_eq!(resized.width(), 100);
        assert_eq!(resized.height(), 75);
    }
}
