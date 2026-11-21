import { useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import type { IconName } from "../../components/Icon";

type Category = "All" | "Images" | "Videos" | "Documents" | "Folders" | "Temporary" | "Cache";

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
] as const;

const initialFiles: FileItem[] = [
  { id: 1, name: "Archive.zip", path: "~/Downloads", category: "Cache", modified: "Today", sizeMb: 1200, selected: false },
];

function formatSize(sizeMb: number) {
  return sizeMb >= 1024
    ? `${(sizeMb / 1024).toFixed(sizeMb >= 10240 ? 1 : 2)} GB`
    : `${sizeMb} MB`;
}

function categoryIcon(category: FileItem["category"]): IconName {
  const icons: Record<FileItem["category"], IconName> = {
    Images: "image",
    Videos: "video",
    Documents: "document",
    Folders: "folder",
    Temporary: "clock",
    Cache: "archive",
  };
  return icons[category];
}

export function LargeFilesView() {
  const [files, setFiles] = useState(initialFiles);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");

  const visibleFiles = useMemo(
    () =>
      files
        .filter((file) => activeCategory === "All" || file.category === activeCategory)
        .filter((file) => file.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.sizeMb - a.sizeMb),
    [activeCategory, files, query],
  );

  const selected = files.filter((file) => file.selected);
  const selectedMb = selected.reduce((total, file) => total + file.sizeMb, 0);

  function toggleFile(id: number) {
    setFiles((current) =>
      current.map((file) =>
        file.id === id ? { ...file, selected: !file.selected } : file,
      ),
    );
    setMessage("");
  }

  function removeFiles() {
    setFiles((current) => current.filter((file) => !file.selected));
    setConfirming(false);
    setMessage(`${selected.length} items moved to Trash`);
  }

  return (
    <>
      <div className="toolbar">
        <p>
          <strong>{activeCategory === "All" ? "All large files" : activeCategory}</strong>
          <span>· {visibleFiles.length} shown</span>
        </p>
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
      </div>

      <section className="category-section" aria-label="File categories">
        <div className="section-heading">
          <div>
            <strong>Browse by type</strong>
            <span>36.2 GB found across 124 items</span>
          </div>
          <button type="button">Rescan</button>
        </div>
        <div className="category-strip">
          {categories.map((category) => (
            <button
              className={`category-card ${activeCategory === category.name ? "active" : ""}`}
              key={category.name}
              onClick={() => {
                setActiveCategory(category.name);
                setMessage("");
              }}
              type="button"
            >
              <span className={`category-icon category-${category.name.toLowerCase()}`}>
                <Icon name={category.icon as IconName} size={19} />
              </span>
              <span className="category-copy">
                <strong>{category.name}</strong>
                <small>{category.count} items</small>
              </span>
              <b>{category.size}</b>
            </button>
          ))}
        </div>
      </section>

      <div className="app-list file-list">
        <div className="list-head file-list-head">
          <span>Name & location</span>
          <span>Modified</span>
          <span>Size</span>
          <span />
        </div>
        {visibleFiles.map((file) => (
          <button
            className={`app-row file-row ${file.selected ? "selected" : ""}`}
            key={file.id}
            onClick={() => toggleFile(file.id)}
            type="button"
          >
            <span className={`checkbox ${file.selected ? "checked" : ""}`}>
              {file.selected && (
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="m2.5 6 2.2 2.2L9.6 3.5" />
                </svg>
              )}
            </span>
            <span className={`file-type-icon type-${file.category.toLowerCase()}`}>
              <Icon name={categoryIcon(file.category)} size={19} />
            </span>
            <span className="app-details">
              <strong>{file.name}</strong>
              <small>{file.path}</small>
            </span>
            <span className="modified-date">{file.modified}</span>
            <span className="app-size">{formatSize(file.sizeMb)}</span>
            <span className="row-arrow">
              <Icon name="chevron" size={16} />
            </span>
          </button>
        ))}
        {visibleFiles.length === 0 && (
          <div className="empty-state">
            <Icon name="search" size={24} />
            <strong>No files found</strong>
            <span>Try another category or search.</span>
          </div>
        )}
      </div>

      <footer className="action-bar">
        <div className="selection-copy">
          <span className="selection-icon">
            <Icon name="trash" size={18} />
          </span>
          <div>
            <strong>
              {selected.length} {selected.length === 1 ? "item" : "items"} selected
            </strong>
            <span>
              {selected.length ? `${formatSize(selectedMb)} will be freed` : "Select files to remove"}
            </span>
          </div>
        </div>
        {message && <p className="success-message">{message}</p>}
        <button
          className="uninstall-button"
          disabled={!selected.length}
          onClick={() => setConfirming(true)}
          type="button"
        >
          <Icon name="trash" size={17} />
          Move to Trash
        </button>
      </footer>

      {confirming && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">Move selected items to Trash?</h2>
            <p>
              {selected.length} items will be moved to Trash. This will recover {formatSize(selectedMb)} of storage.
            </p>
            <div className="modal-actions">
              <button onClick={() => setConfirming(false)} type="button">Cancel</button>
              <button className="confirm-button" onClick={removeFiles} type="button">Move to Trash</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
