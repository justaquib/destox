use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct TrashItem {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub is_dir: bool,
    pub modified_at: String,
}

fn escape_applescript(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn run_osascript(script: &str) -> Result<String, String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn get_trash_items() -> Result<Vec<TrashItem>, String> {
    let script = r#"
tell application "Finder"
  set out to ""
  set trashItems to every item of trash
  repeat with i in trashItems
    set n to name of i
    set s to size of i
    set d to modification date of i as string
    set isDir to (class of i is folder)
    set out to out & n & (character id 9) & s & (character id 9) & d & (character id 9) & isDir & (character id 10)
  end repeat
  return out
end tell
"#;
    let output = run_osascript(script)?;
    let mut items = Vec::new();
    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 4 {
            continue;
        }
        let name = parts[0].to_string();
        let size_bytes: u64 = parts[1].trim().parse().unwrap_or(0);
        let modified_at = parts[2].to_string();
        let is_dir = parts[3].trim().eq_ignore_ascii_case("true");
        items.push(TrashItem {
            name: name.clone(),
            path: name,
            size_bytes,
            is_dir,
            modified_at,
        });
    }
    Ok(items)
}

#[tauri::command]
pub fn delete_trash_item(path: String) -> Result<(), String> {
    let name = escape_applescript(&path);
    let script = format!(
        r#"tell application "Finder" to delete (first item of trash whose name is "{}")"#,
        name
    );
    run_osascript(&script)?;
    Ok(())
}

#[tauri::command]
pub fn recover_trash_item(path: String) -> Result<String, String> {
    let name = escape_applescript(&path);
    let script = format!(
        r#"tell application "Finder" to move (first item of trash whose name is "{}") to desktop"#,
        name
    );
    run_osascript(&script)?;
    Ok("Recovered to Desktop".to_string())
}
