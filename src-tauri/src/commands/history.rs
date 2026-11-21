use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone)]
pub struct DeletedApp {
    pub name: String,
    pub size_mb: u64,
    pub deleted_at: String,
}

fn storage_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".destox").join("recently_deleted.json")
}

fn read_all() -> Vec<DeletedApp> {
    let path = storage_path();
    let Ok(data) = fs::read_to_string(&path) else {
        return Vec::new();
    };
    serde_json::from_str(&data).unwrap_or_default()
}

fn write_all(items: &[DeletedApp]) -> Result<(), String> {
    let path = storage_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(items).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_recently_deleted() -> Result<Vec<DeletedApp>, String> {
    Ok(read_all())
}

#[tauri::command]
pub fn record_deleted_apps(apps: Vec<DeletedApp>) -> Result<(), String> {
    let mut items = read_all();
    items.extend(apps);
    // keep most recent 100
    if items.len() > 100 {
        let start = items.len() - 100;
        items = items[start..].to_vec();
    }
    write_all(&items)
}

#[tauri::command]
pub fn clear_recently_deleted() -> Result<(), String> {
    write_all(&[])
}
