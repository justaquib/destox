import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import type { IconName } from "../../components/Icon";
import { getLargeFiles, revealInFolder, deleteLargeFile } from "../../lib/tauri";
import type { LargeFile } from "../../features/applications/types";

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
  { name: "All", icon: "grid", count: 124, size: "36.2 GB" },
  { name: "Images", icon: "image", count: 38, size: "8.4 GB" },
  { name: "Videos", icon: "video", count: 16, size: "14.8 GB" },
  { name: "Documents", icon: "document", count: 42, size: "5.3 GB" },
  { name: "Folders", icon: "folder", count: 12, size: "4.9 GB" },
  { name: "Temporary", icon: "clock", count: 9, size: "1.6 GB" },
  { name: "Cache", icon: "archive", count: 7, size: "1.2 GB" },
  { name: "Other", icon: "file", count: 0, size: "" },
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

export function LargeFilesView() {
  const [files, setFiles] = useState<LargeFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLargeFiles(5);
      setFiles(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
    stats.All = { count: totalCount, size: totalSize };
    return stats;
  }, [files]);

  const formatBytes = (bytes: number) =>
    bytes >= 1024 * 1024 * 1024
      ? `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
      : bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${bytes} B`;

  return (
    <>
      <div className="toolbar">
        <p>
          <strong>{activeCategory === "All" ? "All large files" : activeCategory}</strong>
          <span>· {visibleFiles.length} shown</span>
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

      {loading && <div className="empty-state"><strong>Scanning files…</strong></div>}
      {error && <div className="empty-state"><strong>Error</strong><span>{error}</span></div>}
      <section className="category-section" aria-label="File categories">
        <div className="category-strip">
          {categories.map((category) => (
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
                <small>{categoryStats[category.name]?.count ?? 0} items</small>
              </span>
              <b>{formatBytes(categoryStats[category.name]?.size ?? 0)}</b>
            </button>
          ))}
        </div>
      </section>

      {viewMode === "list" ? (
      <div className="app-list file-list">
        <div className="list-head file-list-head">
          <span>Name & location</span>
          <span>Modified</span>
          <span>Size</span>
          <span />
        </div>
        {visibleFiles.map((file, index) => (
          <div className="app-row file-row" key={`${file.path}-${index}`}>
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
                onClick={() => revealInFolder(file.path)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}
              >
                <Icon name="folder" size={16} />
              </button>
              <button
                type="button"
                title="Delete"
                disabled={file.protected}
                onClick={async () => {
                  if (file.protected) return;
                  await deleteLargeFile(file.path);
                  load();
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
            <strong>No files found</strong>
            <span>Try another category or search.</span>
          </div>
        )}
      </div>
      ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, padding: 16 }}>
        {visibleFiles.map((file, index) => (
          <div key={`${file.path}-${index}`} style={{ border: "1px solid #e4e9e7", borderRadius: 12, padding: 12, background: "#fff" }}>
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
              onClick={() => revealInFolder(file.path)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#527666", marginRight: 8 }}
            >
              <Icon name="folder" size={16} />
            </button>
            <button
              type="button"
              title="Delete"
              disabled={file.protected}
              onClick={async () => {
                if (file.protected) return;
                await deleteLargeFile(file.path);
                load();
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
            <strong>No files found</strong>
            <span>Try another category or search.</span>
          </div>
        )}
      </div>
      )}

      <div className="toolbar">
        <p>
          <strong>{visibleFiles.length} files larger than 5 MB</strong>
        </p>
        <button
          className="uninstall-button"
          type="button"
          onClick={load}
          style={{ marginLeft: "auto" }}
        >
          Rescan
        </button>
      </div>
    </>
  );
}
