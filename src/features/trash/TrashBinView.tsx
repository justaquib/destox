import { Icon } from "../../components/Icon";
import type { TrashItem } from "../applications/types";

type Props = {
  trash: TrashItem[];
  onRescan: () => Promise<void>;
  onDelete: (path: string) => Promise<void>;
  onRecover: (path: string) => Promise<void>;
};

export function TrashBinView({ trash, onRescan, onDelete, onRecover }: Props) {
  return (
    <>
      <div className="toolbar">
        <p>
          <strong>{trash.length} items in Trash</strong>
        </p>
        <button
          className="uninstall-button"
          type="button"
          onClick={onRescan}
          style={{ marginLeft: "auto" }}
        >
          Rescan
        </button>
      </div>
      <div className="app-list">
        {trash.length === 0 && (
          <div className="empty-state">
            <Icon name="trash" size={24} />
            <strong>Trash is empty</strong>
            <span>Deleted files will appear here.</span>
          </div>
        )}
        {trash.map((item, index) => (
          <div className="app-row" key={`${item.path}-${index}`}>
            <span />
            <span className={`app-icon ${item.is_dir ? "figma-icon" : "notion-icon"}`}>
              {item.name.charAt(0).toUpperCase()}
            </span>
            <span className="app-details">
              <strong>{item.name}</strong>
              <small>{item.modified_at}</small>
            </span>
            <span className="app-size">
              {item.size_bytes > 1024 * 1024
                ? `${(item.size_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
                : item.size_bytes > 1024
                ? `${(item.size_bytes / (1024 * 1024)).toFixed(2)} MB`
                : `${item.size_bytes} B`}
            </span>
            <span className="row-arrow" style={{ display: "flex", gap: "6px", opacity: 1 }}>
              <button
                type="button"
                title="Recover"
                onClick={() => onRecover(item.path)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}
              >
                <Icon name="undo" size={16} />
              </button>
              <button
                type="button"
                title="Delete permanently"
                onClick={() => onDelete(item.path)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}
              >
                <Icon name="trash" size={16} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
