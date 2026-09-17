use crate::models::AppSettings;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self, String> {
        let db_path = get_db_path();
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("打开数据库失败 ({}): {}", db_path.display(), e))?;

        // Initialize tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| format!("创建 settings 表失败: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                jpg_folder TEXT PRIMARY KEY,
                raw_folder TEXT,
                last_index INTEGER,
                sort_order TEXT,
                updated_at INTEGER
            )",
            [],
        )
        .map_err(|e| format!("创建 sessions 表失败: {}", e))?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn load_settings(&self) -> Result<AppSettings, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut settings = AppSettings::default();

        let mut stmt = conn
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;

        for row in rows.flatten() {
            match row.0.as_str() {
                "default_jpg_folder" => settings.default_jpg_folder = row.1,
                "default_raw_folder" => settings.default_raw_folder = row.1,
                "photoshop_path" => settings.photoshop_path = row.1,
                "thumbnail_width" => {
                    if let Ok(w) = row.1.parse::<u32>() {
                        settings.thumbnail_width = w;
                    }
                }
                "sort_order" => settings.sort_order = row.1,
                _ => {}
            }
        }

        Ok(settings)
    }

    pub fn save_settings(&self, settings: &AppSettings) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let pairs = [
            ("default_jpg_folder", settings.default_jpg_folder.as_str()),
            ("default_raw_folder", settings.default_raw_folder.as_str()),
            ("photoshop_path", settings.photoshop_path.as_str()),
            ("thumbnail_width", &settings.thumbnail_width.to_string()),
            ("sort_order", settings.sort_order.as_str()),
        ];

        for (k, v) in pairs {
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = ?2",
                params![k, v],
            )
            .map_err(|e| format!("保存设置 '{}' 失败: {}", k, e))?;
        }

        Ok(())
    }

    pub fn save_session(
        &self,
        jpg_folder: &str,
        raw_folder: &str,
        last_index: usize,
        sort_order: &str,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        conn.execute(
            "INSERT INTO sessions (jpg_folder, raw_folder, last_index, sort_order, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(jpg_folder) DO UPDATE SET
                raw_folder = ?2,
                last_index = ?3,
                sort_order = ?4,
                updated_at = ?5",
            params![
                jpg_folder,
                raw_folder,
                last_index as i64,
                sort_order,
                now as i64
            ],
        )
        .map_err(|e| format!("保存会话失败: {}", e))?;

        Ok(())
    }

    pub fn load_session(&self, jpg_folder: &str) -> Result<Option<(usize, String)>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT last_index, sort_order FROM sessions WHERE jpg_folder = ?1")
            .map_err(|e| e.to_string())?;

        let mut rows = stmt.query(params![jpg_folder]).map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let last_index: i64 = row.get(0).unwrap_or(0);
            let sort_order: String = row.get(1).unwrap_or_else(|_| "time_filename".to_string());
            Ok(Some((last_index.max(0) as usize, sort_order)))
        } else {
            Ok(None)
        }
    }
}

fn get_db_path() -> PathBuf {
    let local = PathBuf::from("gallery_culling.db");
    if let Ok(_) = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .open(&local)
    {
        local
    } else {
        std::env::temp_dir().join("gallery_culling.db")
    }
}
