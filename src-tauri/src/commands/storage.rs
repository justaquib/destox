use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct StorageInfo {
    pub name: String,
    pub total_gb: f64,
    pub free_gb: f64,
    pub used_percent: f64,
}

#[tauri::command]
pub fn get_storage_info() -> Result<StorageInfo, String> {
    let output = Command::new("df")
        .args(["-k", "/"])
        .output()
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stdout);
    let mut lines = text.lines();
    lines.next();
    let line = lines.next().ok_or("no df output")?;
    let cols: Vec<&str> = line.split_whitespace().collect();
    if cols.len() < 4 {
        return Err("unexpected df output".into());
    }
    let total_kb: f64 = cols[1].parse().map_err(|_| "bad total")?;
    let avail_kb: f64 = cols[3].parse().map_err(|_| "bad avail")?;
    let total_gb = total_kb / 1024.0 / 1024.0;
    let free_gb = avail_kb / 1024.0 / 1024.0;
    let used_percent = (1.0 - avail_kb / total_kb) * 100.0;

    let name = Command::new("diskutil")
        .args(["info", "/"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|t| {
            t.lines()
                .find(|l| l.trim().starts_with("Volume Name:"))
                .map(|l| l.split(':').nth(1).unwrap_or("").trim().to_string())
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "Macintosh HD".to_string());

    Ok(StorageInfo {
        name,
        total_gb,
        free_gb,
        used_percent,
    })
}
