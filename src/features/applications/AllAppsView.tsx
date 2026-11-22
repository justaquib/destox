import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, HardDrive, X } from "lucide-react";
import { Icon } from "../../components/Icon";
import type { AppItem, ApplicationDetails } from "./types";
import { getApplicationDetails } from "../../lib/tauri";

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

function AppGlyph({ app, large = false }: { app: AppItem; large?: boolean }) {
  return (
    <span className={`app-icon app-glyph ${large ? "app-detail-icon" : ""} ${app.icon.startsWith("data:") ? "has-image" : ""}`}>
      {app.icon.startsWith("data:") ? <img src={app.icon} alt="" /> : app.icon}
    </span>
  );
}

export function AllAppsView({ apps, visibleApps, selected, selectedSize, sort, setSort, onToggle, onUninstall, message }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [appDetails, setAppDetails] = useState<ApplicationDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const detailsRequest = useRef(0);
  const activeApp = useMemo(() => apps.find((app) => app.id === activeId) ?? null, [activeId, apps]);
  const activeSelectionIndex = activeApp ? selected.findIndex((app) => app.id === activeApp.id) : -1;

  const closeDetails = () => setActiveId(null);
  const focusSelection = (offset: number) => {
    if (activeSelectionIndex < 0 || selected.length < 2) return;
    const index = (activeSelectionIndex + offset + selected.length) % selected.length;
    setActiveId(selected[index].id);
  };

  useEffect(() => {
    if (!activeApp) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetails();
      if (event.key === "ArrowLeft") focusSelection(-1);
      if (event.key === "ArrowRight") focusSelection(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeApp, activeSelectionIndex, selected]);

  useEffect(() => {
    const requestId = ++detailsRequest.current;
    if (!activeApp) {
      setAppDetails(null);
      setDetailsLoading(false);
      setDetailsError("");
      return;
    }

    setAppDetails(null);
    setDetailsLoading(true);
    setDetailsError("");
    getApplicationDetails(activeApp.path)
      .then((details) => {
        if (detailsRequest.current === requestId) setAppDetails(details);
      })
      .catch((error) => {
        if (detailsRequest.current === requestId) setDetailsError(String(error));
      })
      .finally(() => {
        if (detailsRequest.current === requestId) setDetailsLoading(false);
      });

    return () => {
      if (detailsRequest.current === requestId) detailsRequest.current += 1;
    };
  }, [activeApp?.path]);

  return (
    <>
      <div className="toolbar">
        <p>
          <strong>{apps.length} applications</strong>
          <span>·</span>
          {(() => {
            const mb = apps.reduce((total, app) => total + app.sizeMb, 0);
            return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB total` : `${mb} MB total`;
          })()}
        </p>
        <label className="sort-select">
          Sort by:
          <select aria-label="Sort applications" onChange={(event) => setSort(event.target.value as "size" | "name")} value={sort}>
            <option value="size">Size</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <div className="app-list app-inventory">
        <div className="list-head">
          <span>Application</span>
          <span>Size</span>
          <span />
        </div>
        {visibleApps.map((app) => (
          <div className={`app-row ${app.selected ? "selected" : ""}`} key={app.id}>
            <button className="app-row-open" onClick={() => setActiveId(app.id)} type="button" aria-label={`Show details for ${app.name}`}>
              <AppGlyph app={app} />
              <span className="app-details"><strong>{app.name}</strong><small>{app.meta}</small></span>
            </button>
            <span className="app-size">{app.size}</span>
            <button
              className={`checkbox ${app.selected ? "checked" : ""}`}
              onClick={() => onToggle(app.id)}
              type="button"
              aria-label={`${app.selected ? "Deselect" : "Select"} ${app.name}`}
              aria-pressed={app.selected}
            >
              {app.selected && <Check size={12} />}
            </button>
          </div>
        ))}
        {visibleApps.length === 0 && (
          <div className="empty-state"><Icon name="search" size={24} /><strong>No applications found</strong><span>Try a different search.</span></div>
        )}
      </div>

      <footer className="action-bar">
        <div className="selection-copy">
          <div className="selection-icon"><Icon name="trash" size={18} /></div>
          <div>
            <strong>{selected.length} {selected.length === 1 ? "item" : "items"} selected</strong>
            <span>{selected.length ? `${selectedSize} will be freed` : "Select apps to remove"}</span>
          </div>
        </div>
        {message && <p className="success-message">{message}</p>}
        <button className="uninstall-button" disabled={!selected.length} onClick={onUninstall} type="button"><Icon name="trash" size={17} />Uninstall</button>
      </footer>

      {activeApp && (
        <div className="app-details-backdrop" onClick={closeDetails} role="presentation">
          <aside className="app-details-drawer" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="app-detail-title">
            <div className="app-drawer-heading">
              <div><span className="detail-kicker">APPLICATION DETAILS</span><h2 id="app-detail-title">Details</h2></div>
              <button className="drawer-close" onClick={closeDetails} type="button" aria-label="Close details"><X size={18} /></button>
            </div>
            {selected.length > 1 && activeSelectionIndex >= 0 && (
              <div className="drawer-selected-strip" aria-label="Selected applications">
                {selected.map((app, index) => (
                  <button className={activeApp.id === app.id ? "active" : ""} key={app.id} onClick={() => setActiveId(app.id)} type="button" title={app.name}>
                    <span>{index + 1}</span>{app.name}
                  </button>
                ))}
              </div>
            )}
            <div className="drawer-app-identity">
              <AppGlyph app={activeApp} large />
              <div><h3>{activeApp.name}</h3><p>{activeApp.meta}</p></div>
            </div>
            <div className="drawer-size-card"><span><HardDrive size={15} /> Disk usage</span><strong>{activeApp.size}</strong></div>
            <div className="drawer-metadata-heading"><strong>About this app</strong><span>{detailsLoading ? "Reading app metadata…" : "Bundle and macOS metadata"}</span></div>
            <div className="drawer-metadata-grid">
              <div><span>Type</span><strong>{appDetails?.app_type ?? (activeApp.path.endsWith(".app") ? "macOS application" : "Command-line utility")}</strong></div>
              <div><span>Category</span><strong>{appDetails?.category ?? (detailsLoading ? "Checking…" : "Not declared")}</strong></div>
              <div><span>Version</span><strong>{appDetails?.version ?? (detailsLoading ? "Checking…" : "Not available")}{appDetails?.build_version ? ` · Build ${appDetails.build_version}` : ""}</strong></div>
              <div><span>Signed by</span><strong>{appDetails?.publisher ?? (detailsLoading ? "Checking…" : "No signer reported")}</strong></div>
              <div><span>Last used</span><strong>{appDetails?.last_used ? formatLastUsed(appDetails.last_used) : detailsLoading ? "Checking…" : "Not available in Spotlight"}</strong></div>
              {appDetails?.team_identifier && <div><span>Signing team</span><strong>{appDetails.team_identifier}</strong></div>}
            </div>
            {appDetails?.bundle_identifier && (
              <div className="drawer-detail-group"><span>BUNDLE IDENTIFIER</span><code>{appDetails.bundle_identifier}</code></div>
            )}
            {appDetails?.description && <p className="drawer-app-description">{appDetails.description}</p>}
            {appDetails?.document_extensions && appDetails.document_extensions.length > 0 && (
              <div className="drawer-detail-group"><span>FILE TYPES IT OPENS</span><div className="drawer-file-types">{appDetails.document_extensions.map((extension) => <code key={extension}>.{extension}</code>)}</div></div>
            )}
            {appDetails?.copyright && <p className="drawer-copyright">{appDetails.copyright}</p>}
            {detailsError && <p className="drawer-metadata-error">Some app metadata could not be read.</p>}
            <div className="drawer-detail-group"><span>APPLICATION PATH</span><code title={activeApp.path}>{activeApp.path}</code></div>
            <div className="drawer-app-actions">
              {selected.length > 1 && activeSelectionIndex >= 0 && (
                <div className="drawer-pagination">
                  <button onClick={() => focusSelection(-1)} type="button" aria-label="Previous selected app"><ChevronLeft size={17} /></button>
                  <span>{activeSelectionIndex + 1} of {selected.length}</span>
                  <button onClick={() => focusSelection(1)} type="button" aria-label="Next selected app"><ChevronRight size={17} /></button>
                </div>
              )}
              <button className="drawer-select-button" onClick={() => onToggle(activeApp.id)} type="button">
                {activeApp.selected ? <><Check size={15} /> Selected for uninstall</> : "Add to uninstall selection"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function formatLastUsed(value: string) {
  const normalized = value
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/, "$1T$2$3:$4");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
