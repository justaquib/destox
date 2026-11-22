import { useState } from "react";
import { Icon } from "../../components/Icon";
import type { InstalledApp } from "./types";

type Props = {
  installed: InstalledApp[];
  onDelete: (path: string) => Promise<void>;
};

export function RecentlyInstalledView({ installed, onDelete }: Props) {
  const [pending, setPending] = useState<InstalledApp | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(pending.path);
      setPending(null);
    } catch (error) {
      setDeleteError(String(error));
    } finally {
      setDeleting(false);
    }
  };

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
            <span className="app-icon">
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
            <button
              className="recent-delete-button"
              onClick={() => { setDeleteError(""); setPending(item); }}
              type="button"
              aria-label={`Uninstall ${item.name}`}
              title={`Uninstall ${item.name}`}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}
      </div>
      {pending && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="recent-delete-title">
            <h2 id="recent-delete-title">Uninstall {pending.name}?</h2>
            <p>This removes the application from your Mac and clears it from Recently Installed.</p>
            {deleteError && <p className="delete-error">{deleteError}</p>}
            <div className="modal-actions">
              <button disabled={deleting} onClick={() => setPending(null)} type="button">Cancel</button>
              <button className="confirm-button" disabled={deleting} onClick={confirmDelete} type="button">
                {deleting ? "Uninstalling…" : "Uninstall"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
