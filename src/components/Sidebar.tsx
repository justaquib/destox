import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import { useAppStore } from "../store/appStore";


export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const storage = useAppStore((s) => s.storage);
  const appCount = useAppStore((s) => s.apps.length);
  const installedCount = useAppStore((s) => s.installed.length);
  const trashCount = useAppStore((s) => s.trash.length);
  const active = location.pathname;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="sparkles" size={20} />
        </div>
        <div>
          <strong>Destox</strong>
          <span>Mac cleaner</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        <p>Library</p>
        <button
          className={`nav-item ${active === "/" ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/")}
        >
          <Icon name="grid" />
          All Applications
          <span>{appCount}</span>
        </button>
        <button
          className={`nav-item ${active === "/recently-installed" ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/recently-installed")}
        >
          <Icon name="clock" />
          Recently Installed
          <span>{installedCount}</span>
        </button>
        <button
          className={`nav-item ${active === "/large-files" ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/large-files")}
        >
          <Icon name="apps" />
          Large Files
        </button>
        <button
          className={`nav-item ${active === "/trash" ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/trash")}
        >
          <Icon name="trash" />
          Trash Bin
          <span>{trashCount}</span>
        </button>
        <button
          className={`nav-item ${active === "/permissions" ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/permissions")}
        >
          <Icon name="settings" />
          Permissions
        </button>
        <button
          className={`nav-item ${active === "/ports" ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/ports")}
        >
          <Icon name="network" />
          Ports
        </button>
      </nav>

      <div className="storage-card">
        <div className="storage-heading">
          <span>{storage?.name ?? "Macintosh HD"}</span>
          <strong>{storage ? `${storage.used_percent.toFixed(0)}%` : "…"}</strong>
        </div>
        <div className="storage-bar">
          <span style={{ width: storage ? `${storage.used_percent}%` : "68%" }} />
        </div>
        <p>
          {storage
            ? `${storage.free_gb.toFixed(0)} GB free of ${storage.total_gb.toFixed(0)} GB`
            : "…"}
        </p>
      </div>

      <div className="sidebar-bottom">
        <button className="nav-item" type="button">
          <Icon name="settings" />
          Preferences
        </button>
        <button
          className={`nav-item ${active === "/about" ? "active" : ""}`}
          type="button"
          onClick={() => navigate("/about")}
        >
          <Icon name="info" />
          About
        </button>
      </div>
    </aside>
  );
}
