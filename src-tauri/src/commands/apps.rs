use base64::Engine;
use serde::Serialize;
use std::process::Command;
use std::path::Path;

#[derive(Serialize)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    pub size_mb: u64,
    pub icon: Option<String>,
    pub protected: bool,
}

#[derive(Serialize)]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
    pub size_mb: u64,
    pub icon: Option<String>,
    pub installed_at: i64,
}

#[derive(Serialize)]
pub struct AppDetails {
    pub app_type: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub bundle_identifier: Option<String>,
    pub version: Option<String>,
    pub build_version: Option<String>,
    pub publisher: Option<String>,
    pub team_identifier: Option<String>,
    pub last_used: Option<String>,
    pub document_extensions: Vec<String>,
    pub copyright: Option<String>,
}

fn plist_string(value: Option<&plist::Value>, key: &str) -> Option<String> {
    value?
        .as_dictionary()?
        .get(key)?
        .as_string()
        .map(str::to_string)
        .filter(|text| !text.trim().is_empty())
}

fn spotlight_value(path: &str, key: &str) -> Option<String> {
    let output = Command::new("mdls")
        .args(["-raw", "-name", key, path])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let value = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if value.is_empty() || value == "(null)" || value == "null" {
        None
    } else {
        Some(value)
    }
}

fn signature_info(path: &str) -> (Option<String>, Option<String>) {
    let Ok(output) = Command::new("codesign")
        .args(["-dv", "--verbose=4", path])
        .output()
    else {
        return (None, None);
    };
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
    );
    let mut publisher = None;
    let mut team_identifier = None;
    for line in text.lines() {
        if let Some(value) = line.strip_prefix("Authority=") {
            if publisher.is_none() {
                let value = value.trim();
                let value = value
                    .strip_prefix("Developer ID Application: ")
                    .or_else(|| value.strip_prefix("Apple Development: "))
                    .or_else(|| value.strip_prefix("3rd Party Mac Developer Application: "))
                    .unwrap_or(value);
                publisher = Some(value.split_once(" (").map(|(name, _)| name).unwrap_or(value).trim().to_string());
            }
        }
        if let Some(value) = line.strip_prefix("TeamIdentifier=") {
            if value != "not set" && !value.is_empty() {
                team_identifier = Some(value.to_string());
            }
        }
    }
    (publisher, team_identifier)
}

fn app_details(path: &str) -> AppDetails {
    let bundle_path = Path::new(path);
    let is_bundle = bundle_path.extension().and_then(|value| value.to_str()) == Some("app");
    let info_path = bundle_path.join("Contents/Info.plist");
    let plist = plist::Value::from_file(&info_path).ok();
    let category_key = plist_string(plist.as_ref(), "LSApplicationCategoryType");
    let category = category_key.as_deref().map(|value| {
        value
            .strip_prefix("public.app-category.")
            .unwrap_or(value)
            .replace('-', " ")
            .split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                chars.next().map(|first| first.to_uppercase().collect::<String>() + chars.as_str()).unwrap_or_default()
            })
            .collect::<Vec<_>>()
            .join(" ")
    });
    let mut document_extensions = Vec::new();
    if let Some(document_types) = plist
        .as_ref()
        .and_then(|value| value.as_dictionary())
        .and_then(|dictionary| dictionary.get("CFBundleDocumentTypes"))
        .and_then(plist::Value::as_array)
    {
        for document_type in document_types {
            if let Some(extensions) = document_type
                .as_dictionary()
                .and_then(|dictionary| dictionary.get("CFBundleTypeExtensions"))
                .and_then(plist::Value::as_array)
            {
                for extension in extensions.iter().filter_map(plist::Value::as_string) {
                    let extension = extension.trim();
                    if !extension.is_empty() && !document_extensions.iter().any(|known| known == extension) {
                        document_extensions.push(extension.to_string());
                    }
                }
            }
        }
    }
    let (publisher, team_identifier) = signature_info(path);

    AppDetails {
        app_type: if is_bundle { "macOS application" } else { "Command-line utility" }.to_string(),
        category,
        description: plist_string(plist.as_ref(), "CFBundleGetInfoString"),
        bundle_identifier: plist_string(plist.as_ref(), "CFBundleIdentifier"),
        version: plist_string(plist.as_ref(), "CFBundleShortVersionString"),
        build_version: plist_string(plist.as_ref(), "CFBundleVersion"),
        publisher,
        team_identifier,
        last_used: spotlight_value(path, "kMDItemLastUsedDate"),
        document_extensions,
        copyright: plist_string(plist.as_ref(), "NSHumanReadableCopyright"),
    }
}

#[tauri::command]
pub async fn get_app_details(path: String) -> Result<AppDetails, String> {
    tauri::async_runtime::spawn_blocking(move || Ok(app_details(&path)))
        .await
        .map_err(|error| error.to_string())?
}


fn is_protected_path(path: &str) -> bool {
    let protected_prefixes = ["/System", "/usr", "/bin", "/sbin", "/Library", "/Applications"];
    for prefix in protected_prefixes {
        if path.starts_with(prefix) {
            // /Applications user apps are not protected? Mark system apps only
            if prefix == "/Applications" {
                // Heuristic: system apps live in /System/Applications; /Applications is user-managed
            }
        }
    }
    if path.starts_with("/System") || path.starts_with("/usr") || path.starts_with("/bin") || path.starts_with("/sbin") || path.starts_with("/Library") {
        return true;
    }
    if path.contains("/node_modules/") || path.contains("/target/") {
        return true;
    }
    false
}

#[tauri::command]
pub fn get_installed_apps() -> Result<Vec<AppInfo>, String> {
    // Find .app bundles (including hidden ones) and measure their size.
    let output = Command::new("sh")
        .arg("-c")
        .arg("find /Applications \"$HOME/Applications\" /System/Applications -maxdepth 3 -name '*.app' -print0 2>/dev/null | xargs -0 du -sk 2>/dev/null")
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
            let protected = is_protected_path(&path);
            Some(AppInfo {
                name,
                path,
                size_mb: (size_kb + 1023) / 1024,
                icon,
                protected,
            })
        })
        .collect();

    // Include CLI tools from common bin directories.
    for dir in ["/usr/local/bin", "/opt/homebrew/bin", "/opt/homebrew/sbin"] {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_file() {
                    continue;
                }
                let name = match entry.file_name().into_string() {
                    Ok(n) => n,
                    Err(_) => continue,
                };
                if name.starts_with('.') {
                    continue;
                }
                let size_mb = path
                    .metadata()
                    .map(|m| (m.len() + 1024 * 1024 - 1) / (1024 * 1024))
                    .unwrap_or(0);
                apps.push(AppInfo {
                    name,
                    path: path.to_string_lossy().to_string(),
                    size_mb: if size_mb == 0 { 1 } else { size_mb },
                    icon: None,
                    protected: is_protected_path(&path.to_string_lossy()),
                });
            }
        }
    }
    // Also scan user-local bin
    if let Ok(home) = std::env::var("HOME") {
        let user_bin = std::path::Path::new(&home).join(".local/bin");
        if let Ok(entries) = std::fs::read_dir(&user_bin) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_file() {
                    continue;
                }
                let name = match entry.file_name().into_string() {
                    Ok(n) => n,
                    Err(_) => continue,
                };
                if name.starts_with('.') {
                    continue;
                }
                let size_mb = path
                    .metadata()
                    .map(|m| (m.len() + 1024 * 1024 - 1) / (1024 * 1024))
                    .unwrap_or(0);
                apps.push(AppInfo {
                    name,
                    path: path.to_string_lossy().to_string(),
                    size_mb: if size_mb == 0 { 1 } else { size_mb },
                    icon: None,
                    protected: is_protected_path(&path.to_string_lossy()),
                });
            }
        }
    }
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
    let info_plist = std::path::Path::new(app_path).join("Contents/Info.plist");

    // Try to read the declared icon file from Info.plist
    let mut icon_name: Option<String> = None;
    if info_plist.exists() {
        for key in ["CFBundleIconFile", "CFBundleIconName"] {
            let output = Command::new("/usr/libexec/PlistBuddy")
                .arg("-c")
                .arg(format!("Print :{}", key))
                .arg(&info_plist)
                .output()
                .ok();
            if let Some(o) = output {
                if o.status.success() {
                    let val = String::from_utf8_lossy(&o.stdout).trim().to_string();
                    if !val.is_empty() {
                        icon_name = Some(val);
                        break;
                    }
                }
            }
        }
    }

    let mut icns_path: Option<std::path::PathBuf> = None;
    if let Some(name) = &icon_name {
        // name may or may not include extension
        let candidates = [
            resources.join(format!("{}.icns", name)),
            resources.join(name),
            resources.join(format!("{}.png", name)),
        ];
        for c in candidates {
            if c.exists() {
                icns_path = Some(c);
                break;
            }
        }
    }
    // Fallback: prefer AppIcon*.icns, else the largest .icns
    if icns_path.is_none() {
        if let Ok(entries) = std::fs::read_dir(&resources) {
            let mut icns_files: Vec<std::path::PathBuf> = entries
                .flatten()
                .map(|e| e.path())
                .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("icns"))
                .collect();
            // Prefer AppIcon
            icns_files.sort_by(|a, b| {
                let a_name = a.file_name().and_then(|n| n.to_str()).unwrap_or("");
                let b_name = b.file_name().and_then(|n| n.to_str()).unwrap_or("");
                let a_pref = a_name.to_lowercase().starts_with("appicon");
                let b_pref = b_name.to_lowercase().starts_with("appicon");
                if a_pref != b_pref {
                    return b_pref.cmp(&a_pref);
                }
                // larger file first
                let a_size = std::fs::metadata(a).map(|m| m.len()).unwrap_or(0);
                let b_size = std::fs::metadata(b).map(|m| m.len()).unwrap_or(0);
                b_size.cmp(&a_size)
            });
            icns_path = icns_files.into_iter().next();
        }
    }

    let icns = icns_path?;
    let tmp = std::env::temp_dir().join(format!(
        "destox_icon_{}.png",
        app_path.replace('/', "_")
    ));
    let status = Command::new("sips")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
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
