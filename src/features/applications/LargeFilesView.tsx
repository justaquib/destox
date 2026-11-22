import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import type { IconName } from "../../components/Icon";
import { getLargeFiles, getLargeFolders, revealInFolder, deleteLargeFile, getFilePreview, getPermissions } from "../../lib/tauri";
import { useNavigate } from "react-router-dom";
import type { LargeFile, LargeFolder } from "../../features/applications/types";
import { useAppStore } from "../../store/appStore";

type Category = "All" | "Images" | "Videos" | "Documents" | "Folders" | "Temporary" | "Cache" | "Other";

type FileItem = {
  id: number;
  name: string;
  path: string;
  category: Exclude<Category, "All">;
  modified: string;
  sizeMb: number;
  selected: boolean;
};

const categories = [
  { name: "All", icon: "grid" },
  { name: "Images", icon: "image" },
  { name: "Videos", icon: "video" },
  { name: "Documents", icon: "document" },
  { name: "Folders", icon: "folder" },
  { name: "Temporary", icon: "clock" },
  { name: "Cache", icon: "archive" },
  { name: "Other", icon: "file" },
] as const;

function categoryIcon(category: FileItem["category"]): IconName {
  const icons: Record<FileItem["category"], IconName> = {
    Images: "image",
    Videos: "video",
    Documents: "document",
    Folders: "folder",
    Temporary: "clock",
    Cache: "archive",
    Other: "file",
  };
  return icons[category];
}

function previewKind(path: string): "image" | "video" | "pdf" | null {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "tif", "tiff"].includes(extension)) return "image";
  if (["mp4", "m4v", "mov", "webm", "ogv", "avi", "mkv", "wmv"].includes(extension)) return "video";
  if (extension === "pdf") return "pdf";
  return null;
}

export function LargeFilesView() {
  const [files, setFiles] = useState<LargeFile[]>([]);
  const [folders, setFolders] = useState<LargeFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pendingPath, setPendingPath] = useState("");
  const [scanModalDismissed, setScanModalDismissed] = useState(false);
  const [scanPaused, setScanPaused] = useState(false);
  const [previewFile, setPreviewFile] = useState<LargeFile | null>(null);
  const [previewSource, setPreviewSource] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const scanInFlight = useRef(false);
  const folderScanInFlight = useRef(false);
  const scanProgress = useAppStore((state) => state.largeScanProgress);
  const setLargeScanProgress = useAppStore((state) => state.setLargeScanProgress);
  const finishLargeScan = useAppStore((state) => state.finishLargeScan);
  const setScanInBackground = useAppStore((state) => state.setScanInBackground);

  const navigate = useNavigate();
  const load = async () => {
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    setScanModalDismissed(false);
    setScanInBackground(false);
    setLoading(true);
    setError("");
    try {
      const perms = await getPermissions();
      const fullDisk = perms.find((p) => p.name === "Full Disk Access");
      if (!fullDisk?.granted) {
        setPermissionGranted(false);
        setFiles([]);
        return;
      }
      setPermissionGranted(true);
      setLargeScanProgress({ stage: "files", scanned_entries: 0, files_found: 0, category_sizes: {}, folder_count: 0, folder_size_bytes: 0, complete: false });
      const minSize = Math.max(1, Number(localStorage.getItem("destox.minLargeFileSizeMb") ?? "5") || 5);
      const scanHidden = localStorage.getItem("destox.scanHidden") === "true";
      const data = await getLargeFiles(minSize, scanHidden);
      setFiles(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      scanInFlight.current = false;
      finishLargeScan();
    }
  };

  useEffect(() => {
    if (localStorage.getItem("destox.autoScan") === "false") {
      setScanPaused(true);
      return;
    }
    void load();
  }, []);

  useEffect(() => {
    if (!previewFile) return;
    let current = true;
    setPreviewSource("");
    setPreviewError("");
    setPreviewLoading(true);
    getFilePreview(previewFile.path)
      .then((source) => { if (current) setPreviewSource(source); })
      .catch((reason) => { if (current) setPreviewError(String(reason)); })
      .finally(() => { if (current) setPreviewLoading(false); });
    return () => { current = false; };
  }, [previewFile]);

  useEffect(() => {
    if (!previewFile) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewFile(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewFile]);

  useEffect(() => {
    if (activeCategory === "Folders" && !foldersLoaded) {
      if (folderScanInFlight.current) return;
      folderScanInFlight.current = true;
      setScanModalDismissed(false);
      setScanInBackground(false);
      const scanHidden = localStorage.getItem("destox.scanHidden") === "true";
      setLoading(true);
      setError("");
      setLargeScanProgress({ stage: "folders", scanned_entries: 0, files_found: 0, category_sizes: {}, folder_count: 0, folder_size_bytes: 0, complete: false });
      getLargeFolders(Number(localStorage.getItem("destox.minLargeFolderSizeMb") ?? "10"), scanHidden)
        .then(setFolders)
        .catch((e) => setError(String(e)))
        .finally(() => {
          setFoldersLoaded(true);
          setLoading(false);
          folderScanInFlight.current = false;
          finishLargeScan();
        });
    }
  }, [activeCategory, foldersLoaded]);

  const visibleFiles = useMemo(
    () =>
      files
        .filter((file) => activeCategory === "All" || file.category === activeCategory)
        .filter((file) => file.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.size_bytes - a.size_bytes),
    [activeCategory, files, query],
  );

  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; size: number }> = {};
    let totalCount = 0;
    let totalSize = 0;
    for (const file of files) {
      if (!stats[file.category]) stats[file.category] = { count: 0, size: 0 };
      stats[file.category].count += 1;
      stats[file.category].size += file.size_bytes;
      totalCount += 1;
      totalSize += file.size_bytes;
    }
    if (scanProgress?.stage === "files" && (!scanProgress.complete || Object.keys(scanProgress.category_sizes).length > 0)) {
      for (const [name, tally] of Object.entries(scanProgress.category_sizes)) {
        stats[name] = { count: tally.count, size: tally.size_bytes };
      }
      totalCount = scanProgress.files_found;
      totalSize = Object.values(scanProgress.category_sizes).reduce((sum, tally) => sum + tally.size_bytes, 0);
    } else if (scanProgress?.stage === "folders" && Object.keys(scanProgress.category_sizes).length > 0) {
      const fileTotals = Object.entries(scanProgress.category_sizes).filter(([name]) => name !== "Folders");
      for (const [name, tally] of fileTotals) stats[name] = { count: tally.count, size: tally.size_bytes };
      totalCount = fileTotals.reduce((sum, [, tally]) => sum + tally.count, 0);
      totalSize = fileTotals.reduce((sum, [, tally]) => sum + tally.size_bytes, 0);
    }
    stats.All = { count: totalCount, size: totalSize };
    if (scanProgress?.stage === "folders" && (!scanProgress.complete || scanProgress.folder_count > 0)) {
      stats.Folders = { count: scanProgress.folder_count, size: scanProgress.folder_size_bytes };
    } else if (folders.length > 0) {
      stats.Folders = {
        count: folders.length,
        size: folders.reduce((sum, folder) => sum + folder.size_bytes, 0),
      };
    }
    return stats;
  }, [files, folders, scanProgress]);

  const availableCategories = useMemo(
    () => categories.filter((category) =>
      (category.name === "Folders" && (!foldersLoaded || scanProgress?.stage === "folders" && !scanProgress.complete))
      || (categoryStats[category.name]?.size ?? 0) > 0,
    ),
    [categoryStats, foldersLoaded, scanProgress],
  );

  useEffect(() => {
    if (scanProgress?.complete && !availableCategories.some((category) => category.name === activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, availableCategories, scanProgress?.complete]);

  const formatBytes = (bytes: number) =>
    bytes >= 1024 * 1024 * 1024
      ? `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
      : bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${bytes} B`;

  return (
    <>
      {previewFile && (
        <div className="modal-backdrop preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewFile(null); }}>
          <section className="file-preview-modal" role="dialog" aria-modal="true" aria-labelledby="file-preview-title">
            <header className="file-preview-header">
              <div>
                <span className="file-preview-eyebrow">{previewKind(previewFile.path) === "pdf" ? "PDF document" : previewKind(previewFile.path) === "video" ? "Video preview" : "Image preview"}</span>
                <h2 id="file-preview-title" title={previewFile.name}>{previewFile.name}</h2>
              </div>
              <button type="button" className="file-preview-close" onClick={() => setPreviewFile(null)} aria-label="Close preview">×</button>
            </header>
            <div className="file-preview-stage">
              {previewLoading && <span className="file-preview-message">Preparing preview…</span>}
              {previewError && <span className="file-preview-message file-preview-error">{previewError}</span>}
              {previewSource && previewKind(previewFile.path) === "image" && <img src={previewSource} alt={previewFile.name} onError={() => setPreviewError("This image format could not be displayed in the preview.")} />}
              {previewSource && previewKind(previewFile.path) === "video" && <video src={previewSource} controls playsInline onError={() => setPreviewError("This video format or codec could not be played in the preview.")} />}
              {previewSource && previewKind(previewFile.path) === "pdf" && <iframe src={previewSource} title={`Preview of ${previewFile.name}`} />}
            </div>
            <div className="file-preview-details">
              <div><small>File type</small><strong>{previewFile.category} · {previewFile.name.split(".").pop()?.toUpperCase()}</strong></div>
              <div><small>File size</small><strong>{formatBytes(previewFile.size_bytes)}</strong></div>
              <div><small>Last modified</small><strong>{new Date(previewFile.modified_at * 1000).toLocaleString()}</strong></div>
              <div className="file-preview-path"><small>Location</small><strong title={previewFile.path}>{previewFile.path}</strong></div>
            </div>
            <footer className="file-preview-footer">
              <button type="button" onClick={() => { void revealInFolder(previewFile.path); }}>Show in Finder</button>
              <button type="button" className="file-preview-done" onClick={() => setPreviewFile(null)}>Done</button>
            </footer>
          </section>
        </div>
      )}
      {loading && !scanModalDismissed && (
        <div className="modal-backdrop scan-backdrop" role="dialog" aria-modal="true" aria-labelledby="scan-title">
          <div className="scan-modal">
            <span className="scan-spinner" aria-hidden="true" />
            <div>
              <strong id="scan-title">Scanning your files</strong>
              <span>Destox is checking folders. Continue in the background to keep using the app.</span>
              <button className="scan-continue-button" onClick={() => {
                setScanModalDismissed(true);
                setScanInBackground(true);
              }} type="button">Continue in background</button>
            </div>
          </div>
        </div>
      )}
      <div className="toolbar">
        <p>
          <strong>{activeCategory === "All" ? "All large files" : activeCategory}</strong>
          <span>· {scanProgress?.stage === "files" && !scanProgress.complete ? `${scanProgress.files_found} found so far` : `${visibleFiles.length} shown`}</span>
        </p>
        <div>
          <label className="sort-select">
            Search:
            <input
              aria-label="Search files"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files"
              value={query}
              style={{ marginLeft: 8, border: "1px solid #dfe5e2", borderRadius: 6, padding: "4px 8px" }}
            />
          </label>
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === "list" ? "grid" : "list"))}
            style={{ marginLeft: 8, border: "1px solid #dfe5e2", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
          >
            {viewMode === "list" ? <Icon name="grid" size={16} /> : <Icon name="list" size={16} />}
          </button>
        </div>
      </div>

      {permissionGranted === false && (
        <div className="empty-state">
          <strong>Full Disk Access required</strong>
          <span>Grant Full Disk Access in Permissions to scan large files.</span>
          <button type="button" onClick={() => navigate("/permissions")} style={{ marginTop: 12, border: "none", background: "#527666", color: "#fff", padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>
            Open Permissions
          </button>
        </div>
      )}
      {scanPaused && !loading && !permissionGranted && (
        <div className="empty-state">
          <Icon name="search" size={24} />
          <strong>Ready when you are</strong>
          <span>Automatic scanning is off. Start a scan to find files that match your size threshold.</span>
          <button type="button" onClick={() => { setScanPaused(false); void load(); }} style={{ marginTop: 12, border: "none", background: "#527666", color: "#fff", padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>
            Scan now
          </button>
        </div>
      )}
      {error && <div className="empty-state"><strong>Error</strong><span>{error}</span></div>}
      <section className="category-section" aria-label="File categories">
        <div className="category-strip">
          {availableCategories.map((category) => (
            <button
              className={`category-card ${activeCategory === category.name ? "active" : ""}`}
              key={category.name}
              onClick={() => {
                setActiveCategory(category.name);
              }}
              type="button"
            >
              <span className={`category-icon category-${category.name.toLowerCase()}`}>
                <Icon name={category.icon as IconName} size={19} />
              </span>
              <span className="category-copy">
                <strong>{category.name}</strong>
                <small>{category.name === "Folders" && !foldersLoaded && scanProgress?.stage !== "folders"
                  ? "Scan to calculate"
                  : `${categoryStats[category.name]?.count ?? 0} items`}</small>
              </span>
              <b>{category.name === "Folders" && !foldersLoaded && scanProgress?.stage !== "folders"
                ? "Scan"
                : scanProgress?.stage === "folders" && !scanProgress.complete && !(categoryStats[category.name]?.size)
                ? "Scanning…"
                : formatBytes(categoryStats[category.name]?.size ?? 0)}</b>
            </button>
          ))}
        </div>
      </section>

      {activeCategory === "Folders" ? (
        <div className="app-list file-list">
          {folders.length === 0 && (
            <div className="empty-state">
              <Icon name="folder" size={24} />
              <strong>{loading ? "Scanning folders…" : "No large folders found"}</strong>
              <span>{loading ? "Folder sizes will update as the scan progresses." : `Folders at least ${Number(localStorage.getItem("destox.minLargeFolderSizeMb") ?? "10")} MB will appear here.`}</span>
            </div>
          )}
          {folders.map((folder, index) => (
            <div className="app-row file-row" key={`${folder.path}-${index}`}>
              <span />
              <span className="file-type-icon type-folders">
                <Icon name="folder" size={19} />
              </span>
              <span className="app-details">
                <strong>{folder.name}</strong>
                <small>{folder.path}</small>
              </span>
              <span className="modified-date">{folder.file_count} files</span>
              <span className="app-size">
                {folder.size_bytes >= 1024 * 1024 * 1024
                  ? `${(folder.size_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
                  : `${(folder.size_bytes / (1024 * 1024)).toFixed(2)} MB`}
              </span>
              <span className="row-arrow" style={{ display: "flex", gap: "6px", opacity: 1 }}>
                <button
                  type="button"
                  title="Show in folder"
                  onClick={() => revealInFolder(folder.path)}
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}
                >
                  <Icon name="folder" size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : viewMode === "list" ? (
      <div className="app-list file-list">
        <div className="list-head file-list-head">
          <span>Name & location</span>
          <span>Modified</span>
          <span>Size</span>
          <span />
        </div>
        {visibleFiles.map((file, index) => (
          <div
            className="app-row file-row"
            key={`${file.path}-${index}`}
            onClick={() => { if (previewKind(file.path)) setPreviewFile(file); }}
            onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && previewKind(file.path)) { event.preventDefault(); setPreviewFile(file); } }}
            role={previewKind(file.path) ? "button" : undefined}
            tabIndex={previewKind(file.path) ? 0 : undefined}
            style={{ cursor: previewKind(file.path) ? "pointer" : undefined }}
          >
            <span />
            <span className={`file-type-icon type-${file.category.toLowerCase()}`}>
              <Icon name={categoryIcon(file.category as any)} size={19} />
            </span>
            <span className="app-details">
              <strong>{file.name}</strong>
              <small>{file.path}</small>
            </span>
            <span className="modified-date">{new Date(file.modified_at * 1000).toLocaleString()}</span>
            <span className="app-size">{formatBytes(file.size_bytes)}</span>
            <span className="row-arrow" style={{ display: "flex", gap: "6px", opacity: 1 }}>
              {file.protected && (
                <button
                  type="button"
                  title="Protected"
                  disabled
                  style={{ border: "none", background: "transparent", cursor: "not-allowed", color: "#a46e68" }}
                >
                  <Icon name="lock" size={16} />
                </button>
              )}
              <button
                type="button"
                title="Show in folder"
                onClick={(event) => { event.stopPropagation(); void revealInFolder(file.path); }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}
              >
                <Icon name="folder" size={16} />
              </button>
              <button
                type="button"
                title="Delete"
                disabled={file.protected}
                onClick={async (event) => {
                  event.stopPropagation();
                  if (file.protected) return;
                  if (localStorage.getItem("destox.confirmDelete") === "false") {
                    await deleteLargeFile(file.path);
                    load();
                  } else {
                    setPendingPath(file.path);
                    setConfirming(true);
                  }
                }}
                style={{ border: "none", background: "transparent", cursor: file.protected ? "not-allowed" : "pointer", color: file.protected ? "#b9c4bf" : "inherit" }}
              >
                <Icon name="trash" size={16} />
              </button>
            </span>
          </div>
        ))}
        {visibleFiles.length === 0 && (
          <div className="empty-state">
            <Icon name="search" size={24} />
            <strong>{loading ? "Scanning this section…" : "No files found"}</strong>
            <span>{loading ? "Results and size totals update as files are checked." : "Try another category or search."}</span>
          </div>
        )}
      </div>
      ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, padding: 16 }}>
        {visibleFiles.map((file, index) => (
          <div
            key={`${file.path}-${index}`}
            onClick={() => { if (previewKind(file.path)) setPreviewFile(file); }}
            onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && previewKind(file.path)) { event.preventDefault(); setPreviewFile(file); } }}
            role={previewKind(file.path) ? "button" : undefined}
            tabIndex={previewKind(file.path) ? 0 : undefined}
            style={{ border: "1px solid #e4e9e7", borderRadius: 12, padding: 12, background: "#fff", cursor: previewKind(file.path) ? "pointer" : undefined }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className={`file-type-icon type-${file.category.toLowerCase()}`}>
                <Icon name={categoryIcon(file.category as any)} size={19} />
              </span>
              <strong style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</strong>
            </div>
            <div style={{ fontSize: 10, color: "#8f9a96", marginBottom: 8 }}>{new Date(file.modified_at * 1000).toLocaleDateString()}</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
              {file.size_bytes >= 1024 * 1024 * 1024
                ? `${(file.size_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
                : file.size_bytes >= 1024 * 1024
                ? `${(file.size_bytes / (1024 * 1024)).toFixed(2)} MB`
                : `${file.size_bytes} B`}
            </div>
            {file.protected && (
              <button
                type="button"
                title="Protected"
                disabled
                style={{ border: "none", background: "transparent", cursor: "not-allowed", color: "#a46e68", marginRight: 8 }}
              >
                <Icon name="lock" size={16} />
              </button>
            )}
            <button
              type="button"
              title="Show in folder"
                onClick={(event) => { event.stopPropagation(); void revealInFolder(file.path); }}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#527666", marginRight: 8 }}
            >
              <Icon name="folder" size={16} />
            </button>
            <button
              type="button"
              title="Delete"
              disabled={file.protected}
              onClick={async (event) => {
                event.stopPropagation();
                if (file.protected) return;
                if (localStorage.getItem("destox.confirmDelete") === "false") {
                  await deleteLargeFile(file.path);
                  load();
                } else {
                  setPendingPath(file.path);
                  setConfirming(true);
                }
              }}
              style={{ border: "none", background: "transparent", cursor: file.protected ? "not-allowed" : "pointer", color: file.protected ? "#b9c4bf" : "#527666" }}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}
        {visibleFiles.length === 0 && (
          <div className="empty-state">
            <Icon name="search" size={24} />
            <strong>{loading ? "Scanning this section…" : "No files found"}</strong>
            <span>{loading ? "Results and size totals update as files are checked." : "Try another category or search."}</span>
          </div>
        )}
      </div>
      )}

      <div className="toolbar">
        <p>
          <strong>{visibleFiles.length} files at least {Number(localStorage.getItem("destox.minLargeFileSizeMb") ?? "5")} MB</strong>
        </p>
        <button
          className="uninstall-button"
          type="button"
          onClick={() => {
            if (activeCategory === "Folders") setFoldersLoaded(false);
            else void load();
          }}
          style={{ marginLeft: "auto" }}
        >
          Rescan
        </button>
      </div>
    
      {confirming && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">Delete file permanently?</h2>
            <p>This file will be deleted permanently.</p>
            <div className="modal-actions">
              <button onClick={() => setConfirming(false)} type="button">Cancel</button>
              <button
                className="confirm-button"
                onClick={async () => {
                  await deleteLargeFile(pendingPath);
                  setConfirming(false);
                  setPendingPath("");
                  load();
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
</>
  );
}
