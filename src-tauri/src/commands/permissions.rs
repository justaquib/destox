use serde::Serialize;
use std::fs;

#[derive(Serialize)]
pub struct PermissionStatus {
    pub name: String,
    pub description: String,
    pub granted: bool,
}

#[tauri::command]
pub fn get_permissions() -> Result<Vec<PermissionStatus>, String> {
    let trash_ok = fs::read_dir(
        std::path::Path::new(&std::env::var("HOME").unwrap_or_default()).join(".Trash"),
    )
    .is_ok();

    let automation_ok = std::process::Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Finder\" to count items of trash")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    Ok(vec![
        PermissionStatus {
            name: "Full Disk Access".to_string(),
            description: "Required to scan files and read Trash.".to_string(),
            granted: trash_ok,
        },
        PermissionStatus {
            name: "Automation (Finder)".to_string(),
            description: "Required to recover or delete Trash items.".to_string(),
            granted: automation_ok,
        },
    ])
}

#[tauri::command]
pub fn open_permission_settings() -> Result<(), String> {
    let status = std::process::Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles")
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() {
        // fallback
        let _ = std::process::Command::new("open")
            .arg("/System/Library/PreferencePanes/Security.prefPane")
            .status();
    }
    Ok(())
}
