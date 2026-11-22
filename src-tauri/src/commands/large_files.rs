use serde::Serialize;
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::os::unix::fs::MetadataExt;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone, Default)]
pub struct CategoryTotal {
    pub count: u64,
    pub size_bytes: u64,
}

#[derive(Serialize, Clone)]
pub struct LargeScanProgress {
    pub stage: String,
    pub scanned_entries: u64,
    pub files_found: u64,
    pub category_sizes: BTreeMap<String, CategoryTotal>,
    pub folder_count: u64,
    pub folder_size_bytes: u64,
    pub complete: bool,
}

fn publish_progress(app: &AppHandle, stage: &str, scanned_entries: u64, category_sizes: &BTreeMap<String, CategoryTotal>, folder_count: u64, folder_size_bytes: u64, complete: bool) {
    let files_found = category_sizes.values().map(|item| item.count).sum();
    let _ = app.emit("large-scan-progress", LargeScanProgress {
        stage: stage.to_string(), scanned_entries, files_found,
        category_sizes: category_sizes.clone(), folder_count, folder_size_bytes, complete,
    });
}

#[derive(Serialize)]
pub struct LargeFile {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_at: i64,
    pub category: String,
    pub protected: bool,
}

#[derive(Serialize)]
pub struct LargeFolder {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub file_count: u64,
    pub protected: bool,
}

fn category_for(path: &Path) -> &'static str {
    let path_text = path.to_string_lossy().to_lowercase();
    if path_text.contains("/cache/") || path_text.contains("/caches/") {
        return "Cache";
    }
    if path_text.contains("/tmp/") || path_text.contains("/temp/") || path_text.contains("/temporary/") || path_text.contains("/var/folders/") {
        return "Temporary";
    }
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

fn scan_dir(dir: &Path, min_size: u64, depth: usize, scan_hidden: bool, out: &mut Vec<LargeFile>, seen: &mut HashSet<(u64, u64)>, budget: &mut usize, scanned: &mut u64, totals: &mut BTreeMap<String, CategoryTotal>, app: &AppHandle) {
    if depth == 0 || *budget == 0 {
        return;
    }
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        if *budget == 0 {
            break;
        }
        *budget -= 1;
        *scanned += 1;
        let path = entry.path();
        let name = match entry.file_name().into_string() {
            Ok(n) => n,
            Err(_) => continue,
        };
        if !scan_hidden && name.starts_with('.') {
            continue;
        }
        let meta = match fs::symlink_metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.file_type().is_symlink() {
            continue;
        }
        if meta.is_dir() {
            scan_dir(&path, min_size, depth - 1, scan_hidden, out, seen, budget, scanned, totals, app);
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
            let category = category_for(&path).to_string();
            let tally = totals.entry(category.clone()).or_default();
            tally.count += 1;
            tally.size_bytes += meta.len();
            out.push(LargeFile {
                name,
                path: path.to_string_lossy().to_string(),
                size_bytes: meta.len(),
                modified_at,
                category,
                protected,
            });
            if out.len() >= 600 {
                out.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
                out.truncate(300);
            }
        }
        if *scanned % 250 == 0 {
            publish_progress(app, "files", *scanned, totals, 0, 0, false);
        }
    }
}


fn dir_size_and_count(path: &std::path::Path, depth: usize, scan_hidden: bool, budget: &mut usize, scanned: &mut u64, current_bytes: &mut u64, current_files: &mut u64, completed_folders: u64, completed_bytes: u64, app: &AppHandle) -> (u64, u64) {
    let mut total = 0u64;
    let mut count = 0u64;
    if depth == 0 || *budget == 0 {
        return (total, count);
    }
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if *budget == 0 {
                break;
            }
            *budget -= 1;
            *scanned += 1;
            let p = entry.path();
            if !scan_hidden && entry.file_name().to_string_lossy().starts_with('.') {
                continue;
            }
            if let Ok(meta) = fs::symlink_metadata(&p) {
                if meta.file_type().is_symlink() {
                    continue;
                }
                if meta.is_dir() {
                    let (s, c) = dir_size_and_count(&p, depth - 1, scan_hidden, budget, scanned, current_bytes, current_files, completed_folders, completed_bytes, app);
                    total += s;
                    count += c;
                } else if meta.is_file() {
                    total += meta.len();
                    count += 1;
                    *current_bytes += meta.len();
                    *current_files += 1;
                }
            }
            if *scanned % 250 == 0 {
                let in_progress_folder = if *current_files > 0 { 1 } else { 0 };
                publish_progress(app, "folders", *scanned, &BTreeMap::new(), completed_folders + in_progress_folder, completed_bytes + *current_bytes, false);
            }
        }
    }
    (total, count)
}

#[tauri::command]
pub async fn get_large_files(app: AppHandle, min_size_mb: Option<u64>, scan_hidden: Option<bool>) -> Result<Vec<LargeFile>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let min_size = min_size_mb.unwrap_or(5).min(10_240) * 1024 * 1024;
        let scan_hidden = scan_hidden.unwrap_or(false);
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let home = PathBuf::from(home);
        let mut out = Vec::new();
        let mut seen = HashSet::new();
        let mut budget = 200_000;
        let mut scanned = 0;
        let mut totals = BTreeMap::new();
        publish_progress(&app, "files", 0, &totals, 0, 0, false);
        for sub in ["Documents", "Downloads", "Desktop", "Movies", "Music", "Pictures"] {
            scan_dir(&home.join(sub), min_size, 5, scan_hidden, &mut out, &mut seen, &mut budget, &mut scanned, &mut totals, &app);
            if budget == 0 { break; }
        }
        for extra_root in [home.join("Library/Caches"), home.join("Library/Logs")] {
            if budget == 0 { break; }
            scan_dir(&extra_root, min_size, 3, scan_hidden, &mut out, &mut seen, &mut budget, &mut scanned, &mut totals, &app);
        }
        if budget > 0 {
            if let Ok(temp_dir) = std::env::var("TMPDIR") {
                scan_dir(&PathBuf::from(temp_dir), min_size, 3, scan_hidden, &mut out, &mut seen, &mut budget, &mut scanned, &mut totals, &app);
            }
        }
        if budget > 0 {
            scan_dir(&PathBuf::from("/Applications"), min_size, 2, scan_hidden, &mut out, &mut seen, &mut budget, &mut scanned, &mut totals, &app);
        }
        out.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
        out.truncate(300);
        publish_progress(&app, "files", scanned, &totals, 0, 0, true);
        Ok(out)
    })
    .await
    .map_err(|error| error.to_string())?
}


#[tauri::command]
pub async fn get_large_folders(app: AppHandle, min_size_mb: Option<u64>, scan_hidden: Option<bool>) -> Result<Vec<LargeFolder>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let min_size = min_size_mb.unwrap_or(10).min(10_240) * 1024 * 1024;
        let scan_hidden = scan_hidden.unwrap_or(false);
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let home = PathBuf::from(home);
        let mut out = Vec::new();
        let mut budget = 100_000;
        let mut scanned = 0;
        let mut completed_bytes = 0;
        publish_progress(&app, "folders", 0, &BTreeMap::new(), 0, 0, false);
        if let Ok(entries) = fs::read_dir(&home) {
            for entry in entries.flatten() {
                if budget == 0 { break; }
                budget -= 1;
                let path = entry.path();
                let Ok(meta) = fs::symlink_metadata(&path) else { continue; };
                if !meta.is_dir() || meta.file_type().is_symlink() {
                    continue;
                }
                let name = match entry.file_name().into_string() {
                    Ok(n) => n,
                    Err(_) => continue,
                };
                if !scan_hidden && name.starts_with('.') {
                    continue;
                }
                let mut current_bytes = 0;
                let mut current_files = 0;
                let (size, count) = dir_size_and_count(&path, 5, scan_hidden, &mut budget, &mut scanned, &mut current_bytes, &mut current_files, out.len() as u64, completed_bytes, &app);
                if size >= min_size {
                    completed_bytes += size;
                    out.push(LargeFolder {
                        name,
                        path: path.to_string_lossy().to_string(),
                        size_bytes: size,
                        file_count: count,
                        protected: false,
                    });
                }
                publish_progress(&app, "folders", scanned, &BTreeMap::new(), out.len() as u64, completed_bytes, false);
            }
        }
        out.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
        let total_folder_count = out.len() as u64;
        let total_folder_bytes = out.iter().map(|folder| folder.size_bytes).sum();
        let folder_totals = BTreeMap::from([("Folders".to_string(), CategoryTotal { count: total_folder_count, size_bytes: total_folder_bytes })]);
        out.truncate(50);
        publish_progress(&app, "folders", scanned, &folder_totals, total_folder_count, total_folder_bytes, true);
        Ok(out)
    })
    .await
    .map_err(|error| error.to_string())?
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
pub fn get_file_preview(path: String) -> Result<String, String> {
    const MAX_PREVIEW_BYTES: u64 = 50 * 1024 * 1024;
    let file_path = Path::new(&path);
    let metadata = fs::symlink_metadata(file_path).map_err(|error| error.to_string())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("This item cannot be previewed as a file.".into());
    }
    if metadata.len() > MAX_PREVIEW_BYTES {
        return Err("This file is over 50 MB and is too large to preview.".into());
    }
    let extension = file_path.extension().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
    let mime = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "heic" => "image/heic",
        "heif" => "image/heif",
        "bmp" => "image/bmp",
        "tif" | "tiff" => "image/tiff",
        "mp4" | "m4v" => "video/mp4",
        "mov" => "video/quicktime",
        "webm" => "video/webm",
        "ogv" => "video/ogg",
        "avi" => "video/x-msvideo",
        "mkv" => "video/x-matroska",
        "wmv" => "video/x-ms-wmv",
        "pdf" => "application/pdf",
        _ => return Err("Preview is available for images, videos, and PDF files.".into()),
    };
    let contents = fs::read(file_path).map_err(|error| error.to_string())?;
    use base64::Engine;
    Ok(format!("data:{mime};base64,{}", base64::engine::general_purpose::STANDARD.encode(contents)))
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
