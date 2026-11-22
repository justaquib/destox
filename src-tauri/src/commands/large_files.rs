use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::os::unix::fs::MetadataExt;
use std::path::{Path, PathBuf};

#[derive(Serialize)]
pub struct LargeFile {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_at: i64,
    pub category: String,
    pub protected: bool,
}

fn category_for(path: &Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "heic" | "heif" | "bmp" | "tiff" | "webp" => "Images",
        "mp4" | "mov" | "avi" | "mkv" | "m4v" | "wmv" => "Videos",
        "pdf" | "doc" | "docx" | "txt" | "rtf" | "pages" | "ppt" | "pptx" | "xls" | "xlsx" | "csv" | "md" => "Documents",
        _ => "Other",
    }
}


fn is_protected(path: &Path) -> bool {
    let p = path.to_string_lossy();
    let protected_prefixes = [
        "/System", "/usr", "/bin", "/sbin", "/Library", "/Applications",
    ];
    for prefix in protected_prefixes {
        if p.starts_with(prefix) {
            return true;
        }
    }
    // protect dependency/build artifact directories
    if p.contains("/node_modules/") || p.contains("/target/") || p.contains("/.git/") {
        return true;
    }
    false
}

fn scan_dir(dir: &Path, min_size: u64, depth: usize, scan_hidden: bool, out: &mut Vec<LargeFile>, seen: &mut HashSet<(u64, u64)>) {
    if depth == 0 || !dir.exists() {
        return;
    }
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = match entry.file_name().into_string() {
            Ok(n) => n,
            Err(_) => continue,
        };
        if !scan_hidden && name.starts_with('.') {
            continue;
        }
        let meta = match path.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.is_dir() {
            scan_dir(&path, min_size, depth - 1, scan_hidden, out, seen);
        } else if meta.is_file() && meta.len() >= min_size {
            let key = (meta.dev(), meta.ino());
            if !seen.insert(key) {
                continue;
            }
            let modified_at = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            let protected = is_protected(&path);
            out.push(LargeFile {
                name,
                path: path.to_string_lossy().to_string(),
                size_bytes: meta.len(),
                modified_at,
                category: category_for(&path).to_string(),
                protected,
            });
        }
    }
}

#[tauri::command]
pub fn get_large_files(min_size_mb: Option<u64>, scan_hidden: Option<bool>) -> Result<Vec<LargeFile>, String> {
    let min_size = min_size_mb.unwrap_or(5) * 1024 * 1024;
    let scan_hidden = scan_hidden.unwrap_or(false);
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let home = PathBuf::from(home);
    let mut out = Vec::new();
    let mut seen = HashSet::new();
    scan_dir(&home, min_size, 6, scan_hidden, &mut out, &mut seen);
    // Also scan common app locations
    scan_dir(&PathBuf::from("/Applications"), min_size, 2, scan_hidden, &mut out, &mut seen);
    out.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    out.truncate(300);
    Ok(out)
}

#[tauri::command]
pub fn reveal_in_folder(path: String) -> Result<(), String> {
    let status = std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() {
        return Err("failed to reveal".into());
    }
    Ok(())
}


#[tauri::command]
pub fn delete_large_file(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.is_dir() {
        std::fs::remove_dir_all(p).map_err(|e| e.to_string())?;
    } else {
        std::fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}
