import { Download, RefreshCw, Sparkles, X } from "lucide-react";

export type UpdateDialogState = {
  status: "idle" | "checking" | "available" | "downloading" | "installing" | "up-to-date" | "error";
  showDialog?: boolean;
  version?: string;
  notes?: string;
  progress?: number | null;
  error?: string;
};

type Props = {
  state: UpdateDialogState;
  onClose: () => void;
  onInstall: () => void;
};

export function UpdateDialog({ state, onClose, onInstall }: Props) {
  if (!state.showDialog || state.status === "idle") return null;
  const busy = state.status === "checking" || state.status === "downloading" || state.status === "installing";
  const title = {
    checking: "Checking for updates",
    available: "A new Destox is ready",
    downloading: "Downloading update",
    installing: "Installing update",
    "up-to-date": "You’re up to date",
    error: "Update couldn’t complete",
    idle: "Updates",
  }[state.status];

  return (
    <div className="modal-backdrop update-backdrop" role="presentation" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }}>
      <section className={`update-dialog update-state-${state.status}`} role="dialog" aria-modal="true" aria-labelledby="update-dialog-title">
        <header className="update-dialog-header">
          <span className="update-dialog-icon"><Sparkles size={20} /></span>
          {!busy && (
            <button type="button" className="update-dialog-close" onClick={onClose} aria-label="Close update dialog"><X size={17} /></button>
          )}
        </header>
        <div className="update-dialog-copy">
          <p className="eyebrow">DESTOX UPDATER</p>
          <h2 id="update-dialog-title">{title}</h2>
          {state.status === "checking" && <p>Looking for the latest version on GitHub…</p>}
          {state.status === "available" && <p>Version <strong>{state.version}</strong> is available to install.</p>}
          {state.status === "downloading" && <p>{state.progress == null ? "Downloading the signed update…" : `Downloading… ${state.progress}%`}</p>}
          {state.status === "installing" && <p>The update is ready. Destox will restart when installation finishes.</p>}
          {state.status === "up-to-date" && <p>You’re running the latest version of Destox.</p>}
          {state.status === "error" && <p>{state.error || "Check your internet connection and try again."}</p>}
        </div>
        {state.status === "available" && state.notes?.trim() && (
          <div className="update-release-notes">
            <strong>What’s new</strong>
            <p>{state.notes}</p>
          </div>
        )}
        {(state.status === "checking" || state.status === "downloading" || state.status === "installing") && (
          <div className="update-progress-track"><span style={{ width: `${state.status === "downloading" ? state.progress ?? 8 : state.status === "installing" ? 100 : 24}%` }} /></div>
        )}
        <footer className="update-dialog-actions">
          {state.status === "available" && <button type="button" className="update-primary" onClick={onInstall}><Download size={15} /> Install update</button>}
          {state.status === "error" && <button type="button" className="update-primary" onClick={onInstall}><RefreshCw size={14} /> Try again</button>}
          {state.status !== "checking" && state.status !== "downloading" && state.status !== "installing" && (
            <button type="button" className="update-secondary" onClick={onClose}>{state.status === "available" ? "Later" : "Close"}</button>
          )}
        </footer>
      </section>
    </div>
  );
}
