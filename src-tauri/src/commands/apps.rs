use base64::Engine;
use serde::Serialize;
use std::process::{Command, Stdio};

#[derive(Serialize)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    pub size_mb: u64,
    pub icon: Option<String>,
}

#[derive(Serialize)]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
    pub size_mb: u64,
    pub icon: Option<String>,
    pub installed_at: i64,
}

#[tauri::command]
pub fn get_installed_apps() -> Result<Vec<AppInfo>, String> {
    let output = Command::new("sh")
        .arg("-c")
        .arg("du -sk /Applications/*.app \"$HOME/Applications\"/*.app 2>/dev/null")
        .output()
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stdout);
    let mut apps: Vec<AppInfo> = text
        .lines()
        .filter_map(|line| {
            let (size, path) = line.split_once('\t')?;
            let size_kb: u64 = size.trim().parse().ok()?;
            let path = path.trim().to_string();
            let name = std::path::Path::new(&path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            if name.is_empty() {
                return None;
            }
            let icon = app_icon_data_url(&path);
            Some(AppInfo {
                name,
                path,
                size_mb: (size_kb + 1023) / 1024,
                icon,
            })
        })
        .collect();
    apps.sort_by(|a, b| b.size_mb.cmp(&a.size_mb));
    Ok(apps)
}


#[tauri::command]
pub fn get_recently_installed() -> Result<Vec<InstalledApp>, String> {
    let output = Command::new("sh")
        .arg("-c")
        .arg("du -sk /Applications/*.app \"$HOME/Applications\"/*.app 2>/dev/null")
        .output()
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stdout);
    let mut apps: Vec<InstalledApp> = text
        .lines()
        .filter_map(|line| {
            let (size, path) = line.split_once('\t')?;
            let size_kb: u64 = size.trim().parse().ok()?;
            let path = path.trim().to_string();
            let name = std::path::Path::new(&path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            if name.is_empty() {
                return None;
            }
            let installed_at = std::fs::metadata(&path)
                .and_then(|m| m.created())
                .map(|t| {
                    t.duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_secs() as i64)
                        .unwrap_or(0)
                })
                .unwrap_or(0);
            let icon = app_icon_data_url(&path);
            Some(InstalledApp {
                name,
                path,
                size_mb: (size_kb + 1023) / 1024,
                icon,
                installed_at,
            })
        })
        .collect();
    let cutoff = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
        - 30 * 24 * 60 * 60;
    apps.retain(|a| a.installed_at >= cutoff);
    apps.sort_by(|a, b| b.installed_at.cmp(&a.installed_at));
    apps.truncate(50);
    Ok(apps)
}

#[tauri::command]
pub fn uninstall_apps(paths: Vec<String>) -> Result<(), String> {
    for p in &paths {
        let src = std::path::Path::new(p);
        if !src.exists() {
            continue;
        }
        if src.is_dir() {
            std::fs::remove_dir_all(src).map_err(|e| format!("{}: {}", p, e))?;
        } else {
            std::fs::remove_file(src).map_err(|e| format!("{}: {}", p, e))?;
        }
    }

    let script = r#"
import os, plistlib, subprocess, sys, urllib.parse

def norm(value):
    if not value:
        return ""
    value = value.replace("file://", "", 1)
    try:
        value = urllib.parse.unquote(value)
    except Exception:
        pass
    return os.path.normpath(value.rstrip("/"))

targets = {norm(p) for p in sys.argv[1:]}
plist_path = os.path.expanduser("~/Library/Preferences/com.apple.dock.plist")
try:
    with open(plist_path, "rb") as f:
        plist = plistlib.load(f)
except Exception:
    sys.exit(0)

changed = False
for key in ("persistent-apps", "persistent-others"):
    items = plist.get(key)
    if not isinstance(items, list):
        continue
    filtered = []
    for item in items:
        url = ""
        try:
            url = item["tile-data"]["file-data"]["_CFURLString"]
        except Exception:
            url = ""
        if norm(url) in targets:
            changed = True
            continue
        filtered.append(item)
    plist[key] = filtered

if changed:
    with open(plist_path, "wb") as f:
        plistlib.dump(plist, f)
    subprocess.run(["killall", "Dock"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
"#;
    let mut cmd = Command::new("python3");
    cmd.arg("-c").arg(script);
    for p in &paths {
        cmd.arg(p);
    }
    let _ = cmd.output();

    Ok(())
}

fn app_icon_data_url(app_path: &str) -> Option<String> {
    let resources = std::path::Path::new(app_path).join("Contents/Resources");
    let icns = std::fs::read_dir(&resources).ok()?.filter_map(|e| e.ok()).find_map(|e| {
        let p = e.path();
        if p.extension().and_then(|x| x.to_str()) == Some("icns") {
            Some(p)
        } else {
            None
        }
    })?;
    let tmp = std::env::temp_dir().join(format!(
        "destox_icon_{}.png",
        app_path.replace('/', "_")
    ));
    let status = Command::new("sips")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .arg("-z")
        .arg("64")
        .arg("64")
        .arg("-s")
        .arg("format")
        .arg("png")
        .arg(&icns)
        .arg("--out")
        .arg(&tmp)
        .status()
        .ok()?;
    if !status.success() {
        return None;
    }
    let bytes = std::fs::read(&tmp).ok()?;
    let _ = std::fs::remove_file(&tmp);
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Some(format!("data:image/png;base64,{}", b64))
}
