import { Icon } from "../../components/Icon";
import type { InstalledApp } from "./types";

type Props = {
  installed: InstalledApp[];
};

export function RecentlyInstalledView({ installed }: Props) {
  return (
    <>
      <div className="toolbar">
        <p>
          <strong>{installed.length} recently installed</strong>
        </p>
      </div>
      <div className="app-list">
        {installed.length === 0 && (
          <div className="empty-state">
            <Icon name="clock" size={24} />
            <strong>No recently installed apps</strong>
            <span>Installed apps will appear here.</span>
          </div>
        )}
        {installed.map((item, index) => (
          <div className="app-row" key={`${item.name}-${index}`}>
            <span />
            <span className={`app-icon ${index % 2 === 0 ? "figma-icon" : "notion-icon"}`}>
              {item.icon && item.icon.startsWith("data:") ? (
                <img src={item.icon} alt="" style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }} />
              ) : (
                item.name.charAt(0).toUpperCase()
              )}
            </span>
            <span className="app-details">
              <strong>{item.name}</strong>
              <small>{new Date(item.installed_at * 1000).toLocaleString()}</small>
            </span>
            <span className="app-size">
              {item.size_mb > 1024 ? `${(item.size_mb / 1024).toFixed(2)} GB` : `${item.size_mb} MB`}
            </span>
            <span />
          </div>
        ))}
      </div>
    </>
  );
}
