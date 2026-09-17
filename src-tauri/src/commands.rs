use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::State;

use crate::db::Database;
use crate::models::{AppSettings, ExportItem, FolderScanResult};
use crate::scanner::scan_folders;
use crate::thumbnail::get_or_create_thumbnail;
use crate::xmp::{update_xmp_metadata, write_xmp};

pub struct AppState {
    pub db: Database,
}

#[tauri::command]
pub async fn scan_folders_cmd(
    jpg_folder: String,
    raw_folder: Option<String>,
    sort_order: Option<String>,
) -> Result<FolderScanResult, String> {
    let sort = sort_order.unwrap_or_else(|| "time_filename".to_string());
    tokio::task::spawn_blocking(move || {
        scan_folders(&jpg_folder, raw_folder.as_deref(), &sort)
    })
    .await
    .map_err(|e| format!("扫描任务异常: {}", e))?
}

#[tauri::command]
pub async fn get_thumbnail_cmd(
    file_path: String,
    width: Option<u32>,
) -> Result<String, String> {
    let target_width = width.unwrap_or(200);
    tokio::task::spawn_blocking(move || {
        let path = Path::new(&file_path);
        get_or_create_thumbnail(path, target_width)
    })
    .await
    .map_err(|e| format!("生成缩略图任务异常: {}", e))?
}

#[tauri::command]
pub async fn update_rating_flag_cmd(
    file_path: String,
    rating: u8,
    flag: String,
    sync_xmp: bool,
) -> Result<bool, String> {
    tokio::task::spawn_blocking(move || {
        let path = Path::new(&file_path);
        if sync_xmp {
            write_xmp(path, rating, &flag)?;
        }
        Ok(true)
    })
    .await
    .map_err(|e| format!("更新评级任务异常: {}", e))?
}

#[tauri::command]
pub async fn batch_update_metadata_cmd(
    file_paths: Vec<String>,
    lens_model: Option<String>,
    focal_length: Option<String>,
    aperture: Option<String>,
) -> Result<usize, String> {
    tokio::task::spawn_blocking(move || {
        let mut count = 0;
        let lens = lens_model.as_deref();
        let focal = focal_length.as_deref();
        let ap = aperture.as_deref();

        for file_path in file_paths {
            let path = Path::new(&file_path);
            if path.exists() {
                if update_xmp_metadata(path, lens, focal, ap).is_ok() {
                    count += 1;
                }
            }
        }
        Ok(count)
    })
    .await
    .map_err(|e| format!("批量更新元数据任务异常: {}", e))?
}

#[tauri::command]
pub async fn open_in_photoshop_cmd(
    file_path: String,
    custom_ps_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let settings = state.db.load_settings().unwrap_or_default();
    let raw_ps_path = custom_ps_path
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(settings.photoshop_path);

    let ps_path = raw_ps_path.trim_matches(|c| c == '"' || c == '\'' || c == ' ').to_string();

    if !Path::new(&ps_path).exists() {
        // Fallback to default app
        return open_in_default_app_cmd(file_path).await;
    }

    Command::new(&ps_path)
        .arg(&file_path)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("启动 Photoshop 失败 ({}): {}", ps_path, e))?;

    Ok(true)
}

#[tauri::command]
pub async fn open_in_default_app_cmd(file_path: String) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "", &file_path])
            .spawn()
            .map_err(|e| format!("无法使用系统默认程序打开文件: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("无法使用系统默认程序打开文件: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("无法使用系统默认程序打开文件: {}", e))?;
    }

    Ok(true)
}

#[tauri::command]
pub async fn trash_photos_cmd(file_paths: Vec<String>) -> Result<usize, String> {
    tokio::task::spawn_blocking(move || {
        let mut count = 0;
        for path_str in file_paths {
            let path = Path::new(&path_str);
            if path.exists() {
                if trash::delete(path).is_ok() {
                    count += 1;
                }
            }
        }
        Ok(count)
    })
    .await
    .map_err(|e| format!("移动至回收站失败: {}", e))?
}

#[tauri::command]
pub async fn batch_export_cmd(
    items: Vec<ExportItem>,
    target_folder: String,
    include_raw: bool,
    include_jpg: bool,
) -> Result<usize, String> {
    tokio::task::spawn_blocking(move || {
        let target_dir = Path::new(&target_folder);
        if !target_dir.exists() {
            fs::create_dir_all(target_dir)
                .map_err(|e| format!("创建目标导出目录失败: {}", e))?;
        }

        let mut exported = 0;
        for item in items {
            // Copy JPG if requested
            if include_jpg {
                if let Some(jpg_path_str) = &item.jpg_path {
                    let src = Path::new(jpg_path_str);
                    if src.exists() {
                        if let Some(file_name) = src.file_name() {
                            let dst = target_dir.join(file_name);
                            if fs::copy(src, dst).is_ok() {
                                exported += 1;
                            }
                        }
                    }
                }
            }

            // Copy RAW if requested
            if include_raw {
                if let Some(raw_path_str) = &item.raw_path {
                    let src = Path::new(raw_path_str);
                    if src.exists() {
                        if let Some(file_name) = src.file_name() {
                            let dst = target_dir.join(file_name);
                            if fs::copy(src, dst).is_ok() {
                                exported += 1;
                            }
                        }
                        // Also copy matching .xmp if exists
                        let xmp_src = src.with_extension("xmp");
                        if xmp_src.exists() {
                            if let Some(xmp_name) = xmp_src.file_name() {
                                let xmp_dst = target_dir.join(xmp_name);
                                let _ = fs::copy(xmp_src, xmp_dst);
                            }
                        }
                    }
                }
            }
        }

        Ok(exported)
    })
    .await
    .map_err(|e| format!("批量导出任务异常: {}", e))?
}

#[tauri::command]
pub fn get_settings_cmd(state: State<'_, AppState>) -> Result<AppSettings, String> {
    state.db.load_settings()
}

#[tauri::command]
pub fn save_settings_cmd(settings: AppSettings, state: State<'_, AppState>) -> Result<bool, String> {
    state.db.save_settings(&settings)?;
    Ok(true)
}

#[tauri::command]
pub fn save_session_cmd(
    jpg_folder: String,
    raw_folder: String,
    last_index: usize,
    sort_order: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    state
        .db
        .save_session(&jpg_folder, &raw_folder, last_index, &sort_order)?;
    Ok(true)
}

#[tauri::command]
pub fn load_session_cmd(
    jpg_folder: String,
    state: State<'_, AppState>,
) -> Result<Option<(usize, String)>, String> {
    state.db.load_session(&jpg_folder)
}
