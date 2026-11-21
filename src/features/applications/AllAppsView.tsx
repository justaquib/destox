import { Icon } from "../../components/Icon";
import type { AppItem } from "./types";

type Props = {
  apps: AppItem[];
  visibleApps: AppItem[];
  selected: AppItem[];
  selectedSize: string;
  sort: "size" | "name";
  setSort: (value: "size" | "name") => void;
  onToggle: (id: number) => void;
  onUninstall: () => void;
  message: string;
};

export function AllAppsView({
  apps,
  visibleApps,
  selected,
  selectedSize,
  sort,
  setSort,
  onToggle,
  onUninstall,
  message,
}: Props) {
  return (
    <>
      <div className="toolbar">
        <p>
          <strong>{apps.length} applications</strong>
          <span>·</span>
          12.8 GB total
        </p>
        <label className="sort-select">
          Sort by:
          <select
            aria-label="Sort applications"
            onChange={(event) => setSort(event.target.value as "size" | "name")}
            value={sort}
          >
            <option value="size">Size</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <div className="app-list">
        <div className="list-head">
          <span>Application</span>
          <span>Size</span>
          <span />
        </div>
        {visibleApps.map((app) => (
          <button
            className={`app-row ${app.selected ? "selected" : ""}`}
            key={app.id}
            onClick={() => onToggle(app.id)}
            type="button"
          >
            <span className={`checkbox ${app.selected ? "checked" : ""}`}>
              {app.selected && (
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="m2.5 6 2.2 2.2L9.6 3.5" />
                </svg>
              )}
            </span>
            <span className={`app-icon ${app.iconClass}`}>
              {app.icon.startsWith("data:") ? (
                <img src={app.icon} alt="" style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }} />
              ) : (
                app.icon
              )}
            </span>
            <span className="app-details">
              <strong>{app.name}</strong>
              <small>{app.meta}</small>
            </span>
            <span className="app-size">{app.size}</span>
            <span className="row-arrow">
              <Icon name="chevron" size={16} />
            </span>
          </button>
        ))}
        {visibleApps.length === 0 && (
          <div className="empty-state">
            <Icon name="search" size={24} />
            <strong>No applications found</strong>
            <span>Try a different search.</span>
          </div>
        )}
      </div>

      <footer className="action-bar">
        <div className="selection-copy">
          <div className="selection-icon">
            <Icon name="trash" size={18} />
          </div>
          <div>
            <strong>
              {selected.length} {selected.length === 1 ? "item" : "items"} selected
            </strong>
            <span>
              {selected.length ? `${selectedSize} will be freed` : "Select apps to remove"}
            </span>
          </div>
        </div>
        {message && <p className="success-message">{message}</p>}
        <button
          className="uninstall-button"
          disabled={!selected.length}
          onClick={onUninstall}
          type="button"
        >
          <Icon name="trash" size={17} />
          Uninstall
        </button>
      </footer>
    </>
  );
}
